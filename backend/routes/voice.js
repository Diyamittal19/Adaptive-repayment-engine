import { Router } from "express";
import express from "express";

const router = Router();

// Chat model, used for structured extraction (/extract). Groq's free
// tier — check console.groq.com/docs/models if this default ever
// 404s on you.
const GROQ_CHAT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
// Dedicated speech-to-text model (Whisper, hosted on Groq's LPU
// hardware), used for /transcribe. "turbo" is faster/cheaper; swap to
// "whisper-large-v3" for higher accuracy if needed.
const GROQ_TRANSCRIBE_MODEL = process.env.GROQ_TRANSCRIBE_MODEL || "whisper-large-v3-turbo";

// A single unmistakable sentinel we ask the model to return when the clip
// has no speech in it — much more reliable to check for than "is the
// transcript empty", since a model can preface an empty transcript with
// filler text. (Whisper-family transcription models don't take a system
// prompt, so this is enforced via the `prompt` hint param plus a
// post-hoc check on very short/blank output.)
const NO_SPEECH_SENTINEL = "[NO_SPEECH]";

// ── 1. Speech-to-text (Groq-hosted Whisper) ──────────────────────────────
// Body is the raw audio blob (audio/webm from most browsers, audio/mp4 on
// Safari/iOS) — not multipart/form-data from the client, so express.raw()
// reads it straight into a Buffer with no extra dependency (multer etc.)
// needed. Groq's /v1/audio/transcriptions endpoint (OpenAI-compatible)
// itself requires a multipart upload, so we re-wrap the buffer into a
// FormData/Blob here before forwarding it.
router.post("/transcribe", express.raw({ type: "*/*", limit: "20mb" }), async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY is not configured on the server" });
  }

  const audio = req.body;
  if (!Buffer.isBuffer(audio) || audio.length === 0) {
    return res.status(400).json({ error: "No audio received" });
  }

  // Whatever the browser recorded — audio/webm (Chrome/Firefox/Android) or
  // audio/mp4 (Safari/iOS) — Whisper accepts both.
  const mimeType = req.headers["content-type"] || "audio/webm";
  const extension = mimeType.includes("mp4") ? "mp4" : "webm";

  try {
    const form = new FormData();
    form.append("file", new Blob([audio], { type: mimeType }), `audio.${extension}`);
    form.append("model", GROQ_TRANSCRIBE_MODEL);
    // Speaker may use English, Hindi, or a mix of both (Hinglish) — no
    // `language` param is pinned, so the model auto-detects/transcribes
    // in whichever script the speaker used. `prompt` is just a hint, not
    // a strict instruction, but nudges style/vocabulary.
    form.append("prompt", "The speaker may use English, Hindi, or a mix of both (Hinglish).");
    form.append("response_format", "json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Groq transcribe error:", response.status, detail);
      return res.status(502).json({ error: "Speech-to-text request failed" });
    }

    const data = await response.json();
    const text = data.text?.trim();

    if (!text || text === NO_SPEECH_SENTINEL) {
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

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY is not configured on the server" });
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
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_CHAT_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 512,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Groq API error:", response.status, detail);
      return res.status(502).json({ error: "AI provider request failed" });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      const finishReason = data.choices?.[0]?.finish_reason;
      console.error("Groq returned no text. finish_reason:", finishReason, JSON.stringify(data));
      return res.status(502).json({ error: "AI provider returned no text" });
    }

    let parsed;
    try {
      // response_format: json_object should make this a clean parse,
      // but strip stray code fences defensively in case the model
      // wraps it anyway.
      parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim());
    } catch (parseErr) {
      console.error("Failed to parse Groq JSON:", raw);
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
