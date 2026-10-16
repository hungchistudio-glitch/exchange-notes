"use client";

import { Lock, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { ListenButton, useSpeaker, type Speaker } from "@/components/landing/listen";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { NOTE_SAMPLES, noteOriginalFor } from "@/lib/landing/noteSamples";
import { LANGUAGE_CODES, getLanguage, type LanguageCode } from "@/lib/languages";
import { stopSpeech } from "@/lib/speech";

import styles from "./LandingSections.module.css";

type NotesCopy = TranslationDictionary["landing"]["notes"];

/** The app's language code for a BCP-47 tag ("zh-Hant" → "zh-TW"). */
export function languageCodeFor(lang: string): LanguageCode {
  const primary = lang.toLowerCase().split("-")[0];
  return (
    LANGUAGE_CODES.find(code => getLanguage(code).htmlLang.toLowerCase().split("-")[0] === primary) ??
    "en"
  );
}

/*
 * A bilingual note, the way the app keeps one.
 *
 * Both lines are always there: the sentence as it was written, and under
 * it the same sentence in whichever of the five languages the reader picks
 * — the note's "view in" in the app (Chi, 2026-10-16: keep the pair, let
 * any of the five languages be chosen beside it, each one heard). Each line
 * has its own voice, and the word for the feeling in either line can be
 * opened where it stands for its reading, meaning and sound. It is the same
 * word the next two sections send to a friend and bring back for review.
 */
export default function NotesShowcase({ copy }: { copy: NotesCopy }) {
  const [shown, setShown] = useState<LanguageCode>(() => languageCodeFor(copy.translationLang));
  const [open, setOpen] = useState<LanguageCode | null>(null);
  const speaker = useSpeaker();
  const lookupId = useId();

  const written = noteOriginalFor(shown);

  function choose(code: LanguageCode) {
    stopSpeech();
    setShown(code);
    setOpen(null);
  }

  return (
    <div className={styles.note} role="group" aria-label={copy.previewAriaLabel}>
      <div className={styles.noteTop}>
        <span className={styles.noteDate}>{copy.date}</span>
        <span className={styles.notePrivate}>
          <Lock size={12} aria-hidden="true" /> {copy.privateNote}
        </span>
      </div>

      <div className={styles.chips} role="group" aria-label={copy.viewLabel}>
        {LANGUAGE_CODES.map(code => (
          <button
            key={code}
            type="button"
            lang={getLanguage(code).htmlLang}
            aria-pressed={shown === code}
            onClick={() => choose(code)}
          >
            {getLanguage(code).endonym}
          </button>
        ))}
      </div>

      <div className={styles.noteBody}>
        <NoteLine
          code={written}
          className={styles.noteOriginal}
          copy={copy}
          speaker={speaker}
          open={open}
          onLookup={setOpen}
          lookupId={lookupId}
        />
        <span className={styles.noteRule} aria-hidden="true" />
        <NoteLine
          key={shown}
          code={shown}
          className={styles.noteTranslation}
          copy={copy}
          speaker={speaker}
          open={open}
          onLookup={setOpen}
          lookupId={lookupId}
        />
      </div>

      {open ? (
        <Lookup code={open} copy={copy} speaker={speaker} id={lookupId} onClose={() => setOpen(null)} />
      ) : (
        <p className={styles.hint}>{copy.lookupHint}</p>
      )}
    </div>
  );
}

/** One line of the note, its key word a button, with a voice of its own. */
function NoteLine({
  code,
  className,
  copy,
  speaker,
  open,
  onLookup,
  lookupId,
}: {
  code: LanguageCode;
  className: string;
  copy: NotesCopy;
  speaker: Speaker;
  open: LanguageCode | null;
  onLookup: (code: LanguageCode | null) => void;
  lookupId: string;
}) {
  const sample = NOTE_SAMPLES[code];
  const language = getLanguage(code);
  const at = sample.sentence.indexOf(sample.word);
  const isOpen = open === code;

  let body: ReactNode = sample.sentence;
  if (at >= 0) {
    body = (
      <>
        {sample.sentence.slice(0, at)}
        <button
          type="button"
          className={styles.lookupWord}
          // The other line's word lights up with it: the same feeling.
          data-linked={(open !== null && !isOpen) || undefined}
          aria-expanded={isOpen}
          aria-controls={isOpen ? lookupId : undefined}
          onClick={() => onLookup(isOpen ? null : code)}
        >
          {sample.word}
        </button>
        {sample.sentence.slice(at + sample.word.length)}
      </>
    );
  }

  return (
    <div className={styles.noteLine}>
      <p className={className} lang={language.htmlLang}>{body}</p>
      <ListenButton
        id={`sentence-${code}`}
        text={sample.sentence}
        speech={language.speechTag}
        speaker={speaker}
        play={copy.listen}
        playing={copy.playing}
        label={`${copy.listenSentence}: ${language.endonym}`}
        className={styles.iconButton}
        iconOnly
      />
    </div>
  );
}

function Lookup({
  code,
  copy,
  speaker,
  id,
  onClose,
}: {
  code: LanguageCode;
  copy: NotesCopy;
  speaker: Speaker;
  id: string;
  onClose: () => void;
}) {
  const sample = NOTE_SAMPLES[code];
  const language = getLanguage(code);
  return (
    <div id={id} className={styles.lookup}>
      <div className={styles.lookupHead}>
        <strong lang={language.htmlLang}>{sample.word}</strong>
        <span lang={language.htmlLang}>{sample.reading}</span>
      </div>
      {/* The feeling, said in the reader's own language: the same for every
          one of the five words. */}
      <p>{copy.meaning}</p>
      <div className={styles.lookupActions}>
        <ListenButton
          id={`word-${code}`}
          text={sample.word}
          speech={language.speechTag}
          speaker={speaker}
          play={copy.listen}
          playing={copy.playing}
          label={`${copy.listen}: ${sample.word}`}
          className={styles.pill}
        />
        <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={onClose}>
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
