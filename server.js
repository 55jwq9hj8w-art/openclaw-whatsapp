require("dotenv").config();

const express = require("express");
const twilio = require("twilio");

const { getAIReply } = require("./brain/assistant");
const { checkCommand } = require("./brain/commandRouter");

const app = express();
app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 3000;

// ✅ Prevent TwiML/XML from breaking on special characters
function escapeXml(unsafe = "") {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

app.post(
  "/incomingMessages",
  twilio.webhook({
    validate: false,
  }),
  async (req, res) => {
    const incomingMsg = req.body.Body || "";
    const fromNumber = req.body.From || "";

    let replyMessage = "";

    try {
      const commandReply = checkCommand(incomingMsg);

      // ✅ DEBUG (temporary)
      console.log("INCOMING:", JSON.stringify(incomingMsg));
      console.log("COMMAND_REPLY:", JSON.stringify(commandReply));

      if (commandReply === "QUOTE_MODE_START") {
        replyMessage = (await getAIReply(fromNumber, "QUOTE_MODE_START")).trim();
      } else if (commandReply) {
        replyMessage = commandReply.trim();
      } else {
        replyMessage = (await getAIReply(fromNumber, incomingMsg)).trim();
      }

      console.log("SENDING:", JSON.stringify(replyMessage));
    } catch (err) {
      console.error("Error:", err?.message || err);
      replyMessage = "⚠️ I hit an error. Try again in a moment.";
    }

    const safeReply = escapeXml(replyMessage);

    res.type("text/xml");
    res.send(`<Response><Message>${safeReply}</Message></Response>`);
  }
);

app.get("/", (req, res) => {
  res.send("OpenClaw WhatsApp Assistant is running ✅");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
