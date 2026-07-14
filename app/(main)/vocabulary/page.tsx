"use client";

import {
  BookOpen,
  Camera,
  Check,
  LoaderCircle,
  Plus,
  Search,
  Volume2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { toPinyin } from "@/lib/pinyin";
import { speak } from "@/lib/speech";
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

const CATEGORY_LABELS: Record<VocabularyCategory, string> = {
  people: "People",
  objects: "Objects",
  actions: "Actions",
  other: "Other",
};

export default function VocabularyPage() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [learningLanguage, setLearningLanguage] =
    useState<AppLanguage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | VocabularyCategory>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
              : "Could not load your vocabulary."
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

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesFilter = filter === "all" || item.category === filter;
      const matchesQuery =
        !normalizedQuery ||
        item.word.toLowerCase().includes(normalizedQuery) ||
        item.translation.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [filter, items, query]);

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
          currentItem.id === item.id
            ? { ...currentItem, status }
            : currentItem
        )
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update this word."
      );
    } finally {
      setUpdatingId(null);
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
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Vocabulary
            </h1>
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

        <div className="relative mt-7">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search English or 中文"
            className="w-full rounded-[20px] border border-transparent bg-white py-4 pl-12 pr-4 outline-none focus:border-black"
          />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(["all", "people", "objects", "actions", "other"] as const).map(
            (category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black ${
                  filter === category
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
              >
                {category === "all" ? "All" : CATEGORY_LABELS[category]}
              </button>
            )
          )}
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
            <BookOpen className="mx-auto" size={30} />
            <h2 className="mt-4 text-xl font-black">No matching words</h2>
            <p className="mt-2 text-neutral-600">
              Try another search or learning status.
            </p>
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            {visibleItems.map((item) => {
              // item.language is the language of item.word; the other
              // field (item.translation) is the opposite language.
              // The field matching the account's learning_language is the
              // one the person is actively studying, so it gets the
              // prominent, larger treatment. Fall back to "is this field
              // Chinese" if we haven't loaded the profile yet.
              const wordIsTarget = learningLanguage
                ? item.language === learningLanguage
                : toPinyin(item.word) !== null;

              return (
              <article
                key={item.id}
                className="overflow-hidden rounded-[28px] bg-white"
              >
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.word}
                    className="h-48 w-full object-cover"
                  />
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
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
                            speak(
                              item.word,
                              toPinyin(item.word) ? "zh-TW" : "en-US"
                            )
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
                              toPinyin(item.translation) ? "zh-TW" : "en-US"
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
                    </div>

                    {item.status === "mastered" && (
                      <span className="shrink-0 rounded-full bg-green-100 p-2 text-green-700">
                        <Check size={18} />
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

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {(["new", "learning", "mastered"] as const).map(
                      (status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => void changeStatus(item, status)}
                          className={`whitespace-nowrap rounded-[16px] px-2 py-3 text-xs font-black disabled:opacity-40 ${
                            item.status === status
                              ? "bg-black text-white"
                              : "bg-[#f1eee7] text-black"
                          }`}
                        >
                          {STATUS_LABELS[status]}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
