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
// Model is configurable via env (defaults to a fast open-weight model
// on Groq's free tier — plenty for a 3-5 sentence explainer). Check
// console.groq.com/docs/models if this default ever 404s on you.
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

router.post("/insight", async (req, res) => {
  const { mode, inputs, result, borrower, lender } = req.body || {};

  if (!mode || !inputs || !result) {
    return res.status(400).json({ error: "mode, inputs, and result are required" });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY is not configured on the server" });
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
Write a short (3-5 sentence) plain-English explanation of what this scenario means in practice, and one concrete, actionable recommendation. Use the borrower/lender context above when it's relevant (e.g. repeat floor hits, past hardship requests, trust score) instead of only restating the scenario numbers. No headings, no bullet points, no markdown — plain prose only. Do not restate the raw numbers back verbatim; interpret them.
IMPORTANT RULES:
- All monetary values are in Indian Rupees (INR).
- Always use the ₹ symbol, never the $ symbol.
- Never convert INR to USD or any other currency.
- Use Indian-style number formatting when appropriate, such as ₹1,50,000.
- Give practical, easy-to-understand financial advice.

Provide the response clearly and concisely.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Groq API error:", response.status, detail);
      return res.status(502).json({ error: "AI provider request failed" });
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content?.trim();

    if (!insight) {
      // Groq returns a choice with empty content when it hits the
      // token cap mid-thought — surface that distinctly rather than
      // a generic 500.
      const finishReason = data.choices?.[0]?.finish_reason;
      console.error("Groq returned no text. finish_reason:", finishReason, JSON.stringify(data));
      return res.status(502).json({ error: "AI provider returned no text" });
    }

    res.json({ insight });
  } catch (err) {
    console.error("What-if insight error:", err);
    res.status(500).json({ error: "Failed to generate insight" });
  }
});

export default router;
