"use client";

import { Bookmark, Check, Send, Volume2 } from "lucide-react";

import OrbitIconButton from "@/components/foundation/buttons/OrbitIconButton";
import { formatMessageTime } from "@/lib/messages/format";
import type { SharedWordCard } from "@/lib/messages/wordCard";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";
import { getPhonetics } from "@/lib/pronunciation";
import {
  DEFAULT_LEARNING_PAIR,
  getLanguage,
  type LanguageCode,
} from "@/lib/languages";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import usePhonetics from "@/hooks/usePhonetics";
import useTranslatedTexts from "@/hooks/useTranslatedTexts";
import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
import { speak, type SpeechLanguage } from "@/lib/speech";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { insertValues } from "@/lib/utils";

/*
 * A word someone sent you, rendered the way the vocabulary screens render
 * one: it leads in the language it was sent in, and is glossed in a language
 * you read. A card sent as Spanish stays a Spanish card — it is somebody
 * else's word, and relabelling it as whatever you happen to be studying is
 * how a conversation history stops being a record of what was said.
 *
 * Both blocks name their own language, so neither side depends on the reader
 * recognising a script.
 */

type WordCardMessageProps = {
  card: SharedWordCard;
  createdAt: string;
  /** The reader's own learning language, which decides which side leads. */
  learningLanguage: LanguageCode;
  t: TranslationDictionary;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
  onShare: () => void;
};

export default function WordCardMessage({
  card,
  createdAt,
  learningLanguage,
  t,
  saved,
  saving,
  onSave,
  onShare,
}: WordCardMessageProps) {
  /*
   * Read by the same rule the vocabulary screens use, so a word in your
   * history is laid out like a word in your library: it leads in its own
   * language, and the gloss follows the reader.
   *
   * A card sent with every language (`texts`) can be glossed for any reader.
   * One sent before that existed carries two, and if neither is the reader's
   * the gloss is the one it was sent with — it is somebody's message, and a
   * gloss in a third language beats no gloss at all.
   */
  const { supportLanguage } = useDisplayLanguages();

  const sides = getVocabularyCardSides(
    {
      word: card.word,
      translation: card.translation,
      word_language: card.wordLanguage ?? DEFAULT_LEARNING_PAIR[0],
      translation_language:
        card.translationLanguage ?? DEFAULT_LEARNING_PAIR[1],
      example_sentence: null,
      translated_example: null,
      texts: card.texts,
      examples: card.examples,
    },
    learningLanguage,
    supportLanguage,
  );

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

  /*
   * One block, twice, instead of one named for each of two languages. The
   * label is what the language calls itself, and the phonetics are whatever
   * that language actually has — pinyin and zhuyin appear under Chinese and
   * nowhere else, which used to be true only because the second block was
   * literally called "chinese".
   */
  function languageBlock(code: LanguageCode, text: string, primary: boolean) {
    const language = getLanguage(code);
    const phonetics = getPhonetics(text, code);

    /*
     * Whatever systems this language actually uses, in the order the rest of
     * the app shows them: IPA for the Latin languages, zhuyin and pinyin for
     * Chinese. This listed only the Chinese two, so a word card in a
     * conversation carried an annotation for exactly one of the five
     * languages the app teaches — and the reader had no way to tell that
     * from the word simply not having one.
     */
    const annotation = [ipaFor({ text, language: code }), phonetics.pinyin, phonetics.zhuyin]
      .filter(Boolean)
      .join("  ");

    return (
      <div key={code}>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--msg-ink-faint)" }}
        >
          {language.endonym}
        </span>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p
            className={primary ? primaryWordClass : secondaryWordClass}
            style={{
              color: primary ? "var(--msg-ink)" : "var(--msg-ink-soft)",
            }}
          >
            {text}
          </p>
          <button
            type="button"
            onClick={() => speak(text, language.speechTag)}
            aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, {
              text,
            })}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
            style={speakerStyle(primary)}
          >
            <Volume2 size={15} strokeWidth={1.8} />
          </button>
        </div>
        {annotation ? (
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--msg-ink-faint)" }}
          >
            {annotation}
          </p>
        ) : null}
      </div>
    );
  }

  /*
   * What the card can be shown in, and what has to be asked for.
   *
   * A card sent before shared cards carried every language holds two, and
   * they may be two this reader never chose — the screenshot case is a menu
   * item sent as Chinese and English, read by someone learning French, who
   * had it led in Chinese: a language absent from all three of their
   * settings.
   *
   * The message is not rewritten to fix that. It belongs to whoever sent it.
   * What is translated is the *rendering*, on the way to the screen, once
   * and then cached for everybody.
   *
   * Only what is missing: a card that already holds the reader's language
   * asks for nothing, which is every card sent since.
   */
  const leadMissing = sides.primary.language !== learningLanguage;
  const glossMissing = !sides.secondary.text.trim();

  /*
   * The side being translated *from*, text and language together.
   *
   * They have to travel as a pair. Reading the language off one side and
   * the text off the other sends Chinese to the model labelled as English,
   * which is both a worse translation and a cache entry filed under a
   * language the phrase was never in.
   *
   * The gloss side is preferred as the source where there is one: it is the
   * language the reader already reads, so it is the half most likely to be
   * well-formed, and translating out of it keeps the two sides agreeing.
   */
  const translateFrom = sides.secondary.text.trim()
    ? sides.secondary
    : sides.primary;

  const leadRequest = {
    text: leadMissing ? translateFrom.text : null,
    from: translateFrom.language,
    to: learningLanguage,
  };

  const glossRequest = {
    text: glossMissing ? sides.primary.text : null,
    from: sides.primary.language,
    to: supportLanguage,
  };

  const translationFor = useTranslatedTexts([leadRequest, glossRequest]);

  const translatedLead = leadMissing ? translationFor(leadRequest) : undefined;
  const translatedGloss = glossMissing ? translationFor(glossRequest) : undefined;

  /*
   * Until the translation lands the card shows what it was sent as. That is
   * a card briefly in the wrong language, which beats a card that is briefly
   * blank — and it settles within a frame or two of opening the thread.
   */
  const firstCode = translatedLead ? learningLanguage : sides.primary.language;
  const firstText = translatedLead ?? sides.primary.text;

  const secondCode = translatedGloss ? supportLanguage : sides.secondary.language;
  const secondText = translatedGloss ?? sides.secondary.text;

  const ipaFor = usePhonetics([
    { text: firstText, language: firstCode },
    { text: secondText, language: secondCode },
  ]);

  const firstBlock = languageBlock(firstCode, firstText, true);

  /*
   * Absent, not blank. A card sent before shared cards carried every
   * language may hold nothing in the language this reader glosses in, and a
   * divider above an empty line with a speaker button that says nothing is
   * worse than one side on its own.
   */
  const secondBlock = secondText.trim()
    ? languageBlock(secondCode, secondText, false)
    : null;

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
      {secondBlock ? (
        <div
          className="mt-3 border-t pt-3"
          style={{ borderColor: "var(--msg-line)" }}
        >
          {secondBlock}
        </div>
      ) : null}

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
