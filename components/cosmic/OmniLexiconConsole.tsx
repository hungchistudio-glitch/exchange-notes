"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Keyboard, Mic, Radar } from "lucide-react";

import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import LexiconImageMenu from "@/components/lexicon/LexiconImageMenu";
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
  ImageRecognitionError,
  fileToModelImage,
  identifyImage,
  type ImageRecognitionCode,
} from "@/lib/lexicon/imageRecognition";
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
 * and the three mode keys. That is the whole of its job.
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
 * The camera key opens the platform's photo sources here and sends the image
 * through the shared recognition pipeline. A photographed word therefore
 * lands in exactly the same result model as a typed or spoken one, without a
 * detour through the retired capture screen.
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
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  function imageErrorMessage(code: ImageRecognitionCode): string {
    const errors = t.capture.errors;

    switch (code) {
      case "not-an-image":
        return errors.selectImage;
      case "too-large":
        return errors.imageTooLarge;
      case "unreadable":
        return errors.processImage;
      case "daily-limit":
        return errors.identifyDailyLimit;
      case "busy":
        return errors.identifyBusy;
      case "timeout":
        return errors.identifyTimeout;
      default:
        return errors.identifyImage;
    }
  }

  async function handleImageFile(file: File) {
    if (readingImage) return;

    setImageError("");
    setReadingImage(true);

    try {
      const identified = await identifyImage(await fileToModelImage(file));
      if (identified.term) search.submit(identified.term, "image");
    } catch (recognitionError) {
      console.error("Could not read that photo:", recognitionError);
      setImageError(
        imageErrorMessage(
          recognitionError instanceof ImageRecognitionError
            ? recognitionError.code
            : "failed",
        ),
      );
    } finally {
      setReadingImage(false);
    }
  }

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
    : readingImage || search.status === "searching"
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
            onFocus={() => setCameraMenuOpen(false)}
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
        <button
          type="button"
          className={styles.mode}
          data-active={!listening}
          onClick={() => {
            setCameraMenuOpen(false);
            formRef.current?.querySelector("input")?.focus();
          }}
          aria-label={copy.inputText}
          title={copy.inputText}
        >
          <Keyboard size={17} strokeWidth={1.7} aria-hidden="true" />
        </button>

        {voiceSupported && (
          <button
            type="button"
            className={styles.mode}
            data-active={listening}
            aria-pressed={listening}
            onClick={() => {
              setCameraMenuOpen(false);
              toggleVoice();
            }}
            aria-label={copy.inputVoice}
            title={copy.inputVoice}
          >
            <Mic size={17} strokeWidth={1.7} aria-hidden="true" />
          </button>
        )}

        <LexiconImageMenu
          open={cameraMenuOpen}
          onOpenChange={setCameraMenuOpen}
          onFile={handleImageFile}
          disabled={readingImage}
          tone="cosmic"
          buttonClassName={styles.mode}
        />
      </div>

      {imageError ? (
        <p role="alert" className="mt-2.5 text-[12px] text-red-300">
          {imageError}
        </p>
      ) : null}

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
