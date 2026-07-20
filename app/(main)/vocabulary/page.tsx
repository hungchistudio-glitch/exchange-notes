"use client";

import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import VocabularyLookupModal from "@/components/vocabulary/modals/VocabularyLookupModal";
import VocabularyFilterPanel from "@/components/vocabulary/VocabularyFilterPanel";
import VocabularySearchSection from "@/components/vocabulary/sections/VocabularySearchSection";
import VocabularyHero from "@/components/vocabulary/VocabularyHero";
import AppPage from "@/components/ui/AppPage";
import VocabularyList from "@/components/vocabulary/VocabularyList";
import SortBottomSheet, {
  type SortMode,
} from "@/components/vocabulary/SortBottomSheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useVocabulary from "@/hooks/useVocabulary";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import useVocabularyLibrary from "@/hooks/useVocabularyLibrary";
import useUniqueVocabulary from "@/hooks/useUniqueVocabulary";
import useVisibleVocabularyItems from "@/hooks/useVisibleVocabularyItems";
import useVocabularySearchTracking from "@/hooks/useVocabularySearchTracking";
import useVocabularyRanking from "@/hooks/useVocabularyRanking";
import useVocabularyShare from "@/hooks/useVocabularyShare";
import useVocabularyLookup from "@/hooks/useVocabularyLookup";
import useVocabularyLookupSave from "@/hooks/useVocabularyLookupSave";
import useVocabularyLookupPartnerShare from "@/hooks/useVocabularyLookupPartnerShare";

import { createClient } from "@/lib/supabase/client";
import { setPendingSharedVocabulary } from "@/lib/vocabularyDraft";
import {
  changeVocabularyStatus,
  removeVocabularyItem,
} from "@/lib/vocabulary/service";
import { listFriends, type FriendProfile } from "@/lib/friends";

import {
  normalizeVocabularyText,
  recordInteraction,
} from "@/lib/vocabulary/helpers";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

export default function VocabularyPage() {
  const { items, setItems, learningLanguage, loading, error, setError } =
    useVocabulary();

  const router = useRouter();
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<"all" | VocabularyStatus>(
    "all",
  );
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const {
    lookupStatus,
    lookupResult,
    lookupError,
    lookupWord,
    resetLookup,
  } = useVocabularyLookup(query);

  const {
    savingLookup,
    saveLookupResult,
  } = useVocabularyLookupSave({
    items,
    lookupResult,
    setItems,
    setError,
    setQuery,
    setAiSearchOpen,
    resetLookup,
  });

  const [friendPickerItem, setFriendPickerItem] =
    useState<VocabularyItem | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [sendingFriendId, setSendingFriendId] = useState<string | null>(null);
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
      setFriendsError("You're not logged in. Log in to share with a partner.");
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
      router.push(`/messages?with=${friendId}`);
    },
    [friendPickerItem, router, sendingFriendId],
  );

  const uniqueItems = useUniqueVocabulary(items);

  const {
    rankedIds,
    rankingLoading,
    rankingError,
  } = useVocabularyRanking({
    items: uniqueItems,
    query,
    sortMode,
  });

  useVocabularySearchTracking(uniqueItems, query);

  const visibleItems = useVisibleVocabularyItems({
    items: uniqueItems,
    query,
    quickFilter,
    sortMode,
    rankedIds,
  });

  const {
    filterSearch,
    setFilterSearch,
    alphabetizedItems,
    clearFilterSearch,
  } = useVocabularyLibrary(uniqueItems);

  async function changeStatus(item: VocabularyItem, status: VocabularyStatus) {
    if (item.status === status || updatingId) return;

    const previousItems = items;

    setUpdatingId(item.id);
    setError("");

    // Update the UI immediately.
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, status } : currentItem,
      ),
    );

    try {
      await changeVocabularyStatus(item, status);
    } catch (updateError) {
      // Restore the previous state if the request fails.
      setItems(previousItems);

      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update this word.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteVocabularyItem(item: VocabularyItem) {
    const confirmed = window.confirm(
      `Delete "${item.word}" from your vocabulary?`,
    );

    if (!confirmed || updatingId) return;

    const previousItems = items;

    setUpdatingId(item.id);
    setError("");

    // Remove the item from the UI immediately.
    setItems((current) =>
      current.filter((currentItem) => currentItem.id !== item.id),
    );

    try {
      await removeVocabularyItem(item);
    } catch (deleteError) {
      // Restore the item if deletion fails.
      setItems(previousItems);

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this word.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function openAiSearch() {
    setQuery("");
    resetLookup();
    setAiSearchOpen(true);
  }

  function closeAiSearch() {
    setAiSearchOpen(false);
    setQuery("");
    resetLookup();
  }

  const {
    lookupCopied,
    shareLookupResult,
  } = useVocabularyShare(lookupResult);

  const {
    sendLookupToPartner,
  } = useVocabularyLookupPartnerShare({
    lookupResult,
    onSendToPartner: handleSendToPartner,
  });

  const {
    totalWords,
    learningWords,
    masteredWords,
    dailyGoal,
    dailyProgress,
    quickFilters,
  } = useVocabularyStats(uniqueItems);

  return (
    <AppPage width="default">
      <VocabularyHero todayProgress={dailyProgress} todayGoal={dailyGoal} />

      <VocabularySearchSection
        totalWords={totalWords}
        learningWords={learningWords}
        masteredWords={masteredWords}
        query={query}
        quickFilter={quickFilter}
        quickFilters={quickFilters}
        visibleCount={visibleItems.length}
        sortMode={sortMode}
        rankingLoading={rankingLoading}
        rankingError={rankingError}
        onQueryChange={(value) => {
          setQuery(value);
          resetLookup();
        }}
        onClear={() => {
          setQuery("");
          resetLookup();
        }}
        onOpenAI={openAiSearch}
        onQuickFilterChange={setQuickFilter}
        onOpenSort={() => setSortOpen(true)}
        onOpenLibrary={() => setFiltersOpen(true)}
      />

      {error && (
        <p className="mt-5 rounded-[20px] bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      <VocabularyList
        loading={loading}
        totalItemCount={totalWords}
        items={visibleItems}
        query={query}
        learningLanguage={learningLanguage}
        updatingId={updatingId}
        lookupStatus={lookupStatus}
        lookupResult={lookupResult}
        lookupError={lookupError}
        savingLookup={savingLookup}
        onLookupWord={() => void lookupWord()}
        onSaveLookupResult={() => void saveLookupResult()}
        onChangeStatus={changeStatus}
        onSendToPartner={handleSendToPartner}
        onDelete={deleteVocabularyItem}
        onInteract={(item, type) => recordInteraction(item, type)}
      />

      <VocabularyLookupModal
        open={aiSearchOpen}
        onClose={closeAiSearch}

        query={query}
        setQuery={setQuery}

        lookupStatus={lookupStatus}
        lookupResult={lookupResult}
        lookupError={lookupError}

        savingLookup={savingLookup}
        lookupCopied={lookupCopied}

        onLookupWord={() => void lookupWord()}
        onSave={() => void saveLookupResult()}
        onShare={() => void shareLookupResult()}
        onSend={() => void sendLookupToPartner()}
      />

      {sortOpen && (
        <SortBottomSheet
          value={sortMode}
          onClose={() => setSortOpen(false)}
          onChange={(mode) => {
            setSortMode(mode);
            setSortOpen(false);
          }}
        />
      )}

      {filtersOpen && (
        <VocabularyFilterPanel
          items={alphabetizedItems}
          search={filterSearch}
          onSearchChange={setFilterSearch}
          onClose={() => {
            setFiltersOpen(false);
            clearFilterSearch();
          }}
          onSelect={(item) => {
            resetLookup();
            setQuery(item.word);
            setFiltersOpen(false);
            clearFilterSearch();
          }}
        />
      )}

      {friendPickerItem && (
        <FriendPickerModal
          friends={friends}
          loading={friendsLoading}
          errorMessage={friendsError}
          sendingFriendId={sendingFriendId}
          onClose={handleClosePicker}
          onPick={handlePickFriend}
          onRetry={() => {
            friendsRequestedRef.current = false;
            void loadFriends();
          }}
        />
      )}
    </AppPage>
  );
}
