require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sqlPath = path.join(__dirname, '..', 'database_permissions.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function applyPermissions() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL nao foi configurada.');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Permissoes e ajustes do banco aplicados com sucesso.');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Nao foi possivel desfazer a transacao:', rollbackError.message);
    }

    if (error.code === '42501') {
      throw new Error('Permissao negada. Execute este comando conectado como postgres ou como proprietario das tabelas.');
    }

    throw error;
  } finally {
    await client.end();
  }
}

applyPermissions().catch((error) => {
  console.error('Falha ao aplicar permissoes:', error.message);
  process.exitCode = 1;
});