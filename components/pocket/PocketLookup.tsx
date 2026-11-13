"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import { VoiceCaptureStatus, VoiceMicButton } from "@/components/lexicon/VoiceCapture";
import {
  LocalLearningLanguageProvider,
  useLearningLanguageContext,
} from "@/contexts/LearningLanguageContext";
import { useVocabulary } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useLexiconSave from "@/hooks/lexicon/useLexiconSave";
import useLexiconSearch from "@/hooks/lexicon/useLexiconSearch";
import useCosmicMode from "@/hooks/useCosmicMode";
import useVoiceInput from "@/hooks/useVoiceInput";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { transcribeSpeech, warmVoiceLookup } from "@/lib/lexicon/voiceLookup";

import PocketLookupView from "./PocketLookupView";
import styles from "./PocketLookup.module.css";

const VoiceSea = dynamic(() => import("@/components/voice/VoiceSea"), { ssr: false });

/**
 * /lookup: the screen Yumi Pocket Lookup's widget opens (Chi, 2026-11-12).
 *
 * The app's own lookup and saving (useLexiconSearch, useLexiconSave), on a
 * page of its own with nothing else on it. The language pair starts as the
 * account's, and may be changed here for one lookup without changing what
 * the account studies (LocalLearningLanguageProvider). A changed pair is a
 * new session, so a result never shows under the wrong pair; the typed
 * word survives it.
 */
export default function PocketLookup({ inputMode = "text" }: { inputMode?: "text" | "voice" }) {
  const { languagePair } = useLearningLanguageContext();
  const [pair, setPair] = useState(languagePair);
  const [draft, setDraft] = useState("");
  const choosePair = useCallback((learning: LanguageCode, translation: LanguageCode) => {
    setPair([learning, translation]);
  }, []);

  return (
    <LocalLearningLanguageProvider pair={pair} onPair={choosePair}>
      <LookupSession
        key={pair.join(":")}
        inputMode={inputMode}
        draft={draft}
        onDraft={setDraft}
        onPair={choosePair}
      />
    </LocalLearningLanguageProvider>
  );
}

function LookupSession({
  inputMode,
  onPair,
  draft,
  onDraft,
}: {
  inputMode: "text" | "voice";
  onPair: (learning: LanguageCode, translation: LanguageCode) => void;
  draft: string;
  onDraft: (value: string) => void;
}) {
  const { t } = useTranslation();
  const { items, addItem } = useVocabulary();
  const { languagePair: pair } = useLearningLanguageContext();
  const cosmic = useCosmicMode();
  const [voiceOpen, setVoiceOpen] = useState(inputMode === "voice");
  const search = useLexiconSearch({ items });
  const save = useLexiconSave({ result: search.result, items, onSaved: addItem });

  /* A transcription that comes back after the reader has typed, changed
     language or left is for a lookup nobody wants any more: each listen
     takes a generation, and only the current one may answer. */
  const voiceGeneration = useRef(0);
  const voice = useVoiceInput({
    lang: getLanguage(pair[0]).speechTag,
    onResult: (text) => {
      onDraft(text);
      search.submit(text, "voice");
      setVoiceOpen(false);
    },
    onAudio: async (audio) => {
      const generation = voiceGeneration.current;
      const heard = await transcribeSpeech(audio);
      if (generation !== voiceGeneration.current) return "handled";
      if (heard.outcome === "handled") {
        onDraft(heard.text);
        search.submit(heard.text, "voice");
        setVoiceOpen(false);
      }
      return heard.outcome;
    },
    onStart: () => {
      voiceGeneration.current++;
      warmVoiceLookup();
    },
  });

  const cancelRecording = voice.cancel;
  const cancel = useCallback(() => {
    voiceGeneration.current++;
    cancelRecording();
  }, [cancelRecording]);

  // Listening stops the moment the page is hidden or left; never in the background.
  useEffect(() => {
    const hide = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      cancel();
    };
  }, [cancel]);

  const resetSearch = search.reset;
  useEffect(() => () => resetSearch(), [resetSearch]);

  const state = save.stateFor();

  const voicePanel = voiceOpen ? (
    <section className={styles.voice}>
      <h2>{t.pocket.voiceReady}</h2>
      {voice.supported ? (
        <>
          <VoiceMicButton
            phase={voice.phase}
            listening={voice.listening}
            levelRef={voice.bindLevel}
            onPress={voice.toggle}
            className={styles.icon}
            idleClassName=""
            activeClassName=""
          />
          <p>{voice.phase === "idle" ? t.pocket.voiceStart : ""}</p>
        </>
      ) : (
        <p>{t.pocket.voiceUnavailable}</p>
      )}
      <VoiceCaptureStatus
        phase={voice.phase}
        listening={voice.listening}
        caption={voice.caption}
        notice={voice.notice}
        tone={cosmic ? "cosmic" : "warm"}
      />
      <VoiceSea phase={voice.phase} />
    </section>
  ) : undefined;

  return (
    <PocketLookupView
      cosmic={cosmic}
      pair={pair}
      onPair={onPair}
      query={draft}
      onQuery={(value) => {
        cancel();
        search.reset();
        search.setQuery(value);
        onDraft(value);
      }}
      onSubmit={() => {
        cancel();
        setVoiceOpen(false);
        search.reset();
        search.submit(draft);
      }}
      entry={search.result?.entry ?? null}
      busy={search.status === "searching"}
      failed={Boolean(search.error)}
      saved={state === "saved" || state === "duplicate"}
      saving={state === "saving"}
      onSave={() => void save.save()}
      notice={state === "error" ? t.pocket.saveFailed : undefined}
      onVoice={() => {
        setVoiceOpen(true);
        if (voice.supported) voice.toggle();
      }}
      voicePanel={voicePanel}
    />
  );
}
