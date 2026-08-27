"use client";

import { ArrowRight, LoaderCircle, Mic, Search } from "lucide-react";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import LexiconImageMenu from "@/components/lexicon/LexiconImageMenu";
import LexiconResults from "@/components/lexicon/LexiconResults";
import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import { useVocabulary } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useLexiconOnboarding from "@/hooks/lexicon/useLexiconOnboarding";
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
   The home search is the search

   The field used to be a button painted to look like an input. Tapping it
   opened a second full-screen sheet, so the most prominent control on the
   home screen was only a doorway to the real control. This component now
   owns the same lexicon engine and result card itself: type, speak, scan and
   read the answer without leaving or covering the home page.
   ========================================================= */

export default function UniversalSearchField() {
  const router = useRouter();
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.lexicon;
  const { pair } = useDisplayLanguages();
  const { items, addItem } = useVocabulary();
  const onboarding = useLexiconOnboarding();
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const [readingImage, setReadingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  const placeholder = insertValues(copy.fieldPlaceholderLanguage, {
    language: getLanguageName(pair[0], interfaceLanguage),
  });

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

    onboarding.dismiss();
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

        if (heard.heard && heard.text) search.submit(heard.text, "voice");
      } catch {
        // The lexicon's offline path remains available when voice lookup is not.
      }
    },
    [search],
  );

  const voice = useVoiceInput({
    lang: getLanguage(pair[0]).speechTag,
    onResult: (transcript) => search.submit(transcript, "voice"),
    onAudio: handleAudio,
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

  return (
    <div className="min-w-0">
      <form onSubmit={handleSubmit}>
        <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-[#eadfc4] bg-white px-2 py-2 shadow-[0_8px_28px_rgba(35,28,12,0.07)]">
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
            className="h-11 min-w-0 flex-1 bg-transparent px-1 text-[16px] outline-none placeholder:text-ink-faint"
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
            <button
              type="button"
              onClick={() => {
                onboarding.dismiss();
                voice.toggle();
              }}
              aria-label={copy.modeVoice}
              title={copy.modeVoice}
              aria-pressed={voice.listening}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${
                voice.listening
                  ? "bg-black text-white"
                  : "bg-surface text-ink-strong"
              }`}
            >
              <Mic
                size={17}
                strokeWidth={1.8}
                className={voice.listening ? "animate-pulse" : undefined}
                aria-hidden="true"
              />
            </button>
          ) : null}

          <LexiconImageMenu
            onFile={handleImageFile}
            disabled={readingImage}
            buttonClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-strong transition-transform active:scale-95 disabled:opacity-50"
          />
        </div>
      </form>

      {voice.listening ? (
        <p role="status" className="mt-2.5 px-1 text-[12px] text-ink-soft">
          {copy.listening}
        </p>
      ) : null}

      {readingImage ? (
        <p
          role="status"
          className="mt-2.5 flex items-center gap-2 px-1 text-[12px] text-ink-soft"
        >
          <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
          {t.capture.analysis.description}
        </p>
      ) : null}

      {imageError ? (
        <p role="alert" className="mt-2.5 px-1 text-[12px] text-red-600">
          {imageError}
        </p>
      ) : null}

      {onboarding.visible && !hasAnswer ? (
        <div className="mt-2.5 flex items-start gap-2 px-1">
          <p className="min-w-0 flex-1 text-[12px] leading-5 text-ink-faint">
            <span className="font-semibold text-ink-soft">
              {copy.onboardingTitle}
            </span>{" "}
            {copy.onboardingDescription}
          </p>

          <button
            type="button"
            onClick={onboarding.dismiss}
            className="shrink-0 text-[12px] font-semibold text-ink-soft underline underline-offset-2"
          >
            {copy.onboardingDismiss}
          </button>
        </div>
      ) : null}

      {hasAnswer ? (
        <div className="mt-4">
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
