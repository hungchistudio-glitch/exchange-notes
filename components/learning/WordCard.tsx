"use client";

import { useMemo, type ReactNode } from "react";
import SpeakerButton from "@/components/learning/SpeakerButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getPronunciationData } from "@/lib/pronunciation";

type WordCardLanguage = "english" | "traditional-chinese";

function isZhuyin(value: string) {
  return /[ㄅ-ㄩˉˊˇˋ˙]/u.test(value);
}

function normalizePartOfSpeech(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");

  const aliases = {
    n: "noun",
    noun: "noun",
    v: "verb",
    verb: "verb",
    adj: "adjective",
    adjective: "adjective",
    adv: "adverb",
    adverb: "adverb",
    pronoun: "pronoun",
    preposition: "preposition",
    conjunction: "conjunction",
    interjection: "interjection",
    phrase: "phrase",
    "noun phrase": "phrase",
  } as const;

  return aliases[normalized as keyof typeof aliases] ?? "other";
}

type WordCardProps = {
  english: string;
  chinese: string;

  englishExample?: string | null;
  chineseExample?: string | null;
  partOfSpeech?: string | null;
  imageUrl?: string | null;

  learningLanguage?: WordCardLanguage;
  headerLabel?: string | null;
  statusLabel?: string | null;

  actions?: ReactNode;
  className?: string;
};

function AudioButton({
  text,
  language,
  label,
  compact = false,
}: {
  text: string;
  language: "en-US" | "zh-TW";
  label: string;
  compact?: boolean;
}) {
  return (
    <SpeakerButton
      text={text}
      language={language}
      label={label}
      compact={compact}
    />
  );
}

export default function WordCard({
  english,
  chinese,
  englishExample,
  chineseExample,
  partOfSpeech,
  imageUrl,
  learningLanguage = "english",
  headerLabel,
  statusLabel,
  actions,
  className = "",
}: WordCardProps) {
  const { t } = useTranslation();
  const lookup = t.vocabulary.lookup;
  const detail = t.vocabulary.detail;
  const englishText = english.trim();
  const chineseText = chinese.trim();
  const englishExampleText = englishExample?.trim() ?? "";
  const chineseExampleText = chineseExample?.trim() ?? "";

  const partOfSpeechLabel = partOfSpeech?.trim()
    ? detail.partOfSpeech[normalizePartOfSpeech(partOfSpeech)]
    : null;

  const pronunciation = useMemo(
    () =>
      getPronunciationData({
        english: englishText,
        chinese: chineseText,
      }),
    [chineseText, englishText],
  );

  const learningChinese = learningLanguage === "traditional-chinese";

  const chinesePronunciation = [
    pronunciation.pinyin || "—",
    pronunciation.zhuyin || "—",
  ];

  const englishPronunciation = pronunciation.english
    ? [pronunciation.english]
    : [];

  const primary = learningChinese
    ? {
        label: lookup.chinese,
        text: chineseText,
        pronunciation: chinesePronunciation,
        language: "zh-TW" as const,
      }
    : {
        label: lookup.english,
        text: englishText,
        pronunciation: englishPronunciation,
        language: "en-US" as const,
      };

  const secondary = learningChinese
    ? {
        label: lookup.english,
        text: englishText,
        pronunciation: englishPronunciation,
        language: "en-US" as const,
      }
    : {
        label: lookup.chinese,
        text: chineseText,
        pronunciation: chinesePronunciation,
        language: "zh-TW" as const,
      };

  return (
    <article
      className={`overflow-hidden rounded-[30px] border border-black/[0.07] bg-white shadow-[0_16px_45px_rgba(0,0,0,0.055)] ${className}`}
    >
      {imageUrl && (
        <div className="aspect-[4/3] overflow-hidden bg-[#f3f0e9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={englishText || chineseText}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="p-5 sm:p-6">
        {(headerLabel || statusLabel) && (
          <div className="mb-6 flex items-center justify-between gap-3">
            {headerLabel ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
                {headerLabel}
              </p>
            ) : (
              <span />
            )}

            {statusLabel && (
              <span className="rounded-full bg-[#f3f0e9] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45">
                {statusLabel}
              </span>
            )}
          </div>
        )}

        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
            {primary.label}
          </p>

          <div className="mt-2 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-words text-[30px] font-semibold leading-tight tracking-[-0.04em]">
                {primary.text}
              </p>

              {primary.pronunciation.length > 0 && (
                <div className="mt-3 space-y-1 text-[12px] leading-5 text-black/45">
                  {primary.pronunciation.map((value, index) => (
                    <div
                      key={`${value}-${index}`}
                      className="flex min-h-8 items-center justify-between gap-3"
                    >
                      <p
                        className={isZhuyin(value) ? "font-zhuyin" : undefined}
                      >
                        {value}
                      </p>

                      <SpeakerButton
                        text={primary.text}
                        language={primary.language}
                        label={`Play ${primary.label} pronunciation`}
                        compact
                        subtle
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <AudioButton
              text={primary.text}
              language={primary.language}
              label={`Play ${primary.label}`}
            />
          </div>
        </section>

        <div className="my-6 border-t border-black/[0.07]" />

        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
            {secondary.label}
          </p>

          <div className="mt-2 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-words text-[25px] font-semibold leading-tight tracking-[-0.025em] text-neutral-800">
                {secondary.text}
              </p>

              {secondary.pronunciation.length > 0 && (
                <div className="mt-3 space-y-1 text-[12px] leading-5 text-black/45">
                  {secondary.pronunciation.map((value, index) => (
                    <div
                      key={`${value}-${index}`}
                      className="flex min-h-8 items-center justify-between gap-3"
                    >
                      <p
                        className={isZhuyin(value) ? "font-zhuyin" : undefined}
                      >
                        {value}
                      </p>

                      <SpeakerButton
                        text={secondary.text}
                        language={secondary.language}
                        label={`Play ${secondary.label} pronunciation`}
                        compact
                        subtle
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <AudioButton
              text={secondary.text}
              language={secondary.language}
              label={`Play ${secondary.label}`}
            />
          </div>
        </section>

        {partOfSpeechLabel && (
          <p className="mt-5 text-[11px] tracking-[0.06em] text-black/35">
            {partOfSpeechLabel}
          </p>
        )}

        {(englishExampleText || chineseExampleText) && (
          <div className="mt-6 space-y-3 border-t border-black/[0.07] pt-5">
            {englishExampleText && (
              <section className="rounded-[20px] bg-[#f5f2eb] p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">
                      {lookup.englishExample}
                    </p>

                    <p className="mt-3 text-[14px] leading-6">
                      {englishExampleText}
                    </p>
                  </div>

                  <AudioButton
                    text={englishExampleText}
                    language="en-US"
                    label="Play {lookup.englishExample}"
                    compact
                  />
                </div>
              </section>
            )}

            {chineseExampleText && (
              <section className="rounded-[20px] bg-[#f5f2eb] p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold tracking-[0.16em] text-black/35">
                      {lookup.chineseExample}
                    </p>

                    <p className="mt-3 text-[14px] leading-6 text-neutral-600">
                      {chineseExampleText}
                    </p>
                  </div>

                  <AudioButton
                    text={chineseExampleText}
                    language="zh-TW"
                    label="播放{lookup.chineseExample}"
                    compact
                  />
                </div>
              </section>
            )}
          </div>
        )}

        {actions && (
          <div className="mt-5 border-t border-black/[0.07] pt-5">
            {actions}
          </div>
        )}
      </div>
    </article>
  );
}
