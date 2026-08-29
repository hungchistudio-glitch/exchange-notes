import type { YumiMood } from "@/lib/pet/types";

export const landingDemoData = {
  lookup: {
    query: "serendipity",
    partOfSpeech: "noun",
    meaning: "finding something good without looking for it",
    translation: "意外發現美好事物的機緣",
    example: "Learning a word at exactly the right moment feels like serendipity.",
  },
  note: {
    date: "August 24",
    english: "I finally found the word for that feeling: bittersweet.",
    chinese: "我終於找到形容那種感覺的詞：苦樂參半。",
  },
  exchange: {
    word: "留白",
    reading: "liú bái",
    meaning: "breathing room · space left open",
    sender: "Your vocabulary",
    receiver: "A learning friend",
  },
  yumi: {
    message: "You kept three new words today. Want to bring one back for a quick review?",
    translation: "你今天留下了三個新單字，要不要帶一個回來快速複習？",
    reviewWord: "bonjour",
    reviewHint: "ready to review",
  },
} as const;

export const landingYumiMoods: ReadonlyArray<{
  mood: YumiMood;
  label: string;
  labelZh: string;
}> = [
  { mood: "curious", label: "curious", labelZh: "好奇" },
  { mood: "happy", label: "happy", labelZh: "開心" },
  { mood: "excited", label: "excited", labelZh: "興奮" },
  { mood: "proud", label: "proud", labelZh: "驕傲" },
  { mood: "missingYou", label: "missed you", labelZh: "想念" },
];
