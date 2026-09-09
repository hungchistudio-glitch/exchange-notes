"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import LabScreen from "@/components/pronunciation/lab/LabScreen";
import SpeakTrainer from "@/components/pronunciation/lab/SpeakTrainer";
import YumiCoach from "@/components/pronunciation/lab/YumiCoach";
import { LabEmpty, LabLoading } from "@/components/pronunciation/lab/StateViews";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getLanguage } from "@/lib/languages";
import { findUnit } from "@/lib/pronunciation/lab/registry";
import type { AudioSource } from "@/lib/pronunciation/lab/audio";
import type { TrainingItemOutcome } from "@/lib/pronunciation/lab/types";
import type { WordTargetReason } from "@/lib/pronunciation/lab/words";
import type { YumiAnimationState } from "@/lib/pronunciation/yumiRig";

/**
 * The learner's own vocabulary, as pronunciation practice.
 *
 * No word is stored here. These rows come from the same Vocabulary the rest
 * of the app writes to — saved from Discover, from a photo, from a menu
 * scan, from a message — and the Lab's only contribution is working out
 * which sounds each one exercises and putting the ones that matter first.
 */
export default function WordsModule() {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab;

  const { pack, words, wordsLoading, wordCount, recordAttempt } =
    usePronunciationLab();

  const [openId, setOpenId] = useState<string | null>(null);
  const [coachState, setCoachState] = useState<YumiAnimationState>("idle");

  const reasonLabel: Record<WordTargetReason, string> = {
    weak: copy.words.reasonWeak,
    difficult: copy.words.reasonDifficult,
    new: copy.words.reasonNew,
    recent: copy.words.reasonRecent,
  };

  const meta = getLanguage(pack.language);

  const onAttempt = useCallback(
    (unitIds: string[]) =>
      (outcome: TrainingItemOutcome, score?: number, analyzer?: string) => {
        /*
         * Credited to the sounds the word contains, not to the word.
         *
         * The Lab's progress is per-sound, and a word is a vehicle for
         * several of them — getting "perro" right is evidence about the
         * trill, and that is what the weakness map needs to know.
         */
        for (const unitId of unitIds) {
          void recordAttempt({
            unitId,
            module: "words",
            outcome,
            score,
            analyzer,
            speakingScore: score,
          });
        }
      },
    [recordAttempt],
  );

  return (
    <LabScreen
      title={copy.words.title}
      eyebrow={pack.displayName}
      subtitle={copy.words.subtitle}
      backHref="/pronunciation"
      backLabel={copy.backToLab}
    >
      <div className="space-y-5 pb-8">
        <YumiCoach pack={pack} state={coachState} size={92} />

        {wordsLoading ? (
          <LabLoading />
        ) : words.length === 0 ? (
          <LabEmpty
            title={copy.words.empty}
            body={wordCount === 0 ? copy.words.emptyHint : undefined}
            action={
              <Link
                href="/vocabulary"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                {copy.words.addWords}
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {words.map((word) => {
              const open = openId === word.itemId;

              const drills = word.unitIds
                .map((unitId) => findUnit(pack, unitId))
                .filter((unit) => unit !== undefined)
                .slice(0, 4);

              const source: AudioSource = {
                kind: "speech",
                text: word.text,
                language: pack.language,
              };

              return (
                <li
                  key={word.itemId}
                  className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : word.itemId)}
                    aria-expanded={open}
                    className="flex min-h-[72px] w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-black/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    <span className="min-w-0">
                      <span
                        className="font-cjk block truncate text-[1.0625rem] font-semibold"
                        style={{ fontFamily: `var(${meta.fontVariable})` }}
                        lang={meta.htmlLang}
                      >
                        {word.text}
                      </span>

                      <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                        {word.phonetic ? (
                          <span className="font-zhuyin text-xs text-ink-faint">
                            {word.phonetic}
                          </span>
                        ) : null}
                        {word.meaning ? (
                          <span className="font-cjk text-xs text-ink-faint">
                            {word.meaning}
                          </span>
                        ) : null}
                      </span>
                    </span>

                    <span className="font-cjk shrink-0 rounded-full bg-surface px-3 py-1 text-[0.6875rem] font-semibold text-ink-soft">
                      {reasonLabel[word.reason]}
                    </span>
                  </button>

                  {open ? (
                    <div className="border-t border-black/[0.05] px-5 py-4">
                      {drills.length > 0 ? (
                        <div className="mb-4">
                          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                            {copy.words.drills}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {drills.map((unit) => (
                              <Link
                                key={unit.id}
                                href={`/pronunciation/sounds/${encodeURIComponent(unit.id)}`}
                                className="inline-flex min-h-[36px] items-center rounded-full border border-line bg-surface px-3 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                              >
                                {unit.symbol}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <SpeakTrainer
                        language={pack.language}
                        targetText={word.text}
                        nativeSource={source}
                        dimensions={pack.scoreDimensions}
                        onAttempt={onAttempt(word.unitIds)}
                        onCoachStateChange={setCoachState}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </LabScreen>
  );
}
