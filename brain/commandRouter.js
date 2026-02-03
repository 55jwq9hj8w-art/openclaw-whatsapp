// brain/commandRouter.js

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "") // remove punctuation like ! ? .
    .replace(/\s+/g, " ");   // collapse extra spaces
}

function checkCommand(message) {
  const text = normalize(message);

  if (text === "help" || text === "menu") {
    return `
✅ OpenClaw Assistant Help Menu

Type one of these:

• quote     → request a project quote
• schedule  → schedule a call or install
• support   → get help with an issue
• menu      → show this menu again

Or just ask me anything normally.
    `;
  }

  return null; // no command detected
}

module.exports = { checkCommand };
