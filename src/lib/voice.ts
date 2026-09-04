// Client-side helpers for the voice feature. The heavy lifting happens
// server-side in backend/routes/voice.js — this file just calls those two
// endpoints, same pattern as the fetch in WhatIf.tsx.

function apiUrl() {
  return import.meta.env.VITE_API_URL || "http://localhost:3001";
}

/** True when the browser can actually record audio (mic permission API +
 *  MediaRecorder both exist). Used to hide voice buttons entirely on
 *  browsers/contexts that can't support them, rather than showing a
 *  button that always errors. */
export function isVoiceSupported() {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined"
  );
}

/** Sends a recorded audio clip to the backend and returns the
 *  transcript. Throws with a user-facing message on failure. */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const res = await fetch(`${apiUrl()}/api/voice/transcribe`, {
    method: "POST",
    headers: { "content-type": blob.type || "audio/webm" },
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't transcribe that — try again");
  return data.text as string;
}

export type VoiceFormKind = "borrower" | "lender";

/** Sends a transcript to the backend and returns a flat object of form
 *  field values (matching the target form's state shape exactly), via
 *  Gemini. Throws with a user-facing message on failure. */
export async function extractFormFields(
  transcript: string,
  kind: VoiceFormKind
): Promise<Record<string, string>> {
  const res = await fetch(`${apiUrl()}/api/voice/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transcript, kind }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't understand that — try again");
  return data.fields as Record<string, string>;
}
