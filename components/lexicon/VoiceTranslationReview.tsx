"use client";

import { useEffect } from "react";

import OmniLexiconConsole from "@/components/cosmic/OmniLexiconConsole";
import UniversalSearchField from "@/components/lexicon/UniversalSearchField";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { LexiconSearchProvider } from "@/contexts/LexiconSearchContext";
import { VocabularyProvider } from "@/contexts/VocabularyContext";

/*
 * Voice translation without an account (Chi, 2026-10-11).
 *
 * The search field speaks to two signed-in routes, so on this page they are
 * answered from here with one fixed sentence: whatever the microphone hears,
 * the answer is the same "polite no". What is under review is the listening
 * itself — the ring following the voice, the caption, the stop on silence,
 * the hand-over to Yumi — and the card it ends on, on a real phone.
 */

const DEMO_TRANSCRIPT = "I'd love to, but I'm completely swamped this week.";

const DEMO_ENTRY = {
  term: DEMO_TRANSCRIPT,
  translation: "我很想去，但這週真的忙翻了。",
  termLanguage: "en",
  translationLanguage: "zh-TW",
  queryLanguage: "en",
  partOfSpeech: "phrase",
  kind: "sentence",
  termExample: "I'm swamped with work today.",
  translationExample: "我今天工作忙翻了。",
  confidence: "high",
  category: "other",
  highlight: { term: "swamped", translation: "忙翻了、應接不暇", partOfSpeech: "adjective" },
  insight: {
    language: "zh-TW",
    gist: "這是客氣的婉拒：他這週不會去，但不想讓你覺得被拒絕。",
    literal: "我會很樂意，但我這週完全被淹沒了。",
    tone: "友善、帶點歉意，是英文裡很常見的軟性拒絕。",
    implied: "別再約這週了；如果真的想見面，可以改約下週。",
    context: "英語母語者很少直接說 no，常用「I'd love to, but…」先表達好意再拒絕。",
    phrases: [
      { phrase: "I'd love to, but", note: "先表示意願再轉折，幾乎都是在拒絕。" },
      { phrase: "swamped", note: "忙到喘不過氣，比 busy 更強烈、更口語。" },
    ],
  },
};

function useDemoRoutes() {
  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/voice-lookup")) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return Response.json({ heard: true, text: DEMO_TRANSCRIPT, language: "en" });
      }
      if (url.includes("/api/classify-text/preview")) {
        return Response.json({ error: "review" });
      }
      if (url.includes("/api/classify-text")) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        return Response.json({ ...DEMO_ENTRY, degraded: false });
      }
      return original(input, init);
    };
    return () => { window.fetch = original; };
  }, []);
}

export default function VoiceTranslationReview({ cosmic }: { cosmic: boolean }) {
  useDemoRoutes();

  return (
    <InterfaceModeProvider initialMode={cosmic ? "yumi-cosmic" : "standard"} preview>
      <LearningLanguageProvider initialLearningLanguage="en" initialNativeLanguage="zh-TW">
        <VocabularyProvider>
          <LexiconSearchProvider>
            <main
              className="min-h-dvh px-4 pb-16 pt-10"
              style={cosmic ? undefined : { background: "#f3efe6" }}
            >
              <div className="mx-auto w-full max-w-xl">
                {cosmic ? <OmniLexiconConsole /> : <UniversalSearchField />}
              </div>
            </main>
          </LexiconSearchProvider>
        </VocabularyProvider>
      </LearningLanguageProvider>
    </InterfaceModeProvider>
  );
}
