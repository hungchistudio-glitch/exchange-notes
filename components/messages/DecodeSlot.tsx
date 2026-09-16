"use client";

import { Sparkles } from "lucide-react";

import useRevealMotion from "@/components/foundation/overlays/useRevealMotion";
import YumiDecodeCard from "@/components/messages/YumiDecodeCard";
import type { DetectedPhrase, MessageAnalysis } from "@/lib/messages/decode";
import type { SpeechLanguage } from "@/lib/speech";

import styles from "./DecodeReveal.module.css";

type DecodeSlotProps = {
  analysis: MessageAnalysis;
  conversationId: string;
  speechLanguage: SpeechLanguage;
  savedPhraseIds: Set<string>;
  savingPhraseId: string | null;
  open: boolean;
  openLabel: string;
  onOpen: () => void;
  onClose: () => void;
  onSavePhrase: (phrase: DetectedPhrase) => void;
  onInsertReply: (text: string) => void;
};

/**
 * The offer, and the card it opens into.
 *
 * A component of its own for one reason: the reveal needs a hook, and this
 * lives inside the map over messages, where a hook cannot go. Lifting the
 * slot out gives each message its own motion without the room having to
 * track any of it.
 *
 * Both states used to be a ternary. The card appeared and disappeared
 * between frames, which in a scrolling conversation reads as a mis-tap
 * rather than as something opening and closing. Now the card outlives the
 * flag long enough to fold away from the line that offered it.
 */
export default function DecodeSlot({
  analysis,
  conversationId,
  speechLanguage,
  savedPhraseIds,
  savingPhraseId,
  open,
  openLabel,
  onOpen,
  onClose,
  onSavePhrase,
  onInsertReply,
}: DecodeSlotProps) {
  const reveal = useRevealMotion(open);

  if (reveal.rendered) {
    return (
      <div className="mb-4 flex justify-start">
        <div
          className={`${styles.reveal} w-full`}
          data-visible={reveal.visible ? "true" : "false"}
        >
          <YumiDecodeCard
            analysis={analysis}
            conversationId={conversationId}
            speechLanguage={speechLanguage}
            savedPhraseIds={savedPhraseIds}
            savingPhraseId={savingPhraseId}
            onSavePhrase={onSavePhrase}
            onInsertReply={onInsertReply}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  /*
   * Closed, the offer is one quiet line. §18 asks for a conversation that
   * still reads as a conversation, and a card that opens itself under every
   * message would be the opposite of that.
   */
  return (
    <div className="mb-4 flex justify-start">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.75rem] font-medium"
        style={{
          borderColor: "var(--msg-line)",
          color: "var(--msg-accent)",
          background: "var(--msg-accent-soft)",
        }}
      >
        <Sparkles size={13} strokeWidth={1.9} />
        {openLabel}
      </button>
    </div>
  );
}
