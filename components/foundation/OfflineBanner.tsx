"use client";

import { CloudOff } from "lucide-react";
import { useEffect, useState } from "react";

import useOnline from "@/hooks/useOnline";
import useTranslation from "@/hooks/i18n/useTranslation";
import { readOutbox, subscribeToOutbox } from "@/lib/offline/vocabulary";
import { insertValues } from "@/lib/utils";

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
  const online = useOnline();
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

  if (online) return null;

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
        <p className="text-[13px] font-semibold text-[var(--accent-amber-deep)]">
          {copy.title}
        </p>

        <p className="mt-0.5 text-[12px] leading-5 text-ink-soft">
          {copy.body}
        </p>

        {waiting ? (
          <p className="mt-1 text-[11px] font-medium text-ink-faint">
            {waiting}
          </p>
        ) : null}
      </div>
    </div>
  );
}
