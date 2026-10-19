"use client";

import { Check, Copy, ExternalLink, LoaderCircle, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import LabScreen from "@/components/pronunciation/lab/LabScreen";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { helloPath } from "@/lib/hello/url";
import type { HelloSense } from "@/lib/hello/types";
import { getLanguageName, type LanguageCode } from "@/lib/languages";

/* =========================================================
   My Yumi invitations (/invitations)

   Every hello this reader has made, newest first, from GET /api/hello —
   which reads through the owner's own row policy, so this list can only
   ever be theirs. Each can be opened, its link copied, or turned off.

   Turning off asks once, inline, and says plainly what it cannot undo: a
   picture already saved, a preview another app has cached. A hello that is
   off stays in the list, marked, so the reader can see it is.
   ========================================================= */

type Row = {
  id: string;
  createdAt: string;
  revoked: boolean;
  pair: LanguageCode[];
  sense: HelloSense;
  url: string;
  test: boolean;
};

type Load = { status: "loading" } | { status: "ready"; rows: Row[] } | { status: "failed" };

export default function HelloManage() {
  const { t, language } = useTranslation();
  const copy = t.hello;
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/hello", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const { hellos } = (await response.json()) as { hellos: Row[] };
        if (!cancelled) setLoad({ status: "ready", rows: hellos });
      })
      .catch(() => {
        if (!cancelled) setLoad({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const date = useCallback(
    (value: string) => {
      try {
        return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(value));
      } catch {
        return value.slice(0, 10);
      }
    },
    [language],
  );

  const copyLink = async (row: Row) => {
    try {
      await navigator.clipboard.writeText(row.url);
      setCopiedId(row.id);
    } catch {
      setCopiedId(null);
    }
  };

  const revoke = async (row: Row) => {
    setRevoking(row.id);
    setFailedId(null);
    try {
      const response = await fetch(`/api/hello/${encodeURIComponent(row.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(String(response.status));
      setLoad((current) =>
        current.status === "ready"
          ? { status: "ready", rows: current.rows.map((item) => (item.id === row.id ? { ...item, revoked: true } : item)) }
          : current,
      );
      setConfirming(null);
    } catch {
      setFailedId(row.id);
    } finally {
      setRevoking(null);
    }
  };

  const small =
    "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 text-[0.8125rem] font-semibold text-ink-strong transition-colors hover:bg-black/[0.03] disabled:opacity-40";

  return (
    <LabScreen
      title={copy.manageTitle}
      backHref="/friends"
      backLabel={t.common.back}
      action={
        <Link
          href="/invitations/new"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-black px-4 text-[0.875rem] font-semibold text-white"
        >
          <Plus size={16} aria-hidden="true" />
          {copy.newHello}
        </Link>
      }
    >
      <div className="space-y-4 pb-8">
        <p className="text-[0.8125rem] leading-5 text-ink-soft">{copy.revokeNote}</p>

        {load.status === "loading" ? (
          <p role="status" className="inline-flex items-center gap-2 text-[0.875rem] text-ink-soft">
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            {copy.loading}
          </p>
        ) : load.status === "failed" ? (
          <p role="status" className="flex flex-wrap items-center gap-2 text-[0.875rem] text-ink-soft">
            {t.common.error}
            <button
              type="button"
              className="font-semibold underline underline-offset-2"
              onClick={() => {
                setLoad({ status: "loading" });
                setAttempt((value) => value + 1);
              }}
            >
              {copy.tryAgain}
            </button>
          </p>
        ) : load.rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/[0.12] p-6 text-center">
            <p className="text-[0.9375rem] text-ink-soft">{copy.manageEmpty}</p>
            <Link
              href="/invitations/new"
              className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-black px-5 text-[0.875rem] font-semibold text-white"
            >
              {copy.newHello}
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {load.rows.map((row) => {
              const [a, b] = row.pair;
              const words = [row.sense[a]?.text, row.sense[b]?.text].filter(Boolean).join(" · ");
              return (
                <li
                  key={row.id}
                  className={`rounded-3xl border border-black/[0.06] bg-white p-4 ${row.revoked ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-cjk truncate text-[1.0625rem] font-semibold">{words}</p>
                      <p className="mt-0.5 text-[0.75rem] text-ink-faint">
                        {getLanguageName(a, language)} · {getLanguageName(b, language)} ·{" "}
                        {fill(copy.createdOn, { date: date(row.createdAt) })}
                      </p>
                    </div>
                    {row.revoked ? (
                      <span className="shrink-0 rounded-full bg-black/[0.06] px-2.5 py-1 text-[0.6875rem] font-semibold text-ink-soft">
                        {copy.revoked}
                      </span>
                    ) : row.test ? (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[0.6875rem] font-semibold text-amber-900">
                        {copy.testShort}
                      </span>
                    ) : null}
                  </div>

                  {row.revoked ? null : confirming === row.id ? (
                    <div className="mt-3 space-y-2 rounded-2xl bg-black/[0.03] p-3">
                      <p className="text-[0.875rem] font-semibold">{copy.revokeConfirm}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-black px-4 text-[0.8125rem] font-semibold text-white disabled:opacity-40"
                          disabled={revoking === row.id}
                          onClick={() => void revoke(row)}
                        >
                          {revoking === row.id ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : null}
                          {copy.revoke}
                        </button>
                        <button type="button" className={small} onClick={() => setConfirming(null)}>
                          {t.common.cancel}
                        </button>
                      </div>
                      {failedId === row.id ? (
                        <p role="status" className="text-[0.8125rem] text-ink-soft">
                          {t.common.error}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={helloPath(row.id)} className={small}>
                        <ExternalLink size={14} aria-hidden="true" />
                        {copy.openHello}
                      </Link>
                      <button type="button" className={small} onClick={() => void copyLink(row)}>
                        {copiedId === row.id ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                        {copiedId === row.id ? copy.copied : copy.copyLink}
                      </button>
                      <button
                        type="button"
                        className={small}
                        onClick={() => {
                          setFailedId(null);
                          setConfirming(row.id);
                        }}
                      >
                        {copy.revoke}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </LabScreen>
  );
}
