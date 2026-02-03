require("dotenv").config();

const express = require("express");
const twilio = require("twilio");

const { getAIReply } = require("./brain/assistant");
const { checkCommand } = require("./brain/commandRouter");

const app = express();
app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 3000;

//
// ✅ MAIN WHATSAPP ROUTE
//
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
      // ✅ Check commands first
      const commandReply = checkCommand(incomingMsg);

      if (commandReply) {
        replyMessage = commandReply.trim();
      } else {
        // ✅ DEBUG: log what user sent
        console.log("LAST MESSAGE:", incomingMsg);

        // Otherwise use AI reply
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

//
// Root endpoint
//
app.get("/", (req, res) => {
  res.send("OpenClaw WhatsApp Assistant is running ✅");
});

//
// Start server
//
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

