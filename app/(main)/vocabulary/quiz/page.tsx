"use client";

import { ChevronLeft, LoaderCircle, RotateCcw, Volume2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { toPinyin } from "@/lib/pinyin";
import { speak } from "@/lib/speech";
import type { VocabularyItem, VocabularyStatus } from "@/lib/types/app";

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function VocabularyQuizPage() {
  const [deck, setDeck] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDeck() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Please log in to start a quiz.");
        }

        const { data, error: fetchError } = await supabase
          .from("vocabulary_items")
          .select("*")
          .eq("user_id", user.id);

        if (fetchError) throw fetchError;
        if (active) setDeck(shuffle((data ?? []) as VocabularyItem[]));
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

    void loadDeck();

    return () => {
      active = false;
    };
  }, []);

  const current = deck[index];
  const finished = deck.length > 0 && index >= deck.length;

  async function markAndAdvance(status: VocabularyStatus, wasKnown: boolean) {
    if (!current || updatingId) return;

    setUpdatingId(current.id);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("vocabulary_items")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", current.id);

      if (updateError) throw updateError;
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not save your progress.",
      );
    } finally {
      setUpdatingId(null);
      if (wasKnown) setKnownCount((count) => count + 1);
      setRevealed(false);
      setIndex((current) => current + 1);
    }
  }

  function restart() {
    setDeck((current) => shuffle(current));
    setIndex(0);
    setRevealed(false);
    setKnownCount(0);
  }

  return (
    <main className="app-page">
      <div className="app-page__content max-w-xl">
        <header className="flex items-center gap-3">
          <Link
            href="/vocabulary"
            aria-label="Back to vocabulary"
            className="rounded-full bg-white p-3 text-black"
          >
            <ChevronLeft size={22} />
          </Link>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em]">
              Flashcard quiz
            </p>
            <h1 className="mt-1 text-3xl font-black">Test Yourself</h1>
          </div>
        </header>

        {error && (
          <p className="mt-5 rounded-[20px] bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <section className="mt-8 flex items-center justify-center rounded-[30px] bg-white p-10">
            <LoaderCircle className="animate-spin" size={28} />
          </section>
        ) : deck.length === 0 ? (
          <section className="mt-8 rounded-[30px] bg-white p-7 text-center">
            <h2 className="text-2xl font-black">No words yet</h2>
            <p className="mt-3 leading-7">
              Add some vocabulary first, then come back to quiz yourself.
            </p>
            <Link
              href="/capture"
              className="mt-6 block rounded-[20px] bg-black px-5 py-4 font-black text-white"
            >
              Discover a Word
            </Link>
          </section>
        ) : finished ? (
          <section className="mt-8 rounded-[30px] bg-white p-8 text-center">
            <h2 className="text-2xl font-black">
              {knownCount} / {deck.length} known
            </h2>
            <p className="mt-3 leading-7 text-neutral-600">
              Nice work. Run it again to reinforce the ones you missed.
            </p>
            <button
              type="button"
              onClick={restart}
              className="mt-6 inline-flex items-center gap-2 rounded-[20px] bg-black px-5 py-4 font-black text-white"
            >
              <RotateCcw size={18} />
              Quiz Again
            </button>
          </section>
        ) : (
          <section className="mt-8">
            <p className="text-center text-sm font-bold text-neutral-400">
              {index + 1} / {deck.length}
            </p>

            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              className="mt-4 flex min-h-[280px] w-full flex-col items-center justify-center rounded-[30px] bg-white p-8 text-center"
            >
              {!revealed ? (
                <>
                  <h2 className="text-4xl font-black">{current.word}</h2>
                  {toPinyin(current.word) && (
                    <p className="mt-2 text-lg font-bold text-neutral-400">
                      {toPinyin(current.word)}
                    </p>
                  )}
                  <p className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-neutral-400">
                    Tap to reveal
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-neutral-400">
                    {current.word}
                  </p>
                  <h2 className="mt-2 text-4xl font-black">
                    {current.translation}
                  </h2>
                  {current.example_sentence && (
                    <p className="mt-5 leading-7 text-neutral-600">
                      {current.example_sentence}
                    </p>
                  )}
                </>
              )}
            </button>

            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  const textToSpeak = revealed
                    ? current.translation
                    : current.word;
                  speak(textToSpeak, toPinyin(textToSpeak) ? "zh-TW" : "en-US");
                }}
                aria-label={`Pronounce ${current.word}`}
                className="rounded-full bg-[#f1eee7] p-3 text-black"
              >
                <Volume2 size={18} />
              </button>
            </div>

            {revealed && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={updatingId === current.id}
                  onClick={() => void markAndAdvance("learning", false)}
                  className="rounded-[20px] bg-[#f1eee7] px-4 py-4 font-black text-black disabled:opacity-40"
                >
                  Still Learning
                </button>
                <button
                  type="button"
                  disabled={updatingId === current.id}
                  onClick={() => void markAndAdvance("mastered", true)}
                  className="rounded-[20px] bg-black px-4 py-4 font-black text-white disabled:opacity-40"
                >
                  I Knew It
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
