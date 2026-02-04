// brain/assistant.js
require("dotenv").config();

const OpenAI = require("openai");
const { saveMessage, getRecentMessages } = require("./memory");
const { SYSTEM_PROMPT } = require("./prompt");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getAIReply(userId, userMessage) {
  // Save user message
  await saveMessage(userId, "user", userMessage);

  // Load recent history
  const history = await getRecentMessages(userId, 15);

  // Get last assistant message
  const lastAssistant = history
    .filter((m) => m.role === "assistant")
    .slice(-1)[0]?.content;

  // ✅ STEP 0: Start Quote Mode
  if (userMessage === "QUOTE_MODE_START") {
    const reply = `✅ Quote Request Started

What service would you like a quote for?
Examples:
• Security cameras
• Access control
• Monitoring`;

    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  // ✅ STEP 1: Service → Ask Quantity
  if (lastAssistant && lastAssistant.includes("What service would you like")) {
    const reply = `✅ Got it — ${userMessage}.

How many units/items will you need?
(Example: 4 cameras)`;

    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  // ✅ STEP 2: Quantity → Ask Installation
  if (lastAssistant && lastAssistant.includes("How many units")) {
    const reply = `Perfect.

Do you need professional installation as well?
(Yes or No)`;

    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  // ✅ STEP 3: Installation → Finish Quote
  if (lastAssistant && lastAssistant.includes("professional installation")) {
    const reply = `✅ Awesome — thank you.

Your quote request is complete.

Our team will follow up shortly with pricing and next steps.`;

    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  // Otherwise normal AI response
  const response = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.choices[0].message.content;

  await saveMessage(userId, "assistant", reply);
  return reply;
}

module.exports = { getAIReply };
