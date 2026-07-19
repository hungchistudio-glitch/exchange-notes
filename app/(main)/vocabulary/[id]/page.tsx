"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { saveReviewResult } from "@/lib/review/saveReviewResult";

import VocabularyHeader from "@/components/vocabulary/detail/VocabularyHeader";
import VocabularyStats from "@/components/vocabulary/detail/VocabularyStats";
import VocabularyExample from "@/components/vocabulary/detail/VocabularyExample";
import VocabularyReviewDetails from "@/components/vocabulary/detail/VocabularyReviewDetails";
import VocabularyQuickActions from "@/components/vocabulary/detail/VocabularyQuickActions";
import VocabularyReviewPanel from "@/components/vocabulary/detail/VocabularyReviewPanel";
import VocabularyEditModal, {
  type VocabularyEditValues,
} from "@/components/vocabulary/detail/VocabularyEditModal";
import type { VocabularyItem } from "@/components/vocabulary/detail/types";

export default function VocabularyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [word, setWord] =
    useState<VocabularyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadWord() {
      try {
        setLoading(true);
        setError("");

        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            "Please log in to view this word.",
          );
        }

        const { data, error: fetchError } =
          await supabase
            .from("vocabulary_items")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (fetchError) {
          throw fetchError;
        }

        if (active) {
          setWord(data as VocabularyItem);
        }
      } catch (loadError) {
        console.error(loadError);

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load this word.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (id) {
      void loadWord();
    }

    return () => {
      active = false;
    };
  }, [id]);

  async function handleSaveEdit(
    values: VocabularyEditValues,
  ) {
    if (!word) return;

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      throw new Error(
        "Please log in to edit this word.",
      );
    }

    const { data, error: updateError } = await supabase
      .from("vocabulary_items")
      .update(values)
      .eq("id", word.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    setWord(data as VocabularyItem);
  }


  async function handleDelete() {
    if (!word) return;

    const confirmed = window.confirm(
      `Delete "${word.word}" from your vocabulary?`
    );

    if (!confirmed) return;

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("vocabulary_items")
      .delete()
      .eq("id", word.id)
      .eq("user_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/vocabulary");
  }

  async function handleReview(
    rating: "again" | "hard" | "good" | "easy",
  ) {
    if (!word) return;

    try {
      await saveReviewResult(word.id, rating);

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("vocabulary_items")
        .select("*")
        .eq("id", word.id)
        .eq("user_id", user.id)
        .single();

      if (data) {
        setWord(data as VocabularyItem);
      }
    } catch (reviewError) {
      console.error(reviewError);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="animate-pulse space-y-5">
          <div className="h-5 w-24 rounded bg-neutral-200" />
          <div className="h-14 w-2/3 rounded bg-neutral-200" />
          <div className="h-8 w-1/3 rounded bg-neutral-100" />
          <div className="h-56 rounded-3xl bg-neutral-100" />
        </div>
      </main>
    );
  }

  if (error || !word) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Link
          href="/vocabulary"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600"
        >
          <ArrowLeft size={18} />
          Vocabulary
        </Link>

        <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-2xl font-bold">
            Word not found
          </h1>

          <p className="mt-2 text-red-700">
            {error || "This word is unavailable."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href="/vocabulary"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-black"
        >
          <ArrowLeft size={18} />
          Vocabulary
        </Link>

        <div className="mt-8 space-y-6">
          <VocabularyHeader item={word} />

          <VocabularyQuickActions
            english={word.word}
            chinese={word.translation}
            onEdit={() => setEditOpen(true)}
          />

          <div className="flex justify-end">
            <button
              onClick={() => void handleDelete()}
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Delete Word
            </button>
          </div>

          <VocabularyExample item={word} />

          <div id="review-this-word">
            <VocabularyReviewPanel
              onRate={handleReview}
            />
          </div>

          <VocabularyStats item={word} />

          <VocabularyReviewDetails item={word} />
        </div>
      </main>

      <VocabularyEditModal
        open={editOpen}
        item={word}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveEdit}
      />
    </>
  );
}
