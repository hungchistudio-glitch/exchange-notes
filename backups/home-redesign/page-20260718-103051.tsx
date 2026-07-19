"use client";

import type { ChangeEvent } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import HomeHeader from "@/components/home/HomeHeader";
import ProgressCard from "@/components/home/ProgressCard";
import QuickCaptureCard from "@/components/home/QuickCaptureCard";
import RecentLearningCard from "@/components/home/RecentLearningCard";
import { createClient } from "@/lib/supabase/client";
import type { AppLanguage } from "@/lib/types/app";

type RecentNote = {
  articleId: string;
  title: string;
  category: string;
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);

  const [wordsToday, setWordsToday] = useState(0);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [learningLanguage, setLearningLanguage] =
    useState<AppLanguage>("english");
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

        const [{ count }, { data: notesData }, { data: profileData }] =
          await Promise.all([
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
            supabase
              .from("profiles")
              .select("learning_language")
              .eq("id", user.id)
              .single(),
          ]);

        if (!active) return;

        setWordsToday(count ?? 0);

        if (profileData?.learning_language) {
          setLearningLanguage(profileData.learning_language as AppLanguage);
        }

        setRecentNotes(
          (notesData ?? []).map((row) => ({
            articleId: row.article_id as string,
            title:
              (row.chinese_title as string | null) ||
              (row.english_title as string),
            category: row.category as string,
          })),
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

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      window.alert("Please choose an image smaller than 10 MB.");
      return;
    }

    try {
      const reader = new FileReader();

      const imageData = await new Promise<string>((resolve, reject) => {
        reader.onerror = () => reject(new Error("Could not read this image."));

        reader.onload = () => {
          if (typeof reader.result !== "string") {
            reject(new Error("Could not read this image."));
            return;
          }

          resolve(reader.result);
        };

        reader.readAsDataURL(file);
      });

      sessionStorage.setItem(
        "exchange-notes-capture-draft",
        JSON.stringify({
          imageData,
          fileName: file.name || "photo.jpg",
        }),
      );

      router.push("/capture");
    } catch (error) {
      console.error("Could not prepare selected photo:", error);
      window.alert("Could not open this image. Please try another one.");
    }
  }

  return (
    <main className="app-page">
      <div className="app-page__content max-w-xl">
        <HomeHeader greeting={getGreeting()} streakDays={0} />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void handlePhotoSelected(event)}
        />

        <input
          ref={libraryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(event) => void handlePhotoSelected(event)}
        />

        <div className="mt-7 space-y-4">
          <ProgressCard current={loading ? 0 : wordsToday} goal={10} />

          <QuickCaptureCard
            cameraInputRef={cameraInputRef}
            libraryInputRef={libraryInputRef}
          />

          <Link
            href="/pronunciation"
            className="flex items-center justify-between rounded-[26px] bg-black p-5 text-white transition-transform active:scale-[0.99]"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Continue learning
              </p>

              <p className="mt-2 text-[20px] font-semibold tracking-[-0.025em]">
                {learningLanguage === "traditional-chinese"
                  ? "注音基礎"
                  : "English Sounds"}
              </p>

              <p className="mt-1 text-[13px] text-white/55">
                {learningLanguage === "traditional-chinese"
                  ? "學習ㄅㄆㄇㄈ與聲調"
                  : "Practice essential pronunciation"}
              </p>
            </div>

            <ArrowRight size={19} strokeWidth={1.8} />
          </Link>

          <RecentLearningCard items={recentNotes} />

          <Link
            href="/messages"
            className="flex items-center justify-between rounded-[26px] bg-white p-5 shadow-[0_10px_35px_rgba(0,0,0,0.045)] transition-transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f2eb]">
                <MessageCircle size={19} strokeWidth={1.8} />
              </span>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
                  Community
                </p>

                <p className="mt-1 text-[17px] font-semibold">
                  Practice together
                </p>
              </div>
            </div>

            <ArrowRight size={17} className="text-black/40" />
          </Link>
        </div>
      </div>
    </main>
  );
}
