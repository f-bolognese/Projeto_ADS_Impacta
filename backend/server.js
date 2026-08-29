require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.get('/ping', (req, res) => {
  res.json({ message: 'API funcionando!' });
});

app.get('/dbtest', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const tutorRoutes = require('./routes_tutor');
app.use(tutorRoutes);
app.use(require('./routes_veterinaria'));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'O corpo da requisicao deve ser um JSON valido.' });
  }

  next(err);
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API rodando na porta ${port}. Teste: http://localhost:${port}/ping`));