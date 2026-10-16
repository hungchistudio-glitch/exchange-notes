"use client";

import { Lock, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { ListenButton, speechTagFor, useSpeaker } from "@/components/landing/listen";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { LANGUAGE_CODES, getLanguage, type LanguageCode } from "@/lib/languages";

import styles from "./LandingSections.module.css";

type NotesCopy = TranslationDictionary["landing"]["notes"];
type View = "both" | "original" | "translation";

/** The app's language code for a BCP-47 tag ("zh-Hant" → "zh-TW"). */
export function languageCodeFor(lang: string): LanguageCode {
  const primary = lang.toLowerCase().split("-")[0];
  return (
    LANGUAGE_CODES.find(code => getLanguage(code).htmlLang.toLowerCase().split("-")[0] === primary) ??
    "en"
  );
}

/**
 * A line of the note with its key word set apart: the word to look up as a
 * button, its counterpart in the other language as a quiet mark.
 */
function Highlighted({
  text,
  word,
  pair,
  open,
  onLookup,
  lookupId,
}: {
  text: string;
  word: string;
  pair: string;
  open: boolean;
  onLookup: () => void;
  lookupId: string;
}): ReactNode {
  const at = text.indexOf(word);
  if (at >= 0) {
    return (
      <>
        {text.slice(0, at)}
        <button
          type="button"
          className={styles.lookupWord}
          aria-expanded={open}
          aria-controls={lookupId}
          onClick={onLookup}
        >
          {word}
        </button>
        {text.slice(at + word.length)}
      </>
    );
  }
  const pairAt = text.indexOf(pair);
  if (pairAt >= 0) {
    return (
      <>
        {text.slice(0, pairAt)}
        <mark className={styles.pairWord} data-linked={open || undefined}>{pair}</mark>
        {text.slice(pairAt + pair.length)}
      </>
    );
  }
  return text;
}

/*
 * A bilingual note, the way the app keeps one.
 *
 * It used to be a picture of a note, turned a degree on the page with ruled
 * lines that ran through its words. Now it does what a note does in the
 * app: it can be read in either language or both (the note's "view in"),
 * the sentence can be heard, and the word that sent the reader to the note
 * can be looked up where it stands — the same word the next two sections
 * send to a friend and bring back for review.
 */
export default function NotesShowcase({ copy }: { copy: NotesCopy }) {
  const [view, setView] = useState<View>("both");
  const [open, setOpen] = useState(false);
  const speaker = useSpeaker();
  const lookupId = useId();

  const originalCode: LanguageCode = "en";
  const translationCode = languageCodeFor(copy.translationLang);
  const { lookup } = copy;
  const lookupSpeech = speechTagFor(lookup.lang);
  const lookupInOriginal = copy.original.includes(lookup.word);
  const lookupVisible = view === "both" || (view === "original") === lookupInOriginal;

  const views: Array<{ id: View; label: string }> = [
    { id: "both", label: copy.viewBoth },
    // Each language by its own name, as the page's language picker does:
    // "Traditional Chinese" wrapped the control onto two lines on a phone.
    { id: "original", label: getLanguage(originalCode).endonym },
    { id: "translation", label: getLanguage(translationCode).endonym },
  ];

  const line = (text: string) => (
    <Highlighted
      text={text}
      word={lookup.word}
      pair={lookup.pair}
      open={open && lookupVisible}
      onLookup={() => setOpen(value => !value)}
      lookupId={lookupId}
    />
  );

  return (
    <div className={styles.note} role="group" aria-label={copy.previewAriaLabel}>
      <div className={styles.noteTop}>
        <span className={styles.noteDate}>{copy.date}</span>
        <span className={styles.notePrivate}>
          <Lock size={12} aria-hidden="true" /> {copy.privateNote}
        </span>
      </div>

      <div className={styles.segmented} role="group" aria-label={copy.viewLabel}>
        {views.map(item => (
          <button
            key={item.id}
            type="button"
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.noteBody}>
        {view !== "translation" ? (
          <div className={styles.noteLine}>
            <p className={styles.noteOriginal} lang="en">{line(copy.original)}</p>
            <ListenButton
              id="sentence"
              text={copy.original}
              speech={getLanguage(originalCode).speechTag}
              speaker={speaker}
              play={copy.listen}
              playing={copy.playing}
              label={copy.listenSentence}
              className={styles.iconButton}
              iconOnly
            />
          </div>
        ) : null}
        {view === "both" ? <span className={styles.noteRule} aria-hidden="true" /> : null}
        {view !== "original" ? (
          <p className={styles.noteTranslation} lang={copy.translationLang}>{line(copy.translation)}</p>
        ) : null}
      </div>

      {open && lookupVisible ? (
        <div id={lookupId} className={styles.lookup}>
          <div className={styles.lookupHead}>
            <strong lang={lookup.lang}>{lookup.word}</strong>
            <span lang={lookup.lang}>{lookup.reading}</span>
          </div>
          <p>{lookup.meaning}</p>
          <div className={styles.lookupActions}>
            {lookupSpeech ? (
              <ListenButton
                id="word"
                text={lookup.word}
                speech={lookupSpeech}
                speaker={speaker}
                play={copy.listen}
                playing={copy.playing}
                className={styles.pill}
              />
            ) : null}
            <button type="button" className={styles.iconButton} aria-label={copy.close} onClick={() => setOpen(false)}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.hint} data-hidden={!lookupVisible || undefined}>{copy.lookupHint}</p>
      )}
    </div>
  );
}
