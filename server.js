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

function requireAdmin(req, res) {
  const adminToken = normalizeToken(process.env.ADMIN_TOKEN);
  const token = normalizeToken(req.query.token);

  if (!adminToken) {
    res.status(500).send("ADMIN_TOKEN is not set on the server.");
    return false;
  }

  if (!token || token !== adminToken) {
    res.status(401).send("Unauthorized");
    return false;
  }

  return true;
}

// ---------- HEALTH CHECK ----------
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ---------- ADMIN DASHBOARD UI ----------
app.get("/admin", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const token = normalizeToken(req.query.token);

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenClaw Admin Dashboard</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #fafafa; }
    .topbar { padding: 12px 16px; background: #fff; border-bottom: 1px solid #eee; display: flex; gap: 12px; align-items: center; }
    .brand { font-weight: 700; }
    .small { color: #666; font-size: 12px; }
    .layout { display: grid; grid-template-columns: 320px 1fr; height: calc(100vh - 49px); }
    .panel { background: #fff; border-right: 1px solid #eee; overflow: auto; }
    .content { overflow: auto; padding: 16px; }
    .sectionTitle { font-size: 12px; color: #666; padding: 12px 12px 8px; }
    .userRow { padding: 10px 12px; border-top: 1px solid #f2f2f2; cursor: pointer; }
    .userRow:hover { background: #f7f7f7; }
    .userRow.active { background: #eef6ff; }
    .userId { font-size: 13px; font-weight: 600; }
    .lastTime { font-size: 12px; color: #666; margin-top: 2px; }
    .chatHeader { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
    .chatHeader h1 { margin: 0; font-size: 16px; }
    .pill { padding: 2px 8px; border-radius: 999px; background: #f2f2f2; font-size: 12px; }
    .msg { background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
    .meta { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; }
    .time { font-size: 12px; color: #666; }
    .role { font-size: 12px; }
    .text { white-space: pre-wrap; word-break: break-word; font-size: 14px; }
    .empty { color: #666; font-size: 14px; padding: 16px; }
    .row { display: flex; gap: 10px; align-items: center; }
    input[type="text"] { padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; width: 240px; }
    button { padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; background: #fff; cursor: pointer; }
    button:hover { background: #f6f6f6; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand">OpenClaw Admin</div>
    <div class="small">Dashboard UI (users + chat, auto-refresh)</div>
    <div style="flex:1"></div>
    <div class="row">
      <input id="filter" type="text" placeholder="Filter user_id..." />
      <button id="refreshBtn">Refresh</button>
      <span class="small" id="status"></span>
    </div>
  </div>

  <div class="layout">
    <div class="panel">
      <div class="sectionTitle">Users</div>
      <div id="users"></div>
    </div>

    <div class="content">
      <div class="chatHeader">
        <h1 id="chatTitle">Select a user</h1>
        <span class="pill" id="chatPill" style="display:none;">Auto-refresh</span>
      </div>
      <div id="chat"></div>
    </div>
  </div>

<script>
  const ADMIN_TOKEN = ${JSON.stringify(token)};
  let selectedUserId = null;
  let refreshTimer = null;

  function qs(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || "";
  }

  function setStatus(msg) {
    document.getElementById("status").textContent = msg || "";
  }

  async function api(path) {
    const url = new URL(path, window.location.origin);
    url.searchParams.set("token", ADMIN_TOKEN);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || ("Request failed: " + res.status));
    }
    return res.json();
  }

  function fmtTime(iso) {
    try {
      return new Date(iso).toISOString();
    } catch {
      return iso;
    }
  }

  function renderUsers(users) {
    const filter = (document.getElementById("filter").value || "").toLowerCase();
    const mount = document.getElementById("users");
    mount.innerHTML = "";

    const filtered = users.filter(u => (u.user_id || "").toLowerCase().includes(filter));

    if (!filtered.length) {
      mount.innerHTML = '<div class="empty">No users found.</div>';
      return;
    }

    for (const u of filtered) {
      const row = document.createElement("div");
      row.className = "userRow" + (u.user_id === selectedUserId ? " active" : "");
      row.onclick = () => selectUser(u.user_id);

      const id = document.createElement("div");
      id.className = "userId";
      id.textContent = u.user_id;

      const t = document.createElement("div");
      t.className = "lastTime";
      t.textContent = "Last message: " + fmtTime(u.last_message_at);

      row.appendChild(id);
      row.appendChild(t);
      mount.appendChild(row);
    }
  }

  function renderChat(messages) {
    const mount = document.getElementById("chat");
    mount.innerHTML = "";

    if (!selectedUserId) {
      mount.innerHTML = '<div class="empty">Pick a user on the left.</div>';
      return;
    }

    if (!messages.length) {
      mount.innerHTML = '<div class="empty">No messages for this user yet.</div>';
      return;
    }

    for (const m of messages) {
      const card = document.createElement("div");
      card.className = "msg";

      const meta = document.createElement("div");
      meta.className = "meta";

      const time = document.createElement("div");
      time.className = "time";
      time.textContent = fmtTime(m.created_at);

      const role = document.createElement("div");
      role.className = "pill role";
      role.textContent = m.role;

      meta.appendChild(time);
      meta.appendChild(role);

      const text = document.createElement("div");
      text.className = "text";
      text.textContent = m.content || "";

      card.appendChild(meta);
      card.appendChild(text);

      mount.appendChild(card);
    }
  }

  async function loadUsers() {
    setStatus("Loading users...");
    const data = await api("/admin/api/users");
    renderUsers(data.users || []);
    setStatus("");
  }

  async function loadChat() {
    if (!selectedUserId) return;
    setStatus("Loading chat...");
    const url = new URL("/admin/api/messages", window.location.origin);
    url.searchParams.set("token", ADMIN_TOKEN);
    url.searchParams.set("user_id", selectedUserId);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || ("Request failed: " + res.status));
    }
    const data = await res.json();
    renderChat(data.messages || []);
    setStatus("");
  }

  async function selectUser(userId) {
    selectedUserId = userId;
    document.getElementById("chatTitle").textContent = userId;
    document.getElementById("chatPill").style.display = "inline-block";

    await loadUsers();
    await loadChat();

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(async () => {
      try {
        await loadUsers();
        await loadChat();
      } catch (e) {
        setStatus(e.message || String(e));
      }
    }, 3000);
  }

  document.getElementById("refreshBtn").onclick = async () => {
    try {
      await loadUsers();
      await loadChat();
    } catch (e) {
      setStatus(e.message || String(e));
    }
  };

  document.getElementById("filter").addEventListener("input", async () => {
    try {
      await loadUsers();
    } catch (e) {
      setStatus(e.message || String(e));
    }
  });

  (async function init() {
    try {
      await loadUsers();

      // optional: support direct link /admin?token=...&user_id=...
      const initialUser = qs("user_id");
      if (initialUser) {
        await selectUser(initialUser);
      } else {
        renderChat([]);
      }
    } catch (e) {
      setStatus(e.message || String(e));
    }
  })();
</script>
</body>
</html>`;

    res.type("text/html").send(html);
  } catch (err) {
    console.error("Error in /admin:", err);
    res.status(500).send("Server error");
  }
});

// ---------- ADMIN API: LIST USERS ----------
app.get("/admin/api/users", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { rows } = await pool.query(`
      SELECT user_id, MAX(created_at) AS last_message_at
      FROM messages
      GROUP BY user_id
      ORDER BY last_message_at DESC
      LIMIT 200
    `);

    res.json({ users: rows });
  } catch (err) {
    console.error("Error in /admin/api/users:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- ADMIN API: MESSAGES FOR USER ----------
app.get("/admin/api/messages", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const { rows } = await pool.query(
      `
      SELECT user_id, role, content, created_at
      FROM messages
      WHERE user_id = $1
      ORDER BY created_at ASC
      LIMIT 200
      `,
      [userId]
    );

    res.json({ messages: rows });
  } catch (err) {
    console.error("Error in /admin/api/messages:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- ADMIN: VIEW MESSAGES (LEGACY TABLE VIEW) ----------
app.get("/messages", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

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

