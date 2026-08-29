"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AudioLines,
  ChevronRight,
  Ear,
  Mic,
  RotateCcw,
  Type,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import LabScreen from "@/components/pronunciation/lab/LabScreen";
import YumiCoach from "@/components/pronunciation/lab/YumiCoach";
import { LabError, LabLoading } from "@/components/pronunciation/lab/StateViews";
import { MasteryDot } from "@/components/pronunciation/lab/SoundTile";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { getLanguageName } from "@/lib/languages";
import { buildDailyTraining } from "@/lib/pronunciation/lab/dailyTraining";
import {
  getCategoryMastery,
  getLanguagePronunciationProgress,
  getRhythmProgress,
  getWeaknessMap,
} from "@/lib/pronunciation/lab/progress";
import { groupsForModule, moduleHasContent } from "@/lib/pronunciation/lab/registry";
import { localize } from "@/lib/pronunciation/localizedText";
import type { PronunciationModuleId } from "@/lib/pronunciation/lab/types";

const MODULE_ICON: Record<PronunciationModuleId, LucideIcon> = {
  sounds: AudioLines,
  listen: Ear,
  speak: Mic,
  words: Type,
  rhythm: Waves,
  review: RotateCcw,
};

const MODULE_ORDER: PronunciationModuleId[] = [
  "sounds",
  "listen",
  "speak",
  "words",
  "rhythm",
  "review",
];

/**
 * The Lab's front door.
 *
 * Reads top to bottom the way a session actually goes: who is coaching you,
 * what you are learning, what to do today, where you stand, the six rooms,
 * and what needs work. Six tiles rather than a wall of entry points —
 * everything else in the Lab is reachable from inside one of them.
 */
export default function LabLanding() {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.pronunciation.lab;

  const { pack, language, progress, status, words, refresh } =
    usePronunciationLab();

  const searchParams = useSearchParams();
  // Matched against a fixed set rather than used as a path: the value comes
  // from the query string, and treating it as a destination would be an
  // open redirect.
  const cameFromVocabulary = searchParams.get("from") === "vocabulary";
  const exitHref = cameFromVocabulary ? "/vocabulary" : "/home";

  const [coachTapped, setCoachTapped] = useState(false);

  const summary = useMemo(
    () => getLanguagePronunciationProgress(pack, progress),
    [pack, progress],
  );

  const rhythm = useMemo(() => getRhythmProgress(pack, progress), [pack, progress]);

  const weakest = useMemo(
    () =>
      getWeaknessMap(pack, progress)
        .filter((entry) => entry.band !== "strong")
        .slice(0, 4),
    [pack, progress],
  );

  const plan = useMemo(
    () => buildDailyTraining({ pack, progress, words }),
    [pack, progress, words],
  );

  if (status === "loading") {
    return (
      <LabScreen
        title={t.pronunciation.title}
        subtitle={t.pronunciation.subtitle}
        backHref={exitHref}
        backLabel={cameFromVocabulary ? t.pronunciation.backToVocabulary : t.pronunciation.backHome}
      >
        <LabLoading />
      </LabScreen>
    );
  }

  const languageName = getLanguageName(language, interfaceLanguage);

  return (
    <LabScreen
      title={t.pronunciation.title}
      subtitle={t.pronunciation.subtitle}
      backHref={exitHref}
      backLabel={
        cameFromVocabulary ? t.pronunciation.backToVocabulary : t.pronunciation.backHome
      }
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft">
          {pack.displayName}
        </span>
      }
    >
      <div className="space-y-5 pb-6">
        <YumiCoach
          pack={pack}
          state={coachTapped ? "demonstrating" : "idle"}
          onTap={() => setCoachTapped((tapped) => !tapped)}
          tapLabel={copy.coach.eyebrow}
        />

        <p className="px-1 text-[13px] text-ink-faint">
          {fill(copy.learningLabel, { language: languageName })} ·{" "}
          {copy.switchLanguageHint}
        </p>

        {/* ── Today's training ──────────────────────────────────── */}
        <section className="overflow-hidden rounded-[26px] border border-black/[0.06] bg-black text-white">
          <div className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-invert-faint">
              {copy.today.eyebrow}
            </p>

            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-bold tracking-[-0.02em]">
                {copy.today.title}
              </h2>
              {plan.items.length > 0 ? (
                <span className="shrink-0 text-sm font-semibold text-ink-invert-soft">
                  {fill(copy.today.minutes, {
                    minutes: Math.max(1, Math.round(plan.totalSeconds / 60)),
                  })}
                </span>
              ) : null}
            </div>

            {plan.items.length === 0 ? (
              <p className="font-cjk mt-2 text-sm leading-6 text-ink-invert-soft">
                {copy.today.empty}
              </p>
            ) : (
              <>
                <ul className="mt-3 space-y-1.5">
                  {plan.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="font-cjk truncate text-ink-invert-soft">
                        {copy.modules[item.module].title}
                      </span>
                      <span className="font-cjk shrink-0 truncate text-right font-medium">
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/pronunciation/train"
                  className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-black transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {copy.today.start}
                </Link>
              </>
            )}
          </div>
        </section>

        {/* ── Progress ──────────────────────────────────────────── */}
        <section
          aria-label={copy.progress.title}
          className="rounded-[26px] border border-black/[0.06] bg-white p-5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            {copy.progress.eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-[-0.02em]">
            {copy.progress.title}
          </h2>

          {status === "error" ? (
            <div className="mt-4">
              <LabError onRetry={() => void refresh()} />
            </div>
          ) : summary.practisedUnits === 0 ? (
            <p className="font-cjk mt-3 text-sm leading-6 text-ink-soft">
              {copy.progress.notEnough}
            </p>
          ) : (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ProgressTile
                label={copy.progress.sounds}
                value={
                  summary.masteredPercent === null
                    ? null
                    : `${summary.masteredPercent}%`
                }
                hint={fill(copy.progress.soundsMastered, {
                  mastered: summary.counts.mastered,
                  total: summary.totalUnits,
                })}
                fallback={copy.progress.notEnough}
              />
              <ProgressTile
                label={copy.progress.listening}
                value={summary.listening === null ? null : `${summary.listening}`}
                fallback={copy.progress.notEnough}
              />
              <ProgressTile
                label={copy.progress.speaking}
                value={summary.speaking === null ? null : `${summary.speaking}`}
                fallback={copy.progress.notEnough}
              />
              <ProgressTile
                label={copy.progress.rhythm}
                value={rhythm.percent === null ? null : `${rhythm.percent}%`}
                fallback={copy.progress.notEnough}
              />
            </dl>
          )}
        </section>

        {/* ── The six modules ───────────────────────────────────── */}
        {/*
          A nav rather than a section: these six are the Lab's primary
          navigation, and naming the landmark is what lets a screen-reader
          user jump to them instead of walking the whole page.
        */}
        <nav aria-label={t.pronunciation.title}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MODULE_ORDER.filter((module) => moduleHasContent(pack, module)).map(
              (module) => {
                const Icon = MODULE_ICON[module];

                return (
                  <Link
                    key={module}
                    href={`/pronunciation/${module}`}
                    className="flex min-h-[116px] flex-col justify-between rounded-3xl border border-black/[0.06] bg-white p-4 transition-colors hover:bg-black/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-ink-strong">
                      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                    </span>

                    <span className="mt-3 block">
                      <span className="font-cjk block text-[15px] font-bold tracking-[-0.01em]">
                        {copy.modules[module].title}
                      </span>
                      <span className="font-cjk mt-0.5 block text-xs leading-5 text-ink-faint">
                        {copy.modules[module].description}
                      </span>
                    </span>
                  </Link>
                );
              },
            )}
          </div>
        </nav>

        {/* ── Weakness preview ──────────────────────────────────── */}
        <section className="rounded-[26px] border border-black/[0.06] bg-white p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold tracking-[-0.02em]">
              {copy.weakness.title}
            </h2>

            {weakest.length > 0 ? (
              <Link
                href="/pronunciation/review"
                className="shrink-0 text-[13px] font-semibold text-ink-soft hover:text-black"
              >
                {copy.weakness.viewAll}
              </Link>
            ) : null}
          </div>

          {weakest.length === 0 ? (
            <p className="font-cjk mt-2 text-sm leading-6 text-ink-soft">
              {copy.weakness.empty}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {weakest.map((entry) => (
                <li key={entry.unit.id}>
                  <Link
                    href={`/pronunciation/sounds/${encodeURIComponent(entry.unit.id)}`}
                    className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <MasteryDot
                        mastery={entry.unit.id in progress ? progress[entry.unit.id].mastery : "new"}
                        label={
                          entry.band === "needsWork"
                            ? copy.weakness.needsWork
                            : copy.weakness.improving
                        }
                      />
                      <span className="truncate text-[17px] font-semibold">
                        {entry.unit.symbol}
                      </span>
                      <span className="truncate text-xs text-ink-faint">
                        {fill(copy.weakness.attempts, { count: entry.attempts })}
                      </span>
                    </span>

                    <ChevronRight
                      size={17}
                      className="shrink-0 text-ink-faint"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Category progress, as the "continue where you left off" ── */}
        <section
          aria-label={copy.sounds.title}
          className="rounded-[26px] border border-black/[0.06] bg-white p-5"
        >
          <h2 className="text-lg font-bold tracking-[-0.02em]">
            {copy.sounds.title}
          </h2>

          <ul className="mt-3 space-y-2">
            {groupsForModule(pack, "sounds").map((group) => {
              const mastery = getCategoryMastery(pack, group.id, progress);

              return (
                <li key={group.id}>
                  <Link
                    href={`/pronunciation/sounds?group=${encodeURIComponent(group.id)}`}
                    className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl px-2 transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    <span className="font-cjk min-w-0 truncate text-[15px] font-medium">
                      {localize(group.label, interfaceLanguage)}
                    </span>

                    <span className="shrink-0 text-[13px] text-ink-faint">
                      {mastery.percent === null
                        ? fill(copy.sounds.soundCount, { count: mastery.total })
                        : fill(copy.progress.soundsMastered, {
                            mastered: mastery.mastered,
                            total: mastery.total,
                          })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </LabScreen>
  );
}

function ProgressTile({
  label,
  value,
  hint,
  fallback,
}: {
  label: string;
  value: string | null;
  hint?: string;
  fallback: string;
}) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <dt className="font-cjk text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
        {label}
      </dt>
      <dd className="mt-1">
        {value === null ? (
          <span className="font-cjk text-[12px] leading-5 text-ink-faint">
            {fallback}
          </span>
        ) : (
          <>
            <span className="text-[22px] font-bold leading-none tracking-[-0.02em]">
              {value}
            </span>
            {hint ? (
              <span className="mt-1 block text-[11px] text-ink-faint">{hint}</span>
            ) : null}
          </>
        )}
      </dd>
    </div>
  );
}
