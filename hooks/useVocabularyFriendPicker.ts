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
import type { VocabularyItem } from "@/lib/types/app";

export default function useVocabularyFriendPicker() {
  const router = useRouter();

  const [friendPickerItem, setFriendPickerItem] =
    useState<VocabularyItem | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [sendingFriendId, setSendingFriendId] =
    useState<string | null>(null);

  const friendsRequestedRef = useRef(false);

  const handleSendToPartner = useCallback((item: VocabularyItem) => {
    recordInteraction(item, "send");
    setFriendPickerItem(item);
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
    if (!friendPickerItem || friendsRequestedRef.current) return;
    void loadFriends();
  }, [friendPickerItem, loadFriends]);

  const handleClosePicker = useCallback(() => {
    setFriendPickerItem(null);
    setSendingFriendId(null);
  }, []);

  const handlePickFriend = useCallback(
    (friendId: string) => {
      if (!friendPickerItem || sendingFriendId) return;

      setSendingFriendId(friendId);
      setPendingSharedVocabulary(friendPickerItem);
      router.push(`/messages?with=${encodeURIComponent(friendId)}`);
    },
    [friendPickerItem, router, sendingFriendId],
  );

  return {
    friendPickerItem,
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
