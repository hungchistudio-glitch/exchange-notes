"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import AudioButton, { AudioGlyph } from "@/components/pronunciation/lab/AudioButton";
import LabScreen from "@/components/pronunciation/lab/LabScreen";
import SpeakTrainer from "@/components/pronunciation/lab/SpeakTrainer";
import YumiCoach from "@/components/pronunciation/lab/YumiCoach";
import { LabEmpty } from "@/components/pronunciation/lab/StateViews";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import usePronunciationPlayback from "@/hooks/pronunciation/usePronunciationPlayback";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { getLanguage } from "@/lib/languages";
import { exampleAudio, unitAudio } from "@/lib/pronunciation/lab/audio";
import { findUnit } from "@/lib/pronunciation/lab/registry";
import { localize, type LocalizedText } from "@/lib/pronunciation/localizedText";
import { deriveRigPose } from "@/lib/pronunciation/yumiRig";
import { deriveTeachingSteps } from "@/lib/pronunciation/teachingSteps";
import type { ArticulationNotes } from "@/lib/pronunciation/lab/types";
import type { YumiAnimationState } from "@/lib/pronunciation/yumiRig";

/** How long the pause between the two demonstrations of a sound is. */
const REPEAT_GAP_MS = 320;

export default function SoundDetail({ unitId }: { unitId: string }) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.pronunciation.lab;

  const { pack, progress, recordAttempt } = usePronunciationLab();
  const playback = usePronunciationPlayback();

  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [trapOpen, setTrapOpen] = useState(false);
  const [speakState, setSpeakState] = useState<YumiAnimationState | null>(null);

  const unit = useMemo(() => findUnit(pack, unitId), [pack, unitId]);

  const pairs = useMemo(
    () =>
      unit
        ? pack.minimalPairs.filter((pair) => pair.targets.includes(unit.id))
        : [],
    [pack, unit],
  );

  const onAttempt = useCallback(
    (outcome: Parameters<typeof recordAttempt>[0]["outcome"], score?: number, analyzer?: string) => {
      if (!unit) return;

      void recordAttempt({
        unitId: unit.id,
        module: "speak",
        outcome,
        score,
        analyzer,
        speakingScore: score,
      });
    },
    [recordAttempt, unit],
  );

  if (!unit) {
    return (
      <LabScreen
        title={copy.sounds.title}
        backHref="/pronunciation/sounds"
        backLabel={copy.backToLab}
      >
        <LabEmpty title={copy.detail.notFound} />
      </LabScreen>
    );
  }

  const meta = getLanguage(unit.language);
  const source = unitAudio(unit);
  const steps = unit.features ? deriveTeachingSteps(unit.features) : [];
  const mastery = progress[unit.id]?.mastery ?? "new";

  const showGuidance = !unit.articulation && Boolean(unit.guidance?.length);

  const playSelf = () => {
    // Twice, with a gap: one pass is a sound you half-caught, two is a
    // sound you can compare against your own memory of the first.
    playback.playSteps("self", [
      { source, gapMs: REPEAT_GAP_MS },
      { source },
    ]);
  };

  const coachState: YumiAnimationState =
    speakState ??
    (playback.phaseFor("self") === "playing"
      ? "articulating"
      : playback.phaseFor("self") === "loading"
        ? "preparing"
        : "idle");

  return (
    <LabScreen
      title={unit.symbol}
      eyebrow={
        unit.displayLabel
          ? localize(unit.displayLabel, interfaceLanguage)
          : pack.displayName
      }
      subtitle={unit.phoneticRepresentation ?? undefined}
      backHref="/pronunciation/sounds"
      backLabel={copy.backToLab}
      action={
        <span className="inline-flex items-center rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft">
          {copy.mastery[mastery]}
        </span>
      }
    >
      <div className="space-y-4 pb-8">
        <YumiCoach
          pack={pack}
          state={coachState}
          pose={unit.features ? deriveRigPose(unit.features) : undefined}
          onTap={playSelf}
          tapLabel={t.pronunciation.yumi.tapToHear}
        />

        {/* ── Audio ─────────────────────────────────────────────── */}
        <section
          aria-label={copy.detail.replay}
          className="flex flex-wrap items-center gap-2 rounded-3xl border border-black/[0.06] bg-white p-4"
        >
          <AudioButton
            label={copy.detail.nativeSpeed}
            failedLabel={t.pronunciation.cards.playbackFailed}
            phase={playback.phaseFor("native")}
            onClick={() => playback.play("native", source, "native")}
          />

          <button
            type="button"
            onClick={() => playback.play("slow", source, "slow")}
            className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink-soft transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {copy.detail.slowSpeed}
          </button>

          <button
            type="button"
            onClick={playSelf}
            className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink-soft transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {copy.detail.replay}
          </button>

          {source.kind === "unavailable" ? (
            <p className="w-full text-xs text-ink-faint">
              {copy.states.audioUnavailable}
            </p>
          ) : null}
        </section>

        {/* ── Articulation ──────────────────────────────────────── */}
        {steps.length > 0 || unit.articulation || showGuidance || unit.tip ? (
          <section
            aria-label={copy.detail.articulation}
            className="rounded-3xl border border-black/[0.06] bg-white p-5"
          >
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              {copy.detail.articulation}
            </h2>

            {/*
              One articulation list, not two.
              
              A unit can describe itself in prose (`articulation`) or leave it
              to be derived from its phonetic features, and both produce rows
              labelled Tongue, Airflow and Voicing. Rendering both put the
              same label on screen twice with two different sentences under
              it, which reads as the card contradicting itself. Authored wins
              where it exists, because it was written about this sound in
              particular; the derived list is what every other unit gets.
            */}
            {unit.articulation ? (
              <ArticulationList notes={unit.articulation} />
            ) : steps.length > 0 ? (
              <dl className="mt-3 space-y-1.5">
                {steps.map((step) => (
                  <div key={step.key} className="flex gap-2 text-sm leading-6">
                    <dt className="font-cjk w-16 shrink-0 font-semibold text-ink-soft">
                      {t.pronunciation.yumi[step.key]}
                    </dt>
                    <dd className="font-cjk text-ink-strong">
                      {localize(step.text, interfaceLanguage)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {/*
              The short points, and only where they are not saying the list
              above again in fewer words. A unit with authored `articulation`
              already has "Tongue: …" on screen; its `guidance` is the same
              three facts abbreviated, which on one card reads as a stutter.
            */}
            {showGuidance || unit.tip ? (
              <div className="mt-4 rounded-2xl bg-surface p-3">
                {showGuidance ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                      {t.pronunciation.cards.howToSayIt}
                    </p>

                    <div className="mt-2 space-y-1.5">
                      {unit.guidance?.map((point, index) => (
                        <p key={index} className="flex gap-2 text-sm leading-6">
                          <span className="font-cjk shrink-0 font-semibold text-ink-soft">
                            {localize(point.label, interfaceLanguage)}
                          </span>
                          <span className="font-cjk text-ink-strong">
                            {localize(point.text, interfaceLanguage)}
                          </span>
                        </p>
                      ))}
                    </div>
                  </>
                ) : null}

                {unit.tip ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setGuidanceOpen((open) => !open)}
                      aria-expanded={guidanceOpen}
                      className={`inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                        showGuidance ? "mt-2" : ""
                      }`}
                    >
                      {guidanceOpen
                        ? t.pronunciation.cards.showLessGuidance
                        : t.pronunciation.cards.showMoreGuidance}
                      {guidanceOpen ? (
                        <ChevronUp size={13} strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
                      )}
                    </button>

                    {guidanceOpen ? (
                      <p className="font-cjk mt-1 text-sm leading-6 text-ink-soft">
                        {localize(unit.tip, interfaceLanguage)}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* ── Examples ──────────────────────────────────────────── */}
        <section className="rounded-3xl border border-black/[0.06] bg-white p-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            {copy.detail.examples}
          </h2>

          <ul className="mt-3 space-y-2">
            {unit.examples.map((example, index) => {
              const key = `example-${index}`;

              return (
                <li key={`${example.text}-${index}`}>
                  <button
                    type="button"
                    onClick={() =>
                      playback.play(key, exampleAudio(example, unit.language))
                    }
                    aria-label={fill(t.pronunciation.cards.playWord, {
                      word: example.text,
                    })}
                    className="flex min-h-[60px] w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-2.5 text-left transition-colors hover:bg-black/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    <span className="min-w-0">
                      <span
                        className="font-cjk block truncate text-[15px] font-medium"
                        style={{ fontFamily: `var(${meta.fontVariable})` }}
                        lang={meta.htmlLang}
                      >
                        <Highlighted text={example.text} match={example.highlight} />
                      </span>

                      <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                        {example.phonetic ? (
                          <span className="font-phonetic text-xs text-ink-faint">
                            {example.phonetic}
                          </span>
                        ) : null}
                        {example.meaning ? (
                          <span className="font-cjk text-xs text-ink-faint">
                            {localize(example.meaning, interfaceLanguage)}
                          </span>
                        ) : null}
                      </span>
                    </span>

                    <span className="shrink-0">
                      <AudioGlyph phase={playback.phaseFor(key)} size="sm" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── Common mistake ────────────────────────────────────── */}
        {unit.commonMistake ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <button
              type="button"
              onClick={() => setTrapOpen((open) => !open)}
              aria-expanded={trapOpen}
              className="flex w-full items-start justify-between gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700">
                  {t.pronunciation.cards.commonMistake}
                </span>
                <span className="font-cjk mt-1 block text-sm leading-6 text-amber-800">
                  {fill(t.pronunciation.cards.commonTrapSummary, {
                    symbol: unit.symbol,
                    confusedWith: unit.commonMistake.confusedWith,
                  })}
                </span>
              </span>

              {trapOpen ? (
                <ChevronUp size={16} className="mt-1 shrink-0 text-amber-700" aria-hidden="true" />
              ) : (
                <ChevronDown size={16} className="mt-1 shrink-0 text-amber-700" aria-hidden="true" />
              )}
            </button>

            {trapOpen ? (
              <p className="font-cjk mt-2 text-sm leading-6 text-amber-800">
                {localize(unit.commonMistake.explanation, interfaceLanguage)}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* ── Minimal pairs ─────────────────────────────────────── */}
        {pairs.length > 0 ? (
          <section className="rounded-3xl border border-black/[0.06] bg-white p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              {copy.detail.minimalPairs}
            </h2>

            <div className="mt-3 space-y-4">
              {pairs.map((pair) => (
                <div key={pair.id}>
                  <p className="font-cjk text-sm font-semibold">
                    {localize(pair.label, interfaceLanguage)}
                  </p>

                  {pair.hint ? (
                    <p className="font-cjk mt-0.5 text-xs leading-5 text-ink-faint">
                      {localize(pair.hint, interfaceLanguage)}
                    </p>
                  ) : null}

                  <div className="mt-2 space-y-2">
                    {pair.examples.map((set, setIndex) => (
                      <div
                        key={`${pair.id}-${setIndex}`}
                        className="grid gap-2"
                        style={{
                          gridTemplateColumns: `repeat(${Math.min(set.length, 2)}, minmax(0, 1fr))`,
                        }}
                      >
                        {set.map((example, index) => {
                          const key = `pair-${pair.id}-${setIndex}-${index}`;

                          return (
                            <button
                              key={`${example.text}-${index}`}
                              type="button"
                              onClick={() =>
                                playback.play(
                                  key,
                                  exampleAudio(example, pair.language),
                                )
                              }
                              aria-label={fill(t.pronunciation.cards.playWord, {
                                word: example.text,
                              })}
                              className="flex min-h-[56px] items-center justify-between gap-2 rounded-2xl bg-surface px-3 py-2 text-left transition-colors hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                            >
                              <span className="min-w-0">
                                <span
                                  className="font-cjk block truncate text-sm font-semibold"
                                  lang={meta.htmlLang}
                                >
                                  {example.text}
                                </span>
                                {example.meaning ? (
                                  <span className="font-cjk block truncate text-[11px] text-ink-faint">
                                    {localize(example.meaning, interfaceLanguage)}
                                  </span>
                                ) : null}
                              </span>

                              <AudioGlyph phase={playback.phaseFor(key)} size="sm" />
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Record and compare ────────────────────────────────── */}
        <section>
          <h2 className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            {copy.detail.recordYourself}
          </h2>

          <div className="mt-3">
            <SpeakTrainer
              language={unit.language}
              targetText={unit.examples[0]?.text ?? unit.speechText ?? unit.symbol}
              nativeSource={
                unit.examples[0]
                  ? exampleAudio(unit.examples[0], unit.language)
                  : source
              }
              dimensions={pack.scoreDimensions}
              onAttempt={onAttempt}
              onCoachStateChange={setSpeakState}
            />
          </div>
        </section>
      </div>
    </LabScreen>
  );
}

/**
 * Marks where the target sound sits inside an example.
 *
 * Only ever renders what the pack authored. Searching for the sound by
 * spelling would highlight the wrong letters in exactly the languages where
 * it matters, and a confident wrong highlight teaches worse than none.
 */
function Highlighted({ text, match }: { text: string; match?: string }) {
  if (!match) return <>{text}</>;

  const index = text.indexOf(match);
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <span className="font-semibold underline decoration-2 underline-offset-2">
        {match}
      </span>
      {text.slice(index + match.length)}
    </>
  );
}

function ArticulationList({ notes }: { notes: ArticulationNotes }) {
  const { t, language } = useTranslation();
  const copy = t.pronunciation.lab.detail;

  const rows: Array<[string, LocalizedText | undefined]> = [
    [copy.tongue, notes.tongue],
    [copy.lips, notes.lips],
    [copy.jaw, notes.jaw],
    [copy.airflow, notes.airflow],
    [copy.voicing, notes.voicing],
    [copy.resonance, notes.resonance],
  ];

  // Absent fields render nothing at all — an empty labelled row says the
  // pack has an answer and is hiding it.
  const present = rows.filter(
    (row): row is [string, LocalizedText] => row[1] !== undefined,
  );

  if (present.length === 0) return null;

  return (
    <dl className="mt-3 space-y-1.5">
      {present.map(([label, value]) => (
        <div key={label} className="flex gap-2 text-sm leading-6">
          <dt className="font-cjk w-16 shrink-0 font-semibold text-ink-soft">
            {label}
          </dt>
          <dd className="font-cjk text-ink-strong">{localize(value, language)}</dd>
        </div>
      ))}
    </dl>
  );
}
