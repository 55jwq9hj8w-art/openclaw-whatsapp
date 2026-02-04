// brain/commandRouter.js

function normalize(text = "") {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function checkCommand(message) {
  const text = normalize(message);

  if (text === "help" || text === "menu") {
    return `
✅ OpenClaw Assistant Help Menu

• quote     → request a project quote
• schedule  → schedule a call or install
• support   → get help with an issue
• menu      → show this menu again
    `;
  }

  if (text === "quote") {
    return "QUOTE_MODE_START";
  }

  return null;
}

module.exports = { checkCommand };

