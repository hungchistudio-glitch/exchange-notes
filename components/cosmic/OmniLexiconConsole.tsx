"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  BookmarkCheck,
  BookmarkPlus,
  Camera,
  Check,
  ImageIcon,
  Keyboard,
  LoaderCircle,
  Mic,
  Radar,
  Send,
  Share2,
  Volume2,
} from "lucide-react";

import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import useVocabularyLookup from "@/hooks/useVocabularyLookup";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";
import useVocabularyShare from "@/hooks/useVocabularyShare";
import useVoiceInput from "@/hooks/useVoiceInput";
import {
  getPronunciationForPair,
  type PronunciationResult,
} from "@/lib/pronunciation/getPronunciation";
import {
  getLanguage,
  getLanguageName,
  isUnreadableScript,
} from "@/lib/languages";
import { speak } from "@/lib/speech";
import { insertValues } from "@/lib/utils";
import { getCurrentUser, insertVocabulary } from "@/lib/vocabulary/repository";

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
 * Text, voice, camera and image are four doors into the same room. Text and
 * voice both end up in useVocabularyLookup, which is the app's existing
 * lookup pipeline — the same one the vocabulary screen uses, hitting the same
 * endpoint and the same cache. Camera and image hand off to /capture, which
 * already owns recognition. Nothing here is a second search implementation,
 * and nothing here writes to a store of its own.
 *
 * Saving goes through lib/vocabulary/repository directly rather than through
 * useVocabularyLookupSave. That hook also owns the vocabulary list, the search
 * field and the AI sheet of the vocabulary page — none of which exist on the
 * deck — so using it here would drag the heaviest part of another screen into
 * the lightest part of this one. The row it writes is the same row, to the same
 * table, that the standard vocabulary screen reads.
 */
export default function OmniLexiconConsole({
  onStateChange,
}: OmniLexiconConsoleProps) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.cosmic.omni;
  const { pair: languagePair } = useDisplayLanguages();

  const [query, setQuery] = useState("");
  const {
    lookupStatus,
    lookupResult,
    lookupError,
    lookupDegraded,
    lookupPreview,
    lookupWord,
    resetLookup,
  } = useVocabularyLookup(query);

  /*
   * lookupWord reads the query out of its own closure, so a submit cannot run
   * in the same tick as the transcript that produced it — it has to wait for
   * the render that carries the new value.
   *
   * The trigger is a counter rather than the query itself, and that detail is
   * the whole correctness of this component. Submitting text the user has
   * already typed calls setQuery with the value it already holds; React sees
   * no change, skips the re-render, and an effect watching the query never
   * fires — so pressing enter did nothing at all. A counter always changes, so
   * both paths behave the same: typed text submits on the value already in
   * state, and a voice transcript submits on the render that brings it in.
   */
  const [submitToken, setSubmitToken] = useState(0);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!pendingRef.current) return;

    pendingRef.current = false;
    void lookupWord();
  }, [submitToken, lookupWord]);

  const submit = useCallback((value: string) => {
    const next = value.trim();

    if (!next) return;

    pendingRef.current = true;
    setQuery(next);
    setSubmitToken((token) => token + 1);
  }, []);

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

        const result = (await response.json()) as {
          heard?: boolean;
          text?: string;
        };

        // An unconfident answer comes back as heard: false, and nothing is
        // put in the field. A word invented from silence would be looked
        // up, saved and studied, and it would be nobody's word.
        if (result.heard && result.text) submit(result.text);
      } catch {
        // No connection. The offline path below is what answers here.
      }
    },
    [submit],
  );

  const { supported: voiceSupported, listening, toggle: toggleVoice } =
    useVoiceInput({
      // The browser listens in the language being learned, which is the one
      // the reader most often cannot spell. Anything else it mishears goes
      // to the model, which was told nothing.
      lang: getLanguage(languagePair[0]).speechTag,
      onResult: submit,
      onAudio: handleAudio,
    });

  const state: OmniLexiconState = listening
    ? "listening"
    : lookupStatus === "loading"
      ? "scanning"
      : query.length > 0
        ? "typing"
        : "idle";

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit(query);
  }

  function handleClear() {
    setQuery("");
    resetLookup();
  }

  function handleChange(value: string) {
    setQuery(value);

    // A cleared field puts the console back to rest rather than leaving the
    // last answer sitting under an empty input.
    if (!value.trim() && lookupStatus !== "idle") resetLookup();
  }

  /*
   * The placeholder follows the learning language, because the question a
   * learner arrives with is different in each direction: one is "I saw
   * something written I cannot read", the other is "I heard something I cannot
   * spell". It is chosen once per render from a stable input, never rotated on
   * a timer.
   */
  const learningLanguage = languagePair[0];

  const placeholder = insertValues(
    isUnreadableScript(learningLanguage)
      ? copy.placeholderUnreadable
      : copy.placeholderHeard,
    { language: getLanguageName(learningLanguage, interfaceLanguage) },
  );

  // The offline dictionary can answer before the model does; showing that
  // early answer is better than an empty console, as long as it is labelled.
  const shown = lookupResult ?? lookupPreview;

  /*
   * Pinyin, zhuyin and IPA are a second request, so they arrive after the word
   * does rather than holding it back. Requested once per identified pair and
   * remembered, because re-identifying the same word is common and the answer
   * cannot change.
   */
  const [pronunciation, setPronunciation] = useState<PronunciationResult | null>(
    null,
  );
  const pronouncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lookupResult) return;
    // Half a pair cannot be pronounced. Asking anyway is what produced pinyin
    // and zhuyin for the placeholder that used to stand in for the missing
    // translation, presenting an invented reading as the word's own.
    if (lookupResult.translationUnavailable) return;

    const key = `${lookupResult.englishName}|${lookupResult.chineseName}`;

    if (pronouncedRef.current === key) return;

    pronouncedRef.current = key;
    setPronunciation(null);

    let active = true;

    void getPronunciationForPair(
      { text: lookupResult.englishName, language: languagePair[0] },
      { text: lookupResult.chineseName, language: languagePair[1] },
    ).then((result) => {
      if (active) setPronunciation(result);
    });

    return () => {
      active = false;
    };
  }, [lookupResult, languagePair]);

  const { lookupCopied, shareLookupResult } = useVocabularyShare(lookupResult);

  /*
   * Sending to a friend is its own destination, not a variant of the system
   * share sheet: one leaves the app, the other stays inside it and lands as a
   * word card in a conversation. The picker hook is self-contained and needs no
   * vocabulary row — a looked-up word can be sent before it is ever saved.
   */
  const {
    friendPickerItem,
    shareCard,
    friends,
    friendsLoading,
    friendsError,
    sendingFriendId,
    handleClosePicker,
    handlePickFriend,
    retryFriends,
  } = useVocabularyFriendPicker();

  function handleSendToFriend() {
    if (!lookupResult) return;

    shareCard({
      word: lookupResult.englishName,
      translation: lookupResult.chineseName,
      partOfSpeech: lookupResult.partOfSpeech,
      examples: {
        en: lookupResult.englishExample,
        "zh-TW": lookupResult.chineseExample,
      },
    });
  }

  /*
   * Saving writes straight to the vocabulary table through the same repository
   * every other surface uses, so a word identified here is the same row the
   * standard vocabulary screen reads. Deliberately not routed through
   * useVocabularyLookupSave: that hook also owns the vocabulary list, the
   * search field and the AI sheet on the vocabulary page, none of which exist
   * on the deck.
   */
  /*
   * Keyed to the word rather than reset when the word changes. An effect that
   * cleared the button on every new result was both a synchronous setState
   * inside an effect and slightly wrong: identifying a word you already saved
   * a moment ago should still show as saved, not offer to save it twice.
   */
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const resultKey = lookupResult
    ? `${lookupResult.englishName}|${lookupResult.chineseName}`
    : null;

  const saveState =
    resultKey && savingKey === resultKey
      ? "saving"
      : resultKey && savedKey === resultKey
        ? "saved"
        : "idle";

  async function handleSave() {
    if (!lookupResult || !resultKey || saveState !== "idle") return;
    // Guarded here and not only on the button: this is what keeps a word with
    // no meaning out of the vocabulary table, which reviews read from.
    if (lookupResult.translationUnavailable) return;

    setSavingKey(resultKey);

    try {
      const { user } = await getCurrentUser();

      if (!user) {
        setSavingKey(null);
        return;
      }

      await insertVocabulary({
        user_id: user.id,
        word: lookupResult.englishName.trim(),
        translation: lookupResult.chineseName.trim(),
        word_language: languagePair[0],
        translation_language: languagePair[1],
        part_of_speech: lookupResult.partOfSpeech?.trim() || null,
        example_sentence: lookupResult.englishExample?.trim() || null,
        translated_example: lookupResult.chineseExample?.trim() || null,
        confidence: lookupResult.confidence,
        category: lookupResult.category,
        status: "new",
      });

      setSavedKey(resultKey);
    } catch (error) {
      console.error("Unable to save the identified word:", error);
    } finally {
      setSavingKey(null);
    }
  }

  // The learning language leads everywhere in the app, and this is no
  // exception — the console does not get a hierarchy of its own.
  /*
   * A lookup answers in the pair's own order, learning first, so the hero is
   * the first field rather than whichever of two languages this happens to
   * be. The console does not get a hierarchy of its own.
   */
  const primary = shown ? shown.englishName : "";
  const secondary = shown ? shown.chineseName : "";
  const primaryLang = getLanguage(languagePair[0]).speechTag;
  const secondaryLang = getLanguage(languagePair[1]).speechTag;

  // Shared with the standard-mode lookup sheet rather than restated in the
  // cosmic vocabulary: the explanation is about the network, not the theme.
  const pendingCopy = t.vocabulary.lookup;
  const translationUnavailable = Boolean(shown?.translationUnavailable);

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
              style={
                { "--bar-delay": `${index * 78}ms` } as CSSProperties
              }
            />
          ))}
        </div>
      ) : (
        <form className={styles.field} onSubmit={handleSubmit}>
          <Radar
            size={17}
            strokeWidth={1.8}
            className="shrink-0 text-[var(--cosmic-cyan)]"
            aria-hidden="true"
          />

          <input
            type="text"
            value={query}
            onChange={(event) => handleChange(event.target.value)}
            placeholder={placeholder}
            aria-label={copy.placeholder}
            enterKeyHint="search"
            autoComplete="off"
            className={styles.input}
          />

          {/* copy.clear has existed in the dictionary since this console was
              built; nothing ever rendered it. Sitting before the submit
              button keeps the destructive one away from the thumb's path to
              Identify. */}
          {query && (
            <ClearFieldButton onClear={handleClear} label={copy.clear} />
          )}

          <button
            type="submit"
            disabled={!query.trim() || lookupStatus === "loading"}
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
          onClick={(event) => {
            const input =
              event.currentTarget.closest("section")?.querySelector("input");

            if (input instanceof HTMLInputElement) input.focus();
          }}
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
          recognition, rather than a second pipeline living here.

          Deliberately untagged, so no view transition runs. Two reasons. The
          camera opening its own lens is the transition; wrapping that in a
          second aperture animation is the same gesture twice. And a view
          transition that does not settle leaves its snapshot on top of the
          page — everything visible, nothing clickable — which is a far worse
          failure on a full-screen camera than a missing flourish.
        */}
        <Link href="/capture?source=camera&from=deck" className={styles.mode}>
          <Camera size={17} strokeWidth={1.7} aria-hidden="true" />
          <span className={styles.modeLabel}>{copy.inputCamera}</span>
        </Link>

        <Link href="/capture?source=library&from=deck" className={styles.mode}>
          <ImageIcon size={17} strokeWidth={1.7} aria-hidden="true" />
          <span className={styles.modeLabel}>{copy.inputImage}</span>
        </Link>
      </div>

      {shown && lookupStatus !== "error" && (
        <div className={styles.result}>
          <p className="hud-label">{copy.acquired}</p>

          {/* Word and translation each carry their own speaker, because these
              are two different languages and hearing one is not hearing the
              other. */}
          <div className={styles.resultRow}>
            <p className={styles.resultWord}>{primary}</p>
            <button
              type="button"
              className={`cosmic-sonar ${styles.speak}`}
              aria-label={copy.playLearning}
              onClick={() => speak(primary, primaryLang)}
            >
              <Volume2 size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          {/* A missing translation is stated, not filled in. The console used
              to print a placeholder here that looked exactly like an answer,
              so the learner had no way to tell a real meaning from a failed
              request. The retry is offered inline because that is the whole
              remedy — the word was fine, the connection was not. */}
          {translationUnavailable ? (
            <div className={styles.pending} role="status">
              <p className={styles.pendingTitle}>{pendingCopy.translationUnavailable}</p>
              <p className={styles.pendingDetail}>
                {pendingCopy.translationUnavailableDetail}
              </p>
              <button
                type="button"
                className={styles.pendingRetry}
                onClick={() => lookupWord()}
              >
                {pendingCopy.translationUnavailableRetry}
              </button>
            </div>
          ) : (
            <div className={styles.resultRow}>
              <p className={styles.resultTranslation}>{secondary}</p>
              <button
                type="button"
                className={`cosmic-sonar ${styles.speak}`}
                aria-label={copy.playTranslation}
                onClick={() => speak(secondary, secondaryLang)}
              >
                <Volume2 size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Pinyin, zhuyin and IPA. Each gets its own font stack: forcing
              zhuyin or IPA through the Latin stack is what produced the
              missing-glyph boxes this app already fixed once. */}
          {pronunciation && (
            <div className={styles.phonetics}>
              {pronunciation.pinyin && (
                <span className="font-cjk">{pronunciation.pinyin}</span>
              )}
              {pronunciation.zhuyin && (
                <span className="font-zhuyin">{pronunciation.zhuyin}</span>
              )}
              {pronunciation.englishPronunciation && (
                <span className="font-phonetic">
                  /{pronunciation.englishPronunciation}/
                </span>
              )}
            </div>
          )}

          <div className={styles.resultMeta}>
            <span className={styles.pos}>{shown.partOfSpeech}</span>
            {lookupDegraded && (
              <span className={styles.note}>{copy.degraded}</span>
            )}
          </div>

          {/* Empty when the translation never arrived — there is nothing
              truthful to put in a sentence about the word's meaning. */}
          {lookupResult && lookupResult.englishExample && lookupResult.chineseExample && (
            <div className={styles.examples}>
              <div className={styles.resultRow}>
                <p className={styles.resultExample}>
                  {lookupResult.englishExample}
                </p>
                <button
                  type="button"
                  className={`cosmic-sonar ${styles.speak}`}
                  aria-label={copy.playExampleLearning}
                  onClick={() =>
                    speak(
                      lookupResult.englishExample,
                      primaryLang,
                    )
                  }
                >
                  <Volume2 size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>

              <div className={styles.resultRow}>
                <p className={styles.resultExample}>
                  {lookupResult.chineseExample}
                </p>
                <button
                  type="button"
                  className={`cosmic-sonar ${styles.speak}`}
                  aria-label={copy.playExampleTranslation}
                  onClick={() =>
                    speak(
                      lookupResult.chineseExample,
                      secondaryLang,
                    )
                  }
                >
                  <Volume2 size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* Save, send and share only appear for a real model result: the
              offline preview has no example sentences, so saving it would write
              a half-formed row into the vocabulary the rest of the app reads.

              Icon-only, and each icon is a different verb rather than three
              shades of "share": a bookmark keeps it, a paper plane sends it to
              someone in the app, and the system glyph hands it to whatever is
              outside the app. Labels would triple the height of the row for
              three glyphs nobody needs explained twice. */}
          {lookupResult && (
            <div className={styles.actions}>
              <button
                type="button"
                className={`cosmic-lock ${styles.action}`}
                data-saved={saveState === "saved"}
                // A word with no meaning attached is worse in the vocabulary
                // than not saved at all: it comes back in review with nothing
                // to review against.
                disabled={saveState !== "idle" || translationUnavailable}
                aria-label={
                  translationUnavailable
                    ? pendingCopy.translationUnavailableSaveBlocked
                    : saveState === "saved"
                      ? copy.saved
                      : copy.save
                }
                title={
                  translationUnavailable
                    ? pendingCopy.translationUnavailableSaveBlocked
                    : saveState === "saved"
                      ? copy.saved
                      : copy.save
                }
                onClick={handleSave}
              >
                {saveState === "saving" ? (
                  <LoaderCircle
                    size={16}
                    strokeWidth={1.8}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : saveState === "saved" ? (
                  <BookmarkCheck size={16} strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <BookmarkPlus size={16} strokeWidth={1.8} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                className={styles.action}
                aria-label={copy.sendToFriend}
                title={copy.sendToFriend}
                onClick={handleSendToFriend}
              >
                <Send size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>

              <button
                type="button"
                className={styles.action}
                aria-label={lookupCopied ? copy.copied : copy.share}
                title={lookupCopied ? copy.copied : copy.share}
                onClick={() => void shareLookupResult()}
              >
                {lookupCopied ? (
                  <Check size={16} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Share2 size={16} strokeWidth={1.8} aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {lookupStatus === "error" && (
        /*
         * Yumi does not fail dramatically. The message says it could not place
         * the word and then offers the other two senses, because "try a photo"
         * is genuinely the next thing to do when a spelling guess did not land.
         */
        <div className={styles.error} role="status">
          <p className={styles.errorTitle}>{copy.noMatch}</p>
          <p className={`${styles.note} mt-1`}>
            {lookupError || copy.noMatchHint}
          </p>
        </div>
      )}

      {friendPickerItem && (
        <FriendPickerModal
          friends={friends}
          loading={friendsLoading}
          errorMessage={friendsError}
          sendingFriendId={sendingFriendId}
          onClose={handleClosePicker}
          onPick={handlePickFriend}
          onRetry={retryFriends}
        />
      )}
    </section>
  );
}
