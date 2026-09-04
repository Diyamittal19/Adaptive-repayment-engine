// Adaptive Repayment — backend
//
// Why this exists at all: the frontend talks to Supabase directly for
// auth and data (Row Level Security handles who can see what, so the
// Supabase anon key is safe to ship in the browser bundle). An AI
// provider's API key is NOT safe to ship in the browser — anyone could
// read it out of the JS bundle and run up charges on your account. So
// this backend's only job is to hold that secret key and act as a thin
// proxy: the frontend calls this server, this server calls the AI
// provider, and the key never leaves this machine/process.
//
// Nothing here touches the database — that's still all Supabase,
// called directly from the frontend.

import "dotenv/config";
import express from "express";
import cors from "cors";
import whatifRouter from "./routes/whatif.js";
import voiceRouter from "./routes/voice.js";

const app = express();

// NOTE: express.json() only parses bodies whose Content-Type is
// application/json, so it's a no-op (just calls next()) for the raw
// audio/webm bytes POSTed to /api/voice/transcribe — that route parses
// its own body with express.raw(). Order here doesn't need to change.
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/whatif", whatifRouter);

<<<<<<< HEAD
// Voice: POST /api/voice/transcribe (audio -> text) and
// POST /api/voice/extract (text -> structured form fields). Both via
// Gemini — see routes/voice.js for details.
app.use("/api/voice", voiceRouter);
=======
// Voice endpoints go here once we've settled what "voice" means for
// this app (see backend/routes/voice.js for the placeholder + notes).
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI backend running at http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
<<<<<<< HEAD
      "⚠️  GEMINI_API_KEY is not set — /api/whatif/insight and both /api/voice routes will fail until it's added to backend/.env"
=======
      "⚠️  GEMINI_API_KEY is not set — /api/whatif/insight will fail until it's added to backend/.env"
>>>>>>> c5a36b1fdb84f54263bcf32e76d555fde8d95a50
    );
  }
});
