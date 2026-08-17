const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');

const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');

const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/application');
const membersRoutes = require('./routes/members');
const adminRoutes = require('./routes/admin');

const app = express();

// Render يمر من بروكسي - لازم هذا حتى تشتغل secure cookies و rate-limit بشكل صحيح
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl / server-to-server / نفس الأصل
      if (!config.allowedOrigins.length || config.allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('CORS: origin not allowed'));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '3mb' }));
app.use(cookieParser());

// خارج الـ rate limiter حتى ما يأثر عليه فحص Render الدوري
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/application', applicationRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'المسار غير موجود.' }));

app.use(errorHandler);

module.exports = app;
