"use client";

import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
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
  cue: string;
};

type ZhuyinSound = {
  symbol: string;
  example: string;
  reading: string;
};

const ENGLISH_VOWELS: EnglishSound[] = [
  { symbol: "/iː/", example: "see", cue: "long ee" },
  { symbol: "/ɪ/", example: "sit", cue: "short i" },
  { symbol: "/e/", example: "bed", cue: "short e" },
  { symbol: "/æ/", example: "cat", cue: "wide a" },
  { symbol: "/ɑː/", example: "father", cue: "long ah" },
  { symbol: "/ʌ/", example: "cup", cue: "short uh" },
  { symbol: "/ɔː/", example: "law", cue: "long aw" },
  { symbol: "/ʊ/", example: "book", cue: "short oo" },
  { symbol: "/uː/", example: "food", cue: "long oo" },
  { symbol: "/ə/", example: "about", cue: "schwa" },
];

const ENGLISH_CONSONANTS: EnglishSound[] = [
  { symbol: "/θ/", example: "think", cue: "unvoiced th" },
  { symbol: "/ð/", example: "this", cue: "voiced th" },
  { symbol: "/ʃ/", example: "shoe", cue: "sh" },
  { symbol: "/ʒ/", example: "vision", cue: "soft zh" },
  { symbol: "/tʃ/", example: "chair", cue: "ch" },
  { symbol: "/dʒ/", example: "job", cue: "j" },
  { symbol: "/ŋ/", example: "sing", cue: "ng" },
  { symbol: "/r/", example: "red", cue: "English r" },
];

const IPA_SOUND_TEXT: Record<string, string> = {
  "/iː/": "ee",
  "/ɪ/": "ih",
  "/e/": "eh",
  "/æ/": "aah",
  "/ɑː/": "ah",
  "/ʌ/": "uh",
  "/ɔː/": "aw",
  "/ʊ/": "short oo",
  "/uː/": "long oo",
  "/ə/": "uh",
  "/θ/": "th",
  "/ð/": "the",
  "/ʃ/": "sh",
  "/ʒ/": "zh",
  "/tʃ/": "ch",
  "/dʒ/": "j",
  "/ŋ/": "ng",
  "/r/": "rr",
};

const ZHUYIN_INITIALS: ZhuyinSound[] = [
  { symbol: "ㄅ", example: "八", reading: "ㄅㄚ" },
  { symbol: "ㄆ", example: "怕", reading: "ㄆㄚˋ" },
  { symbol: "ㄇ", example: "媽", reading: "ㄇㄚ" },
  { symbol: "ㄈ", example: "發", reading: "ㄈㄚ" },
  { symbol: "ㄉ", example: "大", reading: "ㄉㄚˋ" },
  { symbol: "ㄊ", example: "他", reading: "ㄊㄚ" },
  { symbol: "ㄋ", example: "你", reading: "ㄋㄧˇ" },
  { symbol: "ㄌ", example: "來", reading: "ㄌㄞˊ" },
  { symbol: "ㄍ", example: "高", reading: "ㄍㄠ" },
  { symbol: "ㄎ", example: "看", reading: "ㄎㄢˋ" },
  { symbol: "ㄏ", example: "好", reading: "ㄏㄠˇ" },
  { symbol: "ㄐ", example: "家", reading: "ㄐㄧㄚ" },
  { symbol: "ㄑ", example: "去", reading: "ㄑㄩˋ" },
  { symbol: "ㄒ", example: "小", reading: "ㄒㄧㄠˇ" },
  { symbol: "ㄓ", example: "中", reading: "ㄓㄨㄥ" },
  { symbol: "ㄔ", example: "吃", reading: "ㄔ" },
  { symbol: "ㄕ", example: "是", reading: "ㄕˋ" },
  { symbol: "ㄖ", example: "日", reading: "ㄖˋ" },
  { symbol: "ㄗ", example: "早", reading: "ㄗㄠˇ" },
  { symbol: "ㄘ", example: "菜", reading: "ㄘㄞˋ" },
  { symbol: "ㄙ", example: "三", reading: "ㄙㄢ" },
];

const ZHUYIN_FINALS: ZhuyinSound[] = [
  { symbol: "ㄚ", example: "啊", reading: "ㄚ" },
  { symbol: "ㄛ", example: "喔", reading: "ㄛ" },
  { symbol: "ㄜ", example: "餓", reading: "ㄜˋ" },
  { symbol: "ㄝ", example: "也", reading: "ㄧㄝˇ" },
  { symbol: "ㄞ", example: "愛", reading: "ㄞˋ" },
  { symbol: "ㄟ", example: "黑", reading: "ㄏㄟ" },
  { symbol: "ㄠ", example: "好", reading: "ㄏㄠˇ" },
  { symbol: "ㄡ", example: "口", reading: "ㄎㄡˇ" },
  { symbol: "ㄢ", example: "安", reading: "ㄢ" },
  { symbol: "ㄣ", example: "很", reading: "ㄏㄣˇ" },
  { symbol: "ㄤ", example: "忙", reading: "ㄇㄤˊ" },
  { symbol: "ㄥ", example: "冷", reading: "ㄌㄥˇ" },
  { symbol: "ㄦ", example: "二", reading: "ㄦˋ" },
  { symbol: "ㄧ", example: "一", reading: "ㄧ" },
  { symbol: "ㄨ", example: "五", reading: "ㄨˇ" },
  { symbol: "ㄩ", example: "雨", reading: "ㄩˇ" },
];

const TONES = [
  { symbol: "ˉ", label: "第一聲", example: "媽 ㄇㄚ" },
  { symbol: "ˊ", label: "第二聲", example: "麻 ㄇㄚˊ" },
  { symbol: "ˇ", label: "第三聲", example: "馬 ㄇㄚˇ" },
  { symbol: "ˋ", label: "第四聲", example: "罵 ㄇㄚˋ" },
  { symbol: "˙", label: "輕聲", example: "嗎 ㄇㄚ˙" },
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
            eyebrow: "繁體中文發音",
            title: "注音基礎",
            description:
              "從ㄅㄆㄇㄈ、韻母與聲調開始，建立正確的繁體中文發音基礎。",
          }
        : {
            eyebrow: "English pronunciation",
            title: "English Sounds",
            description:
              "Learn the most useful English IPA symbols through familiar everyday words.",
          },
    [learningChinese],
  );

  return (
    <main
      className="min-h-screen bg-[#f5f2eb] px-5 pt-6 text-black"
      style={{
        paddingBottom:
          "calc(9rem + env(safe-area-inset-bottom))",
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

          <p className="mt-5 max-w-md text-[16px] leading-7 text-black/55">
            {pageCopy.description}
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
    <div className="space-y-5">
      <LessonIntro
        number="01"
        title="Vowel sounds"
        description="English spelling can change, but the IPA symbol consistently represents the sound."
      />

      <SoundGrid>
        {ENGLISH_VOWELS.map((sound) => (
          <EnglishSoundCard key={sound.symbol} sound={sound} />
        ))}
      </SoundGrid>

      <LessonIntro
        number="02"
        title="Special consonants"
        description="These sounds are often difficult because their spelling does not clearly show the pronunciation."
      />

      <SoundGrid>
        {ENGLISH_CONSONANTS.map((sound) => (
          <EnglishSoundCard key={sound.symbol} sound={sound} />
        ))}
      </SoundGrid>

      <section className="rounded-[26px] bg-black p-6 text-white">
        <BookOpen size={22} strokeWidth={1.7} />

        <h2 className="mt-8 text-[25px] font-semibold tracking-[-0.035em]">
          How to practise
        </h2>

        <div className="mt-5 space-y-4 text-[14px] leading-6 text-white/70">
          <p>1. Listen once without repeating.</p>
          <p>2. Listen again and copy the mouth movement.</p>
          <p>3. Say the example word slowly, then naturally.</p>
          <p>4. Compare similar sounds such as /iː/ and /ɪ/.</p>
        </div>
      </section>
    </div>
  );
}

function EnglishSoundCard({
  sound,
}: {
  sound: EnglishSound;
}) {
  const isolatedSound =
    IPA_SOUND_TEXT[sound.symbol] || sound.example;

  return (
    <article className="flex min-h-[178px] flex-col justify-between rounded-[24px] border border-black/[0.06] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[28px] font-semibold tracking-[-0.04em]">
          {sound.symbol}
        </span>

        <button
          type="button"
          onClick={() => speak(isolatedSound, "en-US")}
          aria-label={`Play the ${sound.symbol} sound`}
          title="Play sound"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f2eb] transition-transform active:scale-95"
        >
          <Volume2 size={15} strokeWidth={1.8} />
        </button>
      </div>

      <div className="mt-6">
        <p className="text-[18px] font-semibold">
          {sound.example}
        </p>

        <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-black/35">
          {sound.cue}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => speak(isolatedSound, "en-US")}
          className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#f5f2eb] text-[10px] font-semibold uppercase tracking-[0.1em]"
        >
          <Volume2 size={13} strokeWidth={1.8} />
          Sound
        </button>

        <button
          type="button"
          onClick={() => speak(sound.example, "en-US")}
          className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-black text-[10px] font-semibold uppercase tracking-[0.1em] text-white"
        >
          <Volume2 size={13} strokeWidth={1.8} />
          Word
        </button>
      </div>
    </article>
  );
}

function ChinesePronunciationLesson() {
  return (
    <div className="space-y-5">
      <LessonIntro
        number="01"
        title="聲母"
        description="聲母通常位於一個音節的開頭，例如「媽」的ㄇ。"
      />

      <SoundGrid>
        {ZHUYIN_INITIALS.map((sound) => (
          <ZhuyinSoundCard key={sound.symbol} sound={sound} />
        ))}
      </SoundGrid>

      <LessonIntro
        number="02"
        title="韻母"
        description="韻母是音節的主要聲音，可以單獨出現，也可以接在聲母後面。"
      />

      <SoundGrid>
        {ZHUYIN_FINALS.map((sound) => (
          <ZhuyinSoundCard key={sound.symbol} sound={sound} />
        ))}
      </SoundGrid>

      <LessonIntro
        number="03"
        title="聲調"
        description="繁體中文的聲調會改變一個字的意思，練習時必須一起記住。"
      />

      <div className="space-y-2">
        {TONES.map((tone) => (
          <button
            key={tone.label}
            type="button"
            onClick={() =>
              speak(tone.example.split(" ")[0], "zh-TW")
            }
            className="flex w-full items-center gap-4 rounded-[22px] border border-black/[0.06] bg-white px-5 py-4 text-left transition-transform active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-[21px] text-white">
              {tone.symbol}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">
                {tone.label}
              </span>
              <span className="mt-1 block text-[13px] text-black/40">
                {tone.example}
              </span>
            </span>

            <Volume2
              size={16}
              strokeWidth={1.8}
              className="text-black/40"
            />
          </button>
        ))}
      </div>

      <section className="rounded-[26px] bg-black p-6 text-white">
        <BookOpen size={22} strokeWidth={1.7} />

        <h2 className="mt-8 text-[25px] font-semibold tracking-[-0.035em]">
          如何練習注音
        </h2>

        <div className="mt-5 space-y-4 text-[14px] leading-6 text-white/70">
          <p>1. 先認識聲母，再學習韻母。</p>
          <p>2. 將聲母與韻母慢慢拼合。</p>
          <p>3. 最後加入聲調，完整念出整個音節。</p>
          <p>4. 每次練習都搭配真正的中文字。</p>
        </div>
      </section>
    </div>
  );
}

function ZhuyinSoundCard({
  sound,
}: {
  sound: ZhuyinSound;
}) {
  return (
    <article className="flex min-h-[178px] flex-col justify-between rounded-[24px] border border-black/[0.06] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[34px] font-semibold leading-none">
          {sound.symbol}
        </span>

        <button
          type="button"
          onClick={() => speak(sound.reading, "zh-TW")}
          aria-label={`播放注音 ${sound.reading}`}
          title="播放注音"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f2eb] transition-transform active:scale-95"
        >
          <Volume2 size={15} strokeWidth={1.8} />
        </button>
      </div>

      <div className="mt-6">
        <p className="text-[20px] font-semibold">
          {sound.example}
        </p>

        <p className="mt-1 text-[13px] text-black/35">
          {sound.reading}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => speak(sound.reading, "zh-TW")}
          className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#f5f2eb] text-[11px] font-semibold"
        >
          <Volume2 size={13} strokeWidth={1.8} />
          注音
        </button>

        <button
          type="button"
          onClick={() => speak(sound.example, "zh-TW")}
          className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-black text-[11px] font-semibold text-white"
        >
          <Volume2 size={13} strokeWidth={1.8} />
          單字
        </button>
      </div>
    </article>
  );
}

function LessonIntro({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <section className="pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
        Lesson {number}
      </p>

      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[27px] font-semibold tracking-[-0.04em]">
            {title}
          </h2>
          <p className="mt-2 max-w-md text-[13px] leading-6 text-black/45">
            {description}
          </p>
        </div>

        <ChevronRight
          size={18}
          strokeWidth={1.7}
          className="mb-1 shrink-0 text-black/25"
        />
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
