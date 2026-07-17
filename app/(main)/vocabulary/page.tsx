"use client";

import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import VocabularyFilterPanel from "@/components/vocabulary/VocabularyFilterPanel";
import VocabularyHeader from "@/components/vocabulary/VocabularyHeader";
import VocabularyDashboard from "@/components/vocabulary/VocabularyDashboard";
import VocabularySearch from "@/components/vocabulary/VocabularySearch";
import AppPage from "@/components/ui/AppPage";
import SectionHeader from "@/components/ui/SectionHeader";
import VocabularyList from "@/components/vocabulary/VocabularyList";
import SortBottomSheet, {
  SORT_LABELS,
  type SortMode,
} from "@/components/vocabulary/SortBottomSheet";
import {
  BookmarkPlus,
  Check,
  LoaderCircle,
  Search,
  Send,
  Share,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { toPinyin } from "@/lib/pinyin";
import { speak } from "@/lib/speech";
import { setPendingSharedVocabulary } from "@/lib/vocabularyDraft";
import { listFriends, type FriendProfile } from "@/lib/friends";

import {
  getVocabularyKey,
  normalizeVocabularyText,
  readInteractionMap,
  recordInteraction,
  type InteractionRecord,
} from "@/lib/vocabulary/helpers";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import type {
  AppLanguage,
  VocabularyCategory,
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

export default function VocabularyPage() {
  const router = useRouter();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [learningLanguage, setLearningLanguage] = useState<AppLanguage | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<"all" | VocabularyStatus>(
    "all",
  );
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
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

  useEffect(() => {
    let active = true;

    async function loadVocabulary() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Please log in to view your vocabulary.");
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("learning_language")
          .eq("id", user.id)
          .single();

        if (active && profile?.learning_language) {
          setLearningLanguage(profile.learning_language as AppLanguage);
        }

        const { data, error: fetchError } = await supabase
          .from("vocabulary_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        if (active) setItems((data ?? []) as VocabularyItem[]);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your vocabulary.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadVocabulary();

    return () => {
      active = false;
    };
  }, []);

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();

    // Items are loaded newest first, so the newest copy is retained.
    return items.filter((item) => {
      const key = getVocabularyKey(item.word, item.translation);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }, [items]);

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

  const alphabetizedItems = useMemo(() => {
    const normalizedSearch = normalizeVocabularyText(filterSearch);

    return [...uniqueItems]
      .filter((item) => {
        if (!normalizedSearch) return true;

        return (
          normalizeVocabularyText(item.word).includes(normalizedSearch) ||
          normalizeVocabularyText(item.translation).includes(normalizedSearch)
        );
      })
      .sort((a, b) =>
        a.word.localeCompare(b.word, "en", { sensitivity: "base" }),
      );
  }, [filterSearch, uniqueItems]);

  async function changeStatus(item: VocabularyItem, status: VocabularyStatus) {
    if (item.status === status || updatingId) return;

    setUpdatingId(item.id);
    setError("");

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("vocabulary_items")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", item.id);

      if (updateError) throw updateError;

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? { ...currentItem, status } : currentItem,
        ),
      );
      recordInteraction(item, "status");
    } catch (updateError) {
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

    if (!confirmed) return;

    setUpdatingId(item.id);
    setError("");

    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from("vocabulary_items")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw deleteError;

      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
    } catch (deleteError) {
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

  const totalWords = uniqueItems.length;
  const newWords = uniqueItems.filter((item) => item.status === "new").length;
  const learningWords = uniqueItems.filter(
    (item) => item.status === "learning",
  ).length;
  const masteredWords = uniqueItems.filter(
    (item) => item.status === "mastered",
  ).length;

  const todayKey = new Date().toDateString();
  const todayAdded = uniqueItems.filter((item) => {
    if (!item.created_at) return false;
    return new Date(item.created_at).toDateString() === todayKey;
  }).length;

  const dailyGoal = 10;
  const dailyProgress = Math.min(todayAdded, dailyGoal);
  const quickFilters: Array<{
    value: "all" | VocabularyStatus;
    label: string;
    count: number;
  }> = [
    { value: "all", label: "All", count: totalWords },
    { value: "new", label: "New", count: newWords },
    { value: "learning", label: "Learning", count: learningWords },
    { value: "mastered", label: "Mastered", count: masteredWords },
  ];

  return (
    <AppPage width="default">
      
      <VocabularyDashboard
        total={visibleItems.length}
        learning={visibleItems.filter(item => item.status === "learning").length}
        mastered={visibleItems.filter(item => item.status === "mastered").length}
        progress={
          visibleItems.length === 0
            ? 0
            : Math.round(
                visibleItems.filter(item => item.status === "mastered").length /
                  visibleItems.length *
                  100
              )
        }
      />

<VocabularyHeader todayProgress={dailyProgress} todayGoal={dailyGoal} />

      <div className="mt-7">
        <SectionHeader
          title="Your words"
          description={`${totalWords} saved · ${learningWords} learning · ${masteredWords} mastered`}
        />
      </div>
      <VocabularySearch
        query={query}
        quickFilter={quickFilter}
        quickFilters={quickFilters}
        visibleCount={visibleItems.length}
        sortMode={sortMode}
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

      {sortMode !== "new" && (rankingLoading || rankingError) && (
        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.12em] text-neutral-400">
          <span>
            {rankingLoading
              ? `Personalizing ${SORT_LABELS[sortMode]}…`
              : rankingError}
          </span>
          {rankingLoading && (
            <LoaderCircle size={14} className="shrink-0 animate-spin" />
          )}
        </div>
      )}

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
        onItemAdded={(newItem) => setItems((current) => [newItem, ...current])}
      />

      {aiSearchOpen && (
        <div
          className="fixed inset-0 z-[160] flex items-end justify-center bg-black/25 backdrop-blur-[3px] sm:items-center"
          onClick={closeAiSearch}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-search-title"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom), 18px)",
            }}
          >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-black/15 sm:hidden" />

            <header className="flex items-center justify-between border-b border-black/10 px-5 pb-4 pt-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  Gemini AI
                </p>

                <h2
                  id="ai-search-title"
                  className="mt-1 text-xl font-semibold tracking-[-0.025em]"
                >
                  Search any word
                </h2>
              </div>

              <button
                type="button"
                onClick={closeAiSearch}
                aria-label="Close word search"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f2eb]"
              >
                <X size={17} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void lookupWord();
                }}
              >
                <div className="flex h-12 items-center gap-3 rounded-full border border-black/10 bg-[#f5f2eb] px-4">
                  <Search
                    size={17}
                    strokeWidth={2}
                    className="shrink-0 text-neutral-500"
                  />

                  <input
                    autoFocus
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);

                      if (lookupStatus !== "idle") {
                        setLookupStatus("idle");
                        setLookupResult(null);
                        setLookupError("");
                      }
                    }}
                    placeholder="English or 繁體中文"
                    className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
                  />

                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setLookupStatus("idle");
                        setLookupResult(null);
                        setLookupError("");
                      }}
                      aria-label="Clear search"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!query.trim() || lookupStatus === "loading"}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-[13px] font-semibold text-white disabled:opacity-30"
                >
                  {lookupStatus === "loading" ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Searching
                    </>
                  ) : (
                    <>
                      <Search size={15} />
                      Search with Gemini
                    </>
                  )}
                </button>
              </form>

              {lookupStatus === "idle" && (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f2eb]">
                    <Zap size={21} strokeWidth={1.8} />
                  </div>

                  <p className="mx-auto mt-4 max-w-xs text-[13px] leading-6 text-neutral-500">
                    Search any English or Traditional Chinese word. Gemini will
                    generate its translation, part of speech and natural
                    examples.
                  </p>
                </div>
              )}

              {lookupStatus === "error" && (
                <div className="mt-5 rounded-[20px] bg-red-50 p-4">
                  <p className="text-[13px] leading-5 text-red-700">
                    {lookupError || "Could not search that word."}
                  </p>
                </div>
              )}

              {lookupStatus === "result" && lookupResult && (
                <article className="mt-5 overflow-hidden rounded-[26px] border border-black/[0.08] bg-white shadow-[0_14px_40px_rgba(0,0,0,0.06)]">
                  <div className="p-5 sm:p-6">
                    <div className="space-y-6">
                      <section>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
                          English
                        </p>

                        <div className="mt-2 flex items-center gap-3">
                          <p className="min-w-0 flex-1 break-words text-[28px] font-semibold tracking-[-0.035em]">
                            {lookupResult.englishName}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              speak(lookupResult.englishName, "en-US")
                            }
                            aria-label="Play English word"
                            title="Play English word"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f2eb] transition-transform active:scale-95"
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>
                      </section>

                      <section>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
                          繁體中文
                        </p>

                        <div className="mt-2 flex items-center gap-3">
                          <p className="min-w-0 flex-1 break-words text-[26px] font-semibold tracking-[-0.025em] text-neutral-800">
                            {lookupResult.chineseName}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              speak(lookupResult.chineseName, "zh-TW")
                            }
                            aria-label="播放中文單字"
                            title="播放中文單字"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f2eb] transition-transform active:scale-95"
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>

                        <div className="mt-3 rounded-[18px] bg-[#f7f4ee] px-4 py-3">
                          <PronunciationBlock
                            english={lookupResult.englishName}
                            chinese={lookupResult.chineseName}
                          />

                          <p className="mt-2 text-[11px] capitalize tracking-[0.04em] text-neutral-400">
                            {lookupResult.partOfSpeech}
                          </p>
                        </div>
                      </section>
                    </div>

                    <div className="mt-6 space-y-3 border-t border-black/[0.08] pt-5">
                      <section className="rounded-[20px] bg-[#f5f2eb] p-4">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">
                              English example
                            </p>

                            <p className="mt-3 text-[14px] leading-6">
                              {lookupResult.englishExample}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              speak(lookupResult.englishExample, "en-US")
                            }
                            aria-label="Play English example"
                            title="Play English example"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white transition-transform active:scale-95"
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>
                      </section>

                      <section className="rounded-[20px] bg-[#f5f2eb] p-4">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold tracking-[0.16em] text-black/35">
                              中文例句
                            </p>

                            <p className="mt-3 text-[14px] leading-6 text-neutral-600">
                              {lookupResult.chineseExample}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              speak(lookupResult.chineseExample, "zh-TW")
                            }
                            aria-label="播放中文例句"
                            title="播放中文例句"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white transition-transform active:scale-95"
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>
                      </section>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void shareLookupResult()}
                        aria-label="Share this word"
                        className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#f5f2eb] text-[12px] font-semibold transition-transform active:scale-[0.98]"
                      >
                        {lookupCopied ? (
                          <Check size={15} />
                        ) : (
                          <Share size={15} />
                        )}
                        Share
                      </button>

                      <button
                        type="button"
                        onClick={() => void sendLookupToPartner()}
                        aria-label="Send this word to a partner"
                        className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#f5f2eb] text-[12px] font-semibold transition-transform active:scale-[0.98]"
                      >
                        <Send size={15} />
                        Send
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => void saveLookupResult()}
                      disabled={savingLookup}
                      className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-[13px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-30"
                    >
                      {savingLookup ? (
                        <>
                          <LoaderCircle size={15} className="animate-spin" />
                          Saving
                        </>
                      ) : (
                        <>
                          <BookmarkPlus size={16} />
                          Add to Vocabulary
                        </>
                      )}
                    </button>
                  </div>
                </article>
              )}
            </div>
          </section>
        </div>
      )}

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
            setFilterSearch("");
          }}
          onSelect={(item) => {
            setLookupStatus("idle");
            setLookupResult(null);
            setLookupError("");
            setQuery(item.word);
            setFiltersOpen(false);
            setFilterSearch("");
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
