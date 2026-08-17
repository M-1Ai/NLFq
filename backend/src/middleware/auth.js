const { verifyToken } = require('../lib/jwt');
const { getUserById } = require('../lib/users');
const ApiError = require('../lib/ApiError');
const config = require('../config');

// كل Endpoint إداري يمر من هنا: نتحقق من التوكن ثم نجيب المستخدم من قاعدة
// البيانات مباشرة (مو من التوكن) حتى تنعكس أي تغييرات في الرتبة فوراً.
async function requireAuth(req, res, next) {
  try {
    const authHeader = String(req.get('authorization') || '');
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const token = bearer || req.cookies[config.cookieName];
    if (!token) throw new ApiError(401, 'يجب تسجيل الدخول عبر Discord أولاً.');

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new ApiError(401, 'انتهت صلاحية الجلسة، سجّل الدخول مجدداً.');
    }

    const user = await getUserById(payload.sub);
    if (!user) throw new ApiError(401, 'الجلسة غير صالحة.');

    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new ApiError(403, 'هذه الصفحة متاحة للإدارة فقط.'));
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
