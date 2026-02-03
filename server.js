const { getAIReply } = require("./brain/assistant");
require("dotenv").config();
const express = require('express');
// const bodyParser = require('body-parser');
const twilio = require('twilio');
const app = express();
app.set("trust proxy", true);

app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 3000;
let conversationContext = []; // Array to store conversation context

// Middleware to parse incoming requests
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

// Webhook endpoint for WhatsApp messages
app.post('/incomingMessages', twilio.webhook({ validate: true, authToken: process.env.TWILIO_AUTH_TOKEN }), async (req, res) => {
    const incomingMsg = req.body.Body; // Get the message content
    const fromNumber = req.body.From; // Get the sender's number

    console.log(`Message from ${fromNumber}: ${incomingMsg}`);
    
    // Add the incoming message to context
    conversationContext.push({ role: "user", content: incomingMsg });
    // Ask the brain for a reply
     let replyMessage;
     try {
       replyMessage = (await getAIReply(incomingMsg)).trim();
     } catch (err) {
       console.error("OpenAI error:", err?.message || err);
       replyMessage = "⚠️ I hit an error talking to the AI. Try again in a moment.";
     }

     // Respond to the message
     res.send(`<Response><Message>${replyMessage}</Message></Response>`);
});

// Add this line for the root path
app.get('/', (req, res) => {
    res.send('Welcome to the WhatsApp Messaging API!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
