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
  const history = await getRecentMessages(userId, 12);

  // ✅ QUOTE FLOW CHECK (more flexible)
  const lastAssistant = history
    .filter((m) => m.role === "assistant")
    .slice(-1)[0]?.content?.toLowerCase();

  // Step 1: After "quote" → user gives service → ask quantity
  if (
    lastAssistant &&
    (lastAssistant.includes("quote request started") ||
      lastAssistant.includes("what service") ||
      lastAssistant.includes("reply with what you need"))
  ) {
    const reply = `✅ Got it — ${userMessage}.

How many units/items will you need? (Example: 4 cameras)`;

    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  // Step 2: After quantity → ask installation
  if (lastAssistant && lastAssistant.includes("how many units")) {
    const reply = `Perfect.

Do you need professional installation as well? (Yes or No)`;

    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  // Step 3: After installation → finish quote
  if (lastAssistant && lastAssistant.includes("professional installation")) {
    const reply = `✅ Awesome — thank you.

Your quote request is complete.

Our team will follow up shortly with pricing and next steps.`;

    await saveMessage(userId, "assistant", reply);
    return reply;
  }

  // Otherwise normal AI behavior
  const response = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const reply = response.choices[0].message.content;

  await saveMessage(userId, "assistant", reply);

  return reply;
}

module.exports = { getAIReply };


