"use client";

import type { ReactNode } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";

/*
 * The three things a screen shows when it is not showing its content.
 *
 * Written once and shared by all six modules, because the alternative —
 * each module deciding for itself — is how an app ends up with one blank
 * screen, one spinner and one raw error string for the same condition.
 */

export function LabLoading({ label }: { label?: string }) {
  const { t } = useTranslation();

  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-faint"
      role="status"
      aria-live="polite"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black/50" />
      <p className="text-sm">{label ?? t.pronunciation.lab.states.loading}</p>
    </div>
  );
}

export function LabError({
  title,
  body,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab.states;

  return (
    <div
      className="rounded-[26px] border border-black/[0.06] bg-white p-6 text-center"
      role="alert"
    >
      <p className="text-[17px] font-semibold">{title ?? copy.error}</p>
      <p className="font-cjk mt-1.5 text-sm leading-6 text-ink-soft">
        {body ?? copy.errorBody}
      </p>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          {copy.retry}
        </button>
      ) : null}
    </div>
  );
}

export function LabEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-dashed border-line bg-white/60 p-8 text-center">
      <p className="font-cjk text-[17px] font-semibold">{title}</p>
      {body ? (
        <p className="font-cjk mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
