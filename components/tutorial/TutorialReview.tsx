"use client";

import { useState } from "react";

import TutorialOverlay from "@/components/tutorial/TutorialOverlay";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import {
  setInterfaceLanguage,
  type InterfaceLanguage,
} from "@/lib/appPreferences";

/*
 * The harness behind /tutorial-review.
 *
 * Two controls and nothing else: which language the tour speaks, and how wide
 * the frame it has to fit in. The width is the one that matters — 320px is the
 * narrowest phone the app supports, and every overflow this screen exists to
 * catch appears there first and nowhere else.
 */
const LANGUAGES: ReadonlyArray<{ value: InterfaceLanguage; label: string }> = [
  { value: "english", label: "English" },
  { value: "traditional-chinese", label: "繁體中文" },
  { value: "spanish", label: "Español" },
  { value: "french", label: "Français" },
  { value: "italian", label: "Italiano" },
];

const WIDTHS = [320, 375, 430, 768] as const;

/*
 * 568 is an iPhone SE (1st gen) in portrait minus browser chrome, and it is the
 * measurement that matters most: the tour is one tall column of copy, so the
 * frame it has to survive is the short one, not the narrow one.
 */
const HEIGHTS = [568, 667, 780] as const;

export default function TutorialReview() {
  const language = useInterfaceLanguage();
  const [width, setWidth] = useState<number>(375);
  const [height, setHeight] = useState<number>(667);
  const [open, setOpen] = useState(true);
  const [nonce, setNonce] = useState(0);

  return (
    <LearningLanguageProvider
      initialLearningLanguage="en"
      initialNativeLanguage="zh-TW"
    >
      <main className="min-h-dvh bg-neutral-100 p-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {LANGUAGES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setInterfaceLanguage(option.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  option.value === language
                    ? "border-black bg-black text-white"
                    : "border-black/15 bg-white text-black"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {WIDTHS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setWidth(value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  value === width
                    ? "border-black bg-black text-white"
                    : "border-black/15 bg-white text-black"
                }`}
              >
                {value}px
              </button>
            ))}

            {HEIGHTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setHeight(value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  value === height
                    ? "border-black bg-black text-white"
                    : "border-black/15 bg-white text-black"
                }`}
              >
                h{value}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setNonce((current) => current + 1);
                setOpen(true);
              }}
              className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              Restart
            </button>
          </div>

          {/*
           * A real element with a real width, not a scaled screenshot: the
           * overlay is `fixed`, so it is `contain: layout` that makes this box
           * its containing block and lets it be measured at 320px on a desktop
           * display. Nothing about the overlay knows it is in here.
           */}
          <div
            className="relative overflow-hidden rounded-[28px] border border-black/10 bg-surface shadow-xl"
            style={{
              width,
              height,
              contain: "layout paint size",
            }}
          >
            {open && (
              <TutorialOverlay key={nonce} onClose={() => setOpen(false)} />
            )}
          </div>
        </div>
      </main>
    </LearningLanguageProvider>
  );
}
