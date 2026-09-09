import {
  DEFAULT_LEARNING_PAIR,
  compactByLanguage,
  isLanguageCode,
  type ByLanguage,
  type LanguageCode,
} from "@/lib/languages";

export const WORD_CARD_MARKER = "⟧EXCHANGE_NOTES_WORD⟨";

export type SharedWordCard = {
  word: string;
  translation: string;
  /**
   * Which language each side is in.
   *
   * Optional because cards sent before this existed do not carry them; those
   * are read as the pair the app taught at the time. A card that says so
   * outright can be rendered by someone whose own pair is different.
   */
  wordLanguage?: LanguageCode;
  translationLanguage?: LanguageCode;
  partOfSpeech?: string | null;
  /**
   * The word in every language the sender's row held.
   *
   * Without this a shared card is two languages forever, and a reader
   * studying a third sees whichever two the sender happened to have — a
   * language they never chose, sitting in their conversation history.
   *
   * Optional because cards sent before this existed do not carry it, and
   * cannot be made to: they live inside message bodies people have already
   * sent, and rewriting someone's sent message is not a thing this app does.
   * Those render as the pair they were sent as.
   */
  texts?: ByLanguage;
  /** The example sentence in each language it exists in. */
  examples?: ByLanguage;

  /**
   * The storage path of a card picture the sender published for this card.
   *
   * A path rather than a URL, for the same reason the vocabulary row stores
   * one: a URL bakes in the bucket's visibility, and this bucket is private.
   * The recipient's app turns it into a request to /api/vocabulary-image,
   * which checks that the two of them share a conversation before signing
   * anything.
   *
   * Optional, and always will be. Most word cards are typed rather than
   * photographed, cards sent before this existed have none, and a card whose
   * picture failed to publish is still the word somebody meant to send.
   */
  imagePath?: string;
};

/**
 * The shape as it was sent before examples were keyed by language.
 *
 * Not a migration that can be finished: these cards live inside the bodies of
 * messages people have already sent, and rewriting someone's sent message to
 * change its storage format is not a thing this app should do. Reading them
 * stays supported.
 */
type LegacyWordCard = {
  englishExample?: string | null;
  chineseExample?: string | null;
};

function legacyExamples(parsed: LegacyWordCard): ByLanguage {
  return compactByLanguage({
    en: parsed.englishExample ?? "",
    "zh-TW": parsed.chineseExample ?? "",
  });
}

function readCode(value: unknown): LanguageCode | undefined {
  return isLanguageCode(value) ? value : undefined;
}

export function encodeWordCardMessage(card: SharedWordCard): string {
  const examples = compactByLanguage(card.examples ?? {});
  const texts = compactByLanguage(card.texts ?? {});

  const [firstCode, secondCode] = DEFAULT_LEARNING_PAIR;

  return (
    WORD_CARD_MARKER +
    JSON.stringify({
      word: card.word,
      translation: card.translation,
      wordLanguage: card.wordLanguage ?? firstCode,
      translationLanguage: card.translationLanguage ?? secondCode,
      partOfSpeech: card.partOfSpeech ?? null,
      texts,
      examples,
      // Omitted rather than sent as null when there is no picture: these
      // bodies are permanent, and a key that means nothing is bytes in
      // every message anybody ever sends.
      ...(card.imagePath ? { imagePath: card.imagePath } : {}),
      /*
       * The old fields go out alongside the new ones, and deliberately.
       *
       * This is an installed PWA: a copy of the app from before this change
       * can still be open on someone's phone, and it reads examples only from
       * these two keys. Sending it a card without them shows a word card with
       * its examples silently missing. They can come out once no client that
       * old is still being served — they are write-only compatibility, never
       * read below.
       */
      englishExample: examples.en ?? null,
      chineseExample: examples["zh-TW"] ?? null,
    })
  );
}

export function decodeWordCardMessage(body: string): SharedWordCard | null {
  if (!body.startsWith(WORD_CARD_MARKER)) return null;

  try {
    const parsed = JSON.parse(body.slice(WORD_CARD_MARKER.length)) as Partial<
      SharedWordCard
    > &
      LegacyWordCard;

    if (
      typeof parsed.word !== "string" ||
      typeof parsed.translation !== "string"
    ) {
      return null;
    }

    const examples = compactByLanguage(parsed.examples ?? {});
    const texts = compactByLanguage(parsed.texts ?? {});

    return {
      word: parsed.word,
      translation: parsed.translation,
      texts,
      wordLanguage: readCode(parsed.wordLanguage) ?? DEFAULT_LEARNING_PAIR[0],
      translationLanguage:
        readCode(parsed.translationLanguage) ?? DEFAULT_LEARNING_PAIR[1],
      partOfSpeech: parsed.partOfSpeech ?? null,
      /*
       * Checked for shape rather than trusted. A message body is text that
       * arrived from another device, and this one becomes a request path —
       * so anything that is not a plain relative path is dropped rather
       * than passed to the image route.
       */
      imagePath:
        typeof parsed.imagePath === "string" &&
        /^[0-9a-f-]{36}\/[\w-]+\/[\w.-]+$/i.test(parsed.imagePath)
          ? parsed.imagePath
          : undefined,
      examples:
        Object.keys(examples).length > 0 ? examples : legacyExamples(parsed),
    };
  } catch {
    return null;
  }
}
