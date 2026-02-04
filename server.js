require("dotenv").config();

const express = require("express");
const twilio = require("twilio");

const { getAIReply } = require("./brain/assistant");
const { checkCommand } = require("./brain/commandRouter");

const app = express();
app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 3000;

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

      // ✅ If it's our quote flow starter flag, hand it to the assistant logic
      if (commandReply === "QUOTE_MODE_START") {
        replyMessage = (await getAIReply(fromNumber, "QUOTE_MODE_START")).trim();
      } else if (commandReply) {
        // Normal commands like help/menu
        replyMessage = commandReply.trim();
      } else {
        // Normal AI reply
        replyMessage = (await getAIReply(fromNumber, incomingMsg)).trim();
      }
    } catch (err) {
      console.error("Error:", err?.message || err);
      replyMessage = "⚠️ I hit an error. Try again in a moment.";
    }

    res.type("text/xml");
    res.send(`<Response><Message>${replyMessage}</Message></Response>`);
  }
);

app.get("/", (req, res) => {
  res.send("OpenClaw WhatsApp Assistant is running ✅");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
