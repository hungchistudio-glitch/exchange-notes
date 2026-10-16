"use client";

import { Bookmark, Check, RotateCcw, Send } from "lucide-react";
import { useState } from "react";

import { ListenButton, speechTagFor, useSpeaker, type Speaker } from "@/components/landing/listen";
import type { TranslationDictionary } from "@/lib/i18n/types";

import styles from "./LandingSections.module.css";

type ExchangeCopy = TranslationDictionary["landing"]["exchange"];
type Stage = "idle" | "sent" | "saved";

const fill = (template: string, friend: string) => template.replace("{friend}", friend);

function WordCard({
  copy,
  speaker,
  id,
}: {
  copy: ExchangeCopy;
  speaker: Speaker;
  id: string;
}) {
  const speech = speechTagFor(copy.wordLang);
  return (
    <article className={styles.wordCard}>
      <div className={styles.wordCardHead}>
        <strong lang={copy.wordLang}>{copy.word}</strong>
        {speech ? (
          <ListenButton
            id={id}
            text={copy.word}
            speech={speech}
            speaker={speaker}
            play={copy.listen}
            playing={copy.playing}
            label={`${copy.listen}: ${copy.word}`}
            className={styles.iconButton}
            iconOnly
          />
        ) : null}
      </div>
      <span lang={copy.wordLang}>{copy.reading}</span>
      <p>{copy.meaning}</p>
    </article>
  );
}

/*
 * A word card, passed to one friend.
 *
 * What the app does in a conversation (WordCardMessage): the card arrives
 * whole, with its reading and meaning; the friend can hear it and save it
 * to their own words. The reader plays both sides here — sends it, then
 * saves it as Mia would — and it is the same word the note above kept.
 */
export default function ExchangeShowcase({ copy }: { copy: ExchangeCopy }) {
  const [stage, setStage] = useState<Stage>("idle");
  const speaker = useSpeaker();
  const friend = copy.friend;

  return (
    <div className={styles.exchange} role="group" aria-label={copy.previewAriaLabel} data-stage={stage}>
      <div className={styles.pane}>
        <p className={styles.paneHead}>
          <span className={styles.avatar} data-tone="you" aria-hidden="true">
            {copy.you.charAt(0)}
          </span>
          {copy.you}
        </p>
        {stage === "idle" ? (
          <>
            <WordCard copy={copy} speaker={speaker} id="mine" />
            <button type="button" className={styles.primary} onClick={() => setStage("sent")}>
              <Send size={15} aria-hidden="true" />
              {fill(copy.send, friend)}
            </button>
          </>
        ) : (
          <p className={styles.sentNote}>
            <Check size={15} aria-hidden="true" /> {fill(copy.sent, friend)}
          </p>
        )}
      </div>

      <div className={styles.route} aria-hidden="true">
        <span />
      </div>

      <div className={styles.pane} data-side="friend">
        <p className={styles.paneHead}>
          <span className={styles.avatar} data-tone="friend" aria-hidden="true">
            {friend.charAt(0)}
          </span>
          {friend}
        </p>
        {stage === "idle" ? (
          <p className={styles.waiting}>{copy.waiting}</p>
        ) : (
          <div className={styles.arrival}>
            <WordCard copy={copy} speaker={speaker} id="theirs" />
            <p className={styles.small}>{copy.arrived}</p>
            <button
              type="button"
              className={stage === "saved" ? styles.secondary : styles.primary}
              onClick={() => setStage("saved")}
              disabled={stage === "saved"}
            >
              {stage === "saved" ? <Check size={15} aria-hidden="true" /> : <Bookmark size={15} aria-hidden="true" />}
              {stage === "saved" ? fill(copy.saved, friend) : copy.save}
            </button>
          </div>
        )}
      </div>

      <div className={styles.exchangeFoot}>
        <p className="sr-only" role="status">
          {stage === "sent" ? fill(copy.sent, friend) : stage === "saved" ? fill(copy.saved, friend) : ""}
        </p>
        {stage !== "idle" ? (
          <button type="button" className={styles.textButton} onClick={() => setStage("idle")}>
            <RotateCcw size={14} aria-hidden="true" /> {copy.again}
          </button>
        ) : null}
      </div>
    </div>
  );
}
