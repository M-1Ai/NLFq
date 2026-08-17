const router = require('express').Router();
const pool = require('../../db/pool');
const ApiError = require('../../lib/ApiError');
const asyncHandler = require('../../lib/asyncHandler');
const { QUESTION_TYPES, CHOICE_TYPES, normalizeOptions } = require('../../lib/validate');

// ============ Pages ============

// GET /api/admin/pages
router.get(
  '/pages',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`
      SELECT p.*, COUNT(q.id)::int AS question_count
      FROM pages p
      LEFT JOIN questions q ON q.page_id = p.id
      GROUP BY p.id
      ORDER BY p.sort_order ASC, p.id ASC
    `);
    res.json({ pages: rows });
  })
);

// POST /api/admin/pages
router.post(
  '/pages',
  asyncHandler(async (req, res) => {
    const title = String((req.body && req.body.title) || '').trim();
    const description = String((req.body && req.body.description) || '').trim() || null;
    if (!title) throw new ApiError(400, 'اسم الصفحة مطلوب.');

    const maxRes = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM pages');
    const { rows } = await pool.query(
      'INSERT INTO pages (title, description, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [title, description, maxRes.rows[0].next]
    );
    res.status(201).json({ page: { ...rows[0], question_count: 0 } });
  })
);

// PATCH /api/admin/pages/:id
router.patch(
  '/pages/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await pool.query('SELECT * FROM pages WHERE id = $1', [id]);
    if (!existing.rows.length) throw new ApiError(404, 'الصفحة غير موجودة.');
    const cur = existing.rows[0];

    const title = req.body && req.body.title !== undefined ? String(req.body.title).trim() : cur.title;
    const description =
      req.body && req.body.description !== undefined ? String(req.body.description).trim() || null : cur.description;
    if (!title) throw new ApiError(400, 'اسم الصفحة مطلوب.');

    const { rows } = await pool.query(
      'UPDATE pages SET title = $1, description = $2, updated_at = now() WHERE id = $3 RETURNING *',
      [title, description, id]
    );
    res.json({ page: rows[0] });
  })
);

// DELETE /api/admin/pages/:id (الإجابات التاريخية تبقى محفوظة بنسخة Snapshot)
router.delete(
  '/pages/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { rowCount } = await pool.query('DELETE FROM pages WHERE id = $1', [id]);
    if (!rowCount) throw new ApiError(404, 'الصفحة غير موجودة.');
    res.json({ ok: true });
  })
);

// POST /api/admin/pages/:id/duplicate
router.post(
  '/pages/:id/duplicate',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const pageRes = await client.query('SELECT * FROM pages WHERE id = $1', [id]);
      if (!pageRes.rows.length) throw new ApiError(404, 'الصفحة غير موجودة.');
      const src = pageRes.rows[0];

      const maxRes = await client.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM pages');
      const newPageRes = await client.query(
        'INSERT INTO pages (title, description, sort_order) VALUES ($1, $2, $3) RETURNING *',
        [`${src.title} (نسخة)`, src.description, maxRes.rows[0].next]
      );
      const newPage = newPageRes.rows[0];

      const qRes = await client.query('SELECT * FROM questions WHERE page_id = $1 ORDER BY sort_order ASC, id ASC', [
        id
      ]);
      for (const q of qRes.rows) {
        await client.query(
          `INSERT INTO questions (page_id, question, description, placeholder, type, required, options, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newPage.id, q.question, q.description, q.placeholder, q.type, q.required, JSON.stringify(q.options), q.sort_order]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ page: { ...newPage, question_count: qRes.rows.length } });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  })
);

// ============ Questions ============

// GET /api/admin/pages/:id/questions
router.get(
  '/pages/:id/questions',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { rows } = await pool.query('SELECT * FROM questions WHERE page_id = $1 ORDER BY sort_order ASC, id ASC', [
      id
    ]);
    res.json({ questions: rows });
  })
);

// POST /api/admin/pages/:id/questions
router.post(
  '/pages/:id/questions',
  asyncHandler(async (req, res) => {
    const pageId = Number(req.params.id);
    const pageCheck = await pool.query('SELECT id FROM pages WHERE id = $1', [pageId]);
    if (!pageCheck.rows.length) throw new ApiError(404, 'الصفحة غير موجودة.');

    const body = req.body || {};
    const question = String(body.question || '').trim();
    const type = body.type;
    if (!question) throw new ApiError(400, 'نص السؤال مطلوب.');
    if (!QUESTION_TYPES.includes(type)) throw new ApiError(400, 'نوع السؤال غير صالح.');

    const required = !!body.required;
    const description = String(body.description || '').trim() || null;
    const placeholder = String(body.placeholder || '').trim() || null;

    let options = null;
    if (CHOICE_TYPES.includes(type)) {
      options = normalizeOptions(body.options);
      if (!options.length) throw new ApiError(400, 'أضف خيارات لهذا السؤال.');
    }

    const maxRes = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM questions WHERE page_id = $1', [
      pageId
    ]);
    const { rows } = await pool.query(
      `INSERT INTO questions (page_id, question, description, placeholder, type, required, options, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [pageId, question, description, placeholder, type, required, JSON.stringify(options), maxRes.rows[0].next]
    );
    res.status(201).json({ question: rows[0] });
  })
);

// PATCH /api/admin/questions/:id
router.patch(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await pool.query('SELECT * FROM questions WHERE id = $1', [id]);
    if (!existing.rows.length) throw new ApiError(404, 'السؤال غير موجود.');
    const cur = existing.rows[0];
    const body = req.body || {};

    const question = body.question !== undefined ? String(body.question).trim() : cur.question;
    if (!question) throw new ApiError(400, 'نص السؤال مطلوب.');

    const type = body.type !== undefined ? body.type : cur.type;
    if (!QUESTION_TYPES.includes(type)) throw new ApiError(400, 'نوع السؤال غير صالح.');

    const required = body.required !== undefined ? !!body.required : cur.required;
    const description = body.description !== undefined ? String(body.description).trim() || null : cur.description;
    const placeholder = body.placeholder !== undefined ? String(body.placeholder).trim() || null : cur.placeholder;

    let options = cur.options;
    if (CHOICE_TYPES.includes(type)) {
      if (body.options !== undefined) {
        options = normalizeOptions(body.options);
        if (!options.length) throw new ApiError(400, 'أضف خيارات لهذا السؤال.');
      }
    } else {
      options = null;
    }

    const { rows } = await pool.query(
      `UPDATE questions
       SET question = $1, description = $2, placeholder = $3, type = $4, required = $5, options = $6, updated_at = now()
       WHERE id = $7 RETURNING *`,
      [question, description, placeholder, type, required, JSON.stringify(options), id]
    );
    res.json({ question: rows[0] });
  })
);

// DELETE /api/admin/questions/:id
router.delete(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { rowCount } = await pool.query('DELETE FROM questions WHERE id = $1', [id]);
    if (!rowCount) throw new ApiError(404, 'السؤال غير موجود.');
    res.json({ ok: true });
  })
);

module.exports = router;
