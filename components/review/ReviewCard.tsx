"use client";

import { RotateCcw, Volume2 } from "lucide-react";
import type { AppLanguage, VocabularyItem } from "@/lib/types/app";
import AppButton from "@/components/ui/AppButton";

function speak(text: string, language: AppLanguage) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "traditional-chinese" ? "zh-TW" : "en-US";
  window.speechSynthesis.speak(utterance);
}

type ReviewCardProps = {
  item: VocabularyItem;
  learningLanguage: AppLanguage;
  revealed: boolean;
  direction: "target-first" | "native-first";
  onReveal: () => void;
};

export default function ReviewCard({
  item,
  learningLanguage,
  revealed,
  direction,
  onReveal,
}: ReviewCardProps) {
  const target =
    learningLanguage === "traditional-chinese" ? item.translation : item.word;
  const native =
    learningLanguage === "traditional-chinese" ? item.word : item.translation;
  const prompt = direction === "target-first" ? target : native;
  const answer = direction === "target-first" ? native : target;
  const promptLanguage =
    direction === "target-first"
      ? learningLanguage
      : learningLanguage === "english"
        ? "traditional-chinese"
        : "english";
  const answerLanguage =
    promptLanguage === "english" ? "traditional-chinese" : "english";

  return (
    <article className="overflow-hidden rounded-[32px] border border-black/[0.05] bg-white shadow-[0_18px_55px_rgba(0,0,0,0.07)]">
      {item.image_url ? (
        <div className="aspect-[16/9] overflow-hidden bg-[#e9e5dc]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="flex min-h-[390px] flex-col px-6 pb-6 pt-7 sm:px-8 sm:pb-8">
        <div className="flex items-center justify-between gap-4">
          <span className="rounded-full bg-black/[0.05] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">
            {item.part_of_speech || "Vocabulary"}
          </span>
          <button
            type="button"
            onClick={() => speak(prompt, promptLanguage)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.05] text-black/60"
            aria-label={`Play ${prompt}`}
          >
            <Volume2 size={17} strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="max-w-full break-words text-[42px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[52px]">
            {prompt}
          </p>

          {!revealed ? (
            <p className="mt-5 text-[13px] leading-6 text-black/40">
              Think of the answer, then reveal it.
            </p>
          ) : (
            <div className="mt-8 w-full border-t border-black/[0.07] pt-8">
              <div className="flex items-center justify-center gap-2">
                <p className="break-words text-[26px] font-semibold tracking-[-0.025em] text-black/65">
                  {answer}
                </p>
                <button
                  type="button"
                  onClick={() => speak(answer, answerLanguage)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black/45"
                  aria-label={`Play ${answer}`}
                >
                  <Volume2 size={16} strokeWidth={1.8} />
                </button>
              </div>

              {item.example_sentence ? (
                <div className="mt-7 rounded-[22px] bg-[#f5f2eb] p-5 text-left">
                  <p className="text-[14px] font-medium leading-6 text-black/70">
                    {item.example_sentence}
                  </p>
                  {item.translated_example ? (
                    <p className="mt-2 text-[13px] leading-6 text-black/40">
                      {item.translated_example}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {!revealed ? (
          <AppButton size="lg" className="w-full" onClick={onReveal}>
            <RotateCcw size={17} strokeWidth={1.8} />
            Reveal answer
          </AppButton>
        ) : null}
      </div>
    </article>
  );
}
