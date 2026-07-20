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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useVocabulary from "@/hooks/useVocabulary";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import useVocabularyLibrary from "@/hooks/useVocabularyLibrary";
import useUniqueVocabulary from "@/hooks/useUniqueVocabulary";

import { createClient } from "@/lib/supabase/client";
import { toPinyin } from "@/lib/pinyin";
import { setPendingSharedVocabulary } from "@/lib/vocabularyDraft";
import {
  changeVocabularyStatus,
  removeVocabularyItem,
} from "@/lib/vocabulary/service";
import { listFriends, type FriendProfile } from "@/lib/friends";

import {
  getVocabularyKey,
  normalizeVocabularyText,
  readInteractionMap,
  recordInteraction,
  type InteractionRecord,
} from "@/lib/vocabulary/helpers";
import type {
  VocabularyCategory,
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
  const [lookupCopied, setLookupCopied] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rankedIds, setRankedIds] = useState<string[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState("");

  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "loading" | "error" | "result"
  >("idle");
  const [lookupResult, setLookupResult] = useState<{
    englishName: string;
    chineseName: string;
    partOfSpeech: string;
    englishExample: string;
    chineseExample: string;
    confidence: "high" | "medium" | "low";
    category: VocabularyCategory;
  } | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [savingLookup, setSavingLookup] = useState(false);

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

  useEffect(() => {
    if (sortMode === "new" || uniqueItems.length === 0) return;

    const controller = new AbortController();

    async function loadAiRanking() {
      setRankingLoading(true);
      setRankingError("");

      try {
        let newsContext = "";

        if (sortMode === "trending") {
          try {
            const newsResponse = await fetch("/api/daily-news", {
              signal: controller.signal,
              cache: "no-store",
            });

            if (newsResponse.ok) {
              const newsData = await newsResponse.json();
              newsContext = JSON.stringify(newsData).slice(0, 14000);
            }
          } catch (newsError) {
            if ((newsError as Error).name !== "AbortError") {
              console.warn("Could not load news context:", newsError);
            }
          }
        }

        const response = await fetch("/api/vocabulary-rank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            mode: sortMode,
            items: uniqueItems.map((item) => ({
              id: item.id,
              word: item.word,
              translation: item.translation,
              status: item.status,
              createdAt: item.created_at,
              partOfSpeech: item.part_of_speech,
              example: item.example_sentence,
            })),
            interactions: readInteractionMap(),
            currentSearch: query.trim(),
            newsContext,
          }),
        });

        const data = (await response.json()) as {
          orderedIds?: string[];
          error?: string;
        };

        if (!response.ok || !Array.isArray(data.orderedIds)) {
          throw new Error(data.error || "Could not rank vocabulary.");
        }

        setRankedIds(data.orderedIds);
      } catch (rankingFailure) {
        if ((rankingFailure as Error).name === "AbortError") return;

        console.error("AI ranking failed:", rankingFailure);
        setRankingError(
          "AI ranking is temporarily unavailable. Using smart fallback.",
        );
        setRankedIds([]);
      } finally {
        if (!controller.signal.aborted) setRankingLoading(false);
      }
    }

    void loadAiRanking();

    return () => controller.abort();
  }, [query, sortMode, uniqueItems]);

  useEffect(() => {
    const normalizedQuery = normalizeVocabularyText(query);
    if (!normalizedQuery) return;

    const timer = window.setTimeout(() => {
      uniqueItems.forEach((item) => {
        const matches =
          normalizeVocabularyText(item.word).includes(normalizedQuery) ||
          normalizeVocabularyText(item.translation).includes(normalizedQuery);

        if (matches) recordInteraction(item, "search");
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [query, uniqueItems]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = normalizeVocabularyText(query);
    const filtered = uniqueItems.filter((item) => {
      if (quickFilter !== "all" && item.status !== quickFilter) {
        return false;
      }

      if (!normalizedQuery) return true;

      return (
        normalizeVocabularyText(item.word).includes(normalizedQuery) ||
        normalizeVocabularyText(item.translation).includes(normalizedQuery)
      );
    });

    if (sortMode === "new") {
      return [...filtered].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      );
    }

    const rankIndex = new Map(rankedIds.map((id, index) => [id, index]));

    return [...filtered].sort((a, b) => {
      const aRank = rankIndex.get(a.id);
      const bRank = rankIndex.get(b.id);

      if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
      if (aRank !== undefined) return -1;
      if (bRank !== undefined) return 1;

      // Smart fallback while Gemini is loading or unavailable.
      const statusScore: Record<VocabularyStatus, number> = {
        learning: 3,
        new: 2,
        mastered: 1,
      };
      const interactions = readInteractionMap();
      const aInteraction = interactions[a.id];
      const bInteraction = interactions[b.id];
      const score = (record: InteractionRecord | undefined) =>
        record
          ? record.search * 5 +
            record.send * 5 +
            record.share * 4 +
            record.speak * 3 +
            record.view +
            record.status * 2
          : 0;

      const scoreDifference =
        score(bInteraction) +
        statusScore[b.status] * 10 -
        (score(aInteraction) + statusScore[a.status] * 10);

      if (scoreDifference !== 0) return scoreDifference;

      return (
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
      );
    });
  }, [query, quickFilter, rankedIds, sortMode, uniqueItems]);

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
    setLookupResult(null);
    setLookupError("");
    setLookupStatus("idle");
    setAiSearchOpen(true);
  }

  function closeAiSearch() {
    setAiSearchOpen(false);
    setQuery("");
    setLookupResult(null);
    setLookupError("");
    setLookupStatus("idle");
  }

  function getLookupShareText() {
    if (!lookupResult) return "";

    const pinyin = toPinyin(lookupResult.chineseName);
    const meta = [pinyin, lookupResult.partOfSpeech?.toLowerCase()]
      .filter(Boolean)
      .join(" · ");

    return [
      lookupResult.englishName,
      lookupResult.chineseName,
      meta,
      "",
      lookupResult.englishExample,
      lookupResult.chineseExample,
    ]
      .filter((line, index, array) => {
        if (line !== "") return true;
        return index > 0 && index < array.length - 1;
      })
      .join("\n");
  }

  async function shareLookupResult() {
    if (!lookupResult) return;

    const shareText = getLookupShareText();

    try {
      if (navigator.share) {
        await navigator.share({
          title: lookupResult.englishName,
          text: shareText,
        });
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setLookupCopied(true);
      window.setTimeout(() => setLookupCopied(false), 1800);
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name === "AbortError"
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(shareText);
        setLookupCopied(true);
        window.setTimeout(() => setLookupCopied(false), 1800);
      } catch {
        console.error("Could not share lookup result:", shareError);
      }
    }
  }

  async function sendLookupToPartner() {
    if (!lookupResult) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const now = new Date().toISOString();

    const item: VocabularyItem = {
      id: `ai-search-${crypto.randomUUID()}`,
      user_id: user?.id ?? "",
      word: lookupResult.englishName,
      translation: lookupResult.chineseName,
      language: "english",
      part_of_speech: lookupResult.partOfSpeech || null,
      example_sentence: lookupResult.englishExample || null,
      translated_example: lookupResult.chineseExample || null,
      confidence: lookupResult.confidence,
      category: lookupResult.category,
      status: "new",
      favorite: false,
      image_url: null,
      created_at: now,
      updated_at: now,
    };

    handleSendToPartner(item);
  }

  async function lookupWord() {
    const cleanQuery = query.trim();
    if (!cleanQuery || lookupStatus === "loading") return;

    setLookupStatus("loading");
    setLookupError("");

    try {
      const response = await fetch("/api/classify-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanQuery }),
      });

      const data = await response.json();

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Couldn't look up that word.",
        );
      }

      setLookupResult(data);
      setLookupStatus("result");
    } catch (lookupErrorValue) {
      setLookupError(
        lookupErrorValue instanceof Error
          ? lookupErrorValue.message
          : "Couldn't look up that word.",
      );
      setLookupStatus("error");
    }
  }

  async function saveLookupResult() {
    if (!lookupResult || savingLookup) return;

    setSavingLookup(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in before saving a word.");
      }

      const word = lookupResult.englishName.trim();
      const translation = lookupResult.chineseName.trim();
      const candidateKey = getVocabularyKey(word, translation);

      const duplicate = items.find(
        (item) =>
          getVocabularyKey(item.word, item.translation) === candidateKey,
      );

      if (duplicate) {
        setError("This word is already in your vocabulary.");
        setLookupStatus("idle");
        setLookupResult(null);
        setQuery("");
        return;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("vocabulary_items")
        .insert({
          user_id: user.id,
          word,
          translation,
          language: "english",
          part_of_speech: lookupResult.partOfSpeech.trim() || null,
          example_sentence: lookupResult.englishExample.trim() || null,
          translated_example: lookupResult.chineseExample.trim() || null,
          confidence: lookupResult.confidence,
          category: lookupResult.category,
          status: "new",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setItems((current) => [inserted as VocabularyItem, ...current]);
      setLookupStatus("idle");
      setLookupResult(null);
      setQuery("");
      setAiSearchOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this word.",
      );
    } finally {
      setSavingLookup(false);
    }
  }

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
          setLookupStatus("idle");
          setLookupResult(null);
          setLookupError("");
        }}
        onClear={() => {
          setQuery("");
          setLookupStatus("idle");
          setLookupResult(null);
          setLookupError("");
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
            setLookupStatus("idle");
            setLookupResult(null);
            setLookupError("");
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
