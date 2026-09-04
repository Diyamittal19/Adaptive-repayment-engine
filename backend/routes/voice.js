// Not implemented yet — "voice model" can mean a few genuinely different
// things, and each needs a different provider/SDK and different frontend
// wiring, so this is left as a placeholder until that's decided:
//
// 1. Speech-to-text (voice IN) — e.g. a borrower speaks their situation
//    ("my income dropped this month") instead of using sliders/forms.
//    Needs an STT provider (e.g. OpenAI Whisper API) and a browser mic
//    capture flow.
//
// 2. Text-to-speech (voice OUT) — the app reads a result or AI insight
//    aloud. Needs a TTS provider (e.g. ElevenLabs, or the browser's
//    built-in Web Speech API for a free/simple version with lower
//    quality voices).
//
// 3. Full conversational voice agent — a live back-and-forth voice
//    conversation (e.g. OpenAI's Realtime API). Much bigger scope:
//    needs a persistent connection (WebSocket/WebRTC), not a simple
//    request/response route like the one below.
//
// Once it's clear which of these (or which combination), this file
// gets filled in following the same pattern as routes/whatif.js —
// receive a request from the frontend, call the provider using a
// server-side key from .env, return the result.

import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  res.status(501).json({ error: "Voice feature not implemented yet" });
});

export default router;
