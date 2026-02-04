// server.js
require("dotenv").config();

const express = require("express");
const twilio = require("twilio");

const { getAIReply } = require("./brain/assistant");
const { routeCommand } = require("./brain/commandRouter");
const { ASSISTANT_NAME } = require("./brain/prompt");

const app = express();

// ✅ Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ✅ Health check route
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    assistantName: ASSISTANT_NAME,
    timestamp: new Date().toISOString(),
  });
});

// ✅ WhatsApp webhook
app.post("/incomingMessages", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const fromNumber = req.body.From;

  let replyMessage = "";

  const command = routeCommand(incomingMsg);

  if (command === "QUOTE_MODE_START") {
    replyMessage = await getAIReply(fromNumber, "QUOTE_MODE_START");
  } else if (command) {
    replyMessage = command;
  } else {
    replyMessage = await getAIReply(fromNumber, incomingMsg);
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(replyMessage);

  res.type("text/xml").send(twiml.toString());
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
