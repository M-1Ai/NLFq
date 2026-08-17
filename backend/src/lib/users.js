const pool = require('../db/pool');
const config = require('../config');

// الشكل العام للمستخدم كما يتوقعه الفرونت اند (normalizeUser في script.js)
function publicUser(u) {
  return {
    id: u.id,
    discord_id: u.discord_id,
    discord_username: u.discord_username,
    discord_global_name: u.discord_global_name,
    discord_avatar: u.discord_avatar_hash,
    role: u.role
  };
}

async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function upsertUserFromDiscord(discordUser) {
  const shouldBeAdmin = config.adminDiscordIds.includes(discordUser.id);
  const globalName = discordUser.global_name || discordUser.username;

  const existing = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordUser.id]);

  if (existing.rows.length) {
    const current = existing.rows[0];
    // نرقّي تلقائياً إذا كان ضمن القائمة، وما ننزّل رتبة أي أدمن موجود مسبقاً بدون قصد
    const role = shouldBeAdmin ? 'ADMIN' : current.role;
    const { rows } = await pool.query(
      `UPDATE users
       SET discord_username = $1, discord_global_name = $2, discord_avatar_hash = $3, role = $4, updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [discordUser.username, globalName, discordUser.avatar, role, current.id]
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    `INSERT INTO users (discord_id, discord_username, discord_global_name, discord_avatar_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [discordUser.id, discordUser.username, globalName, discordUser.avatar, shouldBeAdmin ? 'ADMIN' : 'USER']
  );
  return rows[0];
}

module.exports = { publicUser, getUserById, upsertUserFromDiscord };
