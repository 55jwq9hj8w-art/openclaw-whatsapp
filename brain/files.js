// brain/files.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function saveFile({
  user_id,
  file_name,
  file_type,
  file_url,
  extracted_text,
}) {
  const { rows } = await pool.query(
    `
    INSERT INTO user_files
      (user_id, file_name, file_type, file_url, extracted_text)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [user_id, file_name, file_type, file_url, extracted_text]
  );

  return rows[0];
}

async function listFilesForUser(user_id) {
  const { rows } = await pool.query(
    `
    SELECT id, file_name, file_type, created_at
    FROM user_files
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [user_id]
  );

  return rows;
}

module.exports = {
  saveFile,
  listFilesForUser,
};
