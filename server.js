// server.js
require("dotenv").config();

const express = require("express");
const twilio = require("twilio");
const { Pool } = require("pg");

const { getAIReply } = require("./brain/assistant");
const { routeCommand } = require("./brain/commandRouter");

const app = express();
app.use(express.urlencoded({ extended: false }));

// ---------- DATABASE ----------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ---------- HELPERS ----------
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeToken(v) {
  if (v == null) return "";
  let s = String(v).trim();

  // strip surrounding quotes if Render added them
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

// ---------- HEALTH CHECK ----------
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ---------- ADMIN: VIEW MESSAGES ----------
app.get("/messages", async (req, res) => {
  try {
    const adminToken = normalizeToken(process.env.ADMIN_TOKEN);
    const token = normalizeToken(req.query.token);

    if (!adminToken) {
      return res
        .status(500)
        .send("ADMIN_TOKEN is not set on the server.");
    }

    if (!token || token !== adminToken) {
      return res.status(401).send("Unauthorized");
    }

    const userId = req.query.user_id || null;

    const { rows } = await pool.query(
      `
      SELECT user_id, role, content, created_at
      FROM messages
      WHERE ($1::text IS NULL OR user_id = $1)
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId]
    );

    const title = userId
      ? `Messages for ${userId}`
      : "Latest Messages (Last 50)";

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 16px; }
    .wrap { max-width: 1000px; margin: 0 auto; }
    h1 { font-size: 20px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #eee; padding: 10px; vertical-align: top; }
    th { text-align: left; font-size: 13px; color: #333; }
    td { font-size: 14px; }
    .pill { padding: 2px 8px; border-radius: 999px; background: #f2f2f2; font-size: 12px; }
    .content { white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(title)}</h1>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>User</th>
          <th>Role</th>
          <th>Content</th>
        </tr>
      </thead>
      <tbody>
        ${
          rows.length
            ? rows
                .map(
                  (r) => `
        <tr>
          <td>${escapeHtml(new Date(r.created_at).toISOString())}</td>
          <td>${escapeHtml(r.user_id)}</td>
          <td><span class="pill">${escapeHtml(r.role)}</span></td>
          <td class="content">${escapeHtml(r.content)}</td>
        </tr>`
                )
                .join("")
            : `<tr><td colspan="4">No messages found.</td></tr>`
        }
      </tbody>
    </table>
  </div>
</body>
</html>`;

    res.type("text/html").send(html);
  } catch (err) {
    console.error("Error in /messages:", err);
    res.status(500).send("Server error");
  }
});

// ---------- TWILIO WEBHOOK ----------
app.post("/incomingMessages", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const fromNumber = req.body.From;

  let replyMessage = "";

  const command = routeCommand(incomingMsg);

  if (command === "SHOW_FACTS") {
    replyMessage = await getAIReply(fromNumber, "SHOW_FACTS");
  } else if (command === "QUOTE_MODE_START") {
    replyMessage = await getAIReply(fromNumber, "QUOTE_MODE_START");
  } else if (command) {
    replyMessage = command;
  } else {
    replyMessage = await getAIReply(fromNumber, incomingMsg);
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(replyMessage);

  res.type("text/xml").send(twiml.toString());
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
