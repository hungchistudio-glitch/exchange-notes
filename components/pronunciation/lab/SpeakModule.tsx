"use client";

import { useCallback, useMemo, useState } from "react";

import LabScreen from "@/components/pronunciation/lab/LabScreen";
import SpeakTrainer from "@/components/pronunciation/lab/SpeakTrainer";
import YumiCoach from "@/components/pronunciation/lab/YumiCoach";
import { LabEmpty } from "@/components/pronunciation/lab/StateViews";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { LanguageCode } from "@/lib/languages";
import { exampleAudio, unitAudio } from "@/lib/pronunciation/lab/audio";
import {
  getStarterUnits,
  getWeaknessMap,
} from "@/lib/pronunciation/lab/progress";
import { deriveRigPose, type YumiAnimationState } from "@/lib/pronunciation/yumiRig";
import type { TrainingItemOutcome } from "@/lib/pronunciation/lab/types";

/**
 * Say something, and hear it back next to the real thing.
 *
 * Opens on whatever the learner is worst at rather than on the first sound
 * in the pack — the two minutes someone spends here should go where they
 * are needed, and a screen that always starts at "a" is a screen that only
 * ever practises "a".
 */
export default function SpeakModule() {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab;

  const { pack, progress, recordAttempt } = usePronunciationLab();

  const candidates = useMemo(() => {
    const weak = getWeaknessMap(pack, progress)
      .filter((entry) => entry.band !== "strong")
      .map((entry) => entry.unit);

    const starters = getStarterUnits(pack, 8);

    const seen = new Set<string>();
    return [...weak, ...starters].filter((unit) => {
      if (seen.has(unit.id)) return false;
      seen.add(unit.id);
      return true;
    });
  }, [pack, progress]);

  /*
   * The selection carries the language it was made in.
   *
   * A unit id belongs to one pack, so a selection made in Spanish means
   * nothing in French. Storing the pair and comparing on read means the
   * choice resets itself on a language switch, with no effect to clear it
   * and no render where a French screen is highlighting a Spanish sound.
   */
  const [selected, setSelected] = useState<{
    language: LanguageCode;
    unitId: string;
  } | null>(null);

  const [coachState, setCoachState] = useState<YumiAnimationState>("listening");

  const unit =
    (selected?.language === pack.language
      ? candidates.find((candidate) => candidate.id === selected.unitId)
      : undefined) ?? candidates[0];

  const onAttempt = useCallback(
    (outcome: TrainingItemOutcome, score?: number, analyzer?: string) => {
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

  return (
    <LabScreen
      title={copy.speak.title}
      eyebrow={pack.displayName}
      subtitle={copy.speak.subtitle}
      backHref="/pronunciation"
      backLabel={copy.backToLab}
    >
      <div className="space-y-5 pb-8">
        <YumiCoach
          pack={pack}
          state={coachState}
          pose={unit?.features ? deriveRigPose(unit.features) : undefined}
          size={92}
        />

        {!unit ? (
          <LabEmpty title={copy.speak.empty} />
        ) : (
          <>
            <div
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
              role="tablist"
              aria-label={copy.sounds.title}
            >
              {candidates.slice(0, 12).map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  role="tab"
                  aria-selected={candidate.id === unit.id}
                  onClick={() =>
                    setSelected({ language: pack.language, unitId: candidate.id })
                  }
                  className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                    candidate.id === unit.id
                      ? "border-black bg-black text-white"
                      : "border-line bg-white text-ink-soft hover:text-black"
                  }`}
                >
                  {candidate.symbol}
                </button>
              ))}
            </div>

            <SpeakTrainer
              language={unit.language}
              targetText={unit.examples[0]?.text ?? unit.speechText ?? unit.symbol}
              nativeSource={
                unit.examples[0]
                  ? exampleAudio(unit.examples[0], unit.language)
                  : unitAudio(unit)
              }
              dimensions={pack.scoreDimensions}
              onAttempt={onAttempt}
              onCoachStateChange={setCoachState}
            />
          </>
        )}
      </div>
    </LabScreen>
  );
}
