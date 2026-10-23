"use client";

import AudioButton from "@/components/pronunciation/lab/AudioButton";
import LabScreen from "@/components/pronunciation/lab/LabScreen";
import { MasteryDot } from "@/components/pronunciation/lab/SoundTile";
import { LabEmpty } from "@/components/pronunciation/lab/StateViews";
import YumiCoach from "@/components/pronunciation/lab/YumiCoach";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import usePronunciationPlayback from "@/hooks/pronunciation/usePronunciationPlayback";
import { fill } from "@/lib/i18n/format";
import { heteronymsFor, type HeteronymReading } from "@/lib/pronunciation/heteronyms";
import type { AudioSource } from "@/lib/pronunciation/lab/audio";
import { localize } from "@/lib/pronunciation/localizedText";

/* =========================================================
   One spelling, several readings — the Lab's seventh module

   Each listed word with its readings side by side; tapping one plays a
   phrase that can only be read that way, and Yumi goes through it over its
   trace, so the difference — a tone, a moved stress, an open or closed
   vowel — is seen as well as heard (Chi, 2026-10-19: "新模組：對照＋聽力
   測驗"). "Hear them in turn" plays them one after another to compare.

   The listen-and-choose quiz (filed as "listen" attempts under
   heteronym:<word>, see AttemptModule) is still to come.
   ========================================================= */

const GAP_MS = 450;

export default function ReadingsModule() {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.pronunciation.lab.readings;
  const { pack, progress } = usePronunciationLab();
  const playback = usePronunciationPlayback();
  const words = heteronymsFor(pack.language);

  const sourceFor = (reading: HeteronymReading): AudioSource => ({
    kind: "speech",
    text: reading.example,
    language: pack.language,
    hint: { phonetic: reading.examplePhonetic },
  });

  return (
    <LabScreen
      title={copy.title}
      eyebrow={pack.displayName}
      subtitle={copy.subtitle}
      backHref="/pronunciation"
      backLabel={t.pronunciation.lab.backToLab}
    >
      <div className="space-y-5 pb-8">
        <YumiCoach pack={pack} state="idle" size={92} />

        {words.length === 0 ? (
          <LabEmpty title={copy.empty} />
        ) : (
          <ul className="space-y-3">
            {words.map((heteronym) => {
              const mastery = progress[`heteronym:${heteronym.word}`]?.mastery ?? "new";
              const allKey = `all-${heteronym.word}`;
              return (
                <li key={heteronym.word} className="rounded-3xl border border-black/[0.06] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2">
                      <span className="text-[1.375rem] font-semibold" lang={pack.language}>
                        {heteronym.word}
                      </span>
                      <MasteryDot mastery={mastery} label={t.pronunciation.lab.mastery[mastery]} />
                      <span className="font-cjk text-xs text-ink-faint">
                        {fill(copy.count, { count: heteronym.readings.length })}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        playback.playSteps(
                          allKey,
                          heteronym.readings.map((reading) => ({ source: sourceFor(reading), gapMs: GAP_MS })),
                        )
                      }
                      className="font-cjk inline-flex min-h-[36px] items-center rounded-full border border-line px-3 text-[0.75rem] font-semibold text-ink-soft hover:text-black"
                    >
                      {copy.playAll}
                    </button>
                  </div>

                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {heteronym.readings.map((reading, index) => {
                      const key = `${heteronym.word}-${index}`;
                      return (
                        <li key={key} className="flex items-start gap-3 rounded-2xl bg-surface px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-baseline gap-x-2">
                              {reading.spelling ? (
                                <span className="font-semibold" lang={pack.language}>{reading.spelling}</span>
                              ) : null}
                              <span className={pack.language === "zh-TW" ? "font-zhuyin" : "font-phonetic"}>
                                {reading.phonetic}
                              </span>
                              {reading.pinyin ? (
                                <span className="font-phonetic text-xs text-ink-soft" lang="zh-Latn">{reading.pinyin}</span>
                              ) : null}
                            </p>
                            <p className="font-cjk mt-0.5 text-[0.8125rem] text-ink-soft">
                              {localize(reading.meaning, interfaceLanguage)}
                            </p>
                            <p className="mt-0.5 text-[0.8125rem] text-ink-faint" lang={pack.language}>
                              {reading.example}
                            </p>
                          </div>
                          <AudioButton
                            label={fill(t.pronunciation.heteronyms.play, { example: reading.example })}
                            failedLabel={t.pronunciation.cards.playbackFailed}
                            phase={playback.phaseFor(key)}
                            onClick={() => playback.play(key, sourceFor(reading))}
                            size="sm"
                          />
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </LabScreen>
  );
}
