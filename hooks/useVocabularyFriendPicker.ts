"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { listFriends, type FriendProfile } from "@/lib/friends";
import { readMedia } from "@/lib/media/record";
import { publishCardImage } from "@/lib/media/sharing";
import { setPendingSharedVocabulary } from "@/lib/vocabularyDraft";
import { recordInteraction } from "@/lib/vocabulary/helpers";
import type { SharedWordCard } from "@/lib/messages/wordCard";
import type { VocabularyItem } from "@/lib/types/app";

export default function useVocabularyFriendPicker() {
  const router = useRouter();

  /*
   * What is waiting to be sent, held as the card rather than as a saved
   * vocabulary row.
   *
   * The send path never needed a row: picking a friend stashes this payload
   * and navigates to their thread, which sends it. Holding a VocabularyItem
   * meant only saved words could be shared, which is why a looked-up word and
   * a card already sitting in a conversation had no way to reach a friend.
   */
  const [pendingCard, setPendingCard] =
    useState<SharedWordCard | null>(null);
  /** The library path to copy into the shared folder once a friend is picked. */
  const [pendingImageSource, setPendingImageSource] =
    useState<string | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [sendingFriendId, setSendingFriendId] =
    useState<string | null>(null);

  const friendsRequestedRef = useRef(false);

  const handleSendToPartner = useCallback((item: VocabularyItem) => {
    recordInteraction(item, "send");

    /*
     * The picture is noted here and copied later, when a friend has been
     * chosen. Publishing now would make the picker wait on an upload before
     * it opened, which on a slow connection reads as a button that did
     * nothing — and would copy a file for a share the reader then cancels.
     */
    setPendingImageSource(readMedia(item.media)?.cardPath ?? null);

    setPendingCard({
      word: item.word,
      translation: item.translation,
      partOfSpeech: item.part_of_speech,
      wordLanguage: item.word_language,
      translationLanguage: item.translation_language,
      // The whole map, not just the two sides this row was saved as: the
      // person receiving it may be studying a third language, and this is
      // the only chance to give them one they can read.
      texts: item.texts,
      examples: {
        ...(item.examples ?? {}),
        [item.word_language]: item.example_sentence ?? "",
        [item.translation_language]: item.translated_example ?? "",
      },
    });
  }, []);

  /** Opens the picker for a card that is not a saved row — a lookup result, or
   *  one already sitting in a conversation. */
  const shareCard = useCallback((card: SharedWordCard) => {
    /*
     * A card already carrying an imagePath — one being forwarded out of a
     * conversation — keeps it. There is nothing to copy: the sender's
     * shared file is already published, and both readers can reach it
     * through the same membership check.
     */
    setPendingImageSource(null);
    setPendingCard(card);
  }, []);

  const loadFriends = useCallback(async () => {
    friendsRequestedRef.current = true;
    setFriendsLoading(true);
    setFriendsError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFriendsError(
        "You're not logged in. Log in to share with a partner.",
      );
      setFriendsLoading(false);
      friendsRequestedRef.current = false;
      return;
    }

    try {
      const friendsData = await listFriends(supabase, user.id);
      setFriends(friendsData);
    } catch (loadError) {
      console.error("Failed to load friends:", loadError);
      setFriendsError("Couldn't load your friends. Try again.");
      friendsRequestedRef.current = false;
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  const retryFriends = useCallback(() => {
    friendsRequestedRef.current = false;
    void loadFriends();
  }, [loadFriends]);

  useEffect(() => {
    if (!pendingCard || friendsRequestedRef.current) return;
    void loadFriends();
  }, [pendingCard, loadFriends]);

  const handleClosePicker = useCallback(() => {
    setPendingCard(null);
    setPendingImageSource(null);
    setSendingFriendId(null);
  }, []);

  const handlePickFriend = useCallback(
    async (friendId: string) => {
      if (!pendingCard || sendingFriendId) return;

      setSendingFriendId(friendId);

      /*
       * The copy happens here, behind the spinner the picker already shows
       * for the chosen friend.
       *
       * A copy inside the bucket rather than a reference to the library
       * asset: this reader may delete the word next month, and a card they
       * sent should not go blank in someone else's conversation. Failure
       * costs the picture, never the send.
       */
      let imagePath = pendingCard.imagePath;

      if (pendingImageSource) {
        const {
          data: { user },
        } = await createClient().auth.getUser();

        if (user) {
          imagePath =
            (await publishCardImage(
              createClient(),
              user.id,
              pendingImageSource,
            )) ?? undefined;
        }
      }

      setPendingSharedVocabulary({ ...pendingCard, imagePath });
      router.push(`/messages/new?friend=${encodeURIComponent(friendId)}`);
    },
    [pendingCard, pendingImageSource, router, sendingFriendId],
  );

  return {
    /* Kept as the modal's open/closed signal; it is the card now, not a row. */
    friendPickerItem: pendingCard,
    shareCard,
    friends,
    friendsLoading,
    friendsError,
    sendingFriendId,
    handleSendToPartner,
    loadFriends,
    retryFriends,
    handleClosePicker,
    handlePickFriend,
  };
}
