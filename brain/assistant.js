// brain/assistant.js
require("dotenv").config();

const OpenAI = require("openai");
const { saveMessage, getRecentMessages } = require("./memory");
const { SYSTEM_PROMPT, ASSISTANT_NAME } = require("./prompt");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getAIReply(userId, userMessage) {
  // ✅ Hard override for name question
  const clean = (userMessage || "").toLowerCase();
  if (clean.includes("your name")) {
    return `I'm ${ASSISTANT_NAME}.`;
  }

  // Save user message
  await saveMessage(userId, "user", userMessage);

  // Load recent history
  const history = await getRecentMessages(userId, 15);

  // Get last assistant message
  const lastAssistant = history
    .filter((m) => m.role === "assistant")
    .slice(-1)[0]?.content;

  // Quote flow
  if (userMessage === "QUOTE_MODE_START") {
    const reply = `✅ Quote Request Started

What service would you like a quote for?`;

    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  if (lastAssistant && lastAssistant.includes("What service")) {
    const reply = `✅ Got it — ${userMessage}.

How many units/items will you need?`;

    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  if (lastAssistant && lastAssistant.includes("How many units")) {
    const reply = `Do you need professional installation as well? (Yes or No)`;

    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  if (lastAssistant && lastAssistant.includes("professional installation")) {
    const reply = `✅ Thank you.

Your quote request is complete.`;

    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  // Normal AI Response
  const response = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const replyMessage = response.choices[0].message.content;

  await saveMessage(userId, "assistant", replyMessage);

  return replyMessage;
}

module.exports = { getAIReply };
