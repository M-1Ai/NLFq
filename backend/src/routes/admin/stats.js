const router = require('express').Router();
const pool = require('../../db/pool');
const asyncHandler = require('../../lib/asyncHandler');

// GET /api/admin/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW')::int AS under_review,
        COUNT(*) FILTER (WHERE status = 'ACCEPTED')::int AS accepted,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected
      FROM applications
    `);
    res.json(rows[0]);
  })
);

module.exports = router;
