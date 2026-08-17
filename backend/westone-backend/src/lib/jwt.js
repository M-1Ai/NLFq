const jwt = require('jsonwebtoken');
const config = require('../config');

// fallback عشوائي في التطوير فقط حتى لا يكرش السيرفر إذا نسيت تحط JWT_SECRET محلياً
// في الإنتاج نطلبه إجبارياً في src/index.js قبل بدء التشغيل
const secret =
  config.jwtSecret ||
  (() => {
    console.warn('[WARN] JWT_SECRET غير محدد - يتم استخدام مفتاح مؤقت (الجلسات لن تبقى بعد إعادة التشغيل).');
    return require('crypto').randomBytes(32).toString('hex');
  })();

function signToken(payload) {
  return jwt.sign(payload, secret, { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, secret);
}

module.exports = { signToken, verifyToken };
