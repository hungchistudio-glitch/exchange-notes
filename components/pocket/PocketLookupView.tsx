"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BookmarkPlus,
  Check,
  Mic,
  Search,
  Volume2,
} from "lucide-react";
import { useRef, type ReactNode } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import {
  getLanguage,
  getLanguageName,
  LANGUAGE_CODES,
  type LanguageCode,
} from "@/lib/languages";
import type { LexiconEntry } from "@/lib/lexicon/types";
import { speak } from "@/lib/speech";

import styles from "./PocketLookup.module.css";

export type PocketViewProps = {
  /** The share extension's preview: no voice key, a different title. */
  share?: boolean;
  cosmic: boolean;
  query: string;
  onQuery: (query: string) => void;
  onSubmit: () => void;
  pair: readonly [LanguageCode, LanguageCode];
  onPair: (learning: LanguageCode, translation: LanguageCode) => void;
  entry: LexiconEntry | null;
  busy: boolean;
  failed: boolean;
  saved: boolean;
  saving: boolean;
  /** Absent where saving is not offered (the review, the share preview). */
  onSave?: () => void;
  onVoice: () => void;
  voicePanel?: ReactNode;
  notice?: string;
};

/**
 * Yumi Pocket Lookup's one screen, drawn from props alone (Chi, 2026-11-12:
 * Yumi 隨行查字).
 *
 * The signed-in page (PocketLookup), the development review and the share
 * preview all draw this, so the three cannot drift apart. It owns no
 * lookup, saving or listening of its own; what it is handed is all it
 * shows.
 */
export default function PocketLookupView(props: PocketViewProps) {
  const { t, language } = useTranslation();
  const copy = t.pocket;
  const input = useRef<HTMLInputElement>(null);
  const { entry, pair } = props;
  // The result names its own languages, which may differ from the pair
  // chosen (a word typed in the other language is looked up the other way).
  const source = entry?.termLanguage ?? pair[0];
  const target = entry?.translationLanguage ?? pair[1];

  function speaker(text: string, code: LanguageCode) {
    return (
      <button
        type="button"
        className={styles.icon}
        aria-label={`${copy.speak}: ${getLanguageName(code, language)}`}
        onClick={() => speak(text, getLanguage(code).speechTag)}
      >
        <Volume2 size={19} />
      </button>
    );
  }

  /* The two language selects can never hold the same language: choosing
     the one the other side has swaps them. */
  function chooseSource(next: LanguageCode) {
    props.onPair(next, next === pair[1] ? pair[0] : pair[1]);
  }

  function chooseTarget(next: LanguageCode) {
    props.onPair(next === pair[0] ? pair[1] : pair[0], next);
  }

  const options = LANGUAGE_CODES.map((code) => (
    <option key={code} value={code}>
      {getLanguageName(code, language)}
    </option>
  ));

  return (
    <main className={styles.page} data-cosmic={props.cosmic}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <Link href="/home" className={styles.icon} aria-label={copy.home}>
            <ArrowLeft size={20} />
          </Link>
          <h1>{props.share ? copy.shareTitle : copy.title}</h1>
          <span aria-hidden="true" />
        </header>

        <form
          className={styles.search}
          onSubmit={(event) => {
            event.preventDefault();
            props.onSubmit();
            input.current?.blur();
          }}
        >
          <Search size={20} aria-hidden="true" />
          <input
            ref={input}
            value={props.query}
            onChange={(event) => props.onQuery(event.target.value)}
            aria-label={copy.search}
            placeholder={copy.placeholder}
            enterKeyHint="search"
            maxLength={200}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {props.query.trim() ? (
            <button
              className={styles.icon}
              type="submit"
              disabled={props.busy}
              aria-label={copy.search}
            >
              <ArrowRight size={20} />
            </button>
          ) : null}
          {props.share ? null : (
            <button
              className={styles.icon}
              type="button"
              aria-label={copy.voice}
              onClick={props.onVoice}
            >
              <Mic size={20} />
            </button>
          )}
        </form>

        <div className={styles.langs}>
          <select
            aria-label={copy.source}
            value={pair[0]}
            onChange={(event) => chooseSource(event.target.value as LanguageCode)}
          >
            {options}
          </select>
          <button
            className={styles.icon}
            type="button"
            aria-label={copy.swap}
            onClick={() => props.onPair(pair[1], pair[0])}
          >
            <ArrowLeftRight size={17} />
          </button>
          <select
            aria-label={copy.target}
            value={pair[1]}
            onChange={(event) => chooseTarget(event.target.value as LanguageCode)}
          >
            {options}
          </select>
        </div>

        {props.voicePanel}
        {props.notice ? (
          <p className={styles.notice} role="status">
            {props.notice}
          </p>
        ) : null}
        {props.busy ? (
          <p className={styles.notice} role="status">
            {copy.searching}
          </p>
        ) : null}
        {props.failed ? (
          <p className={styles.notice} role="alert">
            {copy.failed}
          </p>
        ) : null}

        {entry && !props.busy ? (
          <>
            <article className={styles.card} aria-label={copy.result}>
              <p className={styles.label}>{getLanguageName(source, language)}</p>
              <div className={styles.word}>
                <h2>{entry.term}</h2>
                {speaker(entry.term, source)}
              </div>
              {entry.termIpa ? <p className={styles.muted}>{entry.termIpa}</p> : null}
              <div className={styles.rule} />
              <p className={styles.label}>{getLanguageName(target, language)}</p>
              <div className={styles.word}>
                <h3>{entry.translation}</h3>
                {speaker(entry.translation, target)}
              </div>
              {entry.termExample ? (
                <div className={styles.example}>
                  <p>{entry.termExample}</p>
                  <p>{entry.translationExample}</p>
                </div>
              ) : null}
            </article>

            {props.onSave ? (
              <button
                className={styles.save}
                disabled={props.saved || props.saving}
                onClick={props.onSave}
                type="button"
              >
                {props.saved ? <Check size={18} /> : <BookmarkPlus size={18} />}{" "}
                {props.saved ? copy.saved : props.saving ? copy.saving : copy.save}
              </button>
            ) : null}
          </>
        ) : null}

        {!entry && !props.busy && !props.failed && !props.voicePanel ? (
          <p className={styles.empty}>{copy.empty}</p>
        ) : null}
      </div>
    </main>
  );
}
