# Backend — AI proxy

This is *not* the app's main data layer — Supabase is (the frontend talks
to it directly for auth and data, protected by Row Level Security). This
backend exists purely to hold secret API keys that must never reach the
browser, starting with the AI provider key.

AI provider is Google **Gemini**, called server-side via the Generative
Language REST API (`generateContent`).

## Setup

```bash
cd backend
npm install
cp .env.example .env
# fill in GEMINI_API_KEY in .env — get one at https://aistudio.google.com/apikey
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
- `POST /api/voice` — placeholder, not implemented. See `routes/voice.js` for
  the three different things "voice" could mean here and why the choice
  changes the implementation.

## Env vars

See `.env.example`. `GEMINI_API_KEY` is the only one that's required for
`/api/whatif/insight` to work; the server will start without it but that
route will return an error until it's set. `GEMINI_MODEL` is optional
(defaults to `gemini-2.5-flash`).
