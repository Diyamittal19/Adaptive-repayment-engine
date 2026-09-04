import { useCallback, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "stopping";

/** Thin wrapper around the browser's MediaRecorder API: start() asks for
 *  mic permission and begins recording, stop() ends it and resolves with
 *  the recorded clip as a Blob (or null if nothing was recorded). Only
 *  one recording happens at a time per hook instance, which matches every
 *  current use site (one mic button per form/field). */
export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : ""; // let the browser pick if neither is explicitly supported

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch (err) {
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setError(
        denied
          ? "Microphone access was blocked — allow it in your browser's site settings and try again."
          : "Couldn't access the microphone on this device."
      );
      setState("idle");
    }
  }, []);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      setState("stopping");
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
          : null;
        setState("idle");
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  /** Stop and discard without transcribing — used when the user closes a
   *  modal mid-recording. */
  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setState("idle");
  }, []);

  return { state, error, start, stop, cancel };
}
