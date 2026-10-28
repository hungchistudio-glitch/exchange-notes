"use client";

import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { SharedWordCard } from "@/lib/messages/wordCard";

import WordCardMessage from "./WordCardMessage";

/** The cards /word-card-review shows: short, long, and long led in Chinese. */
const CARDS: SharedWordCard[] = [
  { word: "library", translation: "圖書館", wordLanguage: "en", translationLanguage: "zh-TW", partOfSpeech: "noun" },
  {
    word: "To achieve even growth, you either need to limit the fast growing trees or speed up the slower growing ones",
    translation: "要達到均衡的生長，你要嘛限制生長快速的樹木，要嘛加速生長較慢的樹木",
    wordLanguage: "en",
    translationLanguage: "zh-TW",
    partOfSpeech: "phrase",
    examples: {
      en: "To achieve even results, we need to balance the workload across all teams",
      "zh-TW": "為了取得均衡的成果，我們需要平衡所有團隊的工作量",
    },
  },
  {
    word: "如果明天不下雨的話，我們就一起去河濱公園騎腳踏車，然後在附近的小吃攤吃晚餐",
    translation: "If it doesn't rain tomorrow, let's ride bikes in the riverside park together and then have dinner at the food stalls nearby",
    wordLanguage: "zh-TW",
    translationLanguage: "en",
  },
];

/** Read as someone learning English whose own language is Chinese, as in the report. */
export default function WordCardReview() {
  return (
    <LearningLanguageProvider initialLearningLanguage="en" initialNativeLanguage="zh-TW">
      <Cards />
    </LearningLanguageProvider>
  );
}

function Cards() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-surface px-4 py-8">
      {CARDS.map((card) => (
        <WordCardMessage
          key={card.word}
          card={card}
          createdAt="2026-10-24T03:45:00Z"
          learningLanguage="en"
          t={t}
          saved={false}
          saving={false}
          onSave={() => {}}
          onShare={() => {}}
        />
      ))}
    </main>
  );
}
