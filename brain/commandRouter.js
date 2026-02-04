// brain/commandRouter.js

const { ASSISTANT_NAME } = require("./prompt");

function routeCommand(message) {
  const text = (message || "").trim().toLowerCase();

  if (text === "help" || text === "menu") {
    return `✅ ${ASSISTANT_NAME} Help Menu

Try:
• help
• menu
• quote`;
  }

  if (text === "quote") {
    return "QUOTE_MODE_START";
  }

  return null;
}

module.exports = { routeCommand };
