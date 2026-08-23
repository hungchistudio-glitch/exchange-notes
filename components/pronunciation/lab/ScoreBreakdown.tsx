"use client";

import { Info } from "lucide-react";
import { useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import type { PronunciationAnalysisResult } from "@/lib/pronunciation/lab/analyzer";
import type { ScoreDimension } from "@/lib/pronunciation/lab/types";

type ScoreBreakdownProps = {
  result: PronunciationAnalysisResult;
  /** The dimensions this language cares about, in display order. */
  dimensions: readonly ScoreDimension[];
};

function toneFor(score: number): string {
  if (score >= 85) return "bg-[var(--success)]";
  if (score >= 60) return "bg-[var(--accent-amber)]";
  return "bg-red-400";
}

/**
 * What was measured, and — just as prominently — what was not.
 *
 * The unmeasured rows are the point of this component. An app that shows
 * four dials filled with numbers nothing produced is lying in a way that is
 * very hard for a learner to detect, so the rows are all present, the
 * measured ones carry a bar, and the rest say "not analyzed" with an
 * explanation one tap away.
 *
 * `sound` leads regardless of what the language declares, because it is the
 * one dimension the shipped analyzer actually measures, and burying it
 * under four empty rows would hide the real result.
 */
export default function ScoreBreakdown({
  result,
  dimensions,
}: ScoreBreakdownProps) {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab.speak;
  const names = t.pronunciation.lab.dimensions;

  const [hintOpen, setHintOpen] = useState(false);

  const ordered: ScoreDimension[] = [
    "sound",
    ...dimensions.filter((dimension) => dimension !== "sound"),
  ];

  const anyUnmeasured = ordered.some(
    (dimension) => result.dimensions[dimension]?.measured !== true,
  );

  return (
    <section className="rounded-3xl border border-black/[0.06] bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          {copy.overall}
        </h3>

        <p className="text-[28px] font-bold leading-none tracking-[-0.02em]">
          {result.overall === null ? (
            <span className="text-[15px] font-medium text-ink-faint">
              {copy.notAnalyzed}
            </span>
          ) : (
            `${result.overall}`
          )}
        </p>
      </div>

      {result.transcript ? (
        <p className="mt-2 text-xs text-ink-faint">
          {copy.heard}: <span className="font-cjk text-ink-soft">{result.transcript}</span>
        </p>
      ) : null}

      <dl className="mt-4 space-y-3">
        {ordered.map((dimension) => {
          const entry = result.dimensions[dimension];

          return (
            <div key={dimension} className="flex items-center gap-3">
              <dt className="w-[38%] shrink-0 truncate font-cjk text-[13px] text-ink-soft">
                {names[dimension]}
              </dt>

              <dd className="flex min-w-0 flex-1 items-center gap-3">
                {entry?.measured ? (
                  <>
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.07]">
                      <span
                        className={`block h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${toneFor(entry.score)}`}
                        style={{ width: `${entry.score}%` }}
                      />
                    </span>
                    <span className="w-9 shrink-0 text-right text-[13px] font-semibold tabular-nums">
                      {entry.score}
                    </span>
                  </>
                ) : (
                  <span className="text-[13px] text-ink-faint">
                    {copy.notAnalyzed}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {anyUnmeasured ? (
        <>
          <button
            type="button"
            onClick={() => setHintOpen((open) => !open)}
            aria-expanded={hintOpen}
            className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <Info size={13} strokeWidth={2} aria-hidden="true" />
            {copy.notAnalyzed}
          </button>

          {hintOpen ? (
            <p className="font-cjk mt-1 text-sm leading-6 text-ink-soft">
              {copy.notAnalyzedHint}
            </p>
          ) : null}
        </>
      ) : null}

      <p className="font-cjk mt-4 border-t border-black/[0.05] pt-3 text-[11px] leading-5 text-ink-faint">
        {result.processing === "cloud" ? copy.privacyCloud : copy.privacyOnDevice}
      </p>
    </section>
  );
}
