const config = require('../config');

function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: config.discord.redirectUri,
    response_type: 'code',
    scope: 'identify',
    state
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.discord.redirectUri
  });

  const r = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`discord_token_exchange_failed (${r.status}): ${text}`);
  }
  return r.json();
}

async function fetchDiscordUser(accessToken) {
  const r = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) throw new Error(`discord_fetch_user_failed (${r.status})`);
  return r.json();
}

module.exports = { buildAuthorizeUrl, exchangeCode, fetchDiscordUser };
