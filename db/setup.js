// db/setup.js
require("dotenv").config();

const db = require("./index");

async function setup() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ Database tables are ready.");
    process.exit();
  } catch (err) {
    console.error("❌ Setup failed:", err.message);
    process.exit(1);
  }
}

setup();

