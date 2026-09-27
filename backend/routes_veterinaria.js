const express = require('express');
const pool = require('./db');

const router = express.Router();

function requiredFields(body, fields) {
  return fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
}

function validId(value) {
  const id = Number(value);
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(id) && id > 0;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isMedicationCategory(category) {
  return normalizeText(category) === 'aplicacao de medicacao';
}

function validateService(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'O corpo da requisicao deve ser um objeto JSON.';
  }

  if (typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length > 150) {
    return 'O nome do servico deve ter entre 1 e 150 caracteres.';
  }

  const missingValue = body.valor === undefined || body.valor === null || body.valor === '';
  if (missingValue) {
    return isMedicationCategory(body.categoria) ? null : 'O valor do servico e obrigatorio.';
  }

  if (body.categoria != null && (typeof body.categoria !== 'string' || body.categoria.length > 50)) {
    return 'A categoria deve ter no maximo 50 caracteres.';
  }

  const valor = Number(body.valor);
  if (!Number.isFinite(valor) || valor < 0 || valor > 99999999.99) {
    return 'O valor deve ser um numero entre 0 e 99999999.99.';
  }

  return null;
}

function sendDatabaseError(res, error) {
  console.error('Erro no banco de dados:', error.code || 'sem codigo', error.message);

  if (error.code === '23503') {
    return res.status(400).json({ error: 'Um dos IDs relacionados nao existe.' });
  }

  if (error.code === '23505') {
    return res.status(409).json({ error: 'Ja existe um registro com esses dados.' });
  }

  if (error.code === '42501') {
    return res.status(503).json({ error: 'O usuario do banco nao possui permissao para esta tabela.' });
  }

  if (error.code === '42703' || error.code === '42P01') {
    return res.status(503).json({ error: 'O schema do banco esta desatualizado.' });
  }

  if (['08001', '08006', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', '28P01', '3D000'].includes(error.code)) {
    return res.status(503).json({ error: 'Nao foi possivel conectar ao banco configurado para a API.' });
  }

  return res.status(500).json({ error: 'Falha ao executar a operacao no banco de dados.' });
}

/* ---------------------- ANIMAIS ---------------------- */

router.post('/animais', async (req, res) => {
  const missing = requiredFields(req.body, ['nome', 'tutor_id']);
  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  try {
    const { nome, data_nascimento, raca, cor, peso_kg, tutor_id } = req.body;
    const result = await pool.query(
      `INSERT INTO public.animal (nome, data_nascimento, raca, cor, peso_kg, tutor_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nome, data_nascimento || null, raca || null, cor || null, peso_kg ?? null, tutor_id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.get('/animais', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.animal ORDER BY id');
    return res.json(result.rows);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

/* ---------------------- VETERINÁRIOS ---------------------- */

router.post('/veterinarios', async (req, res) => {
  const missing = requiredFields(req.body, ['nome', 'crmv', 'especialidade']);
  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  try {
    const { nome, especialidade, crmv } = req.body;
    const result = await pool.query(
      `INSERT INTO public.veterinario (nome, especialidade, crmv)
       VALUES ($1, $2, $3) RETURNING *`,
      [nome, especialidade, crmv]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.get('/veterinarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.veterinario ORDER BY id');
    return res.json(result.rows);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

/* ✔ ADICIONADO: GET /veterinarios/:id */
router.get('/veterinarios/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!id || id <= 0) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM public.veterinario WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Veterinário não encontrado.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

/* ✔ ADICIONADO: PUT /veterinarios/:id */
router.put('/veterinarios/:id', async (req, res) => {
  const id = Number(req.params.id);

  const missing = requiredFields(req.body, ['nome', 'crmv', 'especialidade']);
  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  try {
    const { nome, crmv, especialidade } = req.body;

    const result = await pool.query(
      `UPDATE public.veterinario
       SET nome = $1, crmv = $2, especialidade = $3
       WHERE id = $4
       RETURNING *`,
      [nome, crmv, especialidade, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Veterinário não encontrado.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

/* ✔ ADICIONADO: DELETE /veterinarios/:id */
router.delete('/veterinarios/:id', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const result = await pool.query(
      'DELETE FROM public.veterinario WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Veterinário não encontrado.' });
    }

    return res.json({ message: 'Veterinário excluído com sucesso.' });
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

/* ---------------------- SERVICOS ---------------------- */

router.post('/servicos', async (req, res) => {
  const validationError = validateService(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const { nome, categoria, valor } = req.body;
    const result = await pool.query(
      `INSERT INTO public.servico (nome, categoria, valor)
       VALUES ($1, $2, $3) RETURNING *`,
      [nome.trim(), categoria || null, valor === undefined || valor === null || valor === '' ? null : Number(valor)]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.get('/servicos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.servico ORDER BY id');
    return res.status(200).json(result.rows);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.get('/servicos/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  try {
    const result = await pool.query('SELECT * FROM public.servico WHERE id = $1', [req.params.id]);
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Servico nao encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.put('/servicos/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  const validationError = validateService(req.body);
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
      [nome.trim(), categoria || null, valor === undefined || valor === null || valor === '' ? null : Number(valor), req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Servico nao encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.delete('/servicos/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  try {
    const result = await pool.query('DELETE FROM public.servico WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Servico nao encontrado.' });
    }

    return res.status(200).json({ message: 'Servico excluido com sucesso.', id: result.rows[0].id });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({ error: 'O servico esta vinculado a atendimentos e nao pode ser excluido.' });
    }
    return sendDatabaseError(res, error);
  }
});

module.exports = router;