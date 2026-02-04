// brain/memory.js

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// ✅ Save message
async function saveMessage(userId, role, content) {
  await pool.query(
    "INSERT INTO messages (user_id, role, content) VALUES ($1, $2, $3)",
    [userId, role, content]
  );
}

// ✅ Get recent messages
async function getRecentMessages(userId, limit = 15) {
  const result = await pool.query(
    "SELECT role, content FROM messages WHERE user_id=$1 ORDER BY created_at ASC LIMIT $2",
    [userId, limit]
  );
  return result.rows;
}

// ✅ Save a permanent fact
async function saveFact(userId, key, value) {
  await pool.query(
    "INSERT INTO user_facts (user_id, fact_key, fact_value) VALUES ($1, $2, $3)",
    [userId, key, value]
  );
}

// ✅ Load facts (most recent first)
async function getFacts(userId) {
  const result = await pool.query(
    "SELECT fact_key, fact_value FROM user_facts WHERE user_id=$1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

module.exports = {
  saveMessage,
  getRecentMessages,
  saveFact,
  getFacts,
};
