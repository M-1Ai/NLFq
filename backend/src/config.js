require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

const frontendUrls = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// FRONTEND_URL may contain a GitHub Pages project path (e.g. /NLFq/),
// while CORS receives only the origin (https://m-1ai.github.io).
const allowedOrigins = frontendUrls.map((url) => {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/$/, '');
  }
});

const adminDiscordIds = (process.env.ADMIN_DISCORD_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/'
};

const sessionCookieOptions = {
  ...baseCookieOptions,
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 يوم
};

const shortCookieOptions = {
  ...baseCookieOptions,
  maxAge: 5 * 60 * 1000 // 5 دقائق - لحماية oauth state
};

module.exports = {
  isProd,
  port: Number(process.env.PORT) || 10000,
  frontendUrl: frontendUrls[0] || '',
  allowedOrigins,
  cookieName: process.env.SESSION_COOKIE_NAME || 'westone_session',
  jwtSecret: process.env.JWT_SECRET,
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    redirectUri: process.env.DISCORD_REDIRECT_URI
  },
  adminDiscordIds,
  baseCookieOptions,
  sessionCookieOptions,
  shortCookieOptions
};
