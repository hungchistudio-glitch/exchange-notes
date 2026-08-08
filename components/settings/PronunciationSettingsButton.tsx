"use client";

import { Volume2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  getDefaultSpeechSettings,
  getSpeechSettings,
  setSpeechSettings,
  speak,
  subscribeToSpeechSettings,
  type VoiceGender,
} from "@/lib/speech";

const VOICE_OPTIONS: VoiceGender[] = ["female", "male"];

export default function PronunciationSettingsButton() {
  const [open, setOpen] = useState(false);

  /**
   * The saved settings are the source of truth, so the controls read them
   * directly rather than keeping a copy that had to be filled in on mount.
   * Writing through setSpeechSettings notifies this subscription, so the UI
   * follows the store instead of tracking it in parallel.
   */
  const { rate, voiceGender } = useSyncExternalStore(
    subscribeToSpeechSettings,
    getSpeechSettings,
    getDefaultSpeechSettings,
  );

  const { t, isTraditionalChinese } = useTranslation();
  const copy = t.settings.pronunciation;

  function handleRateChange(value: number) {
    setSpeechSettings({ rate: value, voiceGender });
  }

  function handleGenderChange(value: VoiceGender) {
    setSpeechSettings({ rate, voiceGender: value });
  }

  function handleTest() {
    const text = isTraditionalChinese
      ? "你好，歡迎使用 Exchange Notes。"
      : "Hello, welcome to Exchange Notes.";

    speak(text, isTraditionalChinese ? "zh-TW" : "en-US");
  }

  const voiceLabel = voiceGender === "female" ? copy.female : copy.male;

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={`${voiceLabel} · ${rate.toFixed(2)}×`}
        tone="blue"
        icon={<Volume2 size={17} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      />

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.sheetTitle}
        description={copy.sheetDescription}
        footer={
          <button
            type="button"
            onClick={handleTest}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition-transform active:scale-[0.985]"
          >
            {copy.testVoice}
          </button>
        }
      >
        <div className="space-y-7">
          <section>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[15px] font-semibold text-black">
                  {copy.readingSpeed}
                </h3>

                <p className="mt-1 text-xs leading-5 text-black/45">
                  {copy.readingSpeedDescription}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {rate.toFixed(2)}×
              </span>
            </div>

            <input
              type="range"
              min={0.5}
              max={1.1}
              step={0.05}
              value={rate}
              aria-label={copy.readingSpeedAriaLabel}
              onChange={(event) => handleRateChange(Number(event.target.value))}
              className="mt-5 w-full accent-blue-600"
            />

            <div className="mt-2 flex justify-between text-[10px] font-medium text-black/30">
              <span>{copy.slower}</span>
              <span>{copy.faster}</span>
            </div>
          </section>

          <section>
            <h3 className="text-[15px] font-semibold text-black">
              {copy.voice}
            </h3>

            <p className="mt-1 text-xs leading-5 text-black/45">
              {copy.voiceDescription}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {VOICE_OPTIONS.map((gender) => {
                const selected = voiceGender === gender;
                const label = gender === "female" ? copy.female : copy.male;

                return (
                  <button
                    key={gender}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleGenderChange(gender)}
                    className={[
                      "flex min-h-12 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition-all active:scale-[0.98]",
                      selected
                        ? "bg-blue-600 text-white"
                        : "border border-black/[0.08] bg-white text-black",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </BottomSheet>
    </>
  );
}
