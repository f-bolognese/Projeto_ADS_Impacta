const express = require('express');
const pool = require('./db');

const router = express.Router();
const fields = ['nome', 'cpf', 'telefone', 'endereco', 'data_nascimento', 'email'];
const textLimits = { nome: 100, cpf: 14, telefone: 20, endereco: 200, email: 255 };

function validateId(value) {
  return /^\d+$/.test(value) && Number(value) > 0;
}

function missingFields(body, required) {
  return required.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
}

function validateFields(body) {
  const unknown = Object.keys(body).filter((field) => !fields.includes(field));
  if (unknown.length) {
    return `Campos nao permitidos: ${unknown.join(', ')}.`;
  }

  for (const field of Object.keys(body)) {
    if (textLimits[field] && typeof body[field] === 'string' && body[field].length > textLimits[field]) {
      return `O campo ${field} excede o limite de ${textLimits[field]} caracteres.`;
    }
  }

  return null;
}

function databaseError(res, error) {
  if (error.code === '23503') {
    return res.status(409).json({ error: 'O tutor possui registros relacionados e nao pode ser excluido.' });
  }

  if (error.code === '23505') {
    return res.status(409).json({ error: 'Ja existe um tutor com esse CPF.' });
  }

  if (error.code === '42501') {
    return res.status(503).json({ error: 'O usuario do banco nao possui permissao para esta tabela.' });
  }

  if (error.code === '42703' || error.code === '42P01') {
    return res.status(503).json({ error: 'O schema do banco esta desatualizado.' });
  }

  return res.status(500).json({ error: error.message });
}

router.post('/tutores', async (req, res) => {
  const missing = missingFields(req.body, ['nome', 'cpf']);
  const validationError = validateFields(req.body);

  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(req.body.cpf)) {
    return res.status(400).json({ error: 'O CPF deve estar no formato 000.000.000-00.' });
  }

  try {
    const { nome, cpf, telefone, endereco, data_nascimento, email } = req.body;
    const result = await pool.query(
      `INSERT INTO public.tutor (nome, cpf, telefone, endereco, data_nascimento, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nome, cpf, telefone ?? null, endereco ?? null, data_nascimento ?? null, email ?? null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.get('/tutores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.tutor ORDER BY id');
    return res.status(200).json(result.rows);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.get('/tutores/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  try {
    const result = await pool.query(
      `SELECT t.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', a.id,
                    'nome', a.nome,
                    'data_nascimento', a.data_nascimento,
                    'raca', a.raca,
                    'cor', a.cor,
                    'peso_kg', a.peso_kg
                  ) ORDER BY a.id
                ) FILTER (WHERE a.id IS NOT NULL),
                '[]'::json
              ) AS animais
       FROM public.tutor t
       LEFT JOIN public.animal a ON a.tutor_id = t.id
       WHERE t.id = $1
       GROUP BY t.id`,
      [req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Tutor nao encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.put('/tutores/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  const missing = missingFields(req.body, ['nome', 'cpf']);
  const validationError = validateFields(req.body);
  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const { nome, cpf, telefone, endereco, data_nascimento, email } = req.body;
    const result = await pool.query(
      `UPDATE public.tutor
       SET nome = $1, cpf = $2, telefone = $3, endereco = $4, data_nascimento = $5, email = $6
       WHERE id = $7
       RETURNING *`,
      [nome, cpf, telefone ?? null, endereco ?? null, data_nascimento ?? null, email ?? null, req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Tutor nao encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.patch('/tutores/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  const providedFields = Object.keys(req.body);
  const validationError = validateFields(req.body);
  if (!providedFields.length) {
    return res.status(400).json({ error: 'Informe ao menos um campo para atualizar.' });
  }

  const requiredPatchFields = missingFields(req.body, ['nome', 'cpf']);
  const invalidRequiredPatchFields = requiredPatchFields.filter((field) => providedFields.includes(field));
  if (invalidRequiredPatchFields.length) {
    return res.status(400).json({ error: `Os campos nao podem ser vazios: ${invalidRequiredPatchFields.join(', ')}.` });
  }

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const assignments = providedFields.map((field, index) => `${field} = $${index + 1}`);
  const values = providedFields.map((field) => req.body[field]);
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE public.tutor SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Tutor nao encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.delete('/tutores/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  try {
    const result = await pool.query('DELETE FROM public.tutor WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Tutor nao encontrado.' });
    }

    return res.status(200).json({ message: 'Tutor excluido com sucesso.', id: result.rows[0].id });
  } catch (error) {
    return databaseError(res, error);
  }
});

module.exports = router;
