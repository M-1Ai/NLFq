require('dotenv').config();
const { Pool } = require('pg');

const useSSL = process.env.PGSSL !== 'disable';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  // اتصال خامل فقد الاتصال بقاعدة البيانات - لا نكرش السيرفر بسببه
  console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = pool;
