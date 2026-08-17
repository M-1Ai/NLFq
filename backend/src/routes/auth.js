const router = require('express').Router();
const crypto = require('crypto');
const config = require('../config');
const discord = require('../lib/discord');
const { signToken } = require('../lib/jwt');
const { upsertUserFromDiscord, publicUser } = require('../lib/users');
const { requireAuth } = require('../middleware/auth');
const { discordAuthLimiter } = require('../middleware/rateLimiters');
const asyncHandler = require('../lib/asyncHandler');

// GET /api/auth/discord -> يحول المستخدم لصفحة موافقة Discord
router.get('/discord', discordAuthLimiter, (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, config.shortCookieOptions);
  res.redirect(discord.buildAuthorizeUrl(state));
});

// GET /api/auth/discord/callback -> Discord يرجع هنا بعد الموافقة
router.get(
  '/discord/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;
    const savedState = req.cookies.oauth_state;
    res.clearCookie('oauth_state', config.baseCookieOptions);

    const failUrl = `${config.frontendUrl}/#home`;
    if (error || !code || !state || !savedState || state !== savedState) {
      return res.redirect(failUrl);
    }

    try {
      const tokenData = await discord.exchangeCode(code);
      const discordUser = await discord.fetchDiscordUser(tokenData.access_token);
      const user = await upsertUserFromDiscord(discordUser);
      const token = signToken({ sub: user.id });
      res.cookie(config.cookieName, token, config.sessionCookieOptions);
      return res.redirect(`${config.frontendUrl}/dashboard`);
    } catch (e) {
      console.error('Discord OAuth callback error:', e.message);
      return res.redirect(failUrl);
    }
  })
);

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, config.baseCookieOptions);
  res.json({ ok: true });
});

module.exports = router;
