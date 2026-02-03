const { getAIReply } = require("./brain/assistant");
require("dotenv").config();

const express = require("express");
const twilio = require("twilio");

const app = express();
app.set("trust proxy", true);

app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 3000;

//
// ✅ WORKING ROUTE (Validation OFF)
// This is your live bot route
//
app.post(
  "/incomingMessages",
  twilio.webhook({
    validate: false,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  }),
  async (req, res) => {
    const incomingMsg = req.body.Body;
    const fromNumber = req.body.From;

    console.log(`Message from ${fromNumber}: ${incomingMsg}`);

    let replyMessage;
    try {
     replyMessage = (await getAIReply(fromNumber, incomingMsg)).trim();

    } catch (err) {
      console.error("OpenAI error:", err?.message || err);
      replyMessage =
        "⚠️ I hit an error talking to the AI. Try again in a moment.";
    }

    res.type("text/xml");
    res.send(`<Response><Message>${replyMessage}</Message></Response>`);
  }
);

//
// ✅ SECURE TEST ROUTE (Validation ON)
// This is ONLY for testing signature validation safely
//
app.post(
  "/incomingMessagesSecure",
  twilio.webhook({
    validate: true,
    authToken: process.env.TWILIO_AUTH_TOKEN,

    // Required for Render/Cloudflare
    protocol: "https",
    host: "openclaw-whatsapp.onrender.com",
  }),
  async (req, res) => {
    res.type("text/xml");
    res.send(`<Response><Message>✅ Secure route works!</Message></Response>`);
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

