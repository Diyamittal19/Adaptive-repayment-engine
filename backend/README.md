# Adaptive Repayment — AI Backend

This is the AI service layer for the **Adaptive Repayment** platform.

The frontend communicates directly with **Supabase** for authentication and application data. This backend does **not** access the database. Its main purpose is to keep the AI provider API key secure and provide a small server-side proxy for AI-powered features.

### What this backend handles

- 🤖 AI-generated What-If explanations
- 🎙️ Voice-to-text transcription
- 🧠 Voice-based borrower/lender form extraction
- 🔐 Secure server-side access to the Groq API

The backend is built with **Node.js + Express** and uses **Groq** for both language-model and speech-to-text functionality.

---

## Architecture

```text
React Frontend
      │
      ├── Supabase ──────────────► Authentication + Database
      │
      │
      └── Express Backend
                │
                ├── What-If Insight ──► Groq LLM
                │
                └── Voice
                     ├── Whisper ─────► Speech → Text
                     └── Groq LLM ────► Text → Structured Fields
```

The Groq API key stays on the backend and is never exposed to the browser.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express | Backend API server |
| Groq | AI inference |
| Whisper | Speech-to-text |
| CORS | Frontend access control |
| dotenv | Environment variable management |

---

## Getting Started

### 1. Navigate to the backend

```bash
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend` directory:

```env
GROQ_API_KEY=your_groq_api_key

GROQ_MODEL=openai/gpt-oss-20b
GROQ_TRANSCRIBE_MODEL=whisper-large-v3-turbo

PORT=3001
FRONTEND_URL=http://localhost:5173
```

`GROQ_MODEL` and `GROQ_TRANSCRIBE_MODEL` are optional because the backend provides defaults.

> **Never commit `.env` or expose your Groq API key publicly.**

---

## Running the Server

### Development

```bash
npm run dev
```

The development server uses Node's watch mode and automatically restarts when files change.

### Production

```bash
npm start
```

By default, the backend runs on:

```text
http://localhost:3001
```

---

# API Routes

## 1. Health Check

### `GET /api/health`

Used to verify that the backend is running.

### Response

```json
{
  "ok": true
}
```

---

# What-If AI Insight

## `POST /api/whatif/insight`

The What-If simulator performs the actual financial calculations on the frontend.

The backend **does not calculate or modify the financial result**.

Instead, it receives the already-computed scenario and asks the Groq model to explain what the result means in plain English.

### Request

```json
{
  "mode": "borrower",
  "inputs": {
    "income": 12000,
    "floor": 2000,
    "target": 5000,
    "ceiling": 7000
  },
  "result": {
    "recommendedPayment": 4800
  }
}
```

Optional borrower or lender context can also be supplied.

```json
{
  "mode": "borrower",
  "inputs": {},
  "result": {},
  "borrower": {},
  "lender": {}
}
```

### Response

```json
{
  "insight": "..."
}
```

The model is instructed to:

- Treat the simulator's numbers as ground truth
- Explain the scenario in simple language
- Provide one practical recommendation
- Use borrower/lender context when relevant
- Use Indian Rupees (`₹`)
- Avoid recomputing or contradicting the simulator's results

This keeps the **financial logic deterministic** while using AI as an explanation layer.

---

# Voice AI

The voice feature uses a two-step pipeline:

```text
User speaks
     ↓
Browser records audio
     ↓
/api/voice/transcribe
     ↓
Groq Whisper
     ↓
Transcript
     ↓
/api/voice/extract
     ↓
Groq LLM
     ↓
Structured form fields
     ↓
User reviews/edits
     ↓
Normal form submission
```

Voice input does **not** automatically submit a form.

---

## 2. Speech-to-Text

### `POST /api/voice/transcribe`

Accepts the raw audio recorded by the browser.

Supported browser recordings include formats such as:

- `audio/webm`
- `audio/mp4`

The backend receives the raw audio body and forwards it to Groq's OpenAI-compatible transcription API.

### Default model

```text
whisper-large-v3-turbo
```

### Response

```json
{
  "text": "Add a borrower named Rahul with a loan amount of 50000"
}
```

The transcription prompt allows English, Hindi, and mixed Hindi-English speech.

If no usable speech is detected, the endpoint returns:

```text
422 Unprocessable Entity
```

---

# 3. Voice Form Extraction

### `POST /api/voice/extract`

Converts a transcript into structured fields for either a borrower or lender form.

### Request

```json
{
  "transcript": "Add Rahul, phone number 9876543210, loan amount 50000",
  "kind": "borrower"
}
```

`kind` must be either:

```text
borrower
```

or

```text
lender
```

### Borrower extraction fields

```text
name
phone
email
address
loanAmount
interestRate
startDate
dueDate
status
note
initialNote
```

### Lender extraction fields

```text
lenderName
lenderPhone
lenderEmail
lenderAddress
loanAmount
interestRate
startDate
dueDate
status
note
initialNote
```

### Response

```json
{
  "fields": {
    "name": "Rahul",
    "phone": "9876543210",
    "email": "",
    "address": "",
    "loanAmount": "50000",
    "interestRate": "",
    "startDate": "2026-09-05",
    "dueDate": "",
    "status": "active",
    "note": "",
    "initialNote": ""
  },
  "transcript": "Add Rahul, phone number 9876543210, loan amount 50000"
}
```

The backend only returns recognized schema fields and converts extracted values to strings so they can be directly used by the frontend form state.

If information is not present in the transcript, the model is instructed to return an empty string rather than inventing a value.

---

# Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GROQ_API_KEY` | Yes | — | Authenticates requests to Groq |
| `GROQ_MODEL` | No | `openai/gpt-oss-20b` | LLM used for What-If insights and extraction |
| `GROQ_TRANSCRIBE_MODEL` | No | `whisper-large-v3-turbo` | Speech-to-text model |
| `PORT` | No | `3001` | Express server port |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed frontend origin for CORS |

---

# Error Handling

The API returns appropriate HTTP errors for common failures.

Examples include:

```text
400 — Invalid or missing request data
422 — No usable speech detected
500 — Server configuration/internal error
502 — AI provider request failed
```

The backend does not expose the underlying Groq API response directly to the frontend when an AI provider request fails.

---

# Security

The backend exists primarily to protect the Groq API key.

```text
❌ React → Groq directly
        ↑
     API key exposed

✅ React → Express → Groq
                  ↑
             API key protected
```

The `.env` file is excluded through `.gitignore`:

```gitignore
node_modules
.env
```

Before publishing the project:

- Never commit `.env`
- Never put `GROQ_API_KEY` in frontend code
- Use environment variables for secrets
- Rotate any API keys that have previously been exposed

---

# Project Structure

```text
backend/
│
├── routes/
│   ├── whatif.js       # What-If AI insight endpoint
│   └── voice.js        # Voice transcription + extraction
│
├── server.js           # Express server and middleware
├── package.json
├── package-lock.json
├── .gitignore
└── .env                # Local secrets — never commit
```

---

# Design Principle

The backend intentionally stays lightweight.

### Financial calculations

Handled deterministically by the frontend simulator.

```text
Financial logic
      ↓
Deterministic calculation
      ↓
Scenario result
```

### AI

Used for:

```text
Natural language
      ↓
AI interpretation
      ↓
Plain-English explanation
```

and:

```text
Voice
 ↓
Speech-to-text
 ↓
Structured extraction
```

This separation prevents the AI model from becoming the source of truth for financial calculations.

---

## Backend Responsibilities

| Responsibility | Backend |
|---|---|
| Authentication | ❌ |
| Database | ❌ |
| Financial calculations | ❌ |
| What-If explanation | ✅ |
| Speech-to-text | ✅ |
| Voice form extraction | ✅ |
| Groq API key protection | ✅ |
| CORS | ✅ |

Supabase remains responsible for authentication, database access, and Row Level Security in the main application.

---

## Future Improvements

Potential backend improvements include:

- Request authentication between frontend and backend
- Rate limiting for AI endpoints
- Input-size and request validation
- AI usage monitoring
- Structured logging
- Retry/fallback handling for AI provider failures
- Production deployment configuration
- Additional supported voice languages
- Streaming AI responses where useful

---

## License

Part of the **Adaptive Repayment** project.
