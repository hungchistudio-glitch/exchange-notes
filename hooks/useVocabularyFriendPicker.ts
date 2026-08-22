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
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [sendingFriendId, setSendingFriendId] =
    useState<string | null>(null);

  const friendsRequestedRef = useRef(false);

  const handleSendToPartner = useCallback((item: VocabularyItem) => {
    recordInteraction(item, "send");

    setPendingCard({
      word: item.word,
      translation: item.translation,
      partOfSpeech: item.part_of_speech,
      wordLanguage: item.word_language,
      translationLanguage: item.translation_language,
      examples: {
        [item.word_language]: item.example_sentence ?? "",
        [item.translation_language]: item.translated_example ?? "",
      },
    });
  }, []);

  /** Opens the picker for a card that is not a saved row — a lookup result, or
   *  one already sitting in a conversation. */
  const shareCard = useCallback((card: SharedWordCard) => {
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
    setSendingFriendId(null);
  }, []);

  const handlePickFriend = useCallback(
    (friendId: string) => {
      if (!pendingCard || sendingFriendId) return;

      setSendingFriendId(friendId);
      setPendingSharedVocabulary(pendingCard);
      router.push(`/messages/new?friend=${encodeURIComponent(friendId)}`);
    },
    [pendingCard, router, sendingFriendId],
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
