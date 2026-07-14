"use client";

import { Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getSpeechSettings,
  setSpeechSettings,
  speak,
  type VoiceGender,
} from "@/lib/speech";

export default function SpeechSettingsButton() {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(0.75);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>("female");

  useEffect(() => {
    const settings = getSpeechSettings();
    setRate(settings.rate);
    setVoiceGender(settings.voiceGender);
  }, []);

  function persist(nextRate: number, nextGender: VoiceGender) {
    setSpeechSettings({ rate: nextRate, voiceGender: nextGender });
  }

  function handleRateChange(value: number) {
    setRate(value);
    persist(value, voiceGender);
  }

  function handleGenderChange(value: VoiceGender) {
    setVoiceGender(value);
    persist(rate, value);
  }

  function handleTest() {
    speak("Hello, 你好", "en-US");
  }

  return (
    <>
      <button
        type="button"
        aria-label="Speech settings"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-black"
      >
        <Volume2 size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-[28px] bg-white p-6 sm:rounded-[28px]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Pronunciation</h2>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded-full p-1"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <span className="font-black">Speed</span>
                <span className="text-sm text-neutral-500">
                  {rate.toFixed(2)}x
                </span>
              </div>

              <input
                type="range"
                min={0.5}
                max={1.1}
                step={0.05}
                value={rate}
                onChange={(event) =>
                  handleRateChange(Number(event.target.value))
                }
                className="mt-3 w-full accent-black"
              />
            </div>

            <div className="mt-6">
              <span className="font-black">Voice</span>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["female", "male"] as const).map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => handleGenderChange(gender)}
                    className={`rounded-[16px] px-4 py-3 text-sm font-black capitalize ${
                      voiceGender === gender
                        ? "bg-black text-white"
                        : "bg-[#f1eee7] text-black"
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTest}
              className="mt-6 w-full rounded-[20px] border border-black px-5 py-4 font-black"
            >
              Test Voice
            </button>
          </div>
        </div>
      )}
    </>
  );
}
