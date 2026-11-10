"use client";

import { CloudOff, SignalLow } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useNetworkQuality } from "@/hooks/useOnline";
import useTranslation from "@/hooks/i18n/useTranslation";
import { readOutbox, subscribeToOutbox } from "@/lib/offline/vocabulary";
import { insertValues } from "@/lib/utils";

/* How long the weak-signal label stays before it fades, and the fade. */
const PILL_SHOWN_MS = 4_000;
const PILL_FADE_MS = 300;

/*
 * A weak signal says so with a small label floating over the top of the
 * screen, which fades after a few seconds (Chi, 2026-11-10: "浮動小標籤，不
 * 推畫面"). Not the card below: a weak signal comes and goes, and a card
 * appearing and leaving pushed the whole page down and back each time.
 * Portalled to the body so nothing on the page moves, and nothing it
 * floats over loses a tap.
 */
function WeakSignalLabel({ text }: { text: string }) {
  const [phase, setPhase] = useState<"entering" | "shown" | "leaving" | "gone">("entering");

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase("shown"), 0),
      window.setTimeout(() => setPhase("leaving"), PILL_SHOWN_MS),
      window.setTimeout(() => setPhase("gone"), PILL_SHOWN_MS + PILL_FADE_MS),
    ];
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);

  if (phase === "gone") return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 z-[90] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--accent-amber)]/30 bg-[var(--surface)] px-3.5 py-1.5 shadow-sm transition-opacity duration-300 motion-reduce:transition-none"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
        opacity: phase === "shown" ? 1 : 0,
      }}
    >
      <SignalLow size={14} strokeWidth={1.8} className="shrink-0 text-[var(--accent-amber-deep)]" />
      <span className="text-[0.75rem] font-medium text-[var(--accent-amber-deep)]">{text}</span>
    </div>,
    document.body,
  );
}

/**
 * Says so, once, when there is no network.
 *
 * Most of the app carries on without one now — words, reviews and the last
 * batch of stories are all on the device — so this is not an error state
 * and does not read like one. What it exists to prevent is the reader
 * concluding the app is broken when the camera or a new lookup does
 * nothing: those need a model, a model needs a connection, and that is
 * worth one line rather than a spinner that never resolves.
 *
 * It also counts what is waiting, because "saved" and "sent" are different
 * promises and only one of them has been kept yet.
 */
export default function OfflineBanner() {
  /*
   * Weak is its own notice (2026-11-10). The network is there but too slow
   * to wait for, so the screen is showing the device's copy: worth saying,
   * and not the same way as having no network at all.
   */
  const quality = useNetworkQuality();
  const online = quality !== "offline";
  const { t } = useTranslation();
  const copy = t.offline;

  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (online) {
      /*
       * Cleared rather than left at its last value: coming back online is
       * when the outbox drains, and a stale count reads as work stuck.
       *
       * Deferred by a microtask because an effect may not reach a state
       * write synchronously — the repo convention, and the same reason the
       * read below is allowed to set state only after its await.
       */
      queueMicrotask(() => setPending(0));
      return;
    }

    let active = true;

    function count() {
      void readOutbox().then((queued) => {
        if (active) setPending(queued.length);
      });
    }

    count();

    /*
     * Told when the queue changes rather than asking on a timer. A poll is
     * a timer running for as long as the reader is offline — the exact
     * situation where the phone is also short of battery — and a count up
     * to four seconds stale on a screen someone is watching while they
     * save something.
     */
    const unsubscribe = subscribeToOutbox(count);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [online]);

  if (quality === "good") return null;
  if (quality === "weak") return <WeakSignalLabel text={copy.weakLabel} />;

  const waiting =
    pending === 0
      ? null
      : pending === 1
        ? copy.pendingOne
        : insertValues(copy.pendingMany, { count: String(pending) });

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto mb-3 flex max-w-2xl items-start gap-3 rounded-2xl border border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/[0.08] px-4 py-3"
    >
      <CloudOff
        size={16}
        strokeWidth={1.8}
        className="mt-0.5 shrink-0 text-[var(--accent-amber-deep)]"
      />

      <div className="min-w-0">
        <p className="text-[0.8125rem] font-semibold text-[var(--accent-amber-deep)]">
          {copy.title}
        </p>

        <p className="mt-0.5 text-[0.75rem] leading-5 text-ink-soft">
          {copy.body}
        </p>

        {waiting ? (
          <p className="mt-1 text-[0.6875rem] font-medium text-ink-faint">
            {waiting}
          </p>
        ) : null}
      </div>
    </div>
  );
}
