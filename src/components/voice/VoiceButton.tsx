import { useState } from "react";
import { AlertCircle, Loader2, Mic, Square } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { isVoiceSupported, transcribeAudio } from "@/lib/voice";

type Props = {
  /** Called with the transcript once recording stops. Can be
   *  async (e.g. it also calls /api/voice/extract) — the button stays in
   *  its "processing" state until this resolves. */
  onTranscript: (text: string) => void | Promise<void>;
  /** Label shown on the idle button, e.g. "Speak" or "Fill by voice". */
  label?: string;
  /** Label shown while onTranscript is running, e.g. "Understanding…". */
  busyLabel?: string;
  className?: string;
  size?: "sm" | "md";
};

/** Self-contained mic button: click to record, click again to stop, then
 *  it transcribes the clip and hands the text to onTranscript. Renders
 *  nothing on browsers/contexts without mic support, so it never shows a
 *  control that can't work. */
export default function VoiceButton({ onTranscript, label = "Speak", busyLabel = "Working…", className = "", size = "md" }: Props) {
  const { state, error: recError, start, stop } = useVoiceRecorder();
  const [processing, setProcessing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  if (!isVoiceSupported()) return null;

  const recording = state === "recording" || state === "stopping";
  const busy = processing || state === "stopping";
  const error = transcribeError || recError;

  async function handleClick() {
    if (recording) {
      const blob = await stop();
      if (!blob) return;
      setProcessing(true);
      setTranscribeError(null);
      try {
        const text = await transcribeAudio(blob);
        await onTranscript(text);
      } catch (err) {
        setTranscribeError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setProcessing(false);
      }
      return;
    }
    setTranscribeError(null);
    await start();
  }

  const pad = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={recording}
        title={recording ? "Stop recording" : label}
        className={`inline-flex items-center gap-2 rounded-lg border font-medium transition-colors disabled:opacity-70 ${pad} ${
          recording
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border bg-card text-foreground hover:bg-secondary"
        } ${className}`}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : recording ? (
          <span className="relative flex size-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-destructive" />
          </span>
        ) : (
          <Mic className="size-4" />
        )}
        {busy ? busyLabel : recording ? (
          <span className="inline-flex items-center gap-1.5">
            Stop <Square className="size-3" />
          </span>
        ) : (
          label
        )}
      </button>
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
