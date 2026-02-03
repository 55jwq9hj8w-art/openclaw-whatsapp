// brain/assistant.js

require("dotenv").config();
const OpenAI = require("openai");

// Create OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Core brain function:
 * Takes an incoming WhatsApp message and returns an AI reply.
 */
async function getAIReply(userMessage) {
  const response = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful WhatsApp AI assistant." },
      { role: "user", content: userMessage },
    ],
  });

  return response.choices[0].message.content;
}

module.exports = { getAIReply };
