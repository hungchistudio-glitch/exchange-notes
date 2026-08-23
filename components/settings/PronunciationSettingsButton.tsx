"use client";

import { Volume2 } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  LANGUAGE_CODES,
  getLanguage,
  getLanguageName,
  getLanguageBySpeechTag,
} from "@/lib/languages";
import {
  getDefaultSpeechSettings,
  getInitialVoicesVersion,
  getSpeechSettings,
  getVoicesVersion,
  hasVoiceForGender,
  listVoicesForLanguage,
  setSpeechSettings,
  speak,
  subscribeToSpeechSettings,
  subscribeToVoices,
  type SpeechLanguage,
  type VoiceGender,
} from "@/lib/speech";

const VOICE_OPTIONS: VoiceGender[] = ["female", "male"];

/*
 * Every language the app teaches, not the two it started with.
 *
 * This listed zh-TW and en-US, so a French or Italian learner had no voice
 * setting at all — playback fell to whatever the platform picked, which on a
 * device without those voices is an English one reading French, and sounds
 * exactly as wrong as it is. There was nothing anywhere to change it with.
 */
const SPOKEN_LANGUAGES = LANGUAGE_CODES.map(
  (code) => getLanguage(code).speechTag,
);

export default function PronunciationSettingsButton() {
  const [open, setOpen] = useState(false);

  /**
   * The saved settings are the source of truth, so the controls read them
   * directly rather than keeping a copy that had to be filled in on mount.
   * Writing through setSpeechSettings notifies this subscription, so the UI
   * follows the store instead of tracking it in parallel.
   */
  const { rate, voiceGender, voiceURIs } = useSyncExternalStore(
    subscribeToSpeechSettings,
    getSpeechSettings,
    getDefaultSpeechSettings,
  );

  // A number, not the voice array: useSyncExternalStore compares snapshots by
  // identity, and the browser hands back a new array each call.
  const voicesVersion = useSyncExternalStore(
    subscribeToVoices,
    getVoicesVersion,
    getInitialVoicesVersion,
  );

  const { learningLanguage } = useDisplayLanguages();

  /*
   * The language being learned comes first.
   *
   * Playback already follows it on its own — each card is spoken in its own
   * language and the best installed voice for that language is chosen
   * automatically. This is about the other half: when the automatic choice
   * is not the one you want, or when the language has no voice installed at
   * all, the row you need is the one at the top rather than the third one
   * down.
   */
  const spokenLanguages = useMemo(() => {
    const learningTag = getLanguage(learningLanguage).speechTag;

    return [
      learningTag,
      ...SPOKEN_LANGUAGES.filter((tag) => tag !== learningTag),
    ];
  }, [learningLanguage]);

  /**
   * Languages where the chosen gender simply does not exist on this device.
   *
   * Reported rather than silently substituted: iOS exposes its Mandarin
   * (Taiwan) male voices to native apps only, so asking for one in a web app
   * returns Meijia and the setting looks broken.
   */
  const genderGaps = useMemo(
    () =>
      spokenLanguages.filter(
        (language) =>
          listVoicesForLanguage(language).length > 0
          && !hasVoiceForGender(language, voiceGender),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spokenLanguages, voiceGender, voicesVersion],
  );

  const voicesByLanguage = useMemo(
    () =>
      Object.fromEntries(
        spokenLanguages.map((language) => [
          language,
          listVoicesForLanguage(language),
        ]),
      ) as Record<SpeechLanguage, SpeechSynthesisVoice[]>,
    // voicesVersion is the trigger: the browser loads voices asynchronously
    // and the list is empty on the first render of a cold page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voicesVersion],
  );

  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.settings.pronunciation;

  /** The language's own name, in the language the reader is reading. */
  const nameOf = (tag: SpeechLanguage) =>
    getLanguageName(getLanguageBySpeechTag(tag).code, interfaceLanguage);

  function handleRateChange(value: number) {
    setSpeechSettings({ rate: value, voiceGender, voiceURIs });
  }

  function handleGenderChange(value: VoiceGender) {
    setSpeechSettings({ rate, voiceGender: value, voiceURIs });
  }

  function handleVoiceChange(language: SpeechLanguage, voiceURI: string | null) {
    const nextURIs = { ...voiceURIs };

    if (voiceURI) nextURIs[language] = voiceURI;
    else delete nextURIs[language];

    setSpeechSettings({ rate, voiceGender, voiceURIs: nextURIs });
  }

  function preview(language: SpeechLanguage) {
    speak(getLanguageBySpeechTag(language).voiceSample, language);
  }

  const voiceLabel = voiceGender === "female" ? copy.female : copy.male;

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={`${voiceLabel} · ${rate.toFixed(2)}×`}
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
            onClick={() => preview(getLanguage(learningLanguage).speechTag)}
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

                <p className="mt-1 text-xs leading-5 text-ink-soft">
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

            <div className="mt-2 flex justify-between text-[10px] font-medium text-ink-faint">
              <span>{copy.slower}</span>
              <span>{copy.faster}</span>
            </div>

            {genderGaps.length > 0 && (
              <div className="mt-3 rounded-2xl border border-[var(--accent-amber)]/20 bg-[var(--accent-amber)]/[0.07] p-3">
                {genderGaps.map((language) => {
                  const fallback =
                    listVoicesForLanguage(language)[0]?.name ?? "";

                  return (
                    <p
                      key={language}
                      className="text-[12px] leading-5 text-[var(--accent-amber-deep)]"
                    >
                      {copy.genderUnavailable
                        .replace("{language}", nameOf(language))
                        .replace(
                          "{gender}",
                          voiceGender === "female" ? copy.female : copy.male,
                        )
                        .replace("{fallback}", fallback)}
                    </p>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-[15px] font-semibold text-black">
              {copy.voice}
            </h3>

            <p className="mt-1 text-xs leading-5 text-ink-soft">
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

          <section>
            <h3 className="text-[15px] font-semibold text-black">
              {copy.voicesOnDevice}
            </h3>

            <p className="mt-1 text-xs leading-5 text-ink-soft">
              {copy.voicesOnDeviceDescription}
            </p>

            {spokenLanguages.map((language) => {
              const voices = voicesByLanguage[language];
              const chosen = voiceURIs[language];

              return (
                <div key={language} className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    {nameOf(language)}
                  </p>

                  {voices.length === 0 ? (
                    <p className="mt-2 text-xs leading-5 text-ink-faint">
                      {copy.noVoicesInstalled}
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-1.5">
                      <button
                        type="button"
                        aria-pressed={!chosen}
                        onClick={() => handleVoiceChange(language, null)}
                        className={[
                          "flex min-h-11 items-center justify-between rounded-2xl px-4 text-sm transition-all active:scale-[0.99]",
                          !chosen
                            ? "bg-blue-600 font-semibold text-white"
                            : "border border-black/[0.08] bg-white text-black",
                        ].join(" ")}
                      >
                        <span>{copy.voiceAutomatic}</span>
                      </button>

                      {voices.map((voice) => {
                        const selected = chosen === voice.voiceURI;

                        return (
                          <button
                            key={voice.voiceURI}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                              handleVoiceChange(language, voice.voiceURI);
                              // Selecting is also the preview: the point of
                              // the list is hearing which voice you picked,
                              // reading this language rather than English.
                              preview(language);
                            }}
                            className={[
                              "flex min-h-11 items-center justify-between gap-3 rounded-2xl px-4 text-sm transition-all active:scale-[0.99]",
                              selected
                                ? "bg-blue-600 font-semibold text-white"
                                : "border border-black/[0.08] bg-white text-black",
                            ].join(" ")}
                          >
                            <span className="min-w-0 truncate">{voice.name}</span>
                            <span
                              className={[
                                "shrink-0 font-mono text-[10px]",
                                selected ? "text-white" : "text-ink-faint",
                              ].join(" ")}
                            >
                              {voice.lang}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      </BottomSheet>
    </>
  );
}
