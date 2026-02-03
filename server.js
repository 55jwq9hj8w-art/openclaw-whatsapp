const { getAIReply } = require("./brain/assistant");
require("dotenv").config();

const express = require("express");
const twilio = require("twilio");

const app = express();

// ✅ Required behind Render + Cloudflare
app.set("trust proxy", true);

// ✅ Twilio sends x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 3000;

// ✅ Webhook endpoint for WhatsApp messages
app.post(
  "/incomingMessages",
  twilio.webhook({
    validate: true,
    authToken: process.env.TWILIO_AUTH_TOKEN,

    // ✅ FIX: Required for Render/Cloudflare signature validation
    protocol: "https",
    host: "openclaw-whatsapp.onrender.com",
  }),
  async (req, res) => {
    const incomingMsg = req.body.Body;
    const fromNumber = req.body.From;

    console.log(`Message from ${fromNumber}: ${incomingMsg}`);

    let replyMessage;
    try {
      replyMessage = (await getAIReply(incomingMsg)).trim();
    } catch (err) {
      console.error("OpenAI error:", err?.message || err);
      replyMessage = "⚠️ AI error. Try again in a moment.";
    }

    res.type("text/xml");
    res.send(`<Response><Message>${replyMessage}</Message></Response>`);
  }
);

// ✅ Root endpoint for Render health check
app.get("/", (req, res) => {
  res.send("OpenClaw WhatsApp Assistant is running ✅");
});

// ✅ Start server correctly
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
