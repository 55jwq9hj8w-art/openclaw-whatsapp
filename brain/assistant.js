// brain/assistant.js
require("dotenv").config();

const OpenAI = require("openai");
const { saveMessage, getRecentMessages, saveFact, getFacts } = require("./memory");
const { SYSTEM_PROMPT, ASSISTANT_NAME } = require("./prompt");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  // ✅ Load recent history
  const history = await getRecentMessages(userId, 15);

  // ✅ OpenAI response
  const response = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: SYSTEM_PROMPT + FACTS_CONTEXT }, ...history],
  });

  const replyMessage = response.choices[0].message.content;

  await saveMessage(userId, "assistant", replyMessage);

  return replyMessage;
}

module.exports = { getAIReply };

