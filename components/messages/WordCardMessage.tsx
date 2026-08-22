"use client";

import { Bookmark, Check, Send, Volume2 } from "lucide-react";

import OrbitIconButton from "@/components/foundation/buttons/OrbitIconButton";
import { formatMessageTime } from "@/lib/messages/format";
import type { SharedWordCard } from "@/lib/messages/wordCard";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";
import { getPronunciationData } from "@/lib/pronunciation";
import { getLanguage } from "@/lib/languages";
import { speak, type SpeechLanguage } from "@/lib/speech";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { insertValues } from "@/lib/utils";

/*
 * A word someone sent you, rendered the way the vocabulary screens render
 * one: the language you are learning is the hero, the language you already
 * have is the support. Which of the two that is comes from the account's
 * learning language, so the same card is laid out differently for the two
 * people looking at it.
 */

type WordCardMessageProps = {
  card: SharedWordCard;
  createdAt: string;
  isLearningChinese: boolean;
  t: TranslationDictionary;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
  onShare: () => void;
};

export default function WordCardMessage({
  card,
  createdAt,
  isLearningChinese,
  t,
  saved,
  saving,
  onSave,
  onShare,
}: WordCardMessageProps) {
  const pronunciation = getPronunciationData({
    english: card.word,
    chinese: card.translation,
  });

  const englishIsPrimary = !isLearningChinese;

  const primaryWordClass = "min-w-0 truncate text-xl font-bold";
  const secondaryWordClass = "min-w-0 truncate text-base font-normal";

  function speakerStyle(primary: boolean) {
    return primary
      ? {
          background: "var(--msg-accent)",
          color: "var(--msg-accent-ink)",
          borderColor: "transparent",
        }
      : {
          background: "var(--msg-surface-soft)",
          color: "var(--msg-ink-soft)",
          borderColor: "var(--msg-line)",
        };
  }

  const englishBlock = (
    <div key="english">
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--msg-ink-faint)" }}
      >
        English
      </span>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p
          className={englishIsPrimary ? primaryWordClass : secondaryWordClass}
          style={{
            color: englishIsPrimary ? "var(--msg-ink)" : "var(--msg-ink-soft)",
          }}
        >
          {card.word}
        </p>
        <button
          type="button"
          onClick={() => speak(card.word, "en-US")}
          aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, {
            text: card.word,
          })}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
          style={speakerStyle(englishIsPrimary)}
        >
          <Volume2 size={15} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );

  const chineseBlock = (
    <div key="chinese">
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--msg-ink-faint)" }}
      >
        中文
      </span>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p
          className={englishIsPrimary ? secondaryWordClass : primaryWordClass}
          style={{
            color: englishIsPrimary ? "var(--msg-ink-soft)" : "var(--msg-ink)",
          }}
        >
          {card.translation}
        </p>
        <button
          type="button"
          onClick={() => speak(card.translation, "zh-TW")}
          aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, {
            text: card.translation,
          })}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
          style={speakerStyle(!englishIsPrimary)}
        >
          <Volume2 size={15} strokeWidth={1.8} />
        </button>
      </div>
      {(pronunciation.pinyin || pronunciation.zhuyin) && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--msg-ink-faint)" }}>
          {[pronunciation.pinyin, pronunciation.zhuyin]
            .filter(Boolean)
            .join("  ")}
        </p>
      )}
    </div>
  );

  const [firstBlock, secondBlock] = isLearningChinese
    ? [chineseBlock, englishBlock]
    : [englishBlock, chineseBlock];

  /*
   * Which language leads is the reader's setting; which languages exist is
   * the card's own business. A card sent from a different pair still renders
   * both of its sides — it just cannot promise either of them is the one
   * this reader is studying.
   */
  const [firstCode, secondCode] = isLearningChinese
    ? (["zh-TW", "en"] as const)
    : (["en", "zh-TW"] as const);

  const firstExample = card.examples?.[firstCode];
  const secondExample = card.examples?.[secondCode];
  const firstExampleLang = getLanguage(firstCode).speechTag;
  const secondExampleLang = getLanguage(secondCode).speechTag;

  function renderExample(
    text: string,
    language: SpeechLanguage,
    primary: boolean,
  ) {
    return (
      <div
        className="flex items-center justify-between gap-2 rounded-xl p-2.5"
        style={{ background: "var(--msg-surface-soft)" }}
      >
        <p
          className="min-w-0 text-xs leading-5"
          style={{
            color: primary ? "var(--msg-ink)" : "var(--msg-ink-soft)",
          }}
        >
          {text}
        </p>
        <button
          type="button"
          onClick={() => speak(text, language)}
          aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, {
            text,
          })}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
          style={{
            background: "var(--msg-surface)",
            borderColor: "var(--msg-line)",
            color: "var(--msg-ink-soft)",
          }}
        >
          <Volume2 size={13} strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  return (
    <article
      className="w-full max-w-[360px] rounded-[22px] border p-4 sm:p-5"
      style={{
        background: "var(--msg-surface)",
        borderColor: "var(--msg-line)",
        color: "var(--msg-ink)",
      }}
    >
      {firstBlock}
      <div
        className="mt-3 border-t pt-3"
        style={{ borderColor: "var(--msg-line)" }}
      >
        {secondBlock}
      </div>

      {card.partOfSpeech && (
        <p className="mt-2 text-xs" style={{ color: "var(--msg-ink-faint)" }}>
          {
            t.vocabulary.detail.partOfSpeech[
              normalizePartOfSpeech(card.partOfSpeech)
            ]
          }
        </p>
      )}

      {(firstExample || secondExample) && (
        <div className="mt-2.5 space-y-1.5">
          {firstExample && renderExample(firstExample, firstExampleLang, true)}
          {secondExample &&
            renderExample(secondExample, secondExampleLang, false)}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between">
        <time
          dateTime={createdAt}
          className="text-[10px]"
          style={{ color: "var(--msg-ink-faint)" }}
        >
          {formatMessageTime(createdAt)}
        </time>

        <div className="flex items-center gap-1.5">
          {/* Forwarding a card someone sent you is how a good word travels.
              The picker holds the card itself, so this needs nothing saved
              first. */}
          <OrbitIconButton
            onClick={onShare}
            aria-label={t.vocabulary.lookup.shareWithFriend}
            sizeClassName="h-7 w-7"
          >
            <Send size={13} strokeWidth={1.9} />
          </OrbitIconButton>

          <button
            type="button"
            onClick={onSave}
            disabled={saving || saved}
            aria-label={t.capture.result.saveToVocabulary}
            className="flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-60"
            style={
              saved
                ? { background: "var(--success-soft)", color: "var(--success)" }
                : {
                    background: "var(--msg-accent)",
                    color: "var(--msg-accent-ink)",
                  }
            }
          >
            {saved ? (
              <Check size={13} strokeWidth={2} />
            ) : (
              <Bookmark size={13} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
