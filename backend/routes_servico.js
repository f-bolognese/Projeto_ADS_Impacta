const express = require('express');
const pool = require('./db');

const router = express.Router();

// Campos permitidos
const fields = ['nome', 'categoria', 'valor'];
const textLimits = { nome: 100, categoria: 50 };

// Função para validar ID
function validateId(value) {
  return /^\d+$/.test(value) && Number(value) > 0;
}

// Verifica campos obrigatórios
function missingFields(body, required) {
  return required.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
}

// Valida campos desconhecidos e limites de texto
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

// Tratamento padronizado de erros SQL
function databaseError(res, error) {
  if (error.code === '23503') {
    return res.status(409).json({ error: 'O servico possui registros relacionados e nao pode ser excluido.' });
  }

  if (error.code === '23505') {
    return res.status(409).json({ error: 'Ja existe um servico com esse nome.' });
  }

  if (error.code === '42501') {
    return res.status(503).json({ error: 'O usuario do banco nao possui permissao para esta tabela.' });
  }

  if (error.code === '42703' || error.code === '42P01') {
    return res.status(503).json({ error: 'O schema do banco esta desatualizado.' });
  }

  return res.status(500).json({ error: error.message });
}

// =========================
// CADASTRAR SERVIÇO
// =========================
router.post('/servicos', async (req, res) => {
  const missing = missingFields(req.body, ['nome', 'categoria']);
  const validationError = validateFields(req.body);

  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const { nome, categoria, valor } = req.body;

    const result = await pool.query(
      `INSERT INTO public.servico (nome, categoria, valor)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nome, categoria, valor ?? null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

// =========================
// LISTAR SERVIÇOS
// =========================
router.get('/servicos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.servico ORDER BY id');
    return res.status(200).json(result.rows);
  } catch (error) {
    return databaseError(res, error);
  }
});

// =========================
// DETALHES DE UM SERVIÇO
// =========================
router.get('/servicos/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM public.servico WHERE id = $1`,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Servico nao encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

// =========================
// EDITAR SERVIÇO (PUT)
// =========================
router.put('/servicos/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  const missing = missingFields(req.body, ['nome', 'categoria']);
  const validationError = validateFields(req.body);

  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const { nome, categoria, valor } = req.body;

    const result = await pool.query(
      `UPDATE public.servico
       SET nome = $1, categoria = $2, valor = $3
       WHERE id = $4
       RETURNING *`,
      [nome, categoria, valor ?? null, req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Servico nao encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

// =========================
// ATUALIZAÇÃO PARCIAL (PATCH)
// =========================
router.patch('/servicos/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  const providedFields = Object.keys(req.body);
  const validationError = validateFields(req.body);

  if (!providedFields.length) {
    return res.status(400).json({ error: 'Informe ao menos um campo para atualizar.' });
  }

  const requiredPatchFields = missingFields(req.body, ['nome', 'categoria']);
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
      `UPDATE public.servico SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Servico nao encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return databaseError(res, error);
  }
});

// =========================
// EXCLUIR SERVIÇO
// =========================
router.delete('/servicos/:id', async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM public.servico WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Servico nao encontrado.' });
    }

    return res.status(200).json({ message: 'Servico excluido com sucesso.', id: result.rows[0].id });
  } catch (error) {
    return databaseError(res, error);
  }
});

module.exports = router;