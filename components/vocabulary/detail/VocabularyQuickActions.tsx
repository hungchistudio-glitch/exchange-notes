"use client";

import { useRef, useState } from "react";
import { Check, Pencil, Share2 } from "lucide-react";

import SectionCard from "@/components/vocabulary/detail/VocabularySection";
import AppButton from "@/components/ui/AppButton";
import useTranslation from "@/hooks/i18n/useTranslation";

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
  const { t } = useTranslation();
  const actions = t.vocabulary.detail.actions;

  const [copied, setCopied] = useState(false);
  const sharingRef = useRef(false);

  async function handleShare() {
    if (sharingRef.current) return;

    sharingRef.current = true;

    const shareData = {
      title: english,
      text: chinese ? `${english} — ${chinese}` : english,
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
    "flex min-h-12 items-center justify-center py-4";

  const shareLabel = copied
    ? actions.copied
    : actions.share;

  return (
    <SectionCard>
      <div className="grid grid-cols-2 gap-3">
        <AppButton
          type="button"
          variant="secondary"
          className={actionClassName}
          onClick={onEdit}
          aria-label={actions.edit}
          title={actions.edit}
        >
          <Pencil size={21} aria-hidden="true" />
        </AppButton>

        <AppButton
          type="button"
          variant="secondary"
          className={actionClassName}
          onClick={() => void handleShare()}
          aria-label={shareLabel}
          title={shareLabel}
        >
          {copied ? (
            <Check size={21} aria-hidden="true" />
          ) : (
            <Share2 size={21} aria-hidden="true" />
          )}
        </AppButton>
      </div>
    </SectionCard>
  );
}
