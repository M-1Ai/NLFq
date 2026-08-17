const router = require('express').Router();
const pool = require('../db/pool');
const ApiError = require('../lib/ApiError');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { submitLimiter } = require('../middleware/rateLimiters');
const { getSettings } = require('../lib/settings');
const { CHOICE_TYPES } = require('../lib/validate');

// التقديم يتطلب دايماً ربط Discord أولاً (مطابق لـ FAQ الفرونت اند)
router.use(requireAuth);

// GET /api/application/form
router.get(
  '/form',
  asyncHandler(async (req, res) => {
    const settings = await getSettings();
    if (!settings.applications_open) {
      return res.json({ open: false, message: settings.closed_message || 'التقديم غير متاح حالياً' });
    }

    const pagesRes = await pool.query('SELECT id, title, description FROM pages ORDER BY sort_order ASC, id ASC');
    const questionsRes = await pool.query('SELECT * FROM questions ORDER BY sort_order ASC, id ASC');

    const byPage = {};
    for (const q of questionsRes.rows) {
      (byPage[q.page_id] ||= []).push(q);
    }
    const pages = pagesRes.rows.map((p) => ({ ...p, questions: byPage[p.id] || [] }));

    res.json({ open: true, pages });
  })
);

// POST /api/application/submit
router.post(
  '/submit',
  submitLimiter,
  asyncHandler(async (req, res) => {
    const settings = await getSettings();
    if (!settings.applications_open) {
      throw new ApiError(403, settings.closed_message || 'التقديم مغلق حالياً');
    }

    if (!settings.allow_multiple_applications) {
      const { rows } = await pool.query(
        `SELECT id FROM applications WHERE user_id = $1 AND status IN ('PENDING','UNDER_REVIEW') LIMIT 1`,
        [req.user.id]
      );
      if (rows.length) {
        throw new ApiError(409, 'لديك طلب قيد المعالجة بالفعل، لا يمكنك إرسال طلب جديد حتى تتم مراجعته.');
      }
    }

    const pagesRes = await pool.query('SELECT id, title FROM pages ORDER BY sort_order ASC, id ASC');
    const questionsRes = await pool.query('SELECT * FROM questions ORDER BY sort_order ASC, id ASC');
    const byPage = {};
    for (const q of questionsRes.rows) {
      (byPage[q.page_id] ||= []).push(q);
    }

    const answers = (req.body && req.body.answers) || {};
    const answerRows = [];
    let order = 0;

    for (const page of pagesRes.rows) {
      for (const q of byPage[page.id] || []) {
        const raw = answers[q.id] ?? answers[String(q.id)];
        const hasValue = !(raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0));

        if (q.required && !hasValue) {
          throw new ApiError(400, `أكمل السؤال: ${q.question}`);
        }
        if (!hasValue) continue;

        if (CHOICE_TYPES.includes(q.type) && Array.isArray(q.options) && q.options.length) {
          const validValues = new Set(q.options.map((o) => o.value));
          const vals = Array.isArray(raw) ? raw : [raw];
          for (const v of vals) {
            if (!validValues.has(v)) throw new ApiError(400, `قيمة غير صالحة للسؤال: ${q.question}`);
          }
        }

        answerRows.push({
          question_id: q.id,
          question_snapshot: { question: q.question, type: q.type, options: q.options, page_title: page.title },
          page_title: page.title,
          answer: JSON.stringify(raw),
          sort_order: order++
        });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const appRes = await client.query(
        `INSERT INTO applications (application_number, user_id, status)
         VALUES ('APP-' || LPAD(nextval('application_number_seq')::text, 5, '0'), $1, 'PENDING')
         RETURNING *`,
        [req.user.id]
      );
      const application = appRes.rows[0];

      for (const a of answerRows) {
        await client.query(
          `INSERT INTO application_answers (application_id, question_id, question_snapshot, page_title, answer, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [application.id, a.question_id, a.question_snapshot, a.page_title, a.answer, a.sort_order]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ application });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  })
);

// GET /api/application/my
router.get(
  '/my',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT id, application_number, status, submitted_at FROM applications WHERE user_id = $1 ORDER BY submitted_at DESC',
      [req.user.id]
    );
    res.json({ applications: rows });
  })
);

// GET /api/application/my/:id
router.get(
  '/my/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const appRes = await pool.query('SELECT * FROM applications WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!appRes.rows.length) throw new ApiError(404, 'الطلب غير موجود.');

    const answersRes = await pool.query(
      'SELECT * FROM application_answers WHERE application_id = $1 ORDER BY sort_order ASC',
      [id]
    );
    res.json({ application: appRes.rows[0], answers: answersRes.rows });
  })
);

module.exports = router;
