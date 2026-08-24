"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Camera,
  ImageIcon,
  Keyboard,
  LoaderCircle,
  Mic,
  Search,
  X,
} from "lucide-react";

import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";
import LexiconResults from "@/components/lexicon/LexiconResults";
import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import { useVocabulary } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useKeyboardInset from "@/hooks/lexicon/useKeyboardInset";
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
import { getLanguage, getLanguageName } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";
import { insertValues } from "@/lib/utils";

/* =========================================================
   The Universal Search, as a sheet

   A sheet rather than an inline panel, and the reason is the keyboard. An
   expanding field on the home screen puts the answer in the space between a
   raised keyboard and a floating dock, which on a phone is about two lines
   tall. A sheet takes the screen, puts the field at the top where nothing
   can cover it, and gives the answer all the room below.

   It is also what makes the search reachable from anywhere: the dock's
   centre key opens this on the Vocabulary screen, in Messages, on Discover.
   Nobody has to go home to look up a word.
   ========================================================= */

export type LexiconSearchSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Pre-fills the field — from the dock, a camera hand-off, a deep link. */
  initialQuery?: string;
  /** Looks the initial query up immediately, without waiting for a submit. */
  autoSubmit?: boolean;
  tone?: "warm" | "cosmic";
};

export default function LexiconSearchSheet({
  open,
  onClose,
  initialQuery = "",
  autoSubmit = false,
  tone = "warm",
}: LexiconSearchSheetProps) {
  const router = useRouter();
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.lexicon;

  const { items, addItem } = useVocabulary();
  const { pair } = useDisplayLanguages();

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

  const motion = useSheetMotion({ open, onClose });
  const keyboardInset = useKeyboardInset(motion.rendered);

  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  /*
   * Reading a photograph, which happens before the search has anything to
   * show a state for. The engine's own status only starts once there is a
   * word to look up.
   */
  const [readingImage, setReadingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  /**
   * The sentence for each way a photograph can fail.
   *
   * Taken from the capture screen's dictionary rather than given new keys of
   * its own: these describe images, not the screen they were picked on, and a
   * second set would be the same six sentences translated twice.
   */
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

  async function handleImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Cleared straight away so picking the same photo twice fires again.
    event.target.value = "";

    if (!file || readingImage) return;

    setImageError("");
    setReadingImage(true);

    try {
      const identified = await identifyImage(await fileToModelImage(file));

      /*
       * The word goes back through the field, not around it. What a photo
       * produces is text, and text is what the engine already answers — so a
       * photographed word gets the same card, the same duplicate check and
       * the same save button as a typed one.
       */
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
   * The field takes focus on open, and the query that arrived with it is
   * looked up without waiting to be submitted.
   *
   * Keyed on `open` alone: re-running this when the query changes would
   * re-submit on every keystroke, and stealing focus back mid-typing is the
   * kind of bug that only shows up on a real phone.
   */
  const primedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      primedRef.current = false;
      return;
    }

    if (primedRef.current) return;
    primedRef.current = true;

    if (initialQuery) {
      search.setQuery(initialQuery);
      if (autoSubmit) search.submit(initialQuery);
    }

    /*
     * One frame later, so the panel has been laid out before iOS decides
     * where to put the keyboard. Focusing during the same frame as the mount
     * lands the field under the keyboard about a third of the time.
     */
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /*
   * The browser has to be told a language before it listens and returns
   * whatever its expected words sound closest to — right for dictating the
   * language being studied, useless for holding the phone up to someone
   * speaking something else. The model is told nothing and can hear any of
   * them, so it gets the second turn rather than the first.
   */
  const handleAudio = async (audio: Blob) => {
    const body = new FormData();
    body.append("audio", audio, "speech.webm");

    try {
      const response = await fetch("/api/voice-lookup", { method: "POST", body });

      if (!response.ok) return;

      const heard = (await response.json()) as {
        heard?: boolean;
        text?: string;
      };

      // An unconfident answer comes back as heard: false, and nothing is put
      // in the field. A word invented from silence would be looked up, saved
      // and studied, and it would be nobody's word.
      if (heard.heard && heard.text) search.submit(heard.text, "voice");
    } catch {
      // No connection. The offline path inside the engine answers here.
    }
  };

  const voice = useVoiceInput({
    lang: getLanguage(pair[0]).speechTag,
    onResult: (transcript) => search.submit(transcript, "voice"),
    onAudio: handleAudio,
  });

  if (!motion.rendered) return null;

  const learningName = getLanguageName(pair[0], interfaceLanguage);
  const placeholder = insertValues(copy.fieldPlaceholderLanguage, {
    language: learningName,
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    search.submit();
    // Dismisses the keyboard so the answer gets the whole screen. The field
    // keeps its text, so correcting a typo is one tap away.
    inputRef.current?.blur();
  }

  function openSavedWord(item: VocabularyItem) {
    motion.requestClose();
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

  const modeButtonClass =
    "flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-[12px] font-semibold transition-transform active:scale-[0.97]";

  return (
    <div className="fixed inset-0 z-[130] flex justify-center">
      <button
        type="button"
        aria-label={copy.close}
        onClick={motion.requestClose}
        className={`absolute inset-0 bg-black/25 backdrop-blur-[3px] ${motion.backdropClassName}`}
        {...motion.backdropProps}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={copy.open}
        {...motion.panelProps}
        className={`${motion.panelClassName} relative z-10 flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl sm:my-6 sm:h-auto sm:max-h-[92dvh] sm:rounded-[30px]`}
        style={motion.panelProps.style}
      >
        <header
          className="shrink-0 border-b border-black/[0.07] px-4 pb-3"
          style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}
        >
          <div className="flex items-center gap-2">
            <form className="min-w-0 flex-1" onSubmit={handleSubmit}>
              <div
                className={`flex h-12 items-center gap-2.5 rounded-full border px-4 ${
                  tone === "cosmic"
                    ? "border-[var(--cosmic-cyan-dim)] bg-transparent"
                    : "border-black/[0.09] bg-surface"
                }`}
              >
                <Search
                  size={17}
                  strokeWidth={2}
                  className="shrink-0 text-ink-soft"
                  aria-hidden="true"
                />

                <input
                  ref={inputRef}
                  type="text"
                  value={search.query}
                  onChange={(event) => search.setQuery(event.target.value)}
                  placeholder={placeholder}
                  aria-label={copy.inputAriaLabel}
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-faint"
                />

                {search.query && (
                  <ClearFieldButton onClear={search.reset} label={copy.clear} />
                )}

                {/*
                  A search field with no visible submit is a search field that
                  only works if you know to press return. The keyboard's own
                  search key still submits — enterKeyHint above asks for it —
                  but a thumb reaching for a button should find one, and the
                  Cosmic console has had one all along.

                  Present only once there is something to look up, so the
                  resting field stays as quiet as the rest of the screen.
                */}
                {search.query.trim() && (
                  <button
                    type="submit"
                    disabled={search.status === "searching"}
                    aria-label={copy.search}
                    title={copy.search}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50 ${
                      tone === "cosmic"
                        ? "border border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
                        : "bg-black text-white"
                    }`}
                  >
                    {search.status === "searching" ? (
                      <LoaderCircle
                        size={15}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            </form>

            <button
              type="button"
              onClick={motion.requestClose}
              aria-label={copy.close}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>

          {/* Four doors into the same room, so nobody has to know which one
              the app calls "AI". Text focuses the field rather than
              navigating, which keeps the row reading as four peers. */}
          <div
            className="mt-2.5 flex items-center gap-2"
            role="toolbar"
            aria-label={copy.open}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              aria-pressed={!voice.listening}
              className={`${modeButtonClass} ${
                voice.listening ? "bg-surface text-ink-soft" : "bg-black text-white"
              }`}
            >
              <Keyboard size={16} strokeWidth={1.7} aria-hidden="true" />
              {copy.modeType}
            </button>

            {voice.supported && (
              <button
                type="button"
                onClick={voice.toggle}
                aria-pressed={voice.listening}
                className={`${modeButtonClass} ${
                  voice.listening ? "bg-black text-white" : "bg-surface text-ink-soft"
                }`}
              >
                <Mic size={16} strokeWidth={1.7} aria-hidden="true" />
                {voice.listening ? copy.searching : copy.modeVoice}
              </button>
            )}

            {/* Camera and image go to the capture flow that already owns
                recognition, rather than a second pipeline living here. What
                it recognises comes back through this same sheet — see the
                lexicon query param in LexiconSearchProvider. */}
            <Link
              href="/capture?source=camera&from=lexicon"
              onClick={motion.requestClose}
              className={`${modeButtonClass} bg-surface text-ink-soft`}
            >
              <Camera size={16} strokeWidth={1.7} aria-hidden="true" />
              {copy.modeCamera}
            </Link>

            {/*
              A button, not a link. Choosing a photo is not somewhere to go —
              it opens the picker the operating system already has. This used
              to navigate to the capture screen so that screen could click a
              file input two hundred milliseconds after mounting: a whole page,
              painted, to do nothing the reader wanted to see.

              Scan stays a link on purpose. That one really is a destination:
              a live camera with a focus hint and guidance about centring the
              object, which a bare file input cannot offer.
            */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={readingImage}
              aria-label={copy.modeImage}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft transition-transform active:scale-[0.97] disabled:opacity-50"
            >
              <ImageIcon size={16} strokeWidth={1.7} aria-hidden="true" />
            </button>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFile}
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>

          {/* Reading the photo, which happens before there is a word for the
              engine to have a status about. */}
          {readingImage && (
            <p
              role="status"
              className="mt-2.5 flex items-center gap-2 px-1 text-[12px] text-ink-soft"
            >
              <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
              {t.capture.analysis.description}
            </p>
          )}

          {imageError && (
            <p role="alert" className="mt-2.5 px-1 text-[12px] text-red-600">
              {imageError}
            </p>
          )}
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5"
          style={{
            // The keyboard stands on the bottom of a fixed panel without
            // shortening it, so the last result would sit under the keys
            // with nowhere to scroll to. See useKeyboardInset.
            paddingBottom: `calc(max(env(safe-area-inset-bottom), 16px) + ${keyboardInset}px)`,
          }}
        >
          <LexiconResults
            tone={tone}
            search={search}
            save={save}
            onOpenSaved={openSavedWord}
            onShare={() => void share.share()}
            onSend={sendToFriend}
            shareCopied={share.copied}
          />
        </div>
      </section>

      {friendPicker.friendPickerItem && (
        <FriendPickerModal
          friends={friendPicker.friends}
          loading={friendPicker.friendsLoading}
          errorMessage={friendPicker.friendsError}
          sendingFriendId={friendPicker.sendingFriendId}
          onClose={friendPicker.handleClosePicker}
          /*
           * Picking a friend navigates to their conversation — and this sheet
           * is mounted on the protected layout, so unlike every other picker
           * in the app it survives that navigation. Left alone it sat on top
           * of the thread the reader had just been sent to, which reads as a
           * send that never went anywhere.
           *
           * Closed without the exit animation, because the route is changing
           * underneath it and an animation playing over a page transition is
           * the sheet insisting on being noticed on its way out.
           */
          onPick={(friendId) => {
            friendPicker.handlePickFriend(friendId);
            onClose();
          }}
          onRetry={friendPicker.retryFriends}
        />
      )}
    </div>
  );
}
