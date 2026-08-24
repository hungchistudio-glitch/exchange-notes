"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ImageIcon, Keyboard, Mic, Radar } from "lucide-react";

import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import LexiconResults from "@/components/lexicon/LexiconResults";
import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import { useVocabulary } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useLexiconSave from "@/hooks/lexicon/useLexiconSave";
import useLexiconSearch from "@/hooks/lexicon/useLexiconSearch";
import useLexiconShare from "@/hooks/lexicon/useLexiconShare";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";
import useVoiceInput from "@/hooks/useVoiceInput";
import {
  getLanguage,
  getLanguageName,
  isUnreadableScript,
} from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";
import { insertValues } from "@/lib/utils";

import styles from "./OmniLexiconConsole.module.css";

/** What the console is doing, which is also what Yumi reacts to. */
export type OmniLexiconState = "idle" | "typing" | "listening" | "scanning";

type OmniLexiconConsoleProps = {
  /** Lets the Command Deck turn Yumi towards whatever the console is doing. */
  onStateChange?: (state: OmniLexiconState) => void;
};

// Placed by hand rather than generated — see the .mote note in the stylesheet.
const MOTES: Array<[left: string, top: string, delay: string]> = [
  ["12%", "28%", "0s"],
  ["34%", "72%", "1.6s"],
  ["58%", "22%", "3.1s"],
  ["76%", "64%", "0.8s"],
  ["90%", "36%", "2.4s"],
  ["22%", "52%", "4.2s"],
];

const WAVE_BARS = 12;

/**
 * Yumi OmniLexicon — one console for every way of asking "what is this?".
 *
 * ── What this file is, and is not ──────────────────────────────────────
 *
 * It is the deck's chrome: the brackets, the sweep, the waveform, the field
 * and the four mode keys. That is the whole of its job.
 *
 * Everything underneath — the language detection, the reader's own words,
 * the dictionary, the duplicate check, the save — is
 * hooks/lexicon/useLexiconSearch, the same engine the warm Universal Search
 * sheet runs on, and the answer is drawn by the same LexiconResults with the
 * deck's tone. This used to be five hundred lines of its own result
 * rendering and its own save path, which is exactly how "the same word gives
 * a different answer in Cosmic Mode" becomes possible. It is not possible
 * now: there is one computation and two skins.
 *
 * Camera and image still hand off to /capture, which already owns
 * recognition. What it reads comes back through the search sheet, so a word
 * photographed on the deck lands in the same result model as a word typed
 * into it.
 */
export default function OmniLexiconConsole({
  onStateChange,
}: OmniLexiconConsoleProps) {
  const router = useRouter();
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.cosmic.omni;
  const { pair: languagePair } = useDisplayLanguages();

  const { items, addItem } = useVocabulary();

  const search = useLexiconSearch({ items });
  const save = useLexiconSave({
    result: search.result,
    items,
    onSaved: addItem,
  });
  const share = useLexiconShare(
    search.result?.entry ?? null,
    search.result?.languages ?? null,
  );
  const friendPicker = useVocabularyFriendPicker();

  const formRef = useRef<HTMLFormElement>(null);

  /*
   * The recording, when the browser heard nothing it could use.
   *
   * The browser has to be told a language before it listens and returns
   * whatever its expected words sound closest to — right for dictating the
   * language being studied, useless for holding the phone up to someone
   * speaking something else. The model is told nothing and can hear any of
   * them, so it gets the second turn rather than the first.
   */
  const handleAudio = useCallback(
    async (audio: Blob) => {
      const body = new FormData();
      body.append("audio", audio, "speech.webm");

      try {
        const response = await fetch("/api/voice-lookup", {
          method: "POST",
          body,
        });

        if (!response.ok) return;

        const heard = (await response.json()) as {
          heard?: boolean;
          text?: string;
        };

        // An unconfident answer comes back as heard: false, and nothing is
        // put in the field. A word invented from silence would be looked
        // up, saved and studied, and it would be nobody's word.
        if (heard.heard && heard.text) search.submit(heard.text, "voice");
      } catch {
        // No connection. The engine's offline path answers here.
      }
    },
    [search],
  );

  const { supported: voiceSupported, listening, toggle: toggleVoice } =
    useVoiceInput({
      // The browser listens in the language being learned, which is the one
      // the reader most often cannot spell. Anything else it mishears goes
      // to the model, which was told nothing.
      lang: getLanguage(languagePair[0]).speechTag,
      onResult: (transcript) => search.submit(transcript, "voice"),
      onAudio: handleAudio,
    });

  const state: OmniLexiconState = listening
    ? "listening"
    : search.status === "searching"
      ? "scanning"
      : search.query.length > 0
        ? "typing"
        : "idle";

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    search.submit();
  }

  /*
   * The placeholder follows the learning language, because the question a
   * learner arrives with is different in each direction: one is "I saw
   * something written I cannot read", the other is "I heard something I
   * cannot spell". It is chosen once per render from a stable input, never
   * rotated on a timer.
   */
  const learningLanguage = languagePair[0];

  const placeholder = insertValues(
    isUnreadableScript(learningLanguage)
      ? copy.placeholderUnreadable
      : copy.placeholderHeard,
    { language: getLanguageName(learningLanguage, interfaceLanguage) },
  );

  function openSavedWord(item: VocabularyItem) {
    router.push(
      `/vocabulary?widgetAction=open-word&widgetWordId=${encodeURIComponent(
        item.id,
      )}&widgetNonce=${Date.now()}`,
    );
  }

  function sendToFriend() {
    const entry = search.result?.entry;
    const languages = search.result?.languages;

    if (!entry || !languages) return;

    friendPicker.shareCard({
      word: entry.term,
      translation: entry.translation,
      partOfSpeech: entry.partOfSpeech,
      wordLanguage: languages.sourceLanguage,
      translationLanguage: languages.glossLanguage,
      texts: {
        [languages.sourceLanguage]: entry.term,
        [languages.glossLanguage]: entry.translation,
      },
      examples: {
        [languages.sourceLanguage]: entry.termExample,
        [languages.glossLanguage]: entry.translationExample,
      },
    });
  }

  const hasAnswer =
    search.status !== "idle" || search.savedMatches.length > 0;

  return (
    <section
      className={styles.console}
      data-state={state}
      aria-label={copy.label}
    >
      <span className={`${styles.bracket} ${styles.bracketTopLeft}`} aria-hidden="true" />
      <span className={`${styles.bracket} ${styles.bracketTopRight}`} aria-hidden="true" />
      <span className={`${styles.bracket} ${styles.bracketBottomLeft}`} aria-hidden="true" />
      <span className={`${styles.bracket} ${styles.bracketBottomRight}`} aria-hidden="true" />

      <span className={styles.beam} aria-hidden="true" />

      {MOTES.map(([left, top, delay]) => (
        <span
          key={`${left}-${top}`}
          className={styles.mote}
          style={{ left, top, animationDelay: delay }}
          aria-hidden="true"
        />
      ))}

      <div className={styles.head}>
        <p className="hud-label">{copy.label}</p>

        {(state === "listening" || state === "scanning") && (
          <p className="hud-label" role="status">
            {state === "listening" ? copy.listening : copy.scanning}
          </p>
        )}
      </div>

      {listening ? (
        /*
         * While listening the field gives way to the waveform. The input is
         * not merely disabled behind it — a keyboard and a microphone
         * competing for the same line is what makes voice search feel bolted
         * on, so the console commits to one sense at a time.
         */
        <div className={styles.waveform} aria-hidden="true">
          {Array.from({ length: WAVE_BARS }, (_, index) => (
            <span
              key={index}
              className={styles.waveBar}
              style={{ "--bar-delay": `${index * 78}ms` } as CSSProperties}
            />
          ))}
        </div>
      ) : (
        <form ref={formRef} className={styles.field} onSubmit={handleSubmit}>
          <Radar
            size={17}
            strokeWidth={1.8}
            className="shrink-0 text-[var(--cosmic-cyan)]"
            aria-hidden="true"
          />

          <input
            type="text"
            value={search.query}
            onChange={(event) => search.setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label={copy.placeholder}
            enterKeyHint="search"
            autoComplete="off"
            className={styles.input}
          />

          {/* Sitting before the submit button keeps the destructive one away
              from the thumb's path to Identify. */}
          {search.query && (
            <ClearFieldButton onClear={search.reset} label={copy.clear} />
          )}

          <button
            type="submit"
            disabled={!search.query.trim() || search.status === "searching"}
            aria-label={copy.submit}
            className={styles.submit}
          >
            <Radar size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </form>
      )}

      <div className={styles.modes} role="toolbar" aria-label={copy.label}>
        {/* Text is the mode you are already in; it focuses the field rather
            than navigating, so the toolbar reads as four peers. */}
        <button
          type="button"
          className={styles.mode}
          data-active={!listening}
          onClick={() => formRef.current?.querySelector("input")?.focus()}
        >
          <Keyboard size={17} strokeWidth={1.7} aria-hidden="true" />
          <span className={styles.modeLabel}>{copy.inputText}</span>
        </button>

        {voiceSupported && (
          <button
            type="button"
            className={styles.mode}
            data-active={listening}
            aria-pressed={listening}
            onClick={toggleVoice}
          >
            <Mic size={17} strokeWidth={1.7} aria-hidden="true" />
            <span className={styles.modeLabel}>{copy.inputVoice}</span>
          </button>
        )}

        {/*
          Camera and image go to the capture flow that already owns
          recognition, rather than a second pipeline living here. What it
          reads returns through the lexicon hand-off, so a photographed word
          and a typed one reach the same result.

          Deliberately untagged, so no view transition runs. Two reasons. The
          camera opening its own lens is the transition; wrapping that in a
          second aperture animation is the same gesture twice. And a view
          transition that does not settle leaves its snapshot on top of the
          page — everything visible, nothing clickable — which is a far worse
          failure on a full-screen camera than a missing flourish.
        */}
        <Link href="/capture?source=camera&from=lexicon" className={styles.mode}>
          <Camera size={17} strokeWidth={1.7} aria-hidden="true" />
          <span className={styles.modeLabel}>{copy.inputCamera}</span>
        </Link>

        <Link href="/capture?source=library&from=lexicon" className={styles.mode}>
          <ImageIcon size={17} strokeWidth={1.7} aria-hidden="true" />
          <span className={styles.modeLabel}>{copy.inputImage}</span>
        </Link>
      </div>

      {hasAnswer && (
        <div className={styles.result}>
          <LexiconResults
            tone="cosmic"
            search={search}
            save={save}
            onOpenSaved={openSavedWord}
            onShare={() => void share.share()}
            onSend={sendToFriend}
            shareCopied={share.copied}
          />
        </div>
      )}

      {friendPicker.friendPickerItem && (
        <FriendPickerModal
          friends={friendPicker.friends}
          loading={friendPicker.friendsLoading}
          errorMessage={friendPicker.friendsError}
          sendingFriendId={friendPicker.sendingFriendId}
          onClose={friendPicker.handleClosePicker}
          onPick={friendPicker.handlePickFriend}
          onRetry={friendPicker.retryFriends}
        />
      )}
    </section>
  );
}
