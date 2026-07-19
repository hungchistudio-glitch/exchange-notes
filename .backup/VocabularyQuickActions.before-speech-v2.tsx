"use client";

import { useState } from "react";
import {
  Brain,
  Check,
  Languages,
  LoaderCircle,
  Pencil,
  Share2,
  Volume2,
} from "lucide-react";

import AppButton from "@/components/ui/AppButton";
import SectionCard from "@/components/design/SectionCard";

type SpeakingLanguage = "english" | "chinese";

type Props = {
  english: string;
  chinese?: string | null;
  onEdit: () => void;
};

export default function VocabularyQuickActions({
  english,
  chinese,
  onEdit,
}: Props) {
  const [speaking, setSpeaking] =
    useState<SpeakingLanguage | null>(null);
  const [copied, setCopied] = useState(false);

  function speak(
    text: string,
    language: SpeakingLanguage,
  ) {
    if (typeof window === "undefined") return;

    if (!("speechSynthesis" in window)) {
      alert("Speech is not supported on this browser.");
      return;
    }

    if (!text.trim()) {
      alert(
        language === "english"
          ? "No English text is available."
          : "No Chinese translation is available.",
      );
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang =
      language === "english" ? "en-US" : "zh-TW";

    utterance.rate =
      language === "english" ? 0.85 : 0.78;

    utterance.onstart = () => setSpeaking(language);
    utterance.onend = () => setSpeaking(null);
    utterance.onerror = () => setSpeaking(null);

    window.speechSynthesis.speak(utterance);
  }

  function handleReview() {
    const reviewSection =
      document.getElementById("review-this-word");

    if (!reviewSection) return;

    reviewSection.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    reviewSection.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.015)" },
        { transform: "scale(1)" },
      ],
      {
        duration: 500,
        easing: "ease-out",
      },
    );
  }

  async function handleShare() {
    const shareData = {
      title: english,
      text: chinese
        ? `${english} — ${chinese}`
        : english,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(
        `${shareData.text}\n${shareData.url}`,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error("Could not share this word:", error);
    }
  }

  const actionClassName =
    "flex min-h-12 items-center justify-center gap-2 py-3";

  return (
    <SectionCard>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <AppButton
          type="button"
          variant="secondary"
          className={actionClassName}
          onClick={() => speak(english, "english")}
          disabled={speaking !== null}
        >
          {speaking === "english" ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Volume2 size={18} />
          )}

          <span>
            {speaking === "english"
              ? "Speaking..."
              : "English"}
          </span>
        </AppButton>

        <AppButton
          type="button"
          variant="secondary"
          className={actionClassName}
          onClick={() =>
            speak(chinese ?? "", "chinese")
          }
          disabled={speaking !== null || !chinese}
        >
          {speaking === "chinese" ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Languages size={18} />
          )}

          <span>
            {speaking === "chinese"
              ? "播放中..."
              : "中文"}
          </span>
        </AppButton>

        <AppButton
          type="button"
          variant="secondary"
          className={actionClassName}
          onClick={handleReview}
        >
          <Brain size={18} />
          <span>Review</span>
        </AppButton>

        <AppButton
          type="button"
          variant="secondary"
          className={actionClassName}
          onClick={onEdit}
        >
          <Pencil size={18} />
          <span>Edit</span>
        </AppButton>

        <AppButton
          type="button"
          variant="secondary"
          className={`${actionClassName} col-span-2 sm:col-span-1`}
          onClick={() => void handleShare()}
        >
          {copied ? (
            <Check size={18} />
          ) : (
            <Share2 size={18} />
          )}

          <span>{copied ? "Copied" : "Share"}</span>
        </AppButton>
      </div>
    </SectionCard>
  );
}
