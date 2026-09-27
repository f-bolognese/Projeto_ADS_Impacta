const express = require('express');
const pool = require('./db');

const router = express.Router();
const attendanceFields = ['animal_id', 'veterinario_id', 'data', 'hora', 'observacoes', 'valor_total'];
const serviceFields = ['servico_id', 'valor'];

function validId(value) {
  return /^\d+$/.test(String(value ?? '')) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function missingFields(body, fields) {
  return fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
}

function validateObject(body, fields) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'O corpo da requisicao deve ser um objeto JSON.';
  }

  const unknown = Object.keys(body).filter((field) => !fields.includes(field));
  if (unknown.length) {
    return `Campos nao permitidos: ${unknown.join(', ')}.`;
  }

  return null;
}

function validateMoney(value, label) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return { error: `O campo ${label} deve ser um numero valido.` };
  }

  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    return { error: `O campo ${label} deve ser um numero com ate duas casas decimais.` };
  }

  const amount = Number(text);
  if (!Number.isFinite(amount) || amount > 99999999.99) {
    return { error: `O campo ${label} deve estar entre 0 e 99999999.99.` };
  }

  return { value: amount };
}

function validateAttendance(body) {
  const objectError = validateObject(body, attendanceFields);
  if (objectError) return objectError;

  const missing = missingFields(body, ['animal_id', 'veterinario_id', 'data', 'valor_total']);
  if (missing.length) {
    return `Campos obrigatorios: ${missing.join(', ')}.`;
  }

  if (!validId(body.animal_id) || !validId(body.veterinario_id)) {
    return 'animal_id e veterinario_id devem ser numeros inteiros positivos.';
  }

  if (typeof body.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.data)) {
    return 'Informe a data no formato YYYY-MM-DD.';
  }

  const parsedDate = new Date(`${body.data}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== body.data) {
    return 'Informe uma data valida no formato YYYY-MM-DD.';
  }

  if (body.hora != null && body.hora !== '' && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(String(body.hora))) {
    return 'Informe a hora no formato HH:MM ou HH:MM:SS.';
  }

  if (body.observacoes != null && typeof body.observacoes !== 'string') {
    return 'O campo observacoes deve ser um texto.';
  }

  const total = validateMoney(body.valor_total, 'valor_total');
  return total.error || null;
}

function validateServicePayload(body) {
  const objectError = validateObject(body, serviceFields);
  if (objectError) return objectError;

  const missing = missingFields(body, ['servico_id']);
  if (missing.length) {
    return `Campos obrigatorios: ${missing.join(', ')}.`;
  }

  if (!validId(body.servico_id)) {
    return 'servico_id deve ser um numero inteiro positivo.';
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'valor')) {
    return 'Campos obrigatorios: valor.';
  }

  if (body.valor !== null) {
    const value = validateMoney(body.valor, 'valor');
    if (value.error) return value.error;
  }

  return null;
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

function medicationPrice(species, weight) {
  const normalizedSpecies = normalizeText(species);
  if (normalizedSpecies === 'gato') {
    return { value: 35, weight: null };
  }

  if (normalizedSpecies !== 'cao') {
    return { error: 'A aplicacao de medicacao esta disponivel apenas para caes e gatos.' };
  }

  if (weight === null || weight === undefined || weight === '' || !Number.isFinite(Number(weight)) || Number(weight) <= 0) {
    return { error: 'Cadastre um peso valido para o cao antes de adicionar a aplicacao de medicacao.' };
  }

  const numericWeight = Number(weight);
  if (numericWeight <= 10) return { value: 35, weight: numericWeight };
  if (numericWeight <= 20) return { value: 45, weight: numericWeight };
  if (numericWeight <= 35) return { value: 55, weight: numericWeight };
  return { value: 65, weight: numericWeight };
}

function databaseError(res, error) {
  if (error.code === '23503') {
    return res.status(409).json({ error: 'Um dos IDs relacionados nao existe.' });
  }

  if (error.code === '23505') {
    return res.status(409).json({ error: 'O servico ja esta vinculado a este atendimento.' });
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

  return res.status(500).json({ error: error.message });
}

function sendError(res, error) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }

  return databaseError(res, error);
}

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function transaction(work) {
  const client = await pool.connect();
  let started = false;

  try {
    await client.query('BEGIN');
    started = true;
    const result = await work(client);
    await client.query('COMMIT');
    started = false;
    return result;
  } catch (error) {
    if (started) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

function attendanceSelect() {
  return `SELECT a.id,
                 a.animal_id,
                 a.veterinario_id,
                 a.data,
                 a.hora,
                 a.observacoes,
                 a.valor_total,
                 an.nome AS animal_nome,
                 an.especie AS animal_especie,
                 an.peso_kg AS animal_peso_kg,
                 t.id AS tutor_id,
                 t.nome AS tutor_nome,
                 v.nome AS veterinario_nome,
                 COALESCE(
                   (
                     SELECT json_agg(
                       json_build_object(
                         'id', s.id,
                         'servico_id', s.id,
                         'nome', s.nome,
                         'categoria', s.categoria,
                         'valor', aps.valor
                       ) ORDER BY s.id
                     )
                     FROM public.atendimento_servico aps
                     JOIN public.servico s ON s.id = aps.servico_id
                     WHERE aps.atendimento_id = a.id
                   ),
                   '[]'::json
                 ) AS servicos
          FROM public.atendimento a
          LEFT JOIN public.animal an ON an.id = a.animal_id
          LEFT JOIN public.tutor t ON t.id = an.tutor_id
          LEFT JOIN public.veterinario v ON v.id = a.veterinario_id`;
}

function formatAttendance(row) {
  if (!row) return null;

  const weight = row.animal_peso_kg == null ? null : Number(row.animal_peso_kg);
  const rawServices = typeof row.servicos === 'string' ? JSON.parse(row.servicos) : row.servicos;
  const services = (rawServices || []).map((service) => {
    const medication = isMedicationCategory(service.categoria);
    return {
      ...service,
      id: Number(service.id),
      servico_id: Number(service.servico_id ?? service.id),
      valor: Number(service.valor),
      peso_kg_calculo: medication && normalizeText(row.animal_especie) === 'cao' ? weight : null
    };
  });
  const medicationService = services.find((service) => isMedicationCategory(service.categoria));
  const total = Number(row.valor_total);

  return {
    id: Number(row.id),
    atendimento_id: Number(row.id),
    animal_id: row.animal_id == null ? null : Number(row.animal_id),
    animal_nome: row.animal_nome || null,
    animal_especie: row.animal_especie || null,
    animal_peso_kg: weight,
    peso_kg: weight,
    peso_kg_calculo: medicationService ? medicationService.peso_kg_calculo : null,
    tutor_id: row.tutor_id == null ? null : Number(row.tutor_id),
    tutor_nome: row.tutor_nome || null,
    veterinario_id: row.veterinario_id == null ? null : Number(row.veterinario_id),
    veterinario_nome: row.veterinario_nome || null,
    data: row.data,
    hora: row.hora,
    observacoes: row.observacoes,
    servicos: services,
    valor_total: total,
    total
  };
}

async function loadAttendance(queryable, id) {
  const result = await queryable.query(`${attendanceSelect()} WHERE a.id = $1`, [id]);
  return result.rowCount ? formatAttendance(result.rows[0]) : null;
}

async function loadAnimal(queryable, animalId) {
  const result = await queryable.query(
    'SELECT id, especie, peso_kg FROM public.animal WHERE id = $1',
    [animalId]
  );
  return result.rowCount ? result.rows[0] : null;
}

async function loadService(queryable, serviceId) {
  const result = await queryable.query(
    'SELECT id, nome, categoria, valor FROM public.servico WHERE id = $1',
    [serviceId]
  );
  return result.rowCount ? result.rows[0] : null;
}

async function resolveServiceValue(queryable, service, animal, payloadValue) {
  if (isMedicationCategory(service.categoria)) {
    const price = medicationPrice(animal?.especie, animal?.peso_kg);
    if (price.error) throw requestError(400, price.error);
    return { value: price.value, weight: price.weight };
  }

  if (payloadValue === null || payloadValue === undefined || payloadValue === '') {
    throw requestError(400, 'O valor e obrigatorio para este servico.');
  }

  const catalogValue = service.valor == null ? null : Number(service.valor);
  if (catalogValue === null || !Number.isFinite(catalogValue)) {
    throw requestError(400, 'O servico precisa ter um valor cadastrado.');
  }

  return { value: catalogValue, weight: null };
}

async function recalculateTotal(queryable, attendanceId) {
  const result = await queryable.query(
    `UPDATE public.atendimento a
     SET valor_total = totals.valor_total
     FROM (
       SELECT COALESCE(SUM(valor), 0)::NUMERIC(10,2) AS valor_total
       FROM public.atendimento_servico
       WHERE atendimento_id = $1
     ) totals
     WHERE a.id = $1
     RETURNING a.valor_total`,
    [attendanceId]
  );

  if (!result.rowCount) {
    throw requestError(404, 'Atendimento nao encontrado.');
  }

  return Number(result.rows[0].valor_total);
}

async function lockAttendance(queryable, attendanceId) {
  const result = await queryable.query(
    `SELECT a.id, an.especie, an.peso_kg
     FROM public.atendimento a
     LEFT JOIN public.animal an ON an.id = a.animal_id
     WHERE a.id = $1
     FOR UPDATE OF a`,
    [attendanceId]
  );
  return result.rowCount ? result.rows[0] : null;
}

async function repriceMedicationServices(queryable, attendanceId, animal) {
  const result = await queryable.query(
    `SELECT aps.id, s.categoria
     FROM public.atendimento_servico aps
     JOIN public.servico s ON s.id = aps.servico_id
     WHERE aps.atendimento_id = $1`,
    [attendanceId]
  );

  for (const service of result.rows) {
    if (!isMedicationCategory(service.categoria)) continue;
    const price = medicationPrice(animal?.especie, animal?.peso_kg);
    if (price.error) throw requestError(400, price.error);
    await queryable.query(
      'UPDATE public.atendimento_servico SET valor = $1 WHERE id = $2',
      [price.value, service.id]
    );
  }
}

router.post('/atendimentos', async (req, res) => {
  const body = req.body || {};
  const validationError = validateAttendance(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const attendance = await transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO public.atendimento (animal_id, veterinario_id, data, hora, observacoes, valor_total)
         VALUES ($1, $2, $3, $4, $5, 0)
         RETURNING id`,
        [body.animal_id, body.veterinario_id, body.data, body.hora || null, body.observacoes || null]
      );
      return loadAttendance(client, result.rows[0].id);
    });
    return res.status(201).json(attendance);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/atendimentos', async (req, res) => {
  const data = req.query.data;
  const veterinarianId = req.query.veterinario_id;
  if (data && (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data))) {
    return res.status(400).json({ error: 'Informe a data no formato YYYY-MM-DD.' });
  }

  if (veterinarianId && !validId(veterinarianId)) {
    return res.status(400).json({ error: 'veterinario_id deve ser um numero inteiro positivo.' });
  }

  if (data) {
    const parsedDate = new Date(`${data}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== data) {
      return res.status(400).json({ error: 'Informe uma data valida no formato YYYY-MM-DD.' });
    }
  }

  try {
    const result = await pool.query(
      `${attendanceSelect()}
       WHERE ($1::DATE IS NULL OR a.data = $1::DATE)
        AND ($2::INTEGER IS NULL OR a.veterinario_id = $2::INTEGER)
       ORDER BY a.data DESC, a.hora NULLS LAST, a.id DESC`,
      [data || null, veterinarianId || null]
    );
    return res.status(200).json(result.rows.map(formatAttendance));
  } catch (error) {
    return databaseError(res, error);
  }
});

router.get('/atendimentos/:id/servicos', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  try {
    const attendance = await loadAttendance(pool, req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: 'Atendimento nao encontrado.' });
    }
    return res.status(200).json(attendance.servicos);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.get('/atendimentos/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  try {
    const attendance = await loadAttendance(pool, req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: 'Atendimento nao encontrado.' });
    }
    return res.status(200).json(attendance);
  } catch (error) {
    return databaseError(res, error);
  }
});

router.put('/atendimentos/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  const body = req.body || {};
  const validationError = validateAttendance(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const attendance = await transaction(async (client) => {
      const current = await lockAttendance(client, req.params.id);
      if (!current) throw requestError(404, 'Atendimento nao encontrado.');

      await client.query(
        `UPDATE public.atendimento
         SET animal_id = $1, veterinario_id = $2, data = $3, hora = $4, observacoes = $5
         WHERE id = $6`,
        [body.animal_id, body.veterinario_id, body.data, body.hora || null, body.observacoes || null, req.params.id]
      );

      const animal = await loadAnimal(client, body.animal_id);
      await repriceMedicationServices(client, req.params.id, animal);
      await recalculateTotal(client, req.params.id);
      return loadAttendance(client, req.params.id);
    });
    return res.status(200).json(attendance);
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete('/atendimentos/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM public.atendimento WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Atendimento nao encontrado.' });
    }
    return res.status(200).json({ message: 'Atendimento excluido com sucesso.', id: Number(result.rows[0].id) });
  } catch (error) {
    return databaseError(res, error);
  }
});

router.post('/atendimentos/:id/servicos', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: 'O ID deve ser um numero inteiro positivo.' });
  }

  const body = req.body || {};
  const validationError = validateServicePayload(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const attendance = await transaction(async (client) => {
      const visit = await lockAttendance(client, req.params.id);
      if (!visit) throw requestError(404, 'Atendimento nao encontrado.');

      const existing = await client.query(
        `SELECT id
         FROM public.atendimento_servico
         WHERE atendimento_id = $1 AND servico_id = $2`,
        [req.params.id, body.servico_id]
      );
      if (existing.rowCount) {
        throw requestError(409, 'Este servico ja esta vinculado ao atendimento.');
      }

      const service = await loadService(client, body.servico_id);
      if (!service) throw requestError(404, 'Servico nao encontrado.');
      const animal = { especie: visit.especie, peso_kg: visit.peso_kg };
      const price = await resolveServiceValue(client, service, animal, body.valor);

      const result = await client.query(
        `INSERT INTO public.atendimento_servico (atendimento_id, servico_id, valor)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [req.params.id, body.servico_id, price.value]
      );
      await recalculateTotal(client, req.params.id);
      return loadAttendance(client, req.params.id).then((loaded) => ({
        ...loaded,
        servico_adicionado_id: Number(result.rows[0].id),
        peso_kg_calculo: price.weight
      }));
    });
    return res.status(201).json(attendance);
  } catch (error) {
    return sendError(res, error);
  }
});

router.put('/atendimentos/:id/servicos/:servicoId', async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.servicoId)) {
    return res.status(400).json({ error: 'Os IDs devem ser numeros inteiros positivos.' });
  }

  const body = req.body || {};
  const validationError = validateServicePayload(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const attendance = await transaction(async (client) => {
      const visit = await lockAttendance(client, req.params.id);
      if (!visit) throw requestError(404, 'Atendimento nao encontrado.');

      const current = await client.query(
        `SELECT id
         FROM public.atendimento_servico
         WHERE atendimento_id = $1 AND servico_id = $2
         FOR UPDATE`,
        [req.params.id, req.params.servicoId]
      );
      if (!current.rowCount) throw requestError(404, 'Servico nao encontrado neste atendimento.');

      const duplicate = await client.query(
        `SELECT id
         FROM public.atendimento_servico
         WHERE atendimento_id = $1 AND servico_id = $2 AND id <> $3`,
        [req.params.id, body.servico_id, current.rows[0].id]
      );
      if (duplicate.rowCount) {
        throw requestError(409, 'Este servico ja esta vinculado ao atendimento.');
      }

      const service = await loadService(client, body.servico_id);
      if (!service) throw requestError(404, 'Servico nao encontrado.');
      const animal = { especie: visit.especie, peso_kg: visit.peso_kg };
      const price = await resolveServiceValue(client, service, animal, body.valor);

      await client.query(
        `UPDATE public.atendimento_servico
         SET servico_id = $1, valor = $2
         WHERE id = $3`,
        [body.servico_id, price.value, current.rows[0].id]
      );
      await recalculateTotal(client, req.params.id);
      const loaded = await loadAttendance(client, req.params.id);
      return { ...loaded, peso_kg_calculo: price.weight };
    });
    return res.status(200).json(attendance);
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete('/atendimentos/:id/servicos/:servicoId', async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.servicoId)) {
    return res.status(400).json({ error: 'Os IDs devem ser numeros inteiros positivos.' });
  }

  try {
    const attendance = await transaction(async (client) => {
      const visit = await lockAttendance(client, req.params.id);
      if (!visit) throw requestError(404, 'Atendimento nao encontrado.');

      const result = await client.query(
        `DELETE FROM public.atendimento_servico
         WHERE id = (
           SELECT id
           FROM public.atendimento_servico
           WHERE atendimento_id = $1 AND servico_id = $2
           ORDER BY id
           LIMIT 1
         )
         RETURNING id`,
        [req.params.id, req.params.servicoId]
      );
      if (!result.rowCount) throw requestError(404, 'Servico nao encontrado neste atendimento.');

      await recalculateTotal(client, req.params.id);
      return loadAttendance(client, req.params.id);
    });
    return res.status(200).json(attendance);
  } catch (error) {
    return sendError(res, error);
  }
});

module.exports = router;