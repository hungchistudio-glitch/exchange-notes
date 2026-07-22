"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  BottomSheet,
  SettingsRow,
} from "@/components/foundation";
import {
  getSettingsCopy,
  getVoiceLabel,
} from "@/components/settings/settingsCopy";
import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import {
  getSpeechSettings,
  setSpeechSettings,
  speak,
  type VoiceGender,
} from "@/lib/speech";

type SpeechSettingsButtonProps = {
  variant?: "icon" | "row";
};

const VOICE_OPTIONS: VoiceGender[] = [
  "female",
  "male",
];

export default function SpeechSettingsButton({
  variant = "icon",
}: SpeechSettingsButtonProps) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(0.75);
  const [voiceGender, setVoiceGender] =
    useState<VoiceGender>("female");

  const language = useInterfaceLanguage();
  const copy = getSettingsCopy(language);

  useEffect(() => {
    const settings = getSpeechSettings();

    setRate(settings.rate);
    setVoiceGender(settings.voiceGender);
  }, []);

  function persist(
    nextRate: number,
    nextGender: VoiceGender,
  ) {
    setSpeechSettings({
      rate: nextRate,
      voiceGender: nextGender,
    });
  }

  function handleRateChange(value: number) {
    setRate(value);
    persist(value, voiceGender);
  }

  function handleGenderChange(
    value: VoiceGender,
  ) {
    setVoiceGender(value);
    persist(rate, value);
  }

  function handleTest() {
    const text =
      language === "traditional-chinese"
        ? "你好，歡迎使用 Exchange Notes。"
        : "Hello, welcome to Exchange Notes.";

    const locale =
      language === "traditional-chinese"
        ? "zh-TW"
        : "en-US";

    speak(text, locale);
  }

  const displayedVoice =
    getVoiceLabel(voiceGender, language);

  return (
    <>
      {variant === "row" ? (
        <SettingsRow
          title={copy.pronunciation.rowTitle}
          description={
            copy.pronunciation.rowDescription
          }
          value={`${displayedVoice}，${rate.toFixed(2)}×`}
          icon={
            <Volume2
              size={17}
              strokeWidth={1.8}
            />
          }
          onClick={() => setOpen(true)}
        />
      ) : (
        <button
          type="button"
          aria-label={
            copy.pronunciation.settingsAriaLabel
          }
          title={
            copy.pronunciation.settingsAriaLabel
          }
          onClick={() => setOpen(true)}
          className={[
            "flex h-9 w-9 items-center",
            "justify-center rounded-full",
            "text-black/55 transition-all",
            "hover:bg-black/[0.045]",
            "active:scale-95",
          ].join(" ")}
        >
          <Volume2
            size={17}
            strokeWidth={1.8}
          />
        </button>
      )}

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.pronunciation.sheetTitle}
        description={
          copy.pronunciation.sheetDescription
        }
        footer={
          <button
            type="button"
            onClick={handleTest}
            className={[
              "flex min-h-12 w-full items-center",
              "justify-center rounded-full bg-black",
              "px-5 text-sm font-semibold text-white",
              "transition-transform",
              "active:scale-[0.985]",
            ].join(" ")}
          >
            {copy.pronunciation.testVoice}
          </button>
        }
      >
        <div className="space-y-7">
          <section>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[15px] font-semibold text-black">
                  {
                    copy.pronunciation
                      .readingSpeed
                  }
                </h3>

                <p className="mt-1 text-xs leading-5 text-black/45">
                  {
                    copy.pronunciation
                      .readingSpeedDescription
                  }
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-black/[0.05] px-3 py-1.5 text-xs font-semibold text-black/55">
                {rate.toFixed(2)}×
              </span>
            </div>

            <input
              type="range"
              min={0.5}
              max={1.1}
              step={0.05}
              value={rate}
              aria-label={
                copy.pronunciation
                  .readingSpeedAriaLabel
              }
              onChange={(event) =>
                handleRateChange(
                  Number(event.target.value),
                )
              }
              className="mt-5 w-full accent-black"
            />

            <div className="mt-2 flex justify-between text-[10px] font-medium text-black/30">
              <span>
                {copy.pronunciation.slower}
              </span>

              <span>
                {copy.pronunciation.faster}
              </span>
            </div>
          </section>

          <section>
            <h3 className="text-[15px] font-semibold text-black">
              {copy.pronunciation.voice}
            </h3>

            <p className="mt-1 text-xs leading-5 text-black/45">
              {
                copy.pronunciation
                  .voiceDescription
              }
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {VOICE_OPTIONS.map((gender) => {
                const selected =
                  voiceGender === gender;

                return (
                  <button
                    key={gender}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      handleGenderChange(gender)
                    }
                    className={[
                      "flex min-h-12 items-center",
                      "justify-center rounded-2xl",
                      "px-4 text-sm font-semibold",
                      "transition-all active:scale-[0.98]",
                      selected
                        ? "bg-black text-white"
                        : [
                            "border border-black/[0.08]",
                            "bg-black/[0.035]",
                            "text-black",
                          ].join(" "),
                    ].join(" ")}
                  >
                    {getVoiceLabel(
                      gender,
                      language,
                    )}
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
