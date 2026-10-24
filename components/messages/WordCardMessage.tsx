"use client";

import { Bookmark, Check, ChevronDown, Send, Volume2 } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import OrbitIconButton from "@/components/foundation/buttons/OrbitIconButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import { formatMessageTime } from "@/lib/messages/format";
import { signedImageHref } from "@/lib/media/imageUrl";
import type { SharedWordCard } from "@/lib/messages/wordCard";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";
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

/** The last line of cut text fades out, saying there is more. */
const CLAMP_FADE =
  "data-[overflowing=true]:[mask-image:linear-gradient(to_bottom,#000_calc(100%_-_1.4em),transparent)]";

/**
 * A sentence rather than a word: wider than a line of the large type. Han
 * and kana count double, being about twice as wide as a Latin letter.
 */
export function isLongText(text: string) {
  let width = 0;
  for (const character of text) width += /[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(character) ? 2 : 1;
  return width > 26;
}

/**
 * Whether any of the card's cut elements hides text, marking each for its
 * fade; null while the card is open, when nothing is cut.
 */
function measureCut(words: HTMLElement | null) {
  if (!words || words.dataset.expanded === "true") return null;
  let any = false;
  for (const element of words.querySelectorAll<HTMLElement>("[data-clamp]")) {
    const cut = element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1;
    element.dataset.overflowing = String(cut);
    any ||= cut;
  }
  return any;
}

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
  const { locale } = useTranslation();
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

  /*
   * Long text (Chi, 2026-10-24: a sentence sent as a card was cut to one
   * line with no way to read the rest). The words wrap to three lines and
   * each reading to one; past that a key opens the whole card, words and
   * readings together. A sentence is set smaller than a word, so it reads
   * as a sentence rather than a headline.
   */
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const wordsRef = useRef<HTMLDivElement>(null);
  const wordsId = useId();

  function wordClass(text: string, primary: boolean) {
    const size = isLongText(text)
      ? primary ? "text-[1.0625rem] font-semibold leading-snug" : "text-[0.9375rem] font-normal leading-snug"
      : primary ? "text-xl font-bold leading-tight" : "text-base font-normal leading-snug";
    return `min-w-0 break-words ${size} ${expanded ? "" : `line-clamp-3 ${CLAMP_FADE}`}`;
  }

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
    const phonetics = phoneticsFor({ text, language: code });

    const readings = ([
      ["zhuyin", phonetics?.zhuyin],
      ["pinyin", phonetics?.pinyin],
      ["ipa", phonetics?.ipa],
    ] as const).flatMap(([script, label]) => label ? [{ script, label }] : []);

    return (
      <div key={code}>
        <span
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--msg-ink-faint)" }}
        >
          {language.endonym}
        </span>
        <div className="mt-1 flex items-start justify-between gap-2">
          <p
            data-clamp
            className={wordClass(text, primary)}
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
            className="hit-44 relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
            style={speakerStyle(primary)}
          >
            <Volume2 size={15} strokeWidth={1.8} />
          </button>
        </div>
        {readings.length ? (
          <p
            className="mt-1 space-y-0.5 break-words text-xs leading-relaxed"
            style={{ color: "var(--msg-ink-faint)" }}
          >
            {readings.map((reading) => (
              <span
                key={reading.script}
                data-script={reading.script}
                lang={reading.script === "pinyin" ? "zh-Latn" : code}
                data-clamp
                className={`block ${expanded ? "" : "truncate"} ${reading.script === "zhuyin" ? "font-zhuyin" : "font-phonetic"}`}
              >
                {reading.label}
              </span>
            ))}
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

  const phoneticsFor = usePhonetics([
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

  /*
   * Whether anything is cut: measured, not guessed, since it depends on the
   * card's width, the script and the reader's font size. Each cut element
   * is marked, for its fade. Measured whenever the text, its readings or
   * the fold change, and again when the card changes width.
   */
  useLayoutEffect(() => {
    const cut = measureCut(wordsRef.current);
    if (cut !== null) setOverflowing(cut);
  }, [expanded, firstText, secondText, phoneticsFor]);
  useEffect(() => {
    const words = wordsRef.current;
    if (!words || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const cut = measureCut(words);
      if (cut !== null) setOverflowing(cut);
    });
    observer.observe(words);
    return () => observer.disconnect();
  }, []);

  /* The card grows or shrinks to its new height rather than jumping to it. */
  function toggleFullText() {
    const words = wordsRef.current;
    const from = words?.offsetHeight ?? 0;
    const collapsing = expanded;
    flushSync(() => setExpanded((value) => !value));
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Folding a card whose top has scrolled away brings it back into view.
    if (collapsing && words && words.getBoundingClientRect().top < 0) {
      words.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    }
    if (!words?.animate || still) return;
    words.animate(
      [{ height: `${from}px`, overflow: "hidden" }, { height: `${words.offsetHeight}px`, overflow: "hidden" }],
      { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  }

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
          className="hit-44 relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
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
      className="w-full max-w-[360px] overflow-hidden rounded-[22px] border"
      style={{
        background: "var(--msg-surface)",
        borderColor: "var(--msg-line)",
        color: "var(--msg-ink)",
      }}
    >
      {/*
        The picture above the words, in the same 16:9 container the
        vocabulary card and the detail sheet use — a word looks the same
        wherever the reader meets it.

        Served through /api/vocabulary-image, which checks that these two
        people share a conversation before it signs anything. A card sent
        before pictures existed, or one whose picture failed to publish, has
        no imagePath and this renders nothing.
      */}
      {card.imagePath && (
        // A signed, short-lived redirect that next/image would only proxy
        // again.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={signedImageHref(card.imagePath)}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full object-cover"
          style={{ background: "var(--msg-line)" }}
        />
      )}

      <div className="p-4 sm:p-5">
      <div ref={wordsRef} id={wordsId} data-expanded={expanded}>
        {firstBlock}
        {secondBlock ? (
          <div
            className="mt-3 border-t pt-3"
            style={{ borderColor: "var(--msg-line)" }}
          >
            {secondBlock}
          </div>
        ) : null}
      </div>

      {(overflowing || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={wordsId}
          onClick={toggleFullText}
          className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-full px-1 text-xs font-semibold"
          style={{ color: "var(--msg-ink-soft)" }}
        >
          {expanded ? t.common.showLess : t.common.showFullText}
          <ChevronDown
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className={`transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}

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
          className="text-[0.6875rem]"
          style={{ color: "var(--msg-ink-faint)" }}
        >
          {formatMessageTime(createdAt, locale)}
        </time>

        <div className="flex items-center gap-4">
          {/* Forwarding a card someone sent you is how a good word travels.
              The picker holds the card itself, so this needs nothing saved
              first. */}
          <OrbitIconButton
            onClick={onShare}
            aria-label={t.vocabulary.lookup.shareWithFriend}
            sizeClassName="h-7 w-7"
            className="hit-44"
          >
            <Send size={13} strokeWidth={1.9} />
          </OrbitIconButton>

          <button
            type="button"
            onClick={onSave}
            disabled={saving || saved}
            aria-label={t.capture.result.saveToVocabulary}
            className="hit-44 relative flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-60"
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
      </div>
    </article>
  );
}
