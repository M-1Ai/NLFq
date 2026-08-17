const config = require('./config');
const app = require('./app');
const pool = require('./db/pool');
const { runMigrations } = require('./db/migrate');

async function start() {
  if (config.isProd) {
    const missing = [];
    if (!config.jwtSecret) missing.push('JWT_SECRET');
    if (!config.discord.clientId) missing.push('DISCORD_CLIENT_ID');
    if (!config.discord.clientSecret) missing.push('DISCORD_CLIENT_SECRET');
    if (!config.discord.redirectUri) missing.push('DISCORD_REDIRECT_URI');
    if (!config.frontendUrl) missing.push('FRONTEND_URL');
    if (missing.length) {
      console.error('Missing required environment variables:', missing.join(', '));
      process.exit(1);
    }
  }

  try {
    await runMigrations();
    console.log('Database ready.');
  } catch (e) {
    console.error('Failed to run database migrations:', e);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`Westone backend running on port ${config.port} [${config.isProd ? 'production' : 'development'}]`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
