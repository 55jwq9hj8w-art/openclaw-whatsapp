// brain/assistant.js
require("dotenv").config();

const OpenAI = require("openai");
const { saveMessage, getRecentMessages } = require("./memory");
const { SYSTEM_PROMPT } = require("./prompt");

// Create OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Takes an incoming WhatsApp message and returns an AI reply.
 * Includes per-user memory stored in Postgres.
 * Uses OpenClaw business personality prompt.
 */
async function getAIReply(userId, userMessage) {
  // 1) Save the user's incoming message
  await saveMessage(userId, "user", userMessage);

  // 2) Pull recent conversation history for this user
  const history = await getRecentMessages(userId, 12);

  // 3) Ask OpenAI with OpenClaw system prompt + history
  const response = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.choices[0].message.content;

  // 4) Save assistant reply
  await saveMessage(userId, "assistant", reply);

  return reply;
}

module.exports = { getAIReply };
