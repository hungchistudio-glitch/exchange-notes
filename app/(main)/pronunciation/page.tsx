"use client";

import {
  ArrowLeft,
  BookOpen,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { speak } from "@/lib/speech";
import { createClient } from "@/lib/supabase/client";
import type { AppLanguage } from "@/lib/types/app";

type EnglishSound = {
  symbol: string;
  example: string;
  translation: string;
  cue: string;
  cueChinese: string;
  soundText: string;
};

type ZhuyinSound = {
  symbol: string;
  example: string;
  translation: string;
  reading: string;

  // Browser speech engines cannot reliably pronounce raw Zhuyin.
  // This uses a real Mandarin syllable with the intended sound.
  soundAudio: string;
};

type ToneItem = {
  symbol: string;
  chineseLabel: string;
  englishLabel: string;
  example: string;
  translation: string;
  reading: string;
};

const ENGLISH_VOWELS: EnglishSound[] = [
  {
    symbol: "/iː/",
    example: "see",
    translation: "看見",
    cue: "long ee",
    cueChinese: "長母音 ee",
    soundText: "ee",
  },
  {
    symbol: "/ɪ/",
    example: "sit",
    translation: "坐",
    cue: "short i",
    cueChinese: "短母音 i",
    soundText: "ih",
  },
  {
    symbol: "/e/",
    example: "bed",
    translation: "床",
    cue: "short e",
    cueChinese: "短母音 e",
    soundText: "eh",
  },
  {
    symbol: "/æ/",
    example: "cat",
    translation: "貓",
    cue: "wide a",
    cueChinese: "嘴型較開的 a",
    soundText: "aah",
  },
  {
    symbol: "/ɑː/",
    example: "father",
    translation: "父親",
    cue: "long ah",
    cueChinese: "長母音 ah",
    soundText: "ah",
  },
  {
    symbol: "/ʌ/",
    example: "cup",
    translation: "杯子",
    cue: "short uh",
    cueChinese: "短母音 uh",
    soundText: "uh",
  },
  {
    symbol: "/ɔː/",
    example: "law",
    translation: "法律",
    cue: "long aw",
    cueChinese: "長母音 aw",
    soundText: "aw",
  },
  {
    symbol: "/ʊ/",
    example: "book",
    translation: "書",
    cue: "short oo",
    cueChinese: "短母音 oo",
    soundText: "short oo",
  },
  {
    symbol: "/uː/",
    example: "food",
    translation: "食物",
    cue: "long oo",
    cueChinese: "長母音 oo",
    soundText: "long oo",
  },
  {
    symbol: "/ə/",
    example: "about",
    translation: "關於",
    cue: "schwa",
    cueChinese: "弱母音",
    soundText: "uh",
  },
];

const ENGLISH_CONSONANTS: EnglishSound[] = [
  {
    symbol: "/θ/",
    example: "think",
    translation: "思考",
    cue: "unvoiced th",
    cueChinese: "無聲 th",
    soundText: "th",
  },
  {
    symbol: "/ð/",
    example: "this",
    translation: "這個",
    cue: "voiced th",
    cueChinese: "有聲 th",
    soundText: "the",
  },
  {
    symbol: "/ʃ/",
    example: "shoe",
    translation: "鞋子",
    cue: "sh",
    cueChinese: "sh 音",
    soundText: "sh",
  },
  {
    symbol: "/ʒ/",
    example: "vision",
    translation: "視覺",
    cue: "soft zh",
    cueChinese: "柔和 zh 音",
    soundText: "zh",
  },
  {
    symbol: "/tʃ/",
    example: "chair",
    translation: "椅子",
    cue: "ch",
    cueChinese: "ch 音",
    soundText: "ch",
  },
  {
    symbol: "/dʒ/",
    example: "job",
    translation: "工作",
    cue: "j",
    cueChinese: "j 音",
    soundText: "j",
  },
  {
    symbol: "/ŋ/",
    example: "sing",
    translation: "唱歌",
    cue: "ng",
    cueChinese: "鼻音 ng",
    soundText: "ng",
  },
  {
    symbol: "/r/",
    example: "red",
    translation: "紅色",
    cue: "English r",
    cueChinese: "英文 r 音",
    soundText: "rr",
  },
];

const ZHUYIN_INITIALS: ZhuyinSound[] = [
  {
    symbol: "ㄅ",
    example: "八",
    translation: "eight",
    reading: "ㄅㄚ",
    soundAudio: "波",
  },
  {
    symbol: "ㄆ",
    example: "怕",
    translation: "afraid",
    reading: "ㄆㄚˋ",
    soundAudio: "坡",
  },
  {
    symbol: "ㄇ",
    example: "媽",
    translation: "mother",
    reading: "ㄇㄚ",
    soundAudio: "摸",
  },
  {
    symbol: "ㄈ",
    example: "發",
    translation: "send / issue",
    reading: "ㄈㄚ",
    soundAudio: "佛",
  },
  {
    symbol: "ㄉ",
    example: "大",
    translation: "big",
    reading: "ㄉㄚˋ",
    soundAudio: "得",
  },
  {
    symbol: "ㄊ",
    example: "他",
    translation: "he",
    reading: "ㄊㄚ",
    soundAudio: "特",
  },
  {
    symbol: "ㄋ",
    example: "你",
    translation: "you",
    reading: "ㄋㄧˇ",
    soundAudio: "呢",
  },
  {
    symbol: "ㄌ",
    example: "來",
    translation: "come",
    reading: "ㄌㄞˊ",
    soundAudio: "勒",
  },
  {
    symbol: "ㄍ",
    example: "高",
    translation: "tall",
    reading: "ㄍㄠ",
    soundAudio: "哥",
  },
  {
    symbol: "ㄎ",
    example: "看",
    translation: "look",
    reading: "ㄎㄢˋ",
    soundAudio: "科",
  },
  {
    symbol: "ㄏ",
    example: "好",
    translation: "good",
    reading: "ㄏㄠˇ",
    soundAudio: "喝",
  },
  {
    symbol: "ㄐ",
    example: "家",
    translation: "home",
    reading: "ㄐㄧㄚ",
    soundAudio: "基",
  },
  {
    symbol: "ㄑ",
    example: "去",
    translation: "go",
    reading: "ㄑㄩˋ",
    soundAudio: "七",
  },
  {
    symbol: "ㄒ",
    example: "小",
    translation: "small",
    reading: "ㄒㄧㄠˇ",
    soundAudio: "西",
  },
  {
    symbol: "ㄓ",
    example: "中",
    translation: "middle",
    reading: "ㄓㄨㄥ",
    soundAudio: "知",
  },
  {
    symbol: "ㄔ",
    example: "吃",
    translation: "eat",
    reading: "ㄔ",
    soundAudio: "吃",
  },
  {
    symbol: "ㄕ",
    example: "是",
    translation: "to be",
    reading: "ㄕˋ",
    soundAudio: "詩",
  },
  {
    symbol: "ㄖ",
    example: "日",
    translation: "day",
    reading: "ㄖˋ",
    soundAudio: "日",
  },
  {
    symbol: "ㄗ",
    example: "早",
    translation: "early",
    reading: "ㄗㄠˇ",
    soundAudio: "資",
  },
  {
    symbol: "ㄘ",
    example: "菜",
    translation: "vegetable",
    reading: "ㄘㄞˋ",
    soundAudio: "疵",
  },
  {
    symbol: "ㄙ",
    example: "三",
    translation: "three",
    reading: "ㄙㄢ",
    soundAudio: "思",
  },
];

const ZHUYIN_FINALS: ZhuyinSound[] = [
  {
    symbol: "ㄚ",
    example: "啊",
    translation: "ah",
    reading: "ㄚ",
    soundAudio: "啊",
  },
  {
    symbol: "ㄛ",
    example: "喔",
    translation: "oh",
    reading: "ㄛ",
    soundAudio: "喔",
  },
  {
    symbol: "ㄜ",
    example: "餓",
    translation: "hungry",
    reading: "ㄜˋ",
    soundAudio: "鵝",
  },
  {
    symbol: "ㄝ",
    example: "也",
    translation: "also",
    reading: "ㄧㄝˇ",
    soundAudio: "耶",
  },
  {
    symbol: "ㄞ",
    example: "愛",
    translation: "love",
    reading: "ㄞˋ",
    soundAudio: "哀",
  },
  {
    symbol: "ㄟ",
    example: "黑",
    translation: "black",
    reading: "ㄏㄟ",
    soundAudio: "欸",
  },
  {
    symbol: "ㄠ",
    example: "好",
    translation: "good",
    reading: "ㄏㄠˇ",
    soundAudio: "凹",
  },
  {
    symbol: "ㄡ",
    example: "口",
    translation: "mouth",
    reading: "ㄎㄡˇ",
    soundAudio: "歐",
  },
  {
    symbol: "ㄢ",
    example: "安",
    translation: "peace",
    reading: "ㄢ",
    soundAudio: "安",
  },
  {
    symbol: "ㄣ",
    example: "很",
    translation: "very",
    reading: "ㄏㄣˇ",
    soundAudio: "恩",
  },
  {
    symbol: "ㄤ",
    example: "忙",
    translation: "busy",
    reading: "ㄇㄤˊ",
    soundAudio: "昂",
  },
  {
    symbol: "ㄥ",
    example: "冷",
    translation: "cold",
    reading: "ㄌㄥˇ",
    soundAudio: "鞥",
  },
  {
    symbol: "ㄦ",
    example: "二",
    translation: "two",
    reading: "ㄦˋ",
    soundAudio: "兒",
  },
  {
    symbol: "ㄧ",
    example: "一",
    translation: "one",
    reading: "ㄧ",
    soundAudio: "一",
  },
  {
    symbol: "ㄨ",
    example: "五",
    translation: "five",
    reading: "ㄨˇ",
    soundAudio: "屋",
  },
  {
    symbol: "ㄩ",
    example: "雨",
    translation: "rain",
    reading: "ㄩˇ",
    soundAudio: "迂",
  },
];

const TONES: ToneItem[] = [
  {
    symbol: "ˉ",
    chineseLabel: "第一聲",
    englishLabel: "First tone",
    example: "媽",
    translation: "mother",
    reading: "ㄇㄚ",
  },
  {
    symbol: "ˊ",
    chineseLabel: "第二聲",
    englishLabel: "Second tone",
    example: "麻",
    translation: "hemp",
    reading: "ㄇㄚˊ",
  },
  {
    symbol: "ˇ",
    chineseLabel: "第三聲",
    englishLabel: "Third tone",
    example: "馬",
    translation: "horse",
    reading: "ㄇㄚˇ",
  },
  {
    symbol: "ˋ",
    chineseLabel: "第四聲",
    englishLabel: "Fourth tone",
    example: "罵",
    translation: "scold",
    reading: "ㄇㄚˋ",
  },
  {
    symbol: "˙",
    chineseLabel: "輕聲",
    englishLabel: "Neutral tone",
    example: "嗎",
    translation: "question particle",
    reading: "ㄇㄚ˙",
  },
];

export default function PronunciationPage() {
  const [learningLanguage, setLearningLanguage] =
    useState<AppLanguage>("english");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("learning_language")
          .eq("id", user.id)
          .single();

        if (active && data?.learning_language) {
          setLearningLanguage(data.learning_language as AppLanguage);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const learningChinese =
    learningLanguage === "traditional-chinese";

  const pageCopy = useMemo(
    () =>
      learningChinese
        ? {
            eyebrow: "Traditional Chinese pronunciation",
            title: "注音基礎",
            subtitle: "Zhuyin Basics",
            description:
              "從聲母、韻母與聲調開始，建立正確的繁體中文發音基礎。",
            descriptionSecondary:
              "Build a strong Traditional Chinese pronunciation foundation through initials, finals, and tones.",
          }
        : {
            eyebrow: "English pronunciation",
            title: "English Sounds",
            subtitle: "英文發音基礎",
            description:
              "Learn the most useful English IPA symbols through familiar everyday words.",
            descriptionSecondary:
              "透過熟悉的生活單字，學習最實用的英文 IPA 發音符號。",
          },
    [learningChinese],
  );

  return (
    <main
      className="min-h-screen bg-[#f5f2eb] px-5 pt-6 text-black"
      style={{
        paddingBottom:
          "calc(11rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto max-w-xl">
        <header className="grid grid-cols-[44px_1fr_44px] items-center">
          <Link
            href="/home"
            aria-label="Back to Home"
            className="flex h-10 w-10 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/[0.04] active:scale-95"
          >
            <ArrowLeft size={20} strokeWidth={1.8} />
          </Link>

          <p className="text-center text-[15px] font-semibold">
            Pronunciation
          </p>

          <div />
        </header>

        <section className="pb-8 pt-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/40">
            {pageCopy.eyebrow}
          </p>

          <h1 className="mt-3 text-[42px] font-semibold leading-none tracking-[-0.05em]">
            {loading ? "Loading…" : pageCopy.title}
          </h1>

          <p className="mt-2 text-[15px] font-medium text-black/35">
            {pageCopy.subtitle}
          </p>

          <p className="mt-5 max-w-md text-[16px] leading-7 text-black/60">
            {pageCopy.description}
          </p>

          <p className="mt-2 max-w-md text-[13px] leading-6 text-black/35">
            {pageCopy.descriptionSecondary}
          </p>
        </section>

        {learningChinese ? (
          <ChinesePronunciationLesson />
        ) : (
          <EnglishPronunciationLesson />
        )}
      </div>
    </main>
  );
}

function EnglishPronunciationLesson() {
  return (
    <div className="space-y-7">
      <LessonIntro
        number="01"
        title="Vowel sounds"
        translatedTitle="母音"
        description="English spelling can change, but each IPA symbol consistently represents a sound."
        translatedDescription="英文拼字可能不同，但每一個 IPA 符號都代表相對固定的聲音。"
      />

      <SoundGrid>
        {ENGLISH_VOWELS.map((sound) => (
          <EnglishSoundCard key={sound.symbol} sound={sound} />
        ))}
      </SoundGrid>

      <LessonIntro
        number="02"
        title="Special consonants"
        translatedTitle="特殊子音"
        description="These sounds are often difficult because spelling does not always clearly show their pronunciation."
        translatedDescription="這些聲音較難掌握，因為英文拼字不一定能直接反映實際發音。"
      />

      <SoundGrid>
        {ENGLISH_CONSONANTS.map((sound) => (
          <EnglishSoundCard key={sound.symbol} sound={sound} />
        ))}
      </SoundGrid>

      <PracticeCard
        title="How to practise"
        translatedTitle="如何練習英文發音"
        lines={[
          ["1. Listen once without repeating.", "先聽一次，不要立刻跟讀。"],
          ["2. Listen again and copy the mouth movement.", "再聽一次，模仿嘴型與舌頭位置。"],
          ["3. Say the example slowly, then naturally.", "先慢速念範例，再用自然速度朗讀。"],
          ["4. Compare similar sounds.", "比較容易混淆的相似音，例如 /iː/ 和 /ɪ/。"],
        ]}
      />
    </div>
  );
}

function EnglishSoundCard({
  sound,
}: {
  sound: EnglishSound;
}) {
  return (
    <article className="flex min-h-[220px] flex-col justify-between rounded-[24px] border border-black/[0.06] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[29px] font-semibold tracking-[-0.04em]">
          {sound.symbol}
        </span>

        <button
          type="button"
          onClick={() => speak(sound.soundText, "en-US")}
          aria-label={`Play the ${sound.symbol} sound`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f2eb] transition-transform active:scale-95"
        >
          <Volume2 size={16} strokeWidth={1.8} />
        </button>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[19px] font-semibold">
              {sound.example}
            </p>

            <p className="mt-1 text-[13px] text-black/42">
              {sound.translation}
            </p>
          </div>

          <button
            type="button"
            onClick={() => speak(sound.example, "en-US")}
            aria-label={`Play ${sound.example}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.07]"
          >
            <Volume2 size={14} strokeWidth={1.8} />
          </button>
        </div>

        <div className="mt-4 border-t border-black/[0.06] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/38">
            {sound.cue}
          </p>

          <p className="mt-1 text-[12px] text-black/30">
            {sound.cueChinese}
          </p>
        </div>
      </div>
    </article>
  );
}

function ChinesePronunciationLesson() {
  return (
    <div className="space-y-7">
      <LessonIntro
        number="01"
        title="聲母"
        translatedTitle="Initials"
        description="聲母通常位於一個音節的開頭，例如「媽」的ㄇ。"
        translatedDescription="An initial usually appears at the beginning of a syllable, such as ㄇ in 媽."
      />

      <SoundGrid>
        {ZHUYIN_INITIALS.map((sound) => (
          <ZhuyinSoundCard key={sound.symbol} sound={sound} />
        ))}
      </SoundGrid>

      <LessonIntro
        number="02"
        title="韻母"
        translatedTitle="Finals"
        description="韻母是音節的主要聲音，可以單獨出現，也可以接在聲母後面。"
        translatedDescription="A final is the main sound of a syllable. It may appear alone or after an initial."
      />

      <SoundGrid>
        {ZHUYIN_FINALS.map((sound) => (
          <ZhuyinSoundCard key={sound.symbol} sound={sound} />
        ))}
      </SoundGrid>

      <LessonIntro
        number="03"
        title="聲調"
        translatedTitle="Tones"
        description="繁體中文的聲調會改變一個字的意思，練習時必須一起記住。"
        translatedDescription="Tones can change the meaning of a Chinese word, so they must be learned together with each syllable."
      />

      <div className="space-y-3">
        {TONES.map((tone) => (
          <ToneCard key={tone.englishLabel} tone={tone} />
        ))}
      </div>

      <PracticeCard
        title="如何練習注音"
        translatedTitle="How to practise Zhuyin"
        lines={[
          ["1. 先認識聲母，再學習韻母。", "Learn the initials first, followed by the finals."],
          ["2. 將聲母與韻母慢慢拼合。", "Slowly combine the initial and final."],
          ["3. 最後加入聲調，完整念出整個音節。", "Add the tone and pronounce the complete syllable."],
          ["4. 每次練習都搭配真正的中文字。", "Always practise with a real Chinese character."],
        ]}
      />
    </div>
  );
}

function ZhuyinSoundCard({
  sound,
}: {
  sound: ZhuyinSound;
}) {
  return (
    <article className="flex min-h-[220px] flex-col justify-between rounded-[24px] border border-black/[0.06] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <span
          className="text-[38px] font-semibold leading-none"
          style={{
            fontFamily:
              '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif',
          }}
        >
          {sound.symbol}
        </span>

        <button
          type="button"
          onClick={() => speak(sound.soundAudio, "zh-TW")}
          aria-label={`播放注音 ${sound.symbol} 的發音`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f2eb] transition-transform active:scale-95"
        >
          <Volume2 size={16} strokeWidth={1.8} />
        </button>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[21px] font-semibold">
              {sound.example}
            </p>

            <p className="mt-1 text-[13px] text-black/42">
              {sound.translation}
            </p>
          </div>

          <button
            type="button"
            onClick={() => speak(sound.example, "zh-TW")}
            aria-label={`播放 ${sound.example}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.07]"
          >
            <Volume2 size={14} strokeWidth={1.8} />
          </button>
        </div>

        <div className="mt-4 border-t border-black/[0.06] pt-3">
          <p
            className="text-[13px] text-black/35"
            style={{
              fontFamily:
                '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif',
            }}
          >
            {sound.reading}
          </p>
        </div>
      </div>
    </article>
  );
}

function ToneCard({
  tone,
}: {
  tone: ToneItem;
}) {
  return (
    <article className="flex items-center gap-4 rounded-[23px] border border-black/[0.06] bg-white px-5 py-4">
      <button
        type="button"
        onClick={() => speak(tone.example, "zh-TW")}
        aria-label={`播放 ${tone.chineseLabel} 的聲調`}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-[21px] text-white transition-transform active:scale-95"
      >
        {tone.symbol}
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold">
          {tone.chineseLabel}
        </p>

        <p className="mt-0.5 text-[12px] text-black/35">
          {tone.englishLabel}
        </p>

        <p className="mt-2 text-[13px] text-black/48">
          {tone.example} · {tone.translation} · {tone.reading}
        </p>
      </div>

      <button
        type="button"
        onClick={() => speak(tone.example, "zh-TW")}
        aria-label={`播放單字 ${tone.example}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f2eb]"
      >
        <Volume2 size={15} strokeWidth={1.8} />
      </button>
    </article>
  );
}

function LessonIntro({
  number,
  title,
  translatedTitle,
  description,
  translatedDescription,
}: {
  number: string;
  title: string;
  translatedTitle: string;
  description: string;
  translatedDescription: string;
}) {
  return (
    <section className="pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
        Lesson {number}
      </p>

      <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em]">
        {title}
      </h2>

      <p className="mt-1 text-[14px] font-medium text-black/35">
        {translatedTitle}
      </p>

      <p className="mt-4 max-w-md text-[14px] leading-6 text-black/52">
        {description}
      </p>

      <p className="mt-2 max-w-md text-[12px] leading-5 text-black/30">
        {translatedDescription}
      </p>
    </section>
  );
}

function PracticeCard({
  title,
  translatedTitle,
  lines,
}: {
  title: string;
  translatedTitle: string;
  lines: Array<[string, string]>;
}) {
  return (
    <section className="rounded-[28px] bg-black p-6 text-white">
      <BookOpen size={22} strokeWidth={1.7} />

      <h2 className="mt-8 text-[27px] font-semibold tracking-[-0.035em]">
        {title}
      </h2>

      <p className="mt-1 text-[13px] text-white/42">
        {translatedTitle}
      </p>

      <div className="mt-6 space-y-5">
        {lines.map(([primary, secondary]) => (
          <div key={primary}>
            <p className="text-[14px] leading-6 text-white/82">
              {primary}
            </p>

            <p className="mt-1 text-[12px] leading-5 text-white/40">
              {secondary}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SoundGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {children}
    </div>
  );
}
