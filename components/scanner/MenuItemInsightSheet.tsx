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
import { hasLowConfidence, itemNames, type MenuItem } from "@/lib/scanner/menuTypes";
import { speak, type SpeechLanguage } from "@/lib/speech";
import { createClient } from "@/lib/supabase/client";

type MenuItemInsightSheetProps = {
  item: MenuItem | null;
  cuisine: string;
  targetLanguage: string;
  onClose: () => void;
};

// The dictionary and the model both return bare transcriptions, but a stray
// pair of slashes from either would end up doubled by the markup below.
function stripSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "").trim();
}

/**
 * What one item is, in both languages, and what you can do with it.
 *
 * Every scan now carries an English name and a Traditional Chinese one
 * whatever the list was written in, which is what lets this sheet be the same
 * sheet every time: two pronunciations, both scripts, and a word card that can
 * always be saved or sent — none of it conditional on which way round the
 * languages happened to fall.
 */
export default function MenuItemInsightSheet({
  item,
  cuisine,
  targetLanguage,
  onClose,
}: MenuItemInsightSheetProps) {
  const { t } = useTranslation();
  const copy = t.scanner.menu;
  const router = useRouter();

  const [speaking, setSpeaking] = useState<SpeechLanguage | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [actionError, setActionError] = useState("");

  /*
   * Pinyin, zhuyin and IPA for the item that is open.
   *
   * Fetched per item rather than for all of them at scan time: the endpoint
   * computes the Chinese phonetics on the server for free and looks the
   * English up in a dictionary, and only the item someone opens is worth
   * either.
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
   * Everything belonging to one item is dropped when a different one opens —
   * a render-time adjustment rather than an effect, which is React's
   * documented alternative to an effect that exists only to reset state when
   * a prop changes. The save button is the one that mattered: left alone,
   * saving one item and opening the next showed "Saved" on an item that had
   * not been, with the button disabled so it could not be.
   */
  if (item && phoneticsFor !== item.id) {
    setPhoneticsFor(item.id);
    setPhonetics(null);
    setSaveState("idle");
    setActionError("");
  }

  useEffect(() => {
    if (!item) return;
    if (!item.englishName && !item.chineseName) return;

    let cancelled = false;

    void (async () => {
      const result = await getPronunciation(item.englishName, item.chineseName);
      if (cancelled) return;

      setPhonetics({
        pinyin: result?.pinyin ?? "",
        zhuyin: result?.zhuyin ?? "",
        // The dictionary is the better answer when it has one; an item name is
        // usually a phrase it has never heard of, and that is what the model's
        // transcription is for.
        ipa: stripSlashes(result?.englishPronunciation || item.ipa || ""),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [item]);

  if (!item) return null;

  const { primary, secondary, primaryDescription } = itemNames(
    item,
    targetLanguage,
  );

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
    if (!dish || saveState !== "idle") return;
    if (!dish.englishName || !dish.chineseName) return;

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
        word: dish.englishName.trim(),
        translation: dish.chineseName.trim(),
        language: "english",
        example_sentence: dish.englishDescription || null,
        translated_example: dish.chineseDescription || null,
        // The read's own confidence travels with the word: an item the model
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
    if (!item || sendingFriendId) return;

    setSendingFriendId(friendId);

    /*
     * The same queue every other "share a word" entry point in this app
     * writes to, so an item arrives in Messages as the same word card a
     * captured object or a saved vocabulary item would.
     */
    setPendingSharedVocabulary({
      word: item.englishName,
      translation: item.chineseName,
      examples: {
        en: item.englishDescription,
        "zh-TW": item.chineseDescription,
      },
    });

    router.push(`/messages/new?friend=${encodeURIComponent(friendId)}`);
  }

  const canKeep = Boolean(item.englishName && item.chineseName);

  return (
    <>
      <BottomSheet
        open={Boolean(item)}
        onClose={onClose}
        title={primary}
        description={primaryDescription || undefined}
      >
        <div className="space-y-3">
          {/*
            The other language, always present and never hidden — the whole
            point of scanning inside a language app rather than a translator.
          */}
          {secondary ? (
            <p className="px-1 text-[16px] font-semibold tracking-[-0.02em] text-ink-strong">
              {secondary}
            </p>
          ) : null}

          {/*
            Pinyin, zhuyin and IPA, each in the font stack that has the glyphs
            for it — pushing zhuyin or IPA through the Latin stack is what
            produced the missing-glyph boxes this app has fixed once already.
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
            the list, one to say out loud.
          */}
          <div className="flex gap-2">
            {item.chineseName ? (
              <button
                type="button"
                onClick={() => handleListen(item.chineseName, "zh-TW")}
                disabled={speaking !== null}
                aria-label={`${copy.listen} 中文`}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-black/[0.05] px-3 text-sm font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {speaking === "zh-TW" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Volume2 size={16} strokeWidth={1.9} />
                )}
                中文
              </button>
            ) : null}

            {item.englishName ? (
              <button
                type="button"
                onClick={() => handleListen(item.englishName, "en-US")}
                disabled={speaking !== null}
                aria-label={`${copy.listen} English`}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-black/[0.05] px-3 text-sm font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {speaking === "en-US" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Volume2 size={16} strokeWidth={1.9} />
                )}
                English
              </button>
            ) : null}
          </div>

          {canKeep ? (
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
            {item.sourceName &&
            item.sourceName !== primary &&
            item.sourceName !== secondary ? (
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
            Said on every item, not only the ones that mention an allergen:
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
