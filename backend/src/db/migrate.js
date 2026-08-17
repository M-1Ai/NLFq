const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  await seedDefaults();
}

async function seedDefaults() {
  await pool.query(`
    INSERT INTO settings (id, applications_open, allow_multiple_applications, closed_message)
    VALUES (1, true, false, 'التقديم غير متاح حالياً')
    ON CONFLICT (id) DO NOTHING
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM pages');
  if (rows[0].count === 0) {
    const pageRes = await pool.query(
      `INSERT INTO pages (title, description, sort_order) VALUES ($1, $2, 1) RETURNING id`,
      ['معلومات أساسية', 'تعرّف علينا أكثر قبل قبولك في المجتمع.']
    );
    await pool.query(
      `INSERT INTO questions (page_id, question, type, required, placeholder, sort_order)
       VALUES ($1, $2, 'LONG_TEXT', true, $3, 1)`,
      [pageRes.rows[0].id, 'لماذا تريد الانضمام إلى Westone؟', 'اكتب إجابتك هنا...']
    );
    console.log('Seeded a starter application page/question (editable from the admin Form Builder).');
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration complete.');
      process.exit(0);
    })
    .catch((e) => {
      console.error('Migration failed:', e);
      process.exit(1);
    });
}

module.exports = { runMigrations, seedDefaults };
