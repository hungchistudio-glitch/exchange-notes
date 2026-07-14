"use client";

import Link from "next/link";
import {
  Camera,
  ChevronRight,
  ImagePlus,
  MessageCircle,
  Newspaper,
} from "lucide-react";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type RecentNote = {
  articleId: string;
  title: string;
  category: string;
};

export default function HomePage() {
  const [wordsToday, setWordsToday] = useState(0);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (active) setLoading(false);
          return;
        }

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [{ count }, { data: notesData }] = await Promise.all([
          supabase
            .from("vocabulary_items")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("created_at", startOfToday.toISOString()),
          supabase
            .from("saved_news_articles")
            .select("article_id, english_title, chinese_title, category")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        if (!active) return;

        setWordsToday(count ?? 0);
        setRecentNotes(
          (notesData ?? []).map((row) => ({
            articleId: row.article_id as string,
            title:
              (row.chinese_title as string | null) ||
              (row.english_title as string),
            category: row.category as string,
          }))
        );
      } catch (loadError) {
        console.error("Failed to load home data:", loadError);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHomeData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f2eb] px-5 pb-28 pt-8 text-black">
      <div className="mx-auto max-w-xl">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.2em]">
            English × 繁體中文
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Exchange Notes
          </h1>

          <p className="mt-4 max-w-md text-lg leading-8">
            Learn one useful word from real life,
            then share it with someone who speaks
            the language.
          </p>
        </header>

        <section className="mt-9 rounded-[32px] bg-black p-6 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.18em]">
            Start here
          </p>

          <h2 className="mt-3 text-3xl font-black">
            What is this called?
          </h2>

          <p className="mt-3 leading-7 text-white">
            Take a photo or choose one from your
            library. Turn something you see into a
            word you can remember.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <Link
              href="/capture?source=camera"
              className="flex min-h-28 flex-col justify-between rounded-[24px] bg-white p-4 text-black"
            >
              <Camera size={25} />
              <span className="font-black">
                Take Photo
              </span>
            </Link>

            <Link
              href="/capture?source=library"
              className="flex min-h-28 flex-col justify-between rounded-[24px] bg-white p-4 text-black"
            >
              <ImagePlus size={25} />
              <span className="font-black">
                Choose Photo
              </span>
            </Link>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/vocabulary"
            className="rounded-[28px] bg-white p-5"
          >
            <p className="text-3xl font-black">
              {loading ? "…" : wordsToday}
            </p>
            <p className="mt-6 font-black">
              Words Today
            </p>
            <p className="mt-1 text-sm text-[#4f4f4f]">
              Build your vocabulary
            </p>
          </Link>

          <Link
            href="/grammar"
            className="rounded-[28px] bg-white p-5"
          >
            <p className="text-3xl font-black">0</p>
            <p className="mt-6 font-black">
              Grammar Notes
            </p>
            <p className="mt-1 text-sm text-[#4f4f4f]">
              Use words in context
            </p>
          </Link>
        </section>

        {recentNotes.length > 0 && (
          <section className="mt-6 rounded-[30px] bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Recent Notes</h2>
              <Link
                href="/discover"
                aria-label="See all notes"
                className="rounded-full border border-black p-2"
              >
                <ChevronRight size={18} />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentNotes.map((note) => (
                <div
                  key={note.articleId}
                  className="flex items-start gap-3 rounded-[20px] bg-[#f5f2eb] p-4"
                >
                  <span className="mt-0.5 shrink-0 rounded-full bg-white p-2">
                    <Newspaper size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#8a8a8a]">
                      {note.category}
                    </p>
                    <p className="mt-1 truncate font-bold leading-6">
                      {note.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-[30px] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <MessageCircle size={24} />

              <h2 className="mt-5 text-2xl font-black">
                Learn with a friend
              </h2>

              <p className="mt-2 leading-7">
                Send a real-life photo. Your friend
                explains it in their native language,
                and you reply in yours.
              </p>
            </div>

            <Link
              href="/messages"
              aria-label="Open messages"
              className="rounded-full border border-black p-2"
            >
              <ChevronRight size={20} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}