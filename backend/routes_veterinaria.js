const express = require('express');
const pool = require('./db');

const router = express.Router();

function requiredFields(body, fields) {
  return fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
}

function sendDatabaseError(res, error) {
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

  return res.status(500).json({ error: error.message });
}

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

router.post('/procedimentos', async (req, res) => {
  const missing = requiredFields(req.body, ['nome', 'valor']);
  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  try {
    const { nome, categoria, valor } = req.body;
    const result = await pool.query(
      `INSERT INTO public.procedimento (nome, categoria, valor)
       VALUES ($1, $2, $3) RETURNING *`,
      [nome, categoria || null, valor]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.get('/procedimentos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.procedimento ORDER BY id');
    return res.json(result.rows);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.post('/atendimentos', async (req, res) => {
  const missing = requiredFields(req.body, ['animal_id', 'veterinario_id', 'data', 'hora']);
  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  try {
    const { animal_id, veterinario_id, data, hora } = req.body;
    const result = await pool.query(
      `INSERT INTO public.atendimento (animal_id, veterinario_id, data, hora)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [animal_id, veterinario_id, data, hora]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.get('/atendimentos', async (req, res) => {
  const data = req.query.data;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) {
    return res.status(400).json({ error: 'Informe a data no formato YYYY-MM-DD.' });
  }

  try {
    const result = await pool.query(
      `SELECT a.id AS atendimento_id,
              a.data,
              a.hora,
              an.id AS animal_id,
              an.nome AS animal_nome,
              t.id AS tutor_id,
              t.nome AS tutor_nome,
              v.id AS veterinario_id,
              v.nome AS veterinario_nome,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', p.id,
                    'nome', p.nome,
                    'valor', p.valor
                  ) ORDER BY p.id
                ) FILTER (WHERE p.id IS NOT NULL),
                '[]'::json
              ) AS procedimentos,
              COALESCE(SUM(p.valor), 0) AS total
       FROM public.atendimento a
       JOIN public.animal an ON an.id = a.animal_id
       JOIN public.tutor t ON t.id = an.tutor_id
       JOIN public.veterinario v ON v.id = a.veterinario_id
       LEFT JOIN public.atendimento_procedimento ap ON ap.atendimento_id = a.id
       LEFT JOIN public.procedimento p ON p.id = ap.procedimento_id
       WHERE a.data = $1
       GROUP BY a.id, a.data, a.hora, an.id, an.nome, t.id, t.nome, v.id, v.nome
       ORDER BY a.hora, a.id`,
      [data]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.post('/atendimento-procedimentos', async (req, res) => {
  const missing = requiredFields(req.body, ['atendimento_id', 'procedimento_id']);
  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatorios: ${missing.join(', ')}.` });
  }

  try {
    const { atendimento_id, procedimento_id } = req.body;
    const result = await pool.query(
      `INSERT INTO public.atendimento_procedimento (atendimento_id, procedimento_id)
       VALUES ($1, $2) RETURNING *`,
      [atendimento_id, procedimento_id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.get('/atendimento-procedimentos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.atendimento_procedimento ORDER BY id');
    return res.json(result.rows);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

module.exports = router;
