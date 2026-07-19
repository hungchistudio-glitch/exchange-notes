"use client";

import { useRef, useState } from "react";
import {
  Brain,
  Check,
  Pencil,
  Share2,
} from "lucide-react";

import SectionCard from "@/components/design/SectionCard";
import AppButton from "@/components/ui/AppButton";

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

  const [copied, setCopied] = useState(false);
  const sharingRef = useRef(false);


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
    if (sharingRef.current) return;

    sharingRef.current = true;
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
    } finally {
      sharingRef.current = false;
    }
  }

  const actionClassName =
    "flex min-h-12 items-center justify-center gap-2 py-3";

  return (
    <SectionCard>
      <div className="grid grid-cols-3 gap-3">
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
          className={actionClassName}
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
