const router = require('express').Router();
const pool = require('../../db/pool');
const asyncHandler = require('../../lib/asyncHandler');
const { getSettings } = require('../../lib/settings');

// GET /api/admin/settings
router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    const settings = await getSettings();
    res.json({ settings });
  })
);

// PATCH /api/admin/settings
router.patch(
  '/settings',
  asyncHandler(async (req, res) => {
    const cur = await getSettings();
    const body = req.body || {};

    const applications_open = body.applications_open !== undefined ? !!body.applications_open : cur.applications_open;
    const allow_multiple_applications =
      body.allow_multiple_applications !== undefined ? !!body.allow_multiple_applications : cur.allow_multiple_applications;
    const closed_message =
      body.closed_message !== undefined ? String(body.closed_message).trim() : cur.closed_message;

    const { rows } = await pool.query(
      `UPDATE settings
       SET applications_open = $1, allow_multiple_applications = $2, closed_message = $3, updated_at = now()
       WHERE id = 1 RETURNING *`,
      [applications_open, allow_multiple_applications, closed_message]
    );
    res.json({ settings: rows[0] });
  })
);

module.exports = router;
