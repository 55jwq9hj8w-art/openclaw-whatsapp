// brain/memory.js
const db = require("../db/index");

// Save a message (user or assistant) into Postgres
async function saveMessage(userId, role, content) {
  await db.query(
    `INSERT INTO messages (user_id, role, content)
     VALUES ($1, $2, $3)`,
    [userId, role, content]
  );
}

// Load the most recent conversation history
async function getRecentMessages(userId, limit = 10) {
  const result = await db.query(
    `SELECT role, content
     FROM messages
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  // Reverse so OpenAI sees oldest → newest
  return result.rows.reverse();
}

module.exports = {
  saveMessage,
  getRecentMessages,
};
