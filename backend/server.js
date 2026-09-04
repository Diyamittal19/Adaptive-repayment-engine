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

const app = express();

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

// Voice endpoints go here once we've settled what "voice" means for
// this app (see backend/routes/voice.js for the placeholder + notes).

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI backend running at http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "⚠️  GEMINI_API_KEY is not set — /api/whatif/insight will fail until it's added to backend/.env"
    );
  }
});
