# Backend — AI proxy

This is *not* the app's main data layer — Supabase is (the frontend talks
to it directly for auth and data, protected by Row Level Security). This
backend exists purely to hold secret API keys that must never reach the
browser, starting with the AI provider key.

AI provider is Google **Gemini**, called server-side via the Generative
Language REST API (`generateContent`) — for both the What-If insight
explainer and the voice feature (speech-to-text via Gemini's audio
understanding, then structured extraction from the transcript). One
provider, one key, for everything AI-related in this backend.

## Setup

```bash
cd backend
npm install
cp .env .env.local   # or just edit .env directly — see note below
# fill in GEMINI_API_KEY — https://aistudio.google.com/apikey
npm run dev
```

Runs on `http://localhost:3001` by default.

## Routes

- `GET /api/health` — sanity check
- `POST /api/whatif/insight` — takes the What-If simulator's already-computed
  scenario (inputs + result from `src/lib/simulator.ts`), optionally plus
  `borrower`/`lender` context objects (credit passport, trust score, repayment
  history, portfolio stats — whatever the frontend has on hand), and returns
  a plain-English Gemini explanation + recommendation grounded in all of it.
  The model is given the numbers as ground truth — it explains and contextualizes
  them, it doesn't recompute them.
- `POST /api/voice/transcribe` — body is a raw audio clip (`audio/webm`,
  `audio/mp4`, etc. — whatever `MediaRecorder` produced in the browser, sent
  as the raw request body, not multipart). Sends it to Gemini's audio
  understanding and returns `{ text }`. No language is pinned in the prompt,
  so English, Hindi, and Hindi-English (Hinglish) speech all transcribe.
- `POST /api/voice/extract` — body `{ transcript, kind }` where `kind` is
  `"borrower"` or `"lender"`. Sends the transcript to Gemini with a schema
  for that form and returns `{ fields }` — a flat object matching the
  frontend form's field names exactly, ready to spread into its state. Used
  by the "Add Borrower"/"Add Lender by voice" flows: record → `/transcribe`
  → `/extract` → the form autofills, user reviews/edits, then submits
  normally — nothing is auto-submitted from voice alone.

## Env vars

See `.env`. `GEMINI_API_KEY` is the only one that's required — it's used by
`/api/whatif/insight` and both `/api/voice` routes. The server starts fine
without it, but those routes return an error until it's set. `GEMINI_MODEL`
is optional and has a sane default.
