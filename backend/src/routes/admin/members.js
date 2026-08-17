const router = require('express').Router();
const pool = require('../../db/pool');
const ApiError = require('../../lib/ApiError');
const asyncHandler = require('../../lib/asyncHandler');

// GET /api/admin/members (كل الأعضاء، حتى المخفيين)
router.get(
  '/members',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM members ORDER BY sort_order ASC, id ASC');
    res.json({ members: rows });
  })
);

// POST /api/admin/members
router.post(
  '/members',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const role = String(body.role || '').trim();
    if (!name || !role) throw new ApiError(400, 'اسم الإداري والمسمى مطلوبان.');

    const image_url = String(body.image_url || '').trim() || null;
    const enabled = body.enabled !== undefined ? !!body.enabled : true;

    const maxRes = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM members');
    const { rows } = await pool.query(
      'INSERT INTO members (name, role, image_url, enabled, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, role, image_url, enabled, maxRes.rows[0].next]
    );
    res.status(201).json({ member: rows[0] });
  })
);

// PATCH /api/admin/members/:id
router.patch(
  '/members/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
    if (!existing.rows.length) throw new ApiError(404, 'الإداري غير موجود.');
    const cur = existing.rows[0];
    const body = req.body || {};

    const name = body.name !== undefined ? String(body.name).trim() : cur.name;
    const role = body.role !== undefined ? String(body.role).trim() : cur.role;
    if (!name || !role) throw new ApiError(400, 'اسم الإداري والمسمى مطلوبان.');

    const image_url = body.image_url !== undefined ? String(body.image_url).trim() || null : cur.image_url;
    const enabled = body.enabled !== undefined ? !!body.enabled : cur.enabled;

    const { rows } = await pool.query(
      'UPDATE members SET name = $1, role = $2, image_url = $3, enabled = $4, updated_at = now() WHERE id = $5 RETURNING *',
      [name, role, image_url, enabled, id]
    );
    res.json({ member: rows[0] });
  })
);

// DELETE /api/admin/members/:id
router.delete(
  '/members/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { rowCount } = await pool.query('DELETE FROM members WHERE id = $1', [id]);
    if (!rowCount) throw new ApiError(404, 'الإداري غير موجود.');
    res.json({ ok: true });
  })
);

module.exports = router;
