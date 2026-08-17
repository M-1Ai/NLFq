module.exports = function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // JSON بصيغة غير صحيحة من express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'صيغة الطلب غير صحيحة.' });
  }

  // رفض CORS
  if (/CORS/i.test(err.message || '')) {
    return res.status(403).json({ error: 'غير مسموح بالوصول من هذا المصدر.' });
  }

  const status = err.statusCode || err.status;
  if (err.expected && status) {
    return res.status(status).json({ error: err.message });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'حدث خطأ في الخادم، حاول لاحقاً.' });
};
