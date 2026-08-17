const router = require('express').Router();
const pool = require('../db/pool');
const asyncHandler = require('../lib/asyncHandler');

// GET /api/members - عام، يظهر فقط الأعضاء المفعّلين
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT id, name, role, image_url FROM members WHERE enabled = true ORDER BY sort_order ASC, id ASC'
    );
    res.json({ members: rows });
  })
);

module.exports = router;
