// Voice feature — two small jobs, chained together, both handled by
// Gemini (the same model/key already used by routes/whatif.js — no
// second AI provider needed):
//
//   1. Speech → text   (Gemini's audio understanding — send the audio
//      clip straight to generateContent and ask for a transcript back)
//   2. Text → structured form fields   (Gemini again, text-only, with a
//      schema describing the target form)
//
// The frontend records a clip with MediaRecorder, POSTs the raw audio
// bytes to /transcribe, gets text back, then (for the "fill this form by
// voice" flows) POSTs that text to /extract along with which form it's
// for, and gets back a flat object of field values it merges into its
// existing form state. The user always sees the filled-in fields before
// submitting — this never auto-submits anything on its own.
//
// Both steps run server-side, same reasoning as whatif.js: the Gemini
// API key must never reach the browser bundle.

import { Router } from "express";
import express from "express";

const router = Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

// A single unmistakable sentinel Gemini returns when the clip has no
// speech in it — much more reliable to check for than "is the transcript
// empty", since a model can preface an empty transcript with filler text.
const NO_SPEECH_SENTINEL = "[NO_SPEECH]";

// ── 1. Speech-to-text (Gemini audio understanding) ──────────────────────
// Body is the raw audio blob (audio/webm from most browsers, audio/mp4 on
// Safari/iOS) — not multipart/form-data, so express.raw() reads it
// straight into a Buffer with no extra dependency (multer etc.) needed.
router.post("/transcribe", express.raw({ type: "*/*", limit: "20mb" }), async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
  }

  const audio = req.body;
  if (!Buffer.isBuffer(audio) || audio.length === 0) {
    return res.status(400).json({ error: "No audio received" });
  }

  // Gemini's officially documented inline-audio formats are WAV, MP3,
  // AIFF, AAC, OGG and FLAC — audio/webm (what most browsers record) and
  // audio/mp4 (Safari) aren't on that list, but Gemini accepts them in
  // practice. If Gemini ever starts rejecting a given browser's mime
  // type, the fix is a client-side re-encode before upload, not this
  // route — this route just relays whatever content-type it's handed.
  const mimeType = req.headers["content-type"] || "audio/webm";

  const prompt =
    "Transcribe the speech in this audio clip exactly as spoken. The speaker may use English, Hindi, or a mix of both (Hinglish) — transcribe in whichever script/language they used. " +
    `Return ONLY the transcript text — no preamble, no quotes, no commentary. If there is no discernible speech in the clip, return exactly: ${NO_SPEECH_SENTINEL}`;

  try {
    const response = await fetch(GEMINI_URL(GEMINI_MODEL), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }, { inlineData: { mimeType, data: audio.toString("base64") } }],
          },
        ],
        generationConfig: { maxOutputTokens: 512, temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Gemini transcribe error:", response.status, detail);
      return res.status(502).json({ error: "Speech-to-text request failed" });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("")
      ?.trim();

    if (!text || text.includes(NO_SPEECH_SENTINEL)) {
      return res.status(422).json({ error: "Didn't catch any speech in that recording — try again" });
    }

    res.json({ text });
  } catch (err) {
    console.error("Transcribe error:", err);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

// ── 2. Structured extraction ────────────────────────────────────────────
// One schema per form this feature fills. Keys are exactly the field
// names the frontend forms already use in their `form` state, so the
// response can be spread straight into it with no remapping.
const SCHEMAS = {
  borrower: {
    description: "a lender adding a new borrower to their manual ledger",
    fields: {
      name: "borrower's full name",
      phone: "phone number, digits and + only, as spoken",
      email: "email address if mentioned, else empty string",
      address: "street/city if mentioned, else empty string",
      loanAmount: "loan amount in INR as a plain digit string, no currency symbol or commas (e.g. \"50000\")",
      interestRate: "annual interest rate as a plain number string (e.g. \"12\"), empty string if not mentioned",
      startDate: "loan start date as YYYY-MM-DD, resolving relative phrases (\"today\", \"last Monday\") against today's date",
      dueDate: "due/repayment date as YYYY-MM-DD if mentioned, else empty string",
      status: "one of exactly: active, paid, overdue, written-off, settled-early — default \"active\" unless another is clearly implied",
      note: "loan purpose if mentioned (e.g. \"home renovation\"), else empty string",
      initialNote: "a short note on the disbursal transaction if mentioned, else empty string",
    },
  },
  lender: {
    description: "a borrower adding a new lender to their manual ledger",
    fields: {
      lenderName: "lender's full name or business name",
      lenderPhone: "phone number, digits and + only, as spoken",
      lenderEmail: "email address if mentioned, else empty string",
      lenderAddress: "street/city if mentioned, else empty string",
      loanAmount: "loan amount in INR as a plain digit string, no currency symbol or commas (e.g. \"100000\")",
      interestRate: "annual interest rate as a plain number string (e.g. \"12\"), empty string if not mentioned",
      startDate: "loan start date as YYYY-MM-DD, resolving relative phrases (\"today\", \"last Monday\") against today's date",
      dueDate: "due/repayment date as YYYY-MM-DD if mentioned, else empty string",
      status: "one of exactly: active, paid, overdue, written-off, settled-early — default \"active\" unless another is clearly implied",
      note: "loan purpose if mentioned (e.g. \"home renovation\"), else empty string",
      initialNote: "a short note on the receipt transaction if mentioned, else empty string",
    },
  },
};

const STATUS_VALUES = new Set(["active", "paid", "overdue", "written-off", "settled-early"]);

router.use(express.json());

router.post("/extract", async (req, res) => {
  const { transcript, kind } = req.body || {};
  const schema = SCHEMAS[kind];

  if (!transcript || typeof transcript !== "string" || !schema) {
    return res.status(400).json({ error: "transcript and a valid kind ('borrower' or 'lender') are required" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
  }

  const today = new Date().toISOString().slice(0, 10);
  const fieldLines = Object.entries(schema.fields)
    .map(([key, desc]) => `  "${key}": <${desc}>`)
    .join(",\n");

  const prompt = `You are filling out a form for ${schema.description} in a lending app, from a spoken (transcribed) description. The speaker may mix Hindi and English (Hinglish) — understand it regardless of language.

Today's date is ${today} — resolve any relative dates against it.

Transcript: "${transcript.replace(/"/g, "'")}"

Respond with ONLY a single valid JSON object, no markdown fences, no commentary, with exactly these keys:
{
${fieldLines}
}

If a detail wasn't mentioned, use an empty string "" for that field — never invent values, never omit keys.`;

  try {
    const response = await fetch(GEMINI_URL(GEMINI_MODEL), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.1, responseMimeType: "application/json" },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Gemini API error:", response.status, detail);
      return res.status(502).json({ error: "AI provider request failed" });
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("")
      ?.trim();

    if (!raw) {
      const finishReason = data.candidates?.[0]?.finishReason;
      console.error("Gemini returned no text. finishReason:", finishReason, JSON.stringify(data));
      return res.status(502).json({ error: "AI provider returned no text" });
    }

    let parsed;
    try {
      // responseMimeType: "application/json" should make this a clean
      // parse, but strip stray code fences defensively in case the model
      // wraps it anyway.
      parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim());
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON:", raw);
      return res.status(502).json({ error: "Couldn't understand that — try rephrasing" });
    }

    // Only pass through known keys, coerced to strings (matches the
    // frontend forms, which hold every field — numbers included — as
    // string state until submit).
    const fields = {};
    for (const key of Object.keys(schema.fields)) {
      const value = parsed[key];
      fields[key] = value === null || value === undefined ? "" : String(value);
    }
    if (fields.status && !STATUS_VALUES.has(fields.status)) {
      fields.status = "active";
    }

    res.json({ fields, transcript });
  } catch (err) {
    console.error("Voice extract error:", err);
    res.status(500).json({ error: "Failed to process that" });
  }
});

export default router;
