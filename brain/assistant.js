// brain/assistant.js
require("dotenv").config();

const axios = require("axios");
const { saveMessage, getRecentMessages, saveFact, getFacts } = require("./memory");
const { SYSTEM_PROMPT, ASSISTANT_NAME } = require("./prompt");

// ----- OpenClaw Gateway -----
const OPENCLAW_GATEWAY_WS = process.env.OPENCLAW_GATEWAY_WS; // e.g. ws://100.66.119.56:18789
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is not set`);
  }
}

// ✅ Extract simple facts
function extractFact(message) {
  const text = (message || "").trim();
  const lower = text.toLowerCase();

  if (lower.startsWith("my company name is")) {
    const value = text.split(/is/i)[1]?.trim();
    if (value) return { key: "company_name", value };
  }

  if (lower.startsWith("my name is")) {
    const value = text.split(/is/i)[1]?.trim();
    if (value) return { key: "user_name", value };
  }

  if (lower.startsWith("my favorite color is")) {
    const value = text.split(/is/i)[1]?.trim();
    if (value) return { key: "favorite_color", value };
  }

  return null;
}

/**
 * Call OpenClaw agent via Gateway RPC (HTTP bridge).
 * OpenClaw Gateway is a WebSocket server, but exposes an HTTP-compatible call endpoint
 * via the local dashboard origin. We use the same host/port and hit /rpc.
 *
 * If your build differs, we'll adjust after seeing the error output.
 */
async function callOpenClawAgent({ userId, message }) {
  requireEnv("OPENCLAW_GATEWAY_WS", OPENCLAW_GATEWAY_WS);
  requireEnv("OPENCLAW_GATEWAY_TOKEN", OPENCLAW_GATEWAY_TOKEN);

  // Convert ws://host:port -> http://host:port
  const httpBase = OPENCLAW_GATEWAY_WS.replace(/^ws:/, "http:").replace(/^wss:/, "https:");
  const url = `${httpBase}/rpc`;

  // Minimal, stable payload: ask the default agent to respond and return text
  const payload = {
    method: "agent.turn",
    params: {
      to: userId,
      message,
      deliver: false
    },
    auth: {
      token: OPENCLAW_GATEWAY_TOKEN
    }
  };

  const res = await axios.post(url, payload, {
    timeout: 60000,
    headers: { "Content-Type": "application/json" }
  });

  // Try common response shapes
  const data = res.data || {};
  const text =
    data?.result?.message ||
    data?.result?.text ||
    data?.message ||
    data?.text;

  if (!text) {
    return "I ran into an issue talking to James (no reply text returned).";
  }
  return String(text);
}

async function getAIReply(userId, userMessage) {
  // ✅ SHOW_FACTS must always return formatted facts
  if (userMessage === "SHOW_FACTS") {
    const facts = await getFacts(userId);

    if (!facts || facts.length === 0) {
      return "I don’t have any saved facts yet.";
    }

    // Keep the newest value per key
    const latest = {};
    for (const f of facts) {
      if (!latest[f.fact_key]) latest[f.fact_key] = f.fact_value;
    }

    const lines = Object.entries(latest).map(
      ([k, v]) => `• ${k.replaceAll("_", " ")}: ${v}`
    );

    return `Here’s what I remember:\n${lines.join("\n")}`;
  }

  // ✅ Assistant name
  const clean = (userMessage || "").toLowerCase();
  if (clean.includes("your name")) {
    return `I'm ${ASSISTANT_NAME}.`;
  }

  // ✅ Save user message
  await saveMessage(userId, "user", userMessage);

  // ✅ Save fact permanently if detected
  const fact = extractFact(userMessage);
  if (fact) {
    await saveFact(userId, fact.key, fact.value);
    const reply = "Got it — I’ll remember that.";
    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  // ✅ Load stored facts for context
  const facts = await getFacts(userId);
  const factLines = (facts || [])
    .slice(0, 15)
    .map((f) => `- ${f.fact_key}: ${f.fact_value}`)
    .join("\n");

  const FACTS_CONTEXT = factLines ? `\n\nUser Facts:\n${factLines}\n` : "";

  // ✅ Load recent history (kept for your dashboard)
  const history = await getRecentMessages(userId, 15);

  // Build a single prompt for James
  const historyText = (history || [])
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const composed = `${SYSTEM_PROMPT}${FACTS_CONTEXT}\n\nConversation so far:\n${historyText}\n\nUser: ${userMessage}`;

  // ✅ OpenClaw (James) response
  const replyMessage = await callOpenClawAgent({
    userId,
    message: composed
  });

  await saveMessage(userId, "assistant", replyMessage);

  return replyMessage;
}

module.exports = { getAIReply };

