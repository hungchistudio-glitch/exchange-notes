"use client";

import { useState } from "react";

import DailyNews from "@/app/components/DailyNews";
import { DISCOVER_COLORS } from "@/components/discover/types";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { LexiconSearchProvider } from "@/contexts/LexiconSearchContext";
import { VocabularyProvider } from "@/contexts/VocabularyContext";
import type { DailyNewsCard } from "@/lib/types/dailyNews";

/* A fixed batch: the shapes the real feed sends, the words of a real day. */
const STORIES: Array<[string, string, string, string, string, string]> = [
  ["contemporary art", "Hoor Al Qasimi Named Curator of 2028 Venice Biennale", "胡爾・卡西米被任命為 2028 年威尼斯雙年展策展人", "Sheikha Hoor Al Qasimi has been named curator of the 2028 edition of the Venice Biennale.", "謝赫・胡爾・卡西米已被任命為 2028 年威尼斯雙年展的策展人。", "The Guardian"],
  ["technology", "The Com: The Global Cybercrime Network Posing a ‘Chilling Threat’ to Children", "The Com：對兒童構成「駭人威脅」的全球網路犯罪集團", "Crime agencies around the world warn that the Com, a loose network of young offenders, is growing.", "世界各地的執法機構警告，一個由年輕罪犯組成的鬆散網絡正在擴大。", "The Guardian"],
  ["taiwan", "Taiwan Unveils Plan to Expand Offshore Wind Power by 2030", "台灣公布 2030 年擴大離岸風電計畫", "The plan would double installed capacity and create thousands of local jobs.", "這項計畫將使裝置容量倍增，並創造數千個在地工作機會。", "Focus Taiwan"],
  ["japan", "Kyoto Limits Tour Buses to Ease Crowding in Historic Districts", "京都限制遊覽車以紓解古蹟區擁擠", "City officials say residents have struggled to board buses during peak seasons.", "市府官員表示，旺季時居民經常搭不上公車。", "The Japan Times"],
  ["korea", "Seoul Opens Its First Fully Automated Night Library", "首爾開設第一座全自動夜間圖書館", "Readers can borrow books around the clock using a phone and a robot shelf.", "讀者可以用手機和機器人書架全天候借書。", "The Korea Herald"],
  ["science", "Astronomers Spot a Planet Orbiting Two Suns in a Distant Galaxy", "天文學家在遙遠星系發現環繞兩顆恆星的行星", "The discovery could change how scientists search for worlds like our own.", "這項發現可能改變科學家尋找類地世界的方式。", "The Guardian"],
];

function cards(): DailyNewsCard[] {
  return STORIES.map(([category, title, titleZh, summary, summaryZh, sourceName], index) => ({
    id: `review-${index}`,
    category,
    titles: { en: title, "zh-TW": titleZh },
    summaries: { en: summary, "zh-TW": summaryZh },
    captions: {},
    sourceName,
    sourceUrl: "https://example.com",
    publishedAt: new Date(Date.now() - (index + 18) * 3_600_000).toISOString(),
    imageUrl: null,
    vocabulary: [],
  }));
}

let patched = false;

/* Patched before the page renders: DailyNews asks on its first effect. */
function useReviewFeed() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/api/daily-news")) {
      // Long enough to see the wind blow as the loading state.
      await new Promise((resolve) => setTimeout(resolve, 1_400));
      return Response.json({ cards: cards(), generatedAt: new Date().toISOString() });
    }
    if (url.includes("/api/news/seen")) return new Response(null, { status: 204 });
    if (url.includes("/api/classify-text/preview")) {
      // A few words of the instant dictionary, for the laser scan's tag.
      const word = String(JSON.parse(String(init?.body ?? "{}")).text ?? "").toLowerCase();
      const words: Record<string, [string, string]> = { named: ["被任命", "verb"], curator: ["策展人", "noun"], hoor: ["胡爾（人名）", "name"], venice: ["威尼斯", "noun"] };
      const found = words[word];
      return Response.json(found ? { term: word, translation: found[0], partOfSpeech: found[1] } : { term: word, translationUnavailable: true });
    }
    return original(input, init);
  };
}

export default function NewsWindReview({ cosmic }: { cosmic: boolean }) {
  useReviewFeed();
  const [round, setRound] = useState(0);
  const replay = (full: boolean) => {
    try {
      if (full) window.localStorage.removeItem("news-wind-day-v1");
      else {
        const now = new Date();
        window.localStorage.setItem("news-wind-day-v1", `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`);
      }
    } catch { /* Private mode. */ }
    setRound((value) => value + 1);
  };

  return (
    <InterfaceModeProvider initialMode={cosmic ? "yumi-cosmic" : "standard"} preview>
      <LearningLanguageProvider initialLearningLanguage="en" initialNativeLanguage="zh-TW">
        <VocabularyProvider>
          <LexiconSearchProvider>
            <div className="fixed right-2 top-2 z-[99999] flex gap-1.5">
              <button type="button" data-review="full" onClick={() => replay(true)} className="rounded-lg border border-black bg-white px-3 py-1 text-sm">full</button>
              <button type="button" data-review="short" onClick={() => replay(false)} className="rounded-lg border border-black bg-white px-3 py-1 text-sm">short</button>
            </div>
            <main className="min-h-dvh pb-24 pt-10" style={cosmic ? undefined : { backgroundColor: DISCOVER_COLORS.page }}>
              <div className="mx-auto w-full max-w-xl px-[22px]">
                <DailyNews key={round} />
              </div>
            </main>
          </LexiconSearchProvider>
        </VocabularyProvider>
      </LearningLanguageProvider>
    </InterfaceModeProvider>
  );
}
