<!-- Copilot instructions tailored for this workspace/project -->
# Copilot / AI agent instructions (project-specific)

Purpose
- Help AI coding agents be productive in this workspace by listing the minimal, concrete facts, patterns, and entry points discovered in the repository.

Big picture (what matters)
- **WhatsApp chatbot** with Express server + Twilio integration + OpenAI API.
- Two main entry points: [server.js](server.js) (webhook server) and [sendMessage.js](sendMessage.js) (message sending utility).
- Architecture: incoming WhatsApp → Twilio webhook → OpenAI chat → response back to user.
- Current implementation has **hardcoded credentials in source** (Twilio SID, auth token, OpenAI key in server.js). Must move to environment variables before production.

Key developer workflows (concrete commands)
- **Install**: `npm install` (uses package-lock.json, not pnpm).
- **Run server**: `node server.js` — starts on http://localhost:3000 with logging to console.
- **Send message**: `node sendMessage.js +1234567890 "Hello"` — CLI to test message sending.
- **No test suite** — manual testing required via server logs and Twilio console.

Project conventions and patterns (from discovered docs)
- Node.js CommonJS (not ESM); uses `require()` throughout.
- No async error handling in server webhooks — axios errors will crash webhook but not server (use try/catch).
- Twilio phone numbers require E.164 format: `+1XXXYYYZZZZ`.
- Message content is trimmed after OpenAI response: `.content.trim()`.

Integration points & external dependencies
- **Twilio API**: Creates WhatsApp client via `Twilio(ACCOUNT_SID, AUTH_TOKEN)`; requires valid sandbox or production numbers.
- **OpenAI API**: Requires valid API key in Authorization header; currently hardcoded (move to env).
- **Express server**: Listens on localhost:3000; webhook must be publicly accessible or use tunneling (ngrok) for local dev.

Multi-agent and safety rules (must-follow)
- Do not switch branches, create worktrees, or modify unrelated WIP branches unless explicitly asked.
- Avoid stashing or dropping other agents' changes. When asked to `commit` or `push`, only operate on the intended, scoped changes.
- If you must run formatting/linting that only affects whitespace, auto-apply; for semantic changes, prompt the user first.

Project structure & critical files
- [server.js](server.js): Express HTTP server on port 3000; receives Twilio webhooks at `/incomingMessages`, maintains conversation context, calls OpenAI API.
- [sendMessage.js](sendMessage.js): Standalone Twilio client module for sending WhatsApp messages; supports both require() import and CLI invocation.
- [package.json](package.json): Core dependencies are Twilio, Express, axios, body-parser.

Critical architecture details & data flows
- **Webhook handling**: POST `/incomingMessages` receives Twilio message JSON with `req.body.Body` (message text) and `req.body.From` (sender phone).
- **Conversation context**: stored in-memory array `conversationContext` — persists across messages in one server session, but lost on restart (not persisted to DB).
- **OpenAI integration**: axios POST to OpenAI v1/chat/completions with message history; API key hardcoded in headers (SECURITY ISSUE).
- **Response format**: Server replies with Twilio XML format `<Response><Message>...</Message></Response>`.

Security & credentials (must-follow)
- **CRITICAL**: Twilio SID, auth token, and OpenAI API key are hardcoded in source files. Before any production deployment:
  - Move to `.env` file or environment variables (use `process.env.TWILIO_ACCOUNT_SID`, etc.).
  - Never commit real credentials.
  - Add `.env` to `.gitignore`.
- sendMessage.js already has error handling for missing env vars; extend this pattern to server.js.

When you are unsure
- For Twilio behavior, check request/response format in server logs or Twilio console.
- If conversation context grows unbounded, add max history limit or database persistence.
- For testing locally, use ngrok: `ngrok http 3000` and set Twilio webhook to `https://<ngrok-url>/incomingMessages`.

Next priority tasks (for reference)
- Move hardcoded credentials to environment variables.
- Add try/catch error handling to webhook endpoint.
- Add database or persistent storage for conversation history.
- Add test script or manual testing checklist.
