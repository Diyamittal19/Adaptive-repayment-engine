import { Router } from "express";

const router = Router();

// The frontend already computes the actual numbers deterministically
// (src/lib/simulator.ts) — that math is instant and free, so sliders
// stay responsive with no network call on every drag. This endpoint
// is only called when the user explicitly asks for an AI explanation
// of a scenario they've already landed on (see the "Get AI insight"
// button in WhatIf.tsx). We hand the AI the *already-computed* result
// as grounding, and ask it to explain/advise in plain English —
// we never ask it to invent the numbers itself.
// Model is configurable via env (defaults to the fast/cheap Flash tier —
// plenty for a 3-5 sentence explainer). See backend/.env.example.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

router.post("/insight", async (req, res) => {
  const { mode, inputs, result, borrower, lender } = req.body || {};

  if (!mode || !inputs || !result) {
    return res.status(400).json({ error: "mode, inputs, and result are required" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
  }

  // Extra context beyond the raw scenario numbers, when the frontend has it
  // to send: the borrower's credit passport / repayment history for an
  // individual scenario, or the lender's portfolio/trust info for a
  // portfolio-wide one. All optional — the route still works with just
  // mode/inputs/result, same as before.
  const contextLines = [];
  if (borrower) {
    contextLines.push(`Borrower context (ground truth, do not contradict): ${JSON.stringify(borrower)}`);
  }
  if (lender) {
    contextLines.push(`Lender context (ground truth, do not contradict): ${JSON.stringify(lender)}`);
  }

  const prompt = `You are a plain-English financial explainer inside a lending app's "What-If" simulator.
A user just ran a ${mode === "portfolio" ? "portfolio-wide" : "single borrower"} stress-test scenario.

Scenario inputs: ${JSON.stringify(inputs)}
Computed result (already calculated, treat as ground truth — do not recompute or contradict these numbers): ${JSON.stringify(result)}
${contextLines.length ? `\n${contextLines.join("\n")}\n` : ""}
Write a short (3-5 sentence) plain-English explanation of what this scenario means in practice, and one concrete, actionable recommendation. Use the borrower/lender context above when it's relevant (e.g. repeat floor hits, past hardship requests, trust score) instead of only restating the scenario numbers. No headings, no bullet points, no markdown — plain prose only. Do not restate the raw numbers back verbatim; interpret them.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("Gemini API error:", response.status, detail);
      return res.status(502).json({ error: "AI provider request failed" });
    }

    const data = await response.json();
    const insight = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("")
      ?.trim();

    if (!insight) {
      // Gemini returns candidates without text when it hits a safety block
      // or the max-token cap mid-thought — surface that distinctly.
      const finishReason = data.candidates?.[0]?.finishReason;
      console.error("Gemini returned no text. finishReason:", finishReason, JSON.stringify(data));
      return res.status(502).json({ error: "AI provider returned no text" });
    }

    res.json({ insight });
  } catch (err) {
    console.error("What-if insight error:", err);
    res.status(500).json({ error: "Failed to generate insight" });
  }
});

export default router;
