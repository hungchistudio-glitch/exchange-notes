"use client";

import { memo } from "react";
import { Check, MoreHorizontal, RotateCcw, Send } from "lucide-react";
import AppButton from "@/components/ui/AppButton";
import useTranslation from "@/hooks/i18n/useTranslation";

type Props = {
  mastered: boolean;
  updating: boolean;
  onToggleMastered: () => void;
  onSend: () => void;
  onOpen: () => void;
  word: string;
};

function VocabularyCardActions({
  mastered,
  updating,
  onToggleMastered,
  onSend,
  onOpen,
  word,
}: Props) {
  const { t } = useTranslation();
  const detail = t.vocabulary.detail;

  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-t border-black/[0.06] bg-white px-5 py-4">

      <AppButton
        variant={mastered ? "secondary" : "primary"}
        size="md"
        className="rounded-full h-11 text-[14px] font-semibold tracking-[-0.01em] shadow-[0_4px_12px_rgba(0,0,0,.06)]"
        disabled={updating}
        onClick={onToggleMastered}
      >
        <span className="flex items-center justify-center gap-2">
          {mastered ? (
            <RotateCcw size={18} strokeWidth={2.4} />
          ) : (
            <Check size={18} strokeWidth={2.4} />
          )}
          <span>{mastered ? detail.markAsLearning : detail.markAsMastered}</span>
        </span>
      </AppButton>

      <AppButton
        variant="ghost"
        size="icon"
        className="rounded-full h-10 w-10 hover:bg-black/[0.04]"
        onClick={onSend}
        aria-label={detail.sendToFriendAriaLabel}
        title={detail.sendToFriendAriaLabel}
      >
        <Send size={18} />
      </AppButton>

      <AppButton
        variant="ghost"
        size="icon"
        className="rounded-full h-10 w-10 hover:bg-black/[0.04]"
        onClick={onOpen}
        aria-label={detail.openFullDetailsAriaLabel.replace(
          "{word}",
          word,
        )}
        title={detail.openFullDetailsAriaLabel.replace(
          "{word}",
          word,
        )}
      >
        <MoreHorizontal size={18} />
      </AppButton>

    </div>
  );
}

export default memo(VocabularyCardActions);
