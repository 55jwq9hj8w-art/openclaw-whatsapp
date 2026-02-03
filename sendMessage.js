require("dotenv").config();
const Twilio = require('twilio'); 

/** 
 * sendMessage.js 
 * Usage: 
 * - Set env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM 
 * - Programmatic: const sendWhatsApp = require('./sendMessage'); sendWhatsApp('+1234567890', 'Hello'); 
 * - CLI: node sendMessage.js +1234567890 "Hello from WhatsApp!" 
 */

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM;

if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    throw new Error('Missing required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM');
}

const client = Twilio(ACCOUNT_SID, AUTH_TOKEN);

/** 
 * Send a WhatsApp message via Twilio 
 * @param {string} to - E.164 phone number, e.g. +13868529558 
 * @param {string} body - Message text 
 * @returns {Promise<object>} Twilio message resource 
 */
async function sendWhatsApp(to, body) {
    if (!to || !body) throw new Error('Both "to" and "body" are required');
    const message = await client.messages.create({
        body,
        from: `whatsapp:${FROM_NUMBER}`,
        to: `whatsapp:${to}`,
    });
    return message;
}

module.exports = sendWhatsApp; // CLI support

if (require.main === module) {
    const [,, to, ...bodyParts] = process.argv;
    const body = bodyParts.join(' ') || 'Hello from WhatsApp!';
    if (!to) {
        console.error('Usage: node sendMessage.js +1234567890 "Your message"');
        process.exit(1);
    }
    sendWhatsApp(to, body)
        .then(msg => console.log(`Message sent: ${msg.sid}`))
        .catch(err => {
            console.error(`Error sending message: ${err.message}`);
            process.exit(1);
        });
    

}
