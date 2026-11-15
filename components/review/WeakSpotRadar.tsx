"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { useOptionalVocabulary } from "@/contexts/VocabularyContext";
import { fill } from "@/lib/i18n/format";
import { getLanguage } from "@/lib/languages";
import type { ProgressByUnit } from "@/lib/pronunciation/lab/types";
import { skillAxes, weakSounds, weakestAxis, weakWords, type Axis } from "@/lib/review/weakSpots";
import { createClient } from "@/lib/supabase/client";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   The weak-spot radar on the review page (Chi, 2026-11-15: 弱點雷達)

   Five measures as a radar (lib/review/weakSpots.ts), the weakest named,
   then the words the reader keeps losing, with one key that practises only
   those, and the sounds they score lowest on, each a way into its Lab card.
   The Lab's progress and its sound tables load after the page, behind
   import(), so the review page carries none of them up front.
   ========================================================= */

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 78;
const PAD = 44;

function point(index: number, count: number, fraction: number) {
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  return [CENTER + Math.cos(angle) * RADIUS * fraction, CENTER + Math.sin(angle) * RADIUS * fraction] as const;
}

function Radar({ axes, labels, weakest }: { axes: Axis[]; labels: Record<string, string>; weakest: Axis | null }) {
  const count = axes.length;
  const shape = axes.map((axis, index) => point(index, count, (axis.value ?? 0) / 100).join(",")).join(" ");

  return (
    /* Wider than the chart, so a label beside a side point is never cut. */
    <svg viewBox={`${-PAD} 0 ${SIZE + PAD * 2} ${SIZE}`} className="weak-radar h-auto w-full max-w-[280px]" aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          className="weak-radar-ring"
          points={axes.map((_, index) => point(index, count, ring).join(",")).join(" ")}
        />
      ))}
      {axes.map((axis, index) => {
        const [x, y] = point(index, count, 1);
        return <line key={axis.id} className="weak-radar-spoke" x1={CENTER} y1={CENTER} x2={x} y2={y} />;
      })}
      <polygon className="weak-radar-shape" points={shape} />
      {axes.map((axis, index) => {
        const [x, y] = point(index, count, (axis.value ?? 0) / 100);
        return axis.value === null ? null : (
          <circle
            key={axis.id}
            className={axis.id === weakest?.id ? "weak-radar-dot weak-radar-dot-weakest" : "weak-radar-dot"}
            cx={x}
            cy={y}
            r={axis.id === weakest?.id ? 4.5 : 3}
          />
        );
      })}
      {axes.map((axis, index) => {
        const [x, y] = point(index, count, 1.16);
        /* Left of the centre reads leftwards, right of it rightwards. */
        const anchor = x < CENTER - 4 ? "end" : x > CENTER + 4 ? "start" : "middle";
        return (
          <text
            key={axis.id}
            className={`weak-radar-label${axis.value === null ? " weak-radar-label-empty" : ""}${axis.id === weakest?.id ? " weak-radar-label-weakest" : ""}`}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
          >
            {labels[axis.id]}
          </text>
        );
      })}
    </svg>
  );
}

type RadarProps = { onPractice: (ids: string[]) => void; disabled?: boolean };

/* Outside the library's provider (a test of the review page) it draws nothing. */
export default function WeakSpotRadar(props: RadarProps) {
  const vocabulary = useOptionalVocabulary();
  if (!vocabulary) return null;
  return <WeakSpotPanel {...props} items={vocabulary.items} loading={vocabulary.loading} />;
}

function WeakSpotPanel({ onPractice, disabled, items, loading }: RadarProps & { items: VocabularyItem[]; loading: boolean }) {
  const { t } = useTranslation();
  const copy = t.weakSpots;
  const { learningLanguage } = useDisplayLanguages();
  const [progress, setProgress] = useState<ProgressByUnit | null>(null);
  const [symbols, setSymbols] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [{ fetchPronunciationProgress }, { findUnit, getPronunciationPack }] = await Promise.all([
        import("@/lib/pronunciation/lab/repository"),
        import("@/lib/pronunciation/lab/registry"),
      ]);
      const loaded = await fetchPronunciationProgress(createClient(), learningLanguage);
      if (!alive || !loaded.ok) return;
      const pack = getPronunciationPack(learningLanguage);
      setProgress(loaded.progress);
      setSymbols(Object.fromEntries(
        Object.keys(loaded.progress).map((id) => [id, findUnit(pack, id)?.symbol ?? id]),
      ));
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [learningLanguage]);

  const inLanguage = useMemo(
    () => items.filter((item) => item.word_language === learningLanguage),
    [items, learningLanguage],
  );
  const axes = useMemo(() => skillAxes(inLanguage, progress), [inLanguage, progress]);
  const weakest = weakestAxis(axes);
  const words = useMemo(() => weakWords(inLanguage), [inLanguage]);
  const sounds = useMemo(() => weakSounds(progress), [progress]);

  if (loading || items.length === 0) return null;

  const labels = copy.axes as Record<string, string>;
  const tag = getLanguage(learningLanguage).speechTag;

  return (
    <section className="hud-panel weak-spots mt-4 rounded-[28px] border border-line bg-white p-6" aria-labelledby="weak-spots-title">
      <div className="flex items-center gap-2">
        <span className="hud-led" data-state={weakest ? "alert" : undefined} aria-hidden="true" />
        <h2 id="weak-spots-title" className="text-lg font-bold">{copy.title}</h2>
      </div>

      <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-center">
        <Radar axes={axes} labels={labels} weakest={weakest} />
        <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-[0.8125rem] sm:grid-cols-1">
          {axes.map((axis) => (
            <div key={axis.id} className="flex items-baseline justify-between gap-2">
              <dt className={axis.id === weakest?.id ? "font-semibold text-[var(--hud-alert)]" : "text-ink-soft"}>{labels[axis.id]}</dt>
              <dd className="hud-figure font-semibold">{axis.value === null ? copy.noData : axis.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {weakest ? (
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          {fill(copy.weakest, { axis: labels[weakest.id] })}
        </p>
      ) : null}

      <div className="mt-5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">{copy.words}</p>
        {words.length ? (
          <>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {words.map((item) => (
                <li key={item.id} lang={tag} className="weak-chip rounded-full bg-surface px-3 py-1 text-[0.8125rem] font-semibold">
                  {(item.texts as Record<string, string | undefined>)?.[learningLanguage] ?? item.word}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPractice(words.map((item) => item.id))}
              className="ob-key mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-black px-5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
            >
              {fill(copy.practiceWords, { count: words.length })}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">{copy.noWords}</p>
        )}
      </div>

      <div className="mt-5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">{copy.sounds}</p>
        {sounds.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {sounds.map((sound) => (
              <li key={sound.unitId}>
                <Link
                  href={`/pronunciation/sounds/${encodeURIComponent(sound.unitId)}`}
                  className="weak-chip inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-[0.9375rem] font-semibold"
                >
                  {symbols[sound.unitId] ?? sound.unitId}
                  <span className="hud-figure text-[0.75rem] text-ink-faint">{sound.score}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">{copy.noSounds}</p>
        )}
      </div>
    </section>
  );
}
