"use client";

import { Flag } from "lucide-react";
import { useId, useState } from "react";

import StatusMessage from "@/components/foundation/feedback/StatusMessage";
import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { ReportSurface } from "@/lib/reports";
import { REPORT_LIMITS } from "@/lib/reports";

/* =========================================================
   Report a problem (Chi, 2026-11-16: 回報問題)

   A small flag beside a word, a news story or a game's word. It opens a
   sheet showing what the report is about, takes an optional note, and
   sends it to /api/reports; the app's owner reads them on /reports.
   ========================================================= */

type Phase = "idle" | "sending" | "sent" | "failed" | "limited";

type ReportProblemProps = {
  surface: ReportSurface;
  /** Which thing: "ko:도서관", a news card's id, "hangyumi:ja:旅行". */
  itemKey: string;
  /** What the reader was looking at, shown in the sheet and sent with it. */
  quoted: string;
  language?: string | null;
  className?: string;
};

export default function ReportProblem({ surface, itemKey, quoted, language = null, className = "" }: ReportProblemProps) {
  const { t } = useTranslation();
  const copy = t.reports;
  const noteId = useId();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");

  async function send() {
    setPhase("sending");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface, itemKey, language, quoted, note, page: window.location.pathname }),
      });
      setPhase(response.ok ? "sent" : response.status === 429 ? "limited" : "failed");
      if (response.ok) setNote("");
    } catch {
      setPhase("failed");
    }
  }

  function close() {
    setOpen(false);
    // A sent report's thanks is not shown again the next time it opens.
    if (phase !== "sending") setPhase("idle");
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-2 text-[0.75rem] font-medium text-ink-faint transition-colors hover:text-ink-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${className}`}
        data-report-surface={surface}
      >
        <Flag size={13} strokeWidth={1.8} aria-hidden="true" />
        {copy.button}
      </button>

      <BottomSheet open={open} onClose={close} title={copy.title} description={copy.description} maxHeight="min(34rem, 88dvh)">
        <div className="space-y-4 px-5 pb-5">
          {quoted ? (
            <div className="rounded-2xl border border-black/[0.06] bg-surface px-4 py-3">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-faint">{copy.quotedLabel}</p>
              <p className="font-cjk mt-1 break-words text-sm text-ink-strong" lang={language ?? undefined}>
                {quoted}
              </p>
            </div>
          ) : null}

          {phase === "sent" ? (
            <StatusMessage tone="success">{copy.sent}</StatusMessage>
          ) : (
            <>
              <label htmlFor={noteId} className="block text-[0.8125rem] font-semibold text-ink-soft">
                {copy.noteLabel}
              </label>
              <textarea
                id={noteId}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={REPORT_LIMITS.note}
                rows={3}
                placeholder={copy.notePlaceholder}
                className="font-cjk w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink-strong outline-none focus:border-black"
              />
              {phase === "failed" ? <StatusMessage tone="danger">{copy.failed}</StatusMessage> : null}
              {phase === "limited" ? <StatusMessage tone="info">{copy.limited}</StatusMessage> : null}
              <button
                type="button"
                onClick={() => void send()}
                disabled={phase === "sending" || phase === "limited"}
                className="ob-key inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {phase === "sending" ? copy.sending : copy.send}
              </button>
            </>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
