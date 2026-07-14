"use client";

import {
  BookmarkPlus,
  BookOpen,
  Camera,
  Check,
  LoaderCircle,
  Plus,
  Search,
  Send,
  Share,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { toPinyin } from "@/lib/pinyin";
import { speak } from "@/lib/speech";
import { setPendingSharedVocabulary } from "@/lib/vocabularyDraft";
import { listFriends, type FriendProfile } from "@/lib/friends";
import type {
  AppLanguage,
  VocabularyCategory,
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

const STATUS_LABELS: Record<VocabularyStatus, string> = {
  new: "New",
  learning: "Learning",
  mastered: "Mastered",
};

type SortMode = "new" | "for-you" | "trending";

const SORT_LABELS: Record<SortMode, string> = {
  new: "New Words",
  "for-you": "For You",
  trending: "Trending",
};

function normalizeVocabularyText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function getVocabularyKey(
  word: string | null | undefined,
  translation: string | null | undefined,
) {
  return `${normalizeVocabularyText(word)}::${normalizeVocabularyText(
    translation,
  )}`;
}

export default function VocabularyPage() {
  const router = useRouter();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [learningLanguage, setLearningLanguage] = useState<AppLanguage | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  useEffect(() => {
    setLookupStatus("idle");
    setLookupResult(null);
    setLookupError("");
  }, [query]);

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

  const visibleItems = useMemo(() => {
    const normalizedQuery = normalizeVocabularyText(query);
    const statusPriority: Record<VocabularyStatus, number> = {
      learning: 0,
      new: 1,
      mastered: 2,
    };

    const filtered = uniqueItems.filter((item) => {
      if (!normalizedQuery) return true;

      return (
        normalizeVocabularyText(item.word).includes(normalizedQuery) ||
        normalizeVocabularyText(item.translation).includes(normalizedQuery)
      );
    });

    return [...filtered].sort((a, b) => {
      const aCreated = new Date(a.created_at ?? 0).getTime();
      const bCreated = new Date(b.created_at ?? 0).getTime();

      if (sortMode === "new") {
        return bCreated - aCreated;
      }

      if (sortMode === "for-you") {
        const statusDifference =
          statusPriority[a.status] - statusPriority[b.status];

        if (statusDifference !== 0) return statusDifference;
        return bCreated - aCreated;
      }

      const aTrendingScore =
        (a.status === "learning" ? 3 : a.status === "new" ? 2 : 1) *
          1_000_000_000_000 +
        aCreated;
      const bTrendingScore =
        (b.status === "learning" ? 3 : b.status === "new" ? 2 : 1) *
          1_000_000_000_000 +
        bCreated;

      return bTrendingScore - aTrendingScore;
    });
  }, [query, sortMode, uniqueItems]);

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

  return (
    <main className="min-h-screen bg-[#f5f2eb] px-5 pb-28 pt-8 text-black">
      <div className="mx-auto max-w-xl">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.2em]">
              Your library
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Vocabulary</h1>
          </div>

          <div className="flex shrink-0 gap-2">
            <Link
              href="/vocabulary/quiz"
              aria-label="Flashcard quiz"
              className="rounded-full bg-white p-3 text-black"
            >
              <Zap size={20} />
            </Link>

            <Link
              href="/capture"
              aria-label="Discover a new word"
              className="rounded-full bg-black p-3 text-white"
            >
              <Plus size={20} />
            </Link>
          </div>
        </header>

        <div className="mt-8 border-y border-black/10 bg-white">
          <div className="grid grid-cols-2 divide-x divide-black/10">
            <button
              type="button"
              onClick={() => setSortMode((current) => current)}
              className="px-5 py-4 text-left text-sm uppercase tracking-[0.08em]"
            >
              <span className="text-neutral-400">Sort by</span>
              <span className="ml-2 font-medium text-black">
                {SORT_LABELS[sortMode]}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="px-5 py-4 text-center text-sm uppercase tracking-[0.08em]"
            >
              Filters
            </button>
          </div>

          <div className="grid grid-cols-3 border-t border-black/10">
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSortMode(mode)}
                className={`border-r border-black/10 px-2 py-3 text-xs uppercase tracking-[0.08em] last:border-r-0 ${
                  sortMode === mode
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-5 rounded-[20px] bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <section className="mt-8 flex items-center justify-center rounded-[30px] bg-white p-10">
            <LoaderCircle className="animate-spin" size={28} />
          </section>
        ) : items.length === 0 ? (
          <section className="mt-8 rounded-[30px] bg-white p-7 text-center">
            <Camera className="mx-auto" size={30} />
            <h2 className="mt-5 text-2xl font-black">
              Your first word begins outside
            </h2>
            <p className="mt-3 leading-7">
              Photograph something from daily life and save its English and
              Traditional Chinese meaning.
            </p>
            <Link
              href="/capture"
              className="mt-6 block rounded-[20px] bg-black px-5 py-4 font-black text-white"
            >
              Discover a Word
            </Link>
          </section>
        ) : visibleItems.length === 0 ? (
          <section className="mt-8 rounded-[30px] bg-white p-8 text-center">
            {lookupStatus === "result" && lookupResult ? (
              <>
                <BookmarkPlus className="mx-auto" size={30} />
                <h2 className="mt-4 text-2xl font-black">
                  {lookupResult.englishName}
                </h2>
                <p className="mt-1 text-2xl">{lookupResult.chineseName}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {lookupResult.partOfSpeech}
                </p>
                <div className="mt-4 rounded-2xl bg-[#f5f2eb] p-4 text-left">
                  <p className="leading-6">{lookupResult.englishExample}</p>
                  <p className="mt-1 leading-6 text-neutral-500">
                    {lookupResult.chineseExample}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={saveLookupResult}
                  disabled={savingLookup}
                  className="mt-6 w-full rounded-[20px] bg-black px-5 py-4 font-black text-white disabled:opacity-50"
                >
                  {savingLookup ? "Saving..." : "Add to Vocabulary"}
                </button>
              </>
            ) : (
              <>
                <BookOpen className="mx-auto" size={30} />
                <h2 className="mt-4 text-xl font-black">No matching words</h2>
                <p className="mt-2 text-neutral-600">
                  {query.trim()
                    ? "Not saved yet — look it up and add it."
                    : "Try another search or learning status."}
                </p>

                {query.trim() && (
                  <button
                    type="button"
                    onClick={lookupWord}
                    disabled={lookupStatus === "loading"}
                    className="mt-6 w-full rounded-[20px] bg-black px-5 py-4 font-black text-white disabled:opacity-50"
                  >
                    {lookupStatus === "loading"
                      ? "Looking up..."
                      : `Look up "${query.trim()}"`}
                  </button>
                )}

                {lookupStatus === "error" && (
                  <p className="mt-3 rounded-[16px] bg-red-50 p-3 text-sm font-bold text-red-700">
                    {lookupError}
                  </p>
                )}
              </>
            )}
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            {visibleItems.map((item) => {
              const wordIsTarget = learningLanguage
                ? item.language === learningLanguage
                : toPinyin(item.word) !== null;

              return (
                <VocabularyCard
                  key={item.id}
                  item={item}
                  wordIsTarget={wordIsTarget}
                  updating={updatingId === item.id}
                  onChangeStatus={(status) => void changeStatus(item, status)}
                  onSendToPartner={() => handleSendToPartner(item)}
                  onItemAdded={(newItem) =>
                    setItems((current) => [newItem, ...current])
                  }
                />
              );
            })}
          </section>
        )}
      </div>

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
    </main>
  );
}

function VocabularyFilterPanel({
  items,
  search,
  onSearchChange,
  onClose,
  onSelect,
}: {
  items: VocabularyItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onSelect: (item: VocabularyItem) => void;
}) {
  const letters = useMemo(() => {
    const groups = new Map<string, VocabularyItem[]>();

    for (const item of items) {
      const firstCharacter = item.word.trim().charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(firstCharacter) ? firstCharacter : "#";
      const group = groups.get(letter) ?? [];
      group.push(item);
      groups.set(letter, group);
    }

    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  }, [items]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-white text-black">
      <header className="sticky top-0 z-10 border-b border-black/10 bg-white">
        <div className="flex items-center justify-between px-5 py-5">
          <button
            type="button"
            onClick={onClose}
            className="text-sm uppercase tracking-[0.08em]"
          >
            Cancel
          </button>
          <p className="text-sm uppercase tracking-[0.08em]">Vocabulary</p>
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="text-sm uppercase tracking-[0.08em]"
          >
            Clear
          </button>
        </div>

        <div className="relative border-t border-black/10 px-5 py-4">
          <Search
            size={18}
            className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            autoFocus
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search saved words"
            className="w-full border-0 bg-transparent py-2 pl-8 pr-2 text-xl outline-none placeholder:text-neutral-300"
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-xl grid-cols-[72px_1fr] gap-5 px-5 py-8">
        <aside className="text-xs uppercase leading-5 text-neutral-500">
          <p>{String(items.length).padStart(2, "0")}</p>
          <p>Words</p>
        </aside>

        <div className="space-y-10">
          {letters.length === 0 ? (
            <p className="text-neutral-400">No matching words.</p>
          ) : (
            letters.map(([letter, group]) => (
              <section key={letter} id={`letter-${letter}`}>
                <h2 className="mb-5 text-2xl font-medium">{letter}</h2>
                <div className="space-y-5">
                  {group.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item)}
                      className="block w-full text-left"
                    >
                      <span className="block text-2xl leading-tight">
                        {item.word}
                      </span>
                      <span className="mt-1 block text-sm text-neutral-400">
                        {item.translation} · {STATUS_LABELS[item.status]}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <nav className="fixed right-2 top-1/2 hidden -translate-y-1/2 flex-col text-[10px] leading-4 text-neutral-400 sm:flex">
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
          <a key={letter} href={`#letter-${letter}`}>
            {letter}
          </a>
        ))}
      </nav>
    </div>
  );
}

function FriendPickerModal({
  friends,
  loading,
  errorMessage,
  sendingFriendId,
  onClose,
  onPick,
  onRetry,
}: {
  friends: FriendProfile[];
  loading: boolean;
  errorMessage: string;
  sendingFriendId: string | null;
  onClose: () => void;
  onPick: (friendId: string) => void;
  onRetry: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-to-partner-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={`flex w-full max-w-xl flex-col rounded-t-[28px] border border-white/40 bg-white/75 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out sm:rounded-[28px] ${
          mounted
            ? "translate-y-0"
            : "translate-y-full sm:translate-y-4 sm:opacity-0"
        }`}
        style={{
          maxHeight: "min(78vh, 640px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
        }}
      >
        <div className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-black/15 sm:hidden" />

        <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-3">
          <h2
            id="send-to-partner-title"
            className="text-base font-semibold tracking-tight text-black/90"
          >
            傳送給夥伴
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-black/50 transition-colors hover:bg-black/5 hover:text-black"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-2">
          {loading && (
            <div className="space-y-1.5 px-2 py-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex animate-pulse items-center gap-3 rounded-2xl bg-black/[0.03] p-3"
                >
                  <div className="h-9 w-9 shrink-0 rounded-full bg-black/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-24 rounded-full bg-black/10" />
                    <div className="h-2.5 w-16 rounded-full bg-black/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && errorMessage && (
            <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
              <p className="text-sm text-red-600">{errorMessage}</p>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/5"
              >
                重試
              </button>
            </div>
          )}

          {!loading && !errorMessage && friends.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-black/40">
              還沒有朋友——先加一位才能分享單字。
            </p>
          )}

          {!loading &&
            !errorMessage &&
            friends.map((friend) => {
              const isSending = sendingFriendId === friend.id;
              const isDisabled = sendingFriendId !== null;

              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => onPick(friend.id)}
                  disabled={isDisabled}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-sm font-semibold text-black/70">
                    {(friend.displayName ?? friend.exchangeId)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black/85">
                      {friend.displayName ?? `@${friend.exchangeId}`}
                    </p>
                    <p className="truncate text-xs text-black/40">
                      @{friend.exchangeId}
                    </p>
                  </div>

                  {isSending && (
                    <LoaderCircle
                      size={16}
                      className="shrink-0 animate-spin text-black/40"
                    />
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

type SelectionState = { text: string; top: number; left: number };

function useTextSelection(containerRef: RefObject<HTMLDivElement | null>) {
  const [selection, setSelection] = useState<SelectionState | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection();
      const container = containerRef.current;

      if (!sel || sel.isCollapsed || !container) {
        setSelection(null);
        return;
      }

      const anchorNode = sel.anchorNode;
      if (!anchorNode || !container.contains(anchorNode)) {
        setSelection(null);
        return;
      }

      const text = sel.toString().trim();
      if (!text) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rangeRect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setSelection({
        text,
        top: rangeRect.top - containerRect.top,
        left: rangeRect.left - containerRect.left + rangeRect.width / 2,
      });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [containerRef]);

  return [selection, setSelection] as const;
}

function SelectionToolbar({
  selection,
  addingWord,
  addedWord,
  onAddWord,
  onSendToPartner,
}: {
  selection: SelectionState | null;
  addingWord: boolean;
  addedWord: boolean;
  onAddWord: () => void;
  onSendToPartner: () => void;
}) {
  if (!selection) return null;

  return (
    <div
      className="absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-1 whitespace-nowrap rounded-full border border-white/20 bg-black/40 p-1.5 text-white shadow-xl backdrop-blur-xl"
      style={{ top: selection.top - 12, left: selection.left }}
    >
      <button
        type="button"
        onClick={onAddWord}
        disabled={addingWord}
        aria-label={addedWord ? "已加入單字本" : "加入單字本"}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-60"
      >
        {addingWord ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : addedWord ? (
          <Check size={16} />
        ) : (
          <BookmarkPlus size={16} />
        )}
      </button>

      <span className="h-4 w-px bg-white/20" />

      <button
        type="button"
        onClick={onSendToPartner}
        aria-label="傳送給夥伴"
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
      >
        <Send size={16} />
      </button>
    </div>
  );
}

function VocabularyCard({
  item,
  wordIsTarget,
  updating,
  onChangeStatus,
  onSendToPartner,
  onItemAdded,
}: {
  item: VocabularyItem;
  wordIsTarget: boolean;
  updating: boolean;
  onChangeStatus: (status: VocabularyStatus) => void;
  onSendToPartner: () => void;
  onItemAdded: (item: VocabularyItem) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useTextSelection(contentRef);
  const [addingWord, setAddingWord] = useState(false);
  const [addedWord, setAddedWord] = useState(false);

  async function handleAddSelectionToVocabulary() {
    if (!selection || addingWord) return;
    const text = selection.text;
    setAddingWord(true);

    try {
      const response = await fetch("/api/classify-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Couldn't look up that word.",
        );
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in before saving a word.");
      }

      const word = (data.englishName ?? text).trim();
      const translation = (data.chineseName ?? "").trim();
      const candidateKey = getVocabularyKey(word, translation);

      const { data: existingItems, error: duplicateCheckError } = await supabase
        .from("vocabulary_items")
        .select("id, word, translation")
        .eq("user_id", user.id);

      if (duplicateCheckError) throw duplicateCheckError;

      const duplicate = (existingItems ?? []).some(
        (existingItem) =>
          getVocabularyKey(existingItem.word, existingItem.translation) ===
          candidateKey,
      );

      if (!duplicate) {
        const { data: inserted, error: insertError } = await supabase
          .from("vocabulary_items")
          .insert({
            user_id: user.id,
            word,
            translation,
            language: "english",
            part_of_speech: data.partOfSpeech?.trim() || null,
            example_sentence: data.englishExample?.trim() || null,
            translated_example: data.chineseExample?.trim() || null,
            confidence: data.confidence ?? "medium",
            category: (data.category ?? "other") as VocabularyCategory,
            status: "new",
          })
          .select()
          .single();

        if (insertError) throw insertError;
        onItemAdded(inserted as VocabularyItem);
      }

      setAddedWord(true);
      window.getSelection()?.removeAllRanges();
      setTimeout(() => {
        setSelection(null);
        setAddedWord(false);
      }, 1100);
    } catch (addError) {
      console.error("Failed to add word:", addError);
      setSelection(null);
    } finally {
      setAddingWord(false);
    }
  }

  function handleSelectionSendToPartner() {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    onSendToPartner();
  }

  async function handleShare() {
    const shareData = {
      title: item.word,
      text: `${item.word} — ${item.translation}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed — no action needed.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.text);
    } catch {
      // Clipboard can fail without permission; safe to ignore.
    }
  }

  return (
    <article className="overflow-hidden rounded-[28px] bg-white">
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt={item.word}
          className="h-48 w-full object-cover"
        />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div ref={contentRef} className="relative min-w-0 flex-1">
            <SelectionToolbar
              selection={selection}
              addingWord={addingWord}
              addedWord={addedWord}
              onAddWord={() => void handleAddSelectionToVocabulary()}
              onSendToPartner={handleSelectionSendToPartner}
            />

            <div className="flex flex-wrap items-center gap-2">
              <h2
                className={
                  wordIsTarget
                    ? "break-words text-3xl font-black sm:text-4xl"
                    : "break-words text-lg text-neutral-500 sm:text-xl"
                }
              >
                {item.word}
              </h2>
              <button
                type="button"
                aria-label={`Pronounce ${item.word}`}
                onClick={() =>
                  speak(item.word, toPinyin(item.word) ? "zh-TW" : "en-US")
                }
                className="shrink-0 rounded-full bg-[#f1eee7] p-2 text-black"
              >
                <Volume2 size={16} />
              </button>
            </div>
            {toPinyin(item.word) && (
              <p className="mt-1 text-sm text-neutral-400">
                {toPinyin(item.word)}
              </p>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p
                className={
                  wordIsTarget
                    ? "break-words text-base text-neutral-500 sm:text-lg"
                    : "break-words text-3xl font-black sm:text-4xl"
                }
              >
                {item.translation}
              </p>
              <button
                type="button"
                aria-label={`Pronounce ${item.translation}`}
                onClick={() =>
                  speak(
                    item.translation,
                    toPinyin(item.translation) ? "zh-TW" : "en-US",
                  )
                }
                className="shrink-0 rounded-full bg-[#f1eee7] p-1.5 text-black"
              >
                <Volume2 size={14} />
              </button>
            </div>

            <div className="mt-1 flex items-center gap-1.5">
              {toPinyin(item.translation) && (
                <p className="text-sm text-neutral-400">
                  {toPinyin(item.translation)}
                </p>
              )}
              {item.part_of_speech && (
                <span className="text-[11px] text-neutral-300">
                  · {item.part_of_speech}
                </span>
              )}
            </div>

            {(item.example_sentence || item.translated_example) && (
              <div className="mt-5 border-t border-neutral-100 pt-3">
                <p className="break-words leading-7">
                  {wordIsTarget
                    ? item.translated_example
                    : item.example_sentence}
                </p>
                {(wordIsTarget
                  ? item.example_sentence
                  : item.translated_example) && (
                  <p className="mt-1 break-words text-sm leading-6 text-neutral-400">
                    {wordIsTarget
                      ? item.example_sentence
                      : item.translated_example}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            {item.status === "mastered" && (
              <span className="rounded-full bg-green-100 p-2 text-green-700">
                <Check size={16} />
              </span>
            )}
            <button
              type="button"
              onClick={onSendToPartner}
              aria-label="Send to Partner"
              className="rounded-full bg-[#f1eee7] p-2 text-black transition-colors hover:bg-[#e9e4d8]"
            >
              <Send size={16} />
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              aria-label="Share"
              className="rounded-full bg-[#f1eee7] p-2 text-black transition-colors hover:bg-[#e9e4d8]"
            >
              <Share size={16} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {(["new", "learning", "mastered"] as const).map((status) => (
            <button
              key={status}
              type="button"
              disabled={updating}
              onClick={() => onChangeStatus(status)}
              className={`whitespace-nowrap rounded-[16px] px-2 py-3 text-xs font-black disabled:opacity-40 ${
                item.status === status
                  ? "bg-black text-white"
                  : "bg-[#f1eee7] text-black"
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
