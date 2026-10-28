"use client";

import { ArrowRight, LoaderCircle, Search } from "lucide-react";
import { useCallback, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import LexiconImageMenu from "@/components/lexicon/LexiconImageMenu";
import LexiconResults from "@/components/lexicon/LexiconResults";
import {
  VoiceCaptureStatus,
  VoiceMicButton,
} from "@/components/lexicon/VoiceCapture";
import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import { useVocabulary } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useLexiconOnboarding from "@/hooks/lexicon/useLexiconOnboarding";
import useLexiconImageLookup from "@/hooks/lexicon/useLexiconImageLookup";
import useLexiconSave from "@/hooks/lexicon/useLexiconSave";
import useLexiconSearch from "@/hooks/lexicon/useLexiconSearch";
import useLexiconShare from "@/hooks/lexicon/useLexiconShare";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import useVocabularyFriendPicker from "@/hooks/useVocabularyFriendPicker";
import useVoiceInput, { type VoiceAudioOutcome } from "@/hooks/useVoiceInput";
import { onHomeSearchDismiss } from "@/lib/home/homeMoments";
import { getLanguage, getLanguageName } from "@/lib/languages";
import { transcribeSpeech, warmVoiceLookup } from "@/lib/lexicon/voiceLookup";
import type { VocabularyItem } from "@/lib/types/app";
import { insertValues } from "@/lib/utils";
import { stopSpeech } from "@/lib/speech";

/* =========================================================
   The home search is the search

   The field used to be a button painted to look like an input. Tapping it
   opened a second full-screen sheet, so the most prominent control on the
   home screen was only a doorway to the real control. This component now
   owns the same lexicon engine and result card itself: type, speak, scan and
   read the answer without leaving or covering the home page.
   ========================================================= */

export type UniversalSearchFieldProps = {
  /*
   * Fired when the field starts or stops showing something.
   *
   * On the home screen this is what lifts Yumi out of the way and gives the
   * column under her a height to scroll inside — a dictionary entry is taller
   * than the room she leaves at rest, and that layer is `position: fixed`, so
   * an answer that overruns it cannot be scrolled to at all.
   *
   * Optional because this field is not only a home-screen thing: anywhere
   * that has room for it simply does not pass one.
   */
  onAnswerChange?: (hasAnswer: boolean) => void;
};

export default function UniversalSearchField({
  onAnswerChange,
}: UniversalSearchFieldProps = {}) {
  const router = useRouter();
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.lexicon;
  const { pair } = useDisplayLanguages();
  const { items, addItem } = useVocabulary();
  const onboarding = useLexiconOnboarding();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const voiceEpoch = useRef(0);
  const acceptsVoice = useRef(false);

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

  const imageLookup = useLexiconImageLookup({
    onTerm: (term, options) => search.submit(term, "image", options),
  });

  const placeholder = insertValues(copy.fieldPlaceholderLanguage, {
    language: getLanguageName(pair[0], interfaceLanguage),
  });

  /*
   * Every recording goes to the model now, which hears the whole sentence
   * in whatever language it was said (hooks/useVoiceInput.ts). A recording
   * that comes back after the reader went home is dropped, and so is the
   * browser's fallback for it — "handled" is the honest answer to a
   * question nobody is waiting on any more.
   */
  const handleAudio = useCallback(
    async (audio: Blob): Promise<VoiceAudioOutcome> => {
      if (!acceptsVoice.current) return "handled";
      const epoch = voiceEpoch.current;
      const heard = await transcribeSpeech(audio);

      if (!acceptsVoice.current || epoch !== voiceEpoch.current) return "handled";
      if (heard.outcome !== "handled") return heard.outcome;

      search.submit(heard.text, "voice");
      return "handled";
    },
    [search],
  );

  const voice = useVoiceInput({
    lang: getLanguage(pair[0]).speechTag,
    onResult: (transcript) => {
      if (acceptsVoice.current) search.submit(transcript, "voice");
    },
    onAudio: handleAudio,
    onStart: warmVoiceLookup,
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onboarding.dismiss();
    search.submit();
    inputRef.current?.blur();
  }

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

  useEffect(() => {
    onAnswerChange?.(hasAnswer);
  }, [hasAnswer, onAnswerChange]);

  /* Both the tour and Yumi's return gesture use the existing dismissal
     channel. Late camera/voice answers must not reopen a dismissed search. */
  const { reset } = search;
  const { cancel: cancelImage } = imageLookup;
  const stopVoice = voice.cancel ?? voice.stop;
  useEffect(
    () =>
      onHomeSearchDismiss(() => {
        voiceEpoch.current += 1;
        acceptsVoice.current = false;
        cancelImage();
        stopVoice();
        stopSpeech();
        reset();
        inputRef.current?.blur();
      }),
    [reset, cancelImage, stopVoice],
  );

  /*
   * "A word came back" is announced by useLexiconSearch itself now, for
   * every surface that searches — it fires for all four ways of asking,
   * because all four land on the same lookup, and it can tell an answer from
   * a card with no meaning on it, which this field could not.
   */

  return (
    <div className="min-w-0">
      <form onSubmit={handleSubmit}>
        {/* data-coach-target: where the tour's arrow points (TutorialCoach). */}
        <div
          data-coach-target="search-field"
          className="flex min-w-0 items-center gap-1.5 rounded-full border border-[#eadfc4] bg-white px-2 py-2 shadow-[0_8px_28px_rgba(35,28,12,0.07)]"
        >
          <Search
            size={18}
            strokeWidth={2}
            className="ml-2 shrink-0 text-ink-soft"
            aria-hidden="true"
          />

          <input
            ref={inputRef}
            type="text"
            value={search.query}
            onFocus={onboarding.dismiss}
            onChange={(event) => search.setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label={copy.inputAriaLabel}
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 min-w-0 flex-1 bg-transparent px-1 text-[1rem] outline-none placeholder:text-ink-faint"
          />

          {search.query ? (
            <ClearFieldButton onClear={search.reset} label={copy.clear} />
          ) : null}

          {search.query.trim() ? (
            <button
              type="submit"
              disabled={search.status === "searching"}
              aria-label={copy.search}
              title={copy.search}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white transition-transform active:scale-95 disabled:opacity-50"
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
          ) : null}

          {voice.supported ? (
            <VoiceMicButton
              phase={voice.phase}
              listening={voice.listening}
              levelRef={voice.bindLevel}
              onPress={() => {
                onboarding.dismiss();
                acceptsVoice.current = true;
                voice.toggle();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
              idleClassName="bg-surface text-ink-strong"
              activeClassName="bg-black text-white"
            />
          ) : null}

          <LexiconImageMenu
            onFile={(file) => {
              onboarding.dismiss();
              return imageLookup.handleFile(file);
            }}
            onCapture={({ raster, targetRect }) => {
              onboarding.dismiss();
              return imageLookup.handleCapture(raster, targetRect);
            }}
            busy={imageLookup.reading}
            disabled={imageLookup.reading}
            buttonClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-strong transition-transform active:scale-95 disabled:opacity-50"
          />
        </div>
      </form>

      <VoiceCaptureStatus
            phase={voice.phase}
            listening={voice.listening}
            levelRef={voice.bindLevel}
            caption={voice.caption}
            notice={voice.notice} className="mt-3 px-1" />

      {imageLookup.reading ? (
        <p
          role="status"
          className="mt-2.5 flex items-center gap-2 px-1 text-[0.75rem] text-ink-soft"
        >
          <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
          {t.capture.analysis.description}
        </p>
      ) : null}

      {imageLookup.error ? (
        <p role="alert" className="mt-2.5 px-1 text-[0.75rem] text-red-600">
          {imageLookup.error}
        </p>
      ) : null}

      {onboarding.visible && !hasAnswer ? (
        <div className="mt-2.5 flex items-start gap-2 px-1">
          <p className="min-w-0 flex-1 text-[0.75rem] leading-5 text-ink-faint">
            <span className="font-semibold text-ink-soft">
              {copy.onboardingTitle}
            </span>{" "}
            {copy.onboardingDescription}
          </p>

          <button
            type="button"
            onClick={onboarding.dismiss}
            className="hit-44 relative shrink-0 text-[0.75rem] font-semibold text-ink-soft underline underline-offset-2"
          >
            {copy.onboardingDismiss}
          </button>
        </div>
      ) : null}

      {hasAnswer ? (
        <div className="mt-4" data-home-search-results="">
          <LexiconResults
            tone="warm"
            search={search}
            save={save}
            onOpenSaved={openSavedWord}
            onShare={() => void share.share()}
            onSend={sendToFriend}
            shareCopied={share.copied}
          />
        </div>
      ) : null}

      {friendPicker.friendPickerItem ? (
        <FriendPickerModal
          friends={friendPicker.friends}
          loading={friendPicker.friendsLoading}
          errorMessage={friendPicker.friendsError}
          sendingFriendId={friendPicker.sendingFriendId}
          onClose={friendPicker.handleClosePicker}
          onPick={friendPicker.handlePickFriend}
          onRetry={friendPicker.retryFriends}
        />
      ) : null}
    </div>
  );
}
