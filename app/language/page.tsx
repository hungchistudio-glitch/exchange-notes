"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import {
  setInterfaceLanguage,
  type InterfaceLanguage,
} from "@/lib/appPreferences";

const OPTIONS: Array<{
  value: InterfaceLanguage;
  title: string;
  description: string;
}> = [
  {
    value: "english",
    title: "English",
    description: "Use Exchange Notes in English",
  },
  {
    value: "traditional-chinese",
    title: "繁體中文",
    description: "以繁體中文使用 Exchange Notes",
  },
];

export default function LanguagePage() {
  const router = useRouter();

  const [selectedLanguage, setSelectedLanguage] =
    useState<InterfaceLanguage | null>(null);

  function handleContinue() {
    if (!selectedLanguage) return;

    setInterfaceLanguage(selectedLanguage);
    router.replace("/login");
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f1ea] px-5 py-8 text-black">
      <section className="w-full max-w-md rounded-[32px] bg-white p-7 shadow-sm sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-black text-xl font-bold text-white">
          E
        </div>

        <p className="mt-8 text-sm font-semibold text-neutral-500">
          Exchange Notes
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Choose your language
        </h1>

        <p className="mt-3 leading-7 text-neutral-500">
          選擇你的介面語言
        </p>

        <div className="mt-8 space-y-3">
          {OPTIONS.map((option) => {
            const selected =
              selectedLanguage === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setSelectedLanguage(option.value)
                }
                aria-pressed={selected}
                className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
                  selected
                    ? "border-black bg-black text-white"
                    : "border-black/[0.09] bg-[#faf9f6] hover:border-black/30"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">
                    {option.title}
                  </span>

                  <span
                    className={`mt-1 block text-sm ${
                      selected
                        ? "text-white/65"
                        : "text-neutral-500"
                    }`}
                  >
                    {option.description}
                  </span>
                </span>

                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-white bg-white text-black"
                      : "border-black/15 text-transparent"
                  }`}
                >
                  <Check size={14} strokeWidth={2.5} />
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selectedLanguage}
          onClick={handleContinue}
          className="mt-7 flex h-13 w-full items-center justify-center rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30"
        >
          Continue
        </button>
      </section>
    </main>
  );
}
