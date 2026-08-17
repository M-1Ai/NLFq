const pool = require('../db/pool');

async function getSettings() {
  const { rows } = await pool.query('SELECT * FROM settings WHERE id = 1');
  if (rows.length) return rows[0];

  // شبكة أمان في حال ما اشتغل seed عند الإقلاع لأي سبب
  const ins = await pool.query(
    `INSERT INTO settings (id, applications_open, allow_multiple_applications, closed_message)
     VALUES (1, true, false, 'التقديم غير متاح حالياً')
     ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
     RETURNING *`
  );
  return ins.rows[0];
}

module.exports = { getSettings };
