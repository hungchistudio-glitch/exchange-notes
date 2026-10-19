"use client";

import { AlertCircle, ArrowLeftRight, LoaderCircle, RotateCcw, Volume2 } from "lucide-react";
import { useSyncExternalStore } from "react";

import useHelloSpeech, { type SpeakerPhase } from "@/hooks/hello/useHelloSpeech";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import {
  choicesFor,
  isOriginal,
  type ViewerPairAction,
  type ViewerPairState,
} from "@/lib/hello/pairs";
import type { HelloSense, HelloSide } from "@/lib/hello/types";
import { getLanguage, getLanguageName, type LanguageCode } from "@/lib/languages";
import {
  getDefaultSpeechSettings,
  getInitialVoicesVersion,
  getSpeechSettings,
  getVoicesVersion,
  listClearVoicesForLanguage,
  setSpeechSettings,
  subscribeToSpeechSettings,
  subscribeToVoices,
} from "@/lib/speech";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";

import styles from "./Hello.module.css";

/* =========================================================
   One word, in two languages

   The visitor's pair, never the sharer's saved one and never their own
   interface language: buttons are in the interface language, the card is
   in whatever two languages are chosen above it, and changing one never
   changes the other (lib/hello/pairs.ts).

   Each side reads the same way, in the same order — the language, the
   word, how it is written phonetically, and a speaker — and a side that
   has not been made yet says so where it would have been, rather than
   showing the other language's word in its place.
   ========================================================= */

type HelloCardProps = {
  sense: HelloSense;
  pair: ViewerPairState;
  onPair: (action: ViewerPairAction) => void;
  /** Ask for a language that is missing, where the screen allows it. */
  onRetryMissing?: (language: LanguageCode) => void;
  /** Languages being asked for right now. */
  retrying?: ReadonlySet<LanguageCode>;
  /** Replaces "not ready yet" where a missing side is expected, as in the editor's preview. */
  missingNote?: string;
};

export default function HelloCard({ sense, pair, onPair, onRetryMissing, retrying, missingNote }: HelloCardProps) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.hello;
  const speech = useHelloSpeech();
  const nameOf = (code: LanguageCode) => getLanguageName(code, interfaceLanguage);

  /* Every change to what is shown is a different sound: stop first. */
  const change = (action: ViewerPairAction) => {
    speech.stop();
    onPair(action);
  };

  const [a, b] = pair.current;

  return (
    <section className={styles.card} aria-label={`${nameOf(a)} · ${nameOf(b)}`}>
      <div className={styles.pickers}>
        <LanguagePicker
          label={copy.languageA}
          value={a}
          choices={choicesFor(pair.current, 0)}
          nameOf={nameOf}
          onChange={(language) => change({ type: "set", slot: 0, language })}
        />
        <button
          type="button"
          className={styles.swap}
          onClick={() => change({ type: "swap" })}
          aria-label={copy.swap}
          title={copy.swap}
        >
          <ArrowLeftRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <LanguagePicker
          label={copy.languageB}
          value={b}
          choices={choicesFor(pair.current, 1)}
          nameOf={nameOf}
          onChange={(language) => change({ type: "set", slot: 1, language })}
        />
      </div>

      {!isOriginal(pair) ? (
        <button type="button" className={styles.restore} onClick={() => change({ type: "restore" })}>
          <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
          {copy.restore}
        </button>
      ) : null}

      <div className={styles.sides}>
        {([0, 1] as const).map((slot) => {
          const language = pair.current[slot];
          const side = sense[language];
          return (
            <SideView
              key={`${slot}-${language}`}
              language={language}
              languageName={nameOf(language)}
              side={side}
              phase={speech.phaseFor(slot)}
              canSpeak={speech.supported}
              onSpeak={() => side && speech.play(slot, side.text, language)}
              onRetry={onRetryMissing ? () => onRetryMissing(language) : undefined}
              retrying={retrying?.has(language) ?? false}
              missingNote={missingNote}
            />
          );
        })}
      </div>

      <VoiceMenu languages={pair.current} nameOf={nameOf} />
    </section>
  );
}

export function LanguagePicker({
  label,
  value,
  choices,
  nameOf,
  onChange,
  placeholder,
}: {
  label: string;
  value: LanguageCode | null;
  choices: Array<{ language: LanguageCode; disabled: boolean }>;
  nameOf: (code: LanguageCode) => string;
  onChange: (language: LanguageCode) => void;
  /** Shown while nothing is chosen: a slot left for the reader to fill. */
  placeholder?: string;
}) {
  return (
    <label className={styles.picker}>
      <span className={styles.pickerLabel}>{label}</span>
      {/* A full name, never only a flag: a flag is not a language. */}
      <select
        className={styles.select}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value as LanguageCode)}
      >
        {value === null ? (
          <option value="" disabled>
            {placeholder ?? "—"}
          </option>
        ) : null}
        {choices.map((choice) => (
          <option key={choice.language} value={choice.language} disabled={choice.disabled}>
            {nameOf(choice.language)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SideView({
  language,
  languageName,
  side,
  phase,
  canSpeak,
  onSpeak,
  onRetry,
  retrying,
  missingNote,
}: {
  language: LanguageCode;
  languageName: string;
  side: HelloSide | undefined;
  phase: SpeakerPhase;
  canSpeak: boolean;
  onSpeak: () => void;
  onRetry?: () => void;
  retrying: boolean;
  missingNote?: string;
}) {
  const { t } = useTranslation();
  const copy = t.hello;
  const meta = getLanguage(language);

  if (!side?.text?.trim()) {
    return (
      <article className={styles.side} lang={meta.htmlLang} data-missing="">
        <p className={styles.sideLanguage}>{languageName}</p>
        <p className={styles.missing} role="status">
          {missingNote ?? fill(copy.missing, { language: languageName })}
        </p>
        {onRetry ? (
          <button type="button" className={styles.retry} onClick={onRetry} disabled={retrying}>
            {retrying ? copy.retrying : copy.retry}
          </button>
        ) : null}
      </article>
    );
  }

  const partOfSpeech = side.partOfSpeech
    ? t.vocabulary.detail.partOfSpeech[normalizePartOfSpeech(side.partOfSpeech)]
    : null;
  const readings = [side.phonetic?.zhuyin, side.phonetic?.pinyin, side.phonetic?.ipa].filter(Boolean);

  return (
    <article className={styles.side} lang={meta.htmlLang}>
      <p className={styles.sideLanguage}>{languageName}</p>
      <p className={styles.word} style={{ fontFamily: `var(${meta.fontVariable})` }}>
        {side.text}
      </p>
      {partOfSpeech ? <p className={styles.partOfSpeech}>{partOfSpeech}</p> : null}
      {readings.length ? (
        <p className={styles.readings}>
          {readings.map((reading) => (
            <span key={reading} className={reading === side.phonetic?.zhuyin ? "font-zhuyin" : "font-phonetic"}>
              {reading}
            </span>
          ))}
        </p>
      ) : null}
      <button
        type="button"
        className={styles.speaker}
        onClick={onSpeak}
        disabled={!canSpeak}
        aria-label={fill(copy.play, { language: languageName })}
        data-phase={phase}
      >
        {phase === "loading" ? (
          <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
        ) : phase === "error" ? (
          <AlertCircle size={20} aria-hidden="true" />
        ) : (
          <Volume2 size={20} aria-hidden="true" />
        )}
      </button>
      {phase === "error" ? (
        <p className={styles.speakerError} role="status">
          {copy.playFailed}
        </p>
      ) : null}
    </article>
  );
}

const noop = () => () => {};

/**
 * The voices, for the two languages on the card — only the ones this
 * device actually has, and only for a language with more than one, so
 * there is never a choice that cannot be heard.
 */
function VoiceMenu({
  languages,
  nameOf,
}: {
  languages: readonly LanguageCode[];
  nameOf: (code: LanguageCode) => string;
}) {
  const { t } = useTranslation();
  const copy = t.hello;
  useSyncExternalStore(subscribeToVoices, getVoicesVersion, getInitialVoicesVersion);
  const settings = useSyncExternalStore(subscribeToSpeechSettings, getSpeechSettings, getDefaultSpeechSettings);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  if (!hydrated) return null;

  const rows = languages.flatMap((language) => {
    const tag = getLanguage(language).speechTag;
    const voices = listClearVoicesForLanguage(tag);
    return voices.length > 1 ? [{ language, tag, voices }] : [];
  });
  if (!rows.length) return null;

  return (
    <details className={styles.voices}>
      <summary>{copy.voiceMenu}</summary>
      {rows.map(({ language, tag, voices }) => (
        <label key={language} className={styles.voiceRow}>
          <span>{fill(copy.voiceFor, { language: nameOf(language) })}</span>
          <select
            className={styles.select}
            value={settings.voiceURIs[tag] ?? voices[0].voiceURI}
            onChange={(event) =>
              setSpeechSettings({
                ...getSpeechSettings(),
                voiceURIs: { ...getSpeechSettings().voiceURIs, [tag]: event.target.value },
              })
            }
          >
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>
      ))}
    </details>
  );
}
