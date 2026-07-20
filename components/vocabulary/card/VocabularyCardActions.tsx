"use client";

import { memo } from "react";
import { Check, MoreHorizontal, Send } from "lucide-react";
import AppButton from "@/components/ui/AppButton";

type Props = {
  mastered: boolean;
  updating: boolean;
  onToggleMastered: () => void;
  onSend: () => void;
  onOpen: () => void;
};

function VocabularyCardActions({
  mastered,
  updating,
  onToggleMastered,
  onSend,
  onOpen,
}: Props) {
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
          <Check size={18} strokeWidth={2.4} />
          <span>{mastered ? "Learning" : "Mastered"}</span>
        </span>
      </AppButton>

      <AppButton
        variant="ghost"
        size="icon"
        className="rounded-full h-10 w-10 hover:bg-black/[0.04]"
        onClick={onSend}
      >
        <Send size={18} />
      </AppButton>

      <AppButton
        variant="ghost"
        size="icon"
        className="rounded-full h-10 w-10 hover:bg-black/[0.04]"
        onClick={onOpen}
      >
        <MoreHorizontal size={18} />
      </AppButton>

    </div>
  );
}

export default memo(VocabularyCardActions);
