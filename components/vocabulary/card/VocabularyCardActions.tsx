"use client";

import { Check, MoreHorizontal, Send } from "lucide-react";
import AppButton from "@/components/ui/AppButton";

type Props = {
  mastered: boolean;
  updating: boolean;
  onToggleMastered: () => void;
  onSend: () => void;
  onOpen: () => void;
};

export default function VocabularyCardActions({
  mastered,
  updating,
  onToggleMastered,
  onSend,
  onOpen,
}: Props) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-t border-neutral-200/70 bg-white px-4 py-3">

      <AppButton
        variant={mastered ? "secondary" : "primary"}
        size="md"
        className="rounded-xl shadow-sm"
        disabled={updating}
        onClick={onToggleMastered}
      >
        <Check size={15} />
        {mastered ? "Learning" : "Mastered"}
      </AppButton>

      <AppButton
        variant="ghost"
        size="icon"
        className="rounded-xl hover:bg-neutral-100"
        onClick={onSend}
      >
        <Send size={16} />
      </AppButton>

      <AppButton
        variant="ghost"
        size="icon"
        className="rounded-xl hover:bg-neutral-100"
        onClick={onOpen}
      >
        <MoreHorizontal size={17} />
      </AppButton>

    </div>
  );
}
