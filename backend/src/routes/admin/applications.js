const router = require('express').Router();
const pool = require('../../db/pool');
const ApiError = require('../../lib/ApiError');
const asyncHandler = require('../../lib/asyncHandler');
const { APPLICATION_STATUSES } = require('../../lib/validate');

// GET /api/admin/applications?limit=50&offset=0
router.get(
  '/applications',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const totalRes = await pool.query('SELECT COUNT(*)::int AS count FROM applications');
    const { rows } = await pool.query(
      `SELECT a.id, a.application_number, a.status, a.submitted_at,
              u.discord_id, u.discord_username, u.discord_global_name, u.discord_avatar_hash AS discord_avatar
       FROM applications a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.submitted_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ total: totalRes.rows[0].count, applications: rows });
  })
);

// GET /api/admin/applications/:id
router.get(
  '/applications/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const appRes = await pool.query(
      `SELECT a.*, u.discord_id, u.discord_username, u.discord_global_name, u.discord_avatar_hash AS discord_avatar
       FROM applications a
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [id]
    );
    if (!appRes.rows.length) throw new ApiError(404, 'الطلب غير موجود.');

    const answersRes = await pool.query(
      'SELECT * FROM application_answers WHERE application_id = $1 ORDER BY sort_order ASC',
      [id]
    );
    const notesRes = await pool.query(
      'SELECT * FROM application_notes WHERE application_id = $1 ORDER BY created_at ASC',
      [id]
    );

    res.json({ application: appRes.rows[0], answers: answersRes.rows, notes: notesRes.rows });
  })
);

// PATCH /api/admin/applications/:id/status
router.patch(
  '/applications/:id/status',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!APPLICATION_STATUSES.includes(status)) throw new ApiError(400, 'حالة غير صالحة.');

    const { rows } = await pool.query(
      'UPDATE applications SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (!rows.length) throw new ApiError(404, 'الطلب غير موجود.');
    res.json({ application: rows[0] });
  })
);

// POST /api/admin/applications/:id/notes
router.post(
  '/applications/:id/notes',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const note = String((req.body && req.body.note) || '').trim();
    if (!note) throw new ApiError(400, 'اكتب نص الملاحظة.');

    const appCheck = await pool.query('SELECT id FROM applications WHERE id = $1', [id]);
    if (!appCheck.rows.length) throw new ApiError(404, 'الطلب غير موجود.');

    const adminName = req.user.discord_global_name || req.user.discord_username;
    const { rows } = await pool.query(
      `INSERT INTO application_notes (application_id, admin_id, admin_username, note)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, req.user.id, adminName, note]
    );
    res.status(201).json({ note: rows[0] });
  })
);

module.exports = router;
