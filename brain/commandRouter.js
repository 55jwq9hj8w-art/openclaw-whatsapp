// brain/commandRouter.js

const { ASSISTANT_NAME } = require("./prompt");

function routeCommand(message) {
  const text = (message || "").trim().toLowerCase();

  if (text === "help" || text === "menu") {
    return `✅ ${ASSISTANT_NAME} Help Menu

Try:
• help
• menu
• quote
• facts`;
  }

  if (text === "quote") {
    return "QUOTE_MODE_START";
  }

  // ✅ New Admin/User command
  if (text === "facts") {
    return "SHOW_FACTS";
  }

  return null;
}

module.exports = { routeCommand };
