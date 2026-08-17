const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../../middleware/auth');

// كل ما تحت /api/admin يمر أولاً من هنا: جلسة صالحة + رتبة ADMIN من قاعدة البيانات
router.use(requireAuth, requireAdmin);

router.use(require('./stats'));
router.use(require('./applications'));
router.use(require('./builder'));
router.use(require('./members'));
router.use(require('./settings'));

module.exports = router;
