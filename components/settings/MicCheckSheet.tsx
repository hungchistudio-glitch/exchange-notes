"use client";

import { Check, CircleAlert, LoaderCircle, Mic, RotateCw, Send } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import { MicGuideSteps } from "@/components/voice/MicGuide";
import useTranslation from "@/hooks/i18n/useTranslation";
import useCosmicMode from "@/hooks/useCosmicMode";
import { isOnline } from "@/hooks/useOnline";
import { transcribeSpeech } from "@/lib/lexicon/voiceLookup";
import { audioStuck, micDiagnostic, openMicrophone, sendMicDiagnostic, type MicFailure } from "@/lib/voice/micAccess";
import { meterStream } from "@/lib/voice/signal";

/* =========================================================
   The microphone check-up (Chi, 2026-11-27: 麥克風健檢)

   Three links between a voice and Yumi, each checked and named, so a
   reader who "can't use voice" learns which one is broken:
   1. permission — can the page open the microphone at all;
   2. sound — does a voice reach it (a muted headset passes step 1);
   3. hearing — does Yumi make words of it, the same request the voice
      search makes (it counts against the day's voice lookups).
   ========================================================= */

/* Long enough for a sentence; short enough to watch. */
const LISTEN_MS = 4_500;
/* levelFromRms's scale: a quiet room sits under 0.2, a voice well above. */
const VOICE_LEVEL = 0.35;

type Permission = "pending" | "checking" | "ok" | "denied" | "busy" | "missing";
type Sound = "pending" | "listening" | "ok" | "low";
type Hearing = "pending" | "checking" | { text: string } | "none" | "limit" | "offline";

function audioContext(): AudioContext | null {
  const scope = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Context = scope.AudioContext ?? scope.webkitAudioContext;
  try { return Context ? new Context() : null; } catch { return null; }
}

function record(stream: MediaStream, ms: number): Promise<Blob> {
  return new Promise(resolve => {
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { audioBitsPerSecond: 32_000 });
    } catch {
      try { recorder = new MediaRecorder(stream); } catch { resolve(new Blob()); return; }
    }
    const chunks: Blob[] = [];
    recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
    recorder.start();
    setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, ms);
  });
}

function Step({ label, state, children }: { label: string; state: "pending" | "busy" | "ok" | "bad"; children?: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          state === "ok" ? "bg-emerald-500 text-white"
            : state === "bad" ? "bg-[var(--accent-amber)] text-white"
              : "bg-black/[0.06] text-ink-soft"
        }`}
      >
        {state === "ok" ? <Check size={14} strokeWidth={2.4} />
          : state === "bad" ? <CircleAlert size={14} strokeWidth={2.2} />
            : state === "busy" ? <LoaderCircle size={14} className="animate-spin" />
              : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-semibold leading-6 text-ink-strong">{label}</p>
        {children ? <div className="mt-0.5 text-sm leading-5 text-ink-soft">{children}</div> : null}
      </div>
    </li>
  );
}

export default function MicCheckSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const copy = t.settings.microphone;
  const cosmic = useCosmicMode();
  const [permission, setPermission] = useState<Permission>("pending");
  const [sound, setSound] = useState<Sound>("pending");
  const [hearing, setHearing] = useState<Hearing>("pending");
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [stuck, setStuck] = useState(false);
  const [retriedNote, setRetriedNote] = useState(false);
  const running = useRef(false);
  const bar = useRef<HTMLSpanElement | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const run = async () => {
    if (running.current) return;
    running.current = true;
    setPermission("checking");
    setSound("pending");
    setHearing("pending");
    setDiagnostic(null);
    setSendState("idle");
    setStuck(false);
    setRetriedNote(false);
    /* A failed step's code: what the browser said, and the state around it. */
    const explain = (failure: MicFailure | null, extra: string[] = [], retried = false) => {
      void micDiagnostic(failure, retried).then(code => setDiagnostic([code, ...extra].join(" | ").slice(0, 500)));
    };
    // Inside the tap: iOS starts an AudioContext only from one.
    const context = audioContext();
    void context?.resume().catch(() => undefined);
    try {
      const tried = await openMicrophone();
      if (!tried.ok) {
        setPermission(tried.problem);
        setStuck(audioStuck(tried.failure));
        explain(tried.failure);
        void context?.close().catch(() => undefined);
        return;
      }
      setPermission("ok");
      setRetriedNote(tried.retried);
      setSound("listening");
      const stream = tried.stream;
      let peak = 0;
      void context?.resume().catch(() => undefined);
      const stopMeter = context
        ? meterStream(context, stream, level => {
            peak = Math.max(peak, level);
            bar.current?.style.setProperty("transform", `scaleX(${Math.max(0.04, level).toFixed(3)})`);
          })
        : () => {};
      const release = () => {
        stopMeter();
        tried.release();
        void context?.close().catch(() => undefined);
      };
      cleanup.current = release;
      const audio = await record(stream, LISTEN_MS);
      release();
      cleanup.current = null;
      // No meter at all (an old browser): the hearing step is the judge.
      const soundOk = peak >= VOICE_LEVEL || !context;
      setSound(soundOk ? "ok" : "low");
      const soundNote = `sound ${context ? peak.toFixed(2) : "no-meter"} bytes ${audio.size}`;

      if (!isOnline()) { setHearing("offline"); explain(null, [soundNote, "hearing offline"], tried.retried); return; }
      setHearing("checking");
      const heard = await transcribeSpeech(audio);
      setHearing(
        heard.outcome === "handled" ? { text: heard.text }
          : heard.outcome === "limit" ? "limit"
            : heard.outcome === "unavailable" ? (isOnline() ? "none" : "offline")
              : "none",
      );
      if (heard.outcome !== "handled" || !soundOk) explain(null, [soundNote, `hearing ${heard.outcome}`], tried.retried);
    } finally {
      running.current = false;
    }
  };

  const finished = typeof hearing === "object" || hearing === "none" || hearing === "limit" || hearing === "offline"
    || (permission !== "pending" && permission !== "checking" && permission !== "ok");
  const allGood = typeof hearing === "object" && sound === "ok";
  const busy = permission === "checking" || sound === "listening" || hearing === "checking";
  const permissionProblem = permission === "denied" || permission === "busy" || permission === "missing";

  return (
    <BottomSheet
      open={open}
      onClose={() => { if (!busy) onClose(); }}
      closeDisabled={busy}
      title={copy.checkTitle}
      description={copy.checkIntro}
      footer={
        <button
          type="button"
          onClick={() => { void run(); }}
          disabled={busy}
          className="ob-key flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
          {finished ? copy.again : copy.start}
        </button>
      }
    >
      <ol className="space-y-4" aria-live="polite">
        <Step
          label={copy.steps.permission}
          state={permission === "ok" ? "ok" : permissionProblem ? "bad" : permission === "checking" ? "busy" : "pending"}
        >
          {permission === "ok" ? copy.permissionOk
            : permission === "denied" ? t.lexicon.voice.micDenied
              : permission === "busy" ? t.lexicon.voice.micBusy
                : permission === "missing" ? t.lexicon.voice.micMissing
                  : null}
        </Step>
        <Step
          label={copy.steps.level}
          state={sound === "ok" ? "ok" : sound === "low" ? "bad" : sound === "listening" ? "busy" : "pending"}
        >
          {sound === "listening" ? (
            <>
              <span className="block">{copy.speakNow}</span>
              <span className="mt-2 block h-2 overflow-hidden rounded-full bg-black/[0.06]" aria-hidden="true">
                <span
                  ref={bar}
                  className={`block h-full origin-left rounded-full ${cosmic ? "bg-[var(--cosmic-cyan)]" : "bg-[var(--accent-amber)]"}`}
                  style={{ transform: "scaleX(0.04)", transition: "transform 80ms linear" }}
                />
              </span>
            </>
          ) : sound === "ok" ? copy.levelOk : sound === "low" ? copy.levelLow : null}
        </Step>
        <Step
          label={copy.steps.hearing}
          state={typeof hearing === "object" ? "ok" : hearing === "checking" ? "busy" : hearing === "pending" ? "pending" : "bad"}
        >
          {typeof hearing === "object" ? (
            <>{copy.hearingOk} <q className="text-ink-strong">{hearing.text}</q></>
          ) : hearing === "none" ? copy.hearingNone
            : hearing === "limit" ? copy.hearingLimit
              : hearing === "offline" ? copy.hearingOffline
                : null}
        </Step>
      </ol>

      {allGood ? (
        <p role="status" className="mt-5 text-sm font-semibold text-emerald-700">{copy.allGood}</p>
      ) : null}
      {retriedNote ? <p className="mt-2 text-xs text-ink-faint">{copy.retriedNote}</p> : null}

      {stuck ? (
        <div className="mt-6 rounded-2xl border border-[var(--accent-amber)]/40 p-4">
          <p className="text-sm leading-5 text-ink-strong">{t.lexicon.voice.guide.notSettings}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-ink-strong"
          >
            <RotateCw size={14} aria-hidden="true" />
            {t.lexicon.voice.guide.reload}
          </button>
        </div>
      ) : null}

      {diagnostic ? (
        <div className="mt-6">
          <p className="text-[0.9375rem] font-semibold text-ink-strong">{copy.diagnosticTitle}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{copy.diagnosticHint}</p>
          <code
            data-mic-diagnostic
            className="mt-2 block select-all break-words rounded-xl bg-black/[0.05] p-3 font-mono text-[0.6875rem] leading-4 text-ink-strong"
          >
            {diagnostic}
          </code>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={sendState === "sending" || sendState === "sent"}
              onClick={() => {
                setSendState("sending");
                void sendMicDiagnostic(diagnostic).then(ok => setSendState(ok ? "sent" : "failed"));
              }}
              className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-ink-strong disabled:opacity-60"
            >
              {sendState === "sending" ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
              {sendState === "sending" ? copy.sending : copy.send}
            </button>
            {sendState === "sent" || sendState === "failed" ? (
              <span role="status" className={`text-xs ${sendState === "sent" ? "text-emerald-700" : "text-[var(--accent-amber-deep)]"}`}>
                {sendState === "sent" ? copy.sent : copy.sendFailed}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {permission === "denied" && !stuck ? (
        <div className="mt-6 border-t border-black/10 pt-5">
          <p className="mb-3 text-[0.9375rem] font-semibold text-ink-strong">{copy.howTo}</p>
          <MicGuideSteps cosmic={cosmic} />
        </div>
      ) : null}
    </BottomSheet>
  );
}
