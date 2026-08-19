"use client";

import { BookmarkCheck, BookmarkPlus, LoaderCircle, Send, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import useTranslation from "@/hooks/i18n/useTranslation";
import { listFriends, type FriendProfile } from "@/lib/friends";
import { getPronunciation } from "@/lib/pronunciation/getPronunciation";
import { setPendingSharedVocabulary } from "@/lib/vocabularyDraft";
import { hasLowConfidence, type MenuItem } from "@/lib/scanner/menuTypes";
import { speak, type SpeechLanguage } from "@/lib/speech";
import { createClient } from "@/lib/supabase/client";

type MenuItemInsightSheetProps = {
  item: MenuItem | null;
  cuisine: string;
  sourceLanguage: string;
  targetLanguage: string;
  onClose: () => void;
};

/**
 * The device can only speak two languages, and it is worth being exact about
 * which: everything this app pronounces is either Traditional Chinese or
 * English. A Japanese dish name gets no speaker rather than a bad one.
 */
function toSpeechLanguage(code: string): SpeechLanguage | null {
  if (/^zh/i.test(code)) return "zh-TW";
  if (/^en/i.test(code)) return "en-US";
  return null;
}

/**
 * The English/Chinese pair behind a dish, or null.
 *
 * Vocabulary in this app is one English word against one Traditional Chinese
 * one — that is what a word card is, what a review session asks, and what a
 * friend receives. A menu that is Japanese on one side and English on the
 * other has no such pair, and inventing one by dropping Japanese into the
 * Chinese column would quietly corrupt the learner's own vocabulary.
 */
function vocabularyPair(
  item: MenuItem,
  sourceLanguage: string,
  targetLanguage: string,
) {
  const source = toSpeechLanguage(sourceLanguage);
  const targetIsChinese = targetLanguage === "traditional-chinese";

  if (source === "zh-TW" && !targetIsChinese) {
    return {
      word: item.translatedName,
      translation: item.sourceName,
      englishExample: item.translatedDescription || null,
      chineseExample: item.sourceDescription || null,
    };
  }

  if (source === "en-US" && targetIsChinese) {
    return {
      word: item.sourceName,
      translation: item.translatedName,
      englishExample: item.sourceDescription || null,
      chineseExample: item.translatedDescription || null,
    };
  }

  return null;
}

/**
 * Which side of the dish is English and which is Chinese, if either is.
 *
 * Looser than vocabularyPair on purpose: saving a word needs both halves,
 * but a Japanese menu translated into English still has an English name
 * worth pronouncing.
 */
function phoneticSides(
  item: MenuItem,
  sourceLanguage: string,
  targetLanguage: string,
) {
  const source = toSpeechLanguage(sourceLanguage);
  const targetIsChinese = targetLanguage === "traditional-chinese";

  return {
    english:
      source === "en-US"
        ? item.sourceName
        : targetIsChinese
          ? ""
          : item.translatedName,
    chinese:
      source === "zh-TW"
        ? item.sourceName
        : targetIsChinese
          ? item.translatedName
          : "",
  };
}

// The dictionary and the model both return bare transcriptions, but a stray
// pair of slashes from either would end up doubled by the markup below.
function stripSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "").trim();
}

/**
 * What one dish is, and what you can do with it.
 *
 * Everything shown here was already read from the menu — opening a dish costs
 * no second request. What the sheet adds is room for the full name the
 * overlay had to clip, both pronunciations, and the two things a language
 * app should obviously offer for a word you just met: keep it, or send it to
 * the person you are learning with.
 */
export default function MenuItemInsightSheet({
  item,
  cuisine,
  sourceLanguage,
  targetLanguage,
  onClose,
}: MenuItemInsightSheetProps) {
  const { t, language } = useTranslation();
  const copy = t.scanner.menu;
  const router = useRouter();

  const [speaking, setSpeaking] = useState<SpeechLanguage | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [actionError, setActionError] = useState("");

  /*
   * Pinyin, zhuyin and IPA for the dish that is open.
   *
   * Fetched per dish rather than for all twenty-three at scan time: the
   * endpoint computes the Chinese phonetics on the server for free and looks
   * the English up in a dictionary, and only the dish someone actually opens
   * is worth either.
   */
  const [phonetics, setPhonetics] = useState<{
    pinyin: string;
    zhuyin: string;
    ipa: string;
  } | null>(null);
  const [phoneticsFor, setPhoneticsFor] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [sendingFriendId, setSendingFriendId] = useState<string | null>(null);
  const friendsRequestedRef = useRef(false);

  /*
   * Everything that belongs to one dish is dropped when a different dish
   * opens — a render-time adjustment rather than an effect, which is React's
   * documented alternative to an effect that exists only to reset state when
   * a prop changes.
   *
   * The save button is the one that mattered: left alone, saving one dish
   * and opening the next showed "Saved" on a dish that had not been, with
   * the button disabled so it could not be.
   */
  if (item && phoneticsFor !== item.id) {
    setPhoneticsFor(item.id);
    setPhonetics(null);
    setSaveState("idle");
    setActionError("");
  }

  useEffect(() => {
    if (!item) return;

    const { english, chinese } = phoneticSides(
      item,
      sourceLanguage,
      targetLanguage,
    );

    if (!english && !chinese) return;

    let cancelled = false;

    void (async () => {
      const result = await getPronunciation(english, chinese);
      if (cancelled) return;

      setPhonetics({
        pinyin: result?.pinyin ?? "",
        zhuyin: result?.zhuyin ?? "",
        // The dictionary is the better answer when it has one; a dish name
        // is usually a phrase it has never heard of, and that is what the
        // model's transcription is for.
        ipa: stripSlashes(result?.englishPronunciation || item.ipa || ""),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [item, sourceLanguage, targetLanguage]);

  if (!item) return null;

  const sourceSpeech = toSpeechLanguage(sourceLanguage);
  const targetSpeech: SpeechLanguage =
    language === "traditional-chinese" ? "zh-TW" : "en-US";

  const pair = vocabularyPair(item, sourceLanguage, targetLanguage);
  const canSave = Boolean(pair && pair.word && pair.translation);

  function languageLabel(speech: SpeechLanguage) {
    return speech === "zh-TW" ? "中文" : "English";
  }

  function handleListen(text: string, speech: SpeechLanguage) {
    if (!text || speaking) return;

    setSpeaking(speech);

    speak(text, speech, {
      onEnd: () => setSpeaking(null),
      onError: () => setSpeaking(null),
    });
  }

  async function handleSave() {
    // Captured before the first await: `item` is a prop, and TypeScript
    // cannot keep it narrowed across the asynchronous boundary.
    const dish = item;
    if (!dish || !pair || saveState !== "idle") return;

    setSaveState("saving");
    setActionError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setActionError(copy.shareLoginRequired);
        setSaveState("idle");
        return;
      }

      const { error } = await supabase.from("vocabulary_items").insert({
        user_id: user.id,
        word: pair.word.trim(),
        translation: pair.translation.trim(),
        language: "english",
        example_sentence: pair.englishExample,
        translated_example: pair.chineseExample,
        // The read's own confidence travels with the word: a dish the model
        // was unsure of should not arrive in review looking certain.
        confidence: dish.translationConfidence,
        status: "new",
      });

      if (error) throw error;

      setSaveState("saved");
    } catch {
      setActionError(copy.saveFailed);
      setSaveState("idle");
    }
  }

  async function loadFriends() {
    friendsRequestedRef.current = true;
    setFriendsLoading(true);
    setFriendsError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFriendsError(copy.shareLoginRequired);
        friendsRequestedRef.current = false;
        return;
      }

      setFriends(await listFriends(supabase, user.id));
    } catch {
      setFriendsError(copy.friendsError);
      friendsRequestedRef.current = false;
    } finally {
      setFriendsLoading(false);
    }
  }

  function handleShare() {
    setPickerOpen(true);
    if (!friendsRequestedRef.current) void loadFriends();
  }

  function handlePickFriend(friendId: string) {
    if (!pair || sendingFriendId) return;

    setSendingFriendId(friendId);

    /*
     * The same queue every other "share a word" entry point in this app
     * writes to, so a dish arrives in Messages as the same word card a
     * captured object or a saved vocabulary item would.
     */
    setPendingSharedVocabulary({
      word: pair.word,
      translation: pair.translation,
      englishExample: pair.englishExample,
      chineseExample: pair.chineseExample,
    });

    router.push(`/messages/new?friend=${encodeURIComponent(friendId)}`);
  }

  return (
    <>
      <BottomSheet
        open={Boolean(item)}
        onClose={onClose}
        title={item.translatedName || item.sourceName}
        description={item.translatedDescription || undefined}
      >
        <div className="space-y-3">
          {/*
            Pinyin, zhuyin and IPA, each in the font stack that has the
            glyphs for it — pushing zhuyin or IPA through the Latin stack is
            what produced the missing-glyph boxes this app has fixed once
            already.
          */}
          {phonetics &&
          (phonetics.pinyin || phonetics.zhuyin || phonetics.ipa) ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1 text-[13px] leading-5 text-ink-soft">
              {phonetics.pinyin ? (
                <span className="font-cjk">{phonetics.pinyin}</span>
              ) : null}

              {phonetics.zhuyin ? (
                <span className="font-zhuyin">{phonetics.zhuyin}</span>
              ) : null}

              {phonetics.ipa ? (
                <span className="font-phonetic">/{phonetics.ipa}/</span>
              ) : null}
            </div>
          ) : null}

          {/*
            One speaker per language, named. A single "Listen" button on a
            bilingual card leaves the user guessing which of the two they are
            about to hear — and both are worth hearing: one to recognise on
            the menu, one to say to the waiter.
          */}
          <div className="flex gap-2">
            {sourceSpeech && item.sourceName ? (
              <button
                type="button"
                onClick={() => handleListen(item.sourceName, sourceSpeech)}
                disabled={speaking !== null}
                aria-label={`${copy.listen} ${languageLabel(sourceSpeech)}`}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-black/[0.05] px-3 text-sm font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {speaking === sourceSpeech ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Volume2 size={16} strokeWidth={1.9} />
                )}
                {languageLabel(sourceSpeech)}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() =>
                handleListen(
                  item.translatedName || item.sourceName,
                  targetSpeech,
                )
              }
              disabled={speaking !== null}
              aria-label={`${copy.listen} ${languageLabel(targetSpeech)}`}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-black/[0.05] px-3 text-sm font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {speaking === targetSpeech ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Volume2 size={16} strokeWidth={1.9} />
              )}
              {languageLabel(targetSpeech)}
            </button>
          </div>

          {/*
            Save and share are offered only when the dish actually forms an
            English/Chinese pair, which is the only shape this app's word
            cards and review sessions understand.
          */}
          {canSave ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saveState !== "idle"}
                className={[
                  "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition-transform active:scale-[0.98]",
                  saveState === "saved"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-black text-white disabled:opacity-60",
                ].join(" ")}
              >
                {saveState === "saving" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : saveState === "saved" ? (
                  <BookmarkCheck size={16} strokeWidth={1.9} />
                ) : (
                  <BookmarkPlus size={16} strokeWidth={1.9} />
                )}
                {saveState === "saving"
                  ? copy.saving
                  : saveState === "saved"
                    ? copy.saved
                    : copy.saveWord}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-black/[0.05] px-3 text-sm font-semibold text-black transition-transform active:scale-[0.98]"
              >
                <Send size={16} strokeWidth={1.9} />
                {copy.share}
              </button>
            </div>
          ) : null}

          {actionError ? (
            <p
              role="alert"
              className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700"
            >
              {actionError}
            </p>
          ) : null}

          <dl className="divide-y divide-black/[0.05] overflow-hidden rounded-[18px] border border-black/[0.06] bg-white">
            {item.sourceName ? (
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <dt className="shrink-0 text-[13px] text-ink-soft">
                  {copy.originalLabel}
                </dt>
                <dd className="min-w-0 text-right">
                  <span className="block text-[15px] font-semibold text-black">
                    {item.sourceName}
                  </span>

                  {item.sourceDescription ? (
                    <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-faint">
                      {item.sourceDescription}
                    </span>
                  ) : null}
                </dd>
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <dt className="shrink-0 text-[13px] text-ink-soft">
                {copy.priceLabel}
              </dt>
              <dd className="min-w-0 text-right text-[15px] font-semibold text-black">
                {item.price || copy.noPrice}
              </dd>
            </div>

            {cuisine ? (
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <dt className="shrink-0 text-[13px] text-ink-soft">
                  {copy.cuisineLabel}
                </dt>
                <dd className="min-w-0 text-right text-[15px] font-semibold text-black">
                  {cuisine}
                </dd>
              </div>
            ) : null}
          </dl>

          {hasLowConfidence(item) ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] leading-5 text-amber-800">
              {copy.confidenceNote}
            </p>
          ) : null}

          {/*
            Said on every dish, not only the ones that mention an allergen:
            the ingredients here are read off a name, and the only place that
            knows what is in the pan is the kitchen.
          */}
          <p className="px-1 text-[12px] leading-[18px] text-ink-faint">
            {copy.askRestaurant}
          </p>
        </div>
      </BottomSheet>

      {pickerOpen ? (
        <FriendPickerModal
          friends={friends}
          loading={friendsLoading}
          errorMessage={friendsError}
          sendingFriendId={sendingFriendId}
          onClose={() => {
            setPickerOpen(false);
            setSendingFriendId(null);
          }}
          onPick={handlePickFriend}
          onRetry={() => void loadFriends()}
        />
      ) : null}
    </>
  );
}
