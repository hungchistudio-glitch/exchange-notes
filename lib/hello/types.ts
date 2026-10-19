import type { InterfaceMode } from "@/lib/appPreferences";
import type { LanguageCode } from "@/lib/languages";
import type { YumiOutfit } from "@/lib/shop/catalog";

/* =========================================================
   Yumi's bilingual hello — the public shape

   A reader's own Yumi, dressed as she is the moment they share, carries
   one word in two languages to someone else: a link anyone holding it can
   open, an image, and a QR code (Chi, 2026-10-19: "Yumi 雙語太空邀請函").

   This is everything a visitor may see, and nothing else. It is a
   snapshot, not a view of live data: the outfit, the name and the word are
   copied when the hello is made, so changing clothes tomorrow does not
   change an invitation already sent, and the image and the page always
   agree. Not here, by design: email, account ids, the wallet, purchases,
   the vocabulary library, notes, personal example sentences, moods,
   location and learning statistics.
   ========================================================= */

/** The two languages a word is shown in, in order: A then B. Never equal. */
export type HelloPair = readonly [LanguageCode, LanguageCode];

/** One language's side of the word: the same sense, said in that language. */
export type HelloSide = {
  /** The word, or a short gloss where one word would lose the meaning. */
  text: string;
  /** Normalized part of speech (lib/vocabulary/partOfSpeech.ts), if known. */
  partOfSpeech?: string;
  /** How it is written phonetically, where the language has a system. */
  phonetic?: { ipa?: string; zhuyin?: string; pinyin?: string };
};

/**
 * One sense, in every language it has been put into.
 *
 * Every side is made from the sharer's original two, never from another
 * translation, so switching French → Italian → English and back does not
 * drift: each is one step from the source. A language that could not be
 * made yet is absent, and shown as missing rather than filled with the
 * source text.
 */
export type HelloSense = Partial<Record<LanguageCode, HelloSide>>;

export type HelloSnapshot = {
  /** Opaque and unguessable; the only key a visitor ever holds. */
  id: string;
  version: 1;
  createdAt: string;
  sender: {
    /** The public nickname; null when the sharer has not set one. */
    name: string | null;
    /** Always present, and what stands in for a missing nickname. */
    exchangeId: string;
  };
  yumi: {
    outfit: YumiOutfit;
    /** The look the hello was made in; a visitor's own look never changes it. */
    mode: InterfaceMode;
    /** The picture of her taken when it was made, once it has uploaded. */
    posterUrl: string | null;
    /**
     * Every piece of the outfit still exists in the shop. When one has gone,
     * the live 3D would show her dressed differently from the hello sent,
     * so the picture is shown instead.
     */
    complete: boolean;
  };
  /** The two languages the sharer chose, in their order. */
  pair: HelloPair;
  /** The language the sense was first settled in. */
  source: LanguageCode;
  sense: HelloSense;
};

/** What a visitor's link resolves to. */
export type HelloLookup =
  | { status: "active"; hello: HelloSnapshot }
  /** Turned off by its sharer: nothing of it is shown. */
  | { status: "revoked" }
  | { status: "missing" };
