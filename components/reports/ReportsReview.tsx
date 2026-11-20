"use client";

import { useCallback, useEffect, useState } from "react";

import PageTitle from "@/components/foundation/layout/PageTitle";
import StatusMessage from "@/components/foundation/feedback/StatusMessage";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { ContentReport } from "@/lib/reports";

/* =========================================================
   The owner's reading of readers' reports (Chi, 2026-11-16: 回報問題)

   Every open report, newest first, with what it is about, where it was
   sent from and the reader's note; "Done" closes one. Only the owner gets
   here (app/(protected)/reports/page.tsx), and /api/reports checks again.
   ========================================================= */

export default function ReportsReview() {
  const { t, language } = useTranslation();
  const copy = t.reports;
  const [reports, setReports] = useState<ContentReport[] | null>(null);
  const [failed, setFailed] = useState(false);

  /* The open reports, read once on arrival and again if closing one fails. */
  const read = useCallback((signal?: AbortSignal) => {
    fetch("/api/reports", { cache: "no-store", signal })
      .then(async (response) => {
        const body = (await response.json()) as { reports?: ContentReport[] };
        if (!response.ok || !body.reports) throw new Error("unavailable");
        setReports(body.reports);
      })
      .catch(() => {
        if (!signal?.aborted) setFailed(true);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    read(controller.signal);
    return () => controller.abort();
  }, [read]);

  async function resolve(id: string) {
    setReports((current) => current?.filter((report) => report.id !== id) ?? null);
    const response = await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved: true }),
    }).catch(() => null);
    if (!response?.ok) read();
  }

  const when = new Intl.DateTimeFormat(language === "traditional-chinese" ? "zh-TW" : undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto w-full max-w-xl pb-28">
      <PageTitle title={copy.reviewTitle} subtitle={copy.reviewSubtitle} back={{ href: "/profile", label: t.settings.title }} />
      <div className="mt-6 space-y-3 px-4 sm:px-6">
        {failed ? <StatusMessage tone="danger">{copy.failed}</StatusMessage> : null}
        {reports && reports.length === 0 ? <StatusMessage>{copy.reviewEmpty}</StatusMessage> : null}
        {reports?.map((report) => (
          <article key={report.id} className="hud-panel rounded-3xl border border-black/[0.06] bg-white p-4" data-report-id={report.id}>
            <div className="flex items-baseline justify-between gap-3 text-[0.75rem] text-ink-faint">
              <span className="font-semibold">
                {copy.surfaces[report.surface]}
                {report.language ? ` · ${report.language}` : ""}
              </span>
              <time dateTime={report.createdAt}>{when.format(new Date(report.createdAt))}</time>
            </div>
            <p className="font-cjk mt-2 break-words text-[0.9375rem] font-semibold text-ink-strong" lang={report.language ?? undefined}>
              {report.quoted || report.itemKey}
            </p>
            {report.note ? <p className="font-cjk mt-2 whitespace-pre-wrap break-words text-sm text-ink-soft">{report.note}</p> : null}
            <div className="mt-3 flex items-center justify-between gap-3">
              <code className="truncate text-[0.6875rem] text-ink-faint">
                {report.itemKey}
                {report.page ? ` · ${report.page}` : ""}
              </code>
              <button
                type="button"
                onClick={() => void resolve(report.id)}
                className="ob-key inline-flex min-h-[36px] shrink-0 items-center rounded-full border border-line px-4 text-[0.8125rem] font-semibold text-ink-strong"
              >
                {copy.resolve}
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
