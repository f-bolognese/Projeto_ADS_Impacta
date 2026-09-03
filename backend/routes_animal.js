const express = require('express');
const pool = require('./db');

const router = express.Router();

const fields = ['nome', 'data_nascimento', 'especie', 'raca', 'cor', 'peso_kg', 'tutor_id'];
const textLimits = { nome: 100, raca: 100, cor: 50 };

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
    return res.status(409).json({ error: 'O tutor informado nao existe ou o animal possui registros relacionados.' });
  }

  if (error.code === '42501') {
    return res.status(503).json({ error: 'O usuario do banco nao possui permissao para esta tabela.' });
  }

  if (error.code === '42703' || error.code === '42P01') {
    return res.status(503).json({ error: 'O schema do banco esta desatualizado.' });
  }

  return res.status(500).json({ error: error.message });
}

router.post('/animais', async (req, res) => {
  const missing = missingFields(req.body, ['nome', 'tutor_id']);
  const validationError = validateFields(req.body);

  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  if (!validateId(req.body.tutor_id)) {
    return res.status(400).json({ error: 'tutor_id deve ser um numero inteiro positivo.' });
  }

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const { nome, data_nascimento, especie, raca, cor, peso_kg, tutor_id } = req.body;

    const result = await pool.query(
      `INSERT INTO public.animal (nome, data_nascimento, especie, raca, cor, peso_kg, tutor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nome, data_nascimento ?? null, especie, raca ?? null, cor ?? null, peso_kg ?? null, tutor_id]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.get('/animais', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.animal ORDER BY id');
    return res.status(200).json(result.rows);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.get('/animais/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  try {
    const result = await pool.query(
      `SELECT a.*, COALESCE(t.nome, '') AS tutor_nome
      FROM public.animal a
      LEFT JOIN public.tutor t ON t.id = a.tutor_id
      WHERE a.id = $1`,
      [req.params.id]
    );


    if (!result.rowCount) {
      return res.status(404).json({ error: 'Animal nao encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.put('/animais/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  const missing = missingFields(req.body, ['nome', 'tutor_id']);
  const validationError = validateFields(req.body);

  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  if (!validateId(req.body.tutor_id)) {
    return res.status(400).json({ error: 'tutor_id deve ser um numero inteiro positivo.' });
  }

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const { nome, data_nascimento, especie, raca, cor, peso_kg, tutor_id } = req.body;

    const result = await pool.query(
      `UPDATE public.animal
       SET nome = $1, data_nascimento = $2, especie = $3, raca = $4, cor = $5, peso_kg = $6, tutor_id = $7
       WHERE id = $8
       RETURNING *`,
      [nome, data_nascimento ?? null, especie, raca ?? null, cor ?? null, peso_kg ?? null, tutor_id, req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Animal nao encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.patch('/animais/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  const providedFields = Object.keys(req.body);
  const validationError = validateFields(req.body);

  if (!providedFields.length) {
    return res.status(400).json({ error: 'Informe ao menos um campo para atualizar.' });
  }

  if (req.body.tutor_id && !validateId(req.body.tutor_id)) {
    return res.status(400).json({ error: 'tutor_id deve ser um numero inteiro positivo.' });
  }

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const assignments = providedFields.map((field, index) => `${field} = $${index + 1}`);
  const values = providedFields.map((field) => req.body[field]);
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE public.animal SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Animal nao encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.delete('/animais/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  try {
    const result = await pool.query('DELETE FROM public.animal WHERE id = $1 RETURNING id', [req.params.id]);

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Animal nao encontrado.' });
    }

    return res.status(200).json({ message: 'Animal excluido com sucesso.', id: result.rows[0].id });
  } catch (error) {
    return databaseError(res, error);
  }
});

module.exports = router;