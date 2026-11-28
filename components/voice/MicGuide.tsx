"use client";

import { Check, LoaderCircle, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { MicPlatform } from "@/lib/i18n/types";
import { detectMicPlatform, tryMicrophone } from "@/lib/voice/micAccess";

/* =========================================================
   Where to turn the microphone on (Chi, 2026-11-27: 我不知道要去哪裡打開
   這設定)

   The steps for the kind of device this is, first and numbered, with the
   other kinds a tap away for anyone who guessed differently; and a key that
   tries the microphone again from inside the tap, so the browser can ask
   right there. Opened from a voice notice, from Yumi in her earmuffs, and
   from Settings' check-up.
   ========================================================= */

const PLATFORMS: readonly MicPlatform[] = [
  "ios-home",
  "ios-safari",
  "ios-app",
  "android",
  "mac-safari",
  "desktop-chrome",
  "desktop-firefox",
];

type TryState = "idle" | "trying" | "works" | "denied" | "busy" | "missing";

export function MicGuideSteps({ cosmic = false }: { cosmic?: boolean }) {
  const { t } = useTranslation();
  const copy = t.lexicon.voice.guide;
  const [platform, setPlatform] = useState<MicPlatform>(() => detectMicPlatform());
  const steps = copy.steps[platform];

  return (
    <div className="space-y-4">
      <p className="text-sm leading-5 text-ink-soft">
        {copy.youAreOn}{" "}
        <strong className="font-semibold text-ink-strong">{copy.platforms[platform]}</strong>
      </p>
      <ol className="space-y-2.5" aria-label={copy.platforms[platform]}>
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-[0.9375rem] leading-6 text-ink-strong">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                cosmic ? "border border-[var(--cosmic-cyan)] text-[var(--cosmic-cyan)]" : "bg-black text-white"
              }`}
            >
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div>
        <p className="mb-2 text-xs text-ink-faint">{copy.other}</p>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.filter(other => other !== platform).map(other => (
            <button
              key={other}
              type="button"
              onClick={() => setPlatform(other)}
              className="rounded-full border border-black/10 px-3 py-1 text-xs text-ink-soft transition active:scale-95"
            >
              {copy.platforms[other]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The guide as a sheet of its own: components/voice/MicGuideHost.tsx. */
export default function MicGuideSheet({
  open,
  onClose,
  cosmic = false,
}: {
  open: boolean;
  onClose: () => void;
  cosmic?: boolean;
}) {
  const { t } = useTranslation();
  const copy = t.lexicon.voice.guide;
  const [state, setState] = useState<TryState>("idle");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const retry = async () => {
    setState("trying");
    const result = await tryMicrophone();
    if (result.ok) {
      setState("works");
      closeTimer.current = setTimeout(() => { setState("idle"); onClose(); }, 1_400);
      return;
    }
    setState(result.problem);
  };

  const message =
    state === "works" ? copy.works
      : state === "denied" ? copy.stillDenied
        : state === "busy" ? copy.busy
          : state === "missing" ? copy.missing
            : null;

  return (
    <BottomSheet
      open={open}
      onClose={() => { setState("idle"); onClose(); }}
      title={copy.title}
      description={copy.intro}
      footer={
        <div className="space-y-2">
          {message ? (
            <p role="status" className={`text-center text-sm ${state === "works" ? "text-emerald-700" : "text-[var(--accent-amber-deep)]"}`}>
              {message}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => { void retry(); }}
            disabled={state === "trying" || state === "works"}
            className="ob-key flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {state === "trying" ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            ) : state === "works" ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Mic size={16} aria-hidden="true" />
            )}
            {state === "trying" ? copy.trying : copy.retry}
          </button>
        </div>
      }
    >
      <MicGuideSteps cosmic={cosmic} />
    </BottomSheet>
  );
}
