"use client";

import { useState } from "react";

import { SpeakerButton } from "@/components/foundation-legacy";
import useTranslation from "@/hooks/i18n/useTranslation";
import useLearningLanguage from "@/hooks/preferences/useLearningLanguage";
import { speakText } from "@/lib/pronunciation/playback";
import type { ReviewGrade } from "@/types/vocabulary";

type Props = {
  english: string;
  chinese: string;
  englishExample?: string | null;
  chineseExample?: string | null;
  onGrade: (grade: ReviewGrade) => void;
  disabled?: boolean;
};

const gradeStyles: Record<
  ReviewGrade,
  string
> = {
  again:
    "border-red-200 bg-red-50 text-red-700",
  hard:
    "border-orange-200 bg-orange-50 text-orange-700",
  good:
    "border-green-200 bg-green-50 text-green-700",
  easy:
    "border-blue-200 bg-blue-50 text-blue-700",
};

type AudioRowProps = {
  text: string;
  language: "en" | "zh";
  textClassName?: string;
};

function AudioRow({
  text,
  language,
  textClassName = "",
}: AudioRowProps) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4">
      <p
        className={[
          "min-w-0 flex-1 break-words",
          textClassName,
        ].join(" ")}
      >
        {text}
      </p>

      <SpeakerButton
        label={
          language === "en"
            ? `Play ${text}`
            : `播放 ${text}`
        }
        onClick={() =>
          speakText(
            text,
            language === "en"
              ? "en-US"
              : "zh-TW",
          )
        }
        className="shrink-0"
      />
    </div>
  );
}

type ExampleRowProps = {
  text: string;
  language: "en" | "zh";
};

function ExampleRow({
  text,
  language,
}: ExampleRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-[22px] bg-black/[0.035] p-5">
      <p className="min-w-0 flex-1 text-[15px] leading-7 text-black/60">
        {text}
      </p>

      <SpeakerButton
        label={
          language === "en"
            ? `Play ${text}`
            : `播放 ${text}`
        }
        onClick={() =>
          speakText(
            text,
            language === "en"
              ? "en-US"
              : "zh-TW",
          )
        }
        className="shrink-0 border-black/[0.07] bg-transparent"
      />
    </div>
  );
}

export default function ReviewCard({
  english,
  chinese,
  englishExample,
  chineseExample,
  onGrade,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const {
    isLearningChinese,
  } = useLearningLanguage();

  const [revealed, setRevealed] =
    useState(false);

  const promptText = isLearningChinese
    ? chinese
    : english;

  const promptLanguage = isLearningChinese
    ? "zh"
    : "en";

  const answerText = isLearningChinese
    ? english
    : chinese;

  const answerLanguage = isLearningChinese
    ? "en"
    : "zh";

  const gradeButtons: Array<{
    grade: ReviewGrade;
    label: string;
    description: string;
  }> = [
    {
      grade: "again",
      label:
        t.review.grades.again.label,
      description:
        t.review.grades.again
          .description,
    },
    {
      grade: "hard",
      label:
        t.review.grades.hard.label,
      description:
        t.review.grades.hard
          .description,
    },
    {
      grade: "good",
      label:
        t.review.grades.good.label,
      description:
        t.review.grades.good
          .description,
    },
    {
      grade: "easy",
      label:
        t.review.grades.easy.label,
      description:
        t.review.grades.easy
          .description,
    },
  ];

  return (
    <article className="overflow-hidden rounded-[28px] border border-black/[0.08] bg-white shadow-[0_18px_55px_rgba(0,0,0,0.06)]">
      <div className="flex min-h-[390px] flex-col p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/35">
          {t.review.vocabulary}
        </p>

        <div className="mt-6">
          <AudioRow
            text={promptText}
            language={promptLanguage}
            textClassName="text-[38px] font-semibold leading-[1.05] tracking-[-0.045em] text-black sm:text-[44px]"
          />
        </div>

        {revealed ? (
          <div className="mt-9 space-y-5">
            <AudioRow
              text={answerText}
              language={answerLanguage}
              textClassName="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-black/80"
            />

            {englishExample ||
            chineseExample ? (
              <div className="space-y-3 border-t border-black/[0.07] pt-5">
                {englishExample ? (
                  <ExampleRow
                    text={englishExample}
                    language="en"
                  />
                ) : null}

                {chineseExample ? (
                  <ExampleRow
                    text={chineseExample}
                    language="zh"
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {!revealed ? (
          <button
            type="button"
            onClick={() =>
              setRevealed(true)
            }
            className="mt-auto min-h-[54px] w-full rounded-2xl bg-black px-5 text-[15px] font-semibold text-white transition hover:opacity-85 active:scale-[0.99]"
          >
            {t.review.revealAnswer}
          </button>
        ) : (
          <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
            {gradeButtons.map(
              (button) => (
                <button
                  key={button.grade}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onGrade(
                      button.grade,
                    )
                  }
                  className={`min-h-[82px] rounded-[20px] border px-4 py-3 text-left transition hover:brightness-95 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 ${gradeStyles[button.grade]}`}
                >
                  <span className="block text-[16px] font-semibold">
                    {button.label}
                  </span>

                  <span className="mt-1 block text-xs opacity-70">
                    {
                      button.description
                    }
                  </span>
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </article>
  );
}
