"use client";

import { ArrowDown, Bookmark, Check, Sparkles } from "lucide-react";
import { useId, useRef, useState } from "react";

import { ListenButton, Said, useSpeaker } from "@/components/landing/listen";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { keepPhrase, useNotebook } from "@/lib/landing/trialNotebook";
import { trialPhraseFor } from "@/lib/landing/trialPhrases";

import styles from "./HeroQuickCard.module.css";
import { phraseCardFor } from "./phraseCard";

type HeroCopy = TranslationDictionary["landing"]["hero"];

/* =========================================================
   Three taps, on the first screen (Chi, 2026-11-21: 第一屏三下就懂)

   The app in the time it takes to read its title: one real phrase, and
   the three things a reader does with every word they meet.

   1. Listen: it is read aloud and lit as it is said, as everywhere in the
      app (the landing's Said and ListenButton, over SpokenText).
   2. Tap it: Yumi's reading opens under it, the meaning and the closest
      thing to it in the reader's own language.
   3. Keep it: it flies into the notebook, the same notebook the trial
      under the hero keeps into and reviews from (lib/landing/
      trialNotebook.ts), so the deeper try starts where this one ended.

   The steps can be done in any order; each lights its number when done.
   Nothing here moves on its own, and under reduced motion nothing flies.
   ========================================================= */

const FLIGHT_MS = 620;

function reducedMotion() {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function HeroQuickCard({
  copy,
  trialId,
}: {
  copy: HeroCopy;
  /** The trial's element id, which "Go further" scrolls to. */
  trialId: string;
}) {
  const { quick, journey, trial } = copy;
  const phrase = trialPhraseFor(journey.phraseLang);
  const speaker = useSpeaker();
  const notebook = useNotebook();
  const readingId = useId();
  const phraseRef = useRef<HTMLSpanElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  const [heard, setHeard] = useState(false);
  const [open, setOpen] = useState(false);
  const kept = notebook.some(item => item.id === "phrase");
  const done = [heard, open, kept];

  function keep() {
    if (kept) return;
    keepPhrase(phraseCardFor(journey));
    if (!reducedMotion()) fly();
  }

  /*
   * The phrase's own letters, lifted off the card and flown to the
   * notebook pill: transform and opacity only, on a fixed copy, so nothing
   * in the hero is laid out again while it goes.
   */
  function fly() {
    const from = phraseRef.current;
    if (!from || typeof from.animate !== "function") return;
    // The pill mounts with the keep; measure it after React has drawn it.
    requestAnimationFrame(() => {
      const to = pillRef.current;
      if (!to) return;
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const ghost = document.createElement("span");
      ghost.textContent = journey.phrase;
      ghost.setAttribute("aria-hidden", "true");
      ghost.className = styles.ghost;
      // On <body>, outside the page's tokens: it takes the phrase's own
      // colour and type, so it is the same letters in either theme.
      const look = getComputedStyle(from);
      Object.assign(ghost.style, {
        left: `${a.left}px`,
        top: `${a.top}px`,
        width: `${a.width}px`,
        height: `${a.height}px`,
        color: look.color,
        fontFamily: look.fontFamily,
        fontSize: look.fontSize,
        fontWeight: look.fontWeight,
      });
      ghost.lang = journey.phraseLang;
      document.body.appendChild(ghost);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const flight = ghost.animate(
        [
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 28}px) scale(0.72)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.28)`, opacity: 0 },
        ],
        { duration: FLIGHT_MS, easing: "cubic-bezier(0.77, 0, 0.175, 1)", fill: "forwards" },
      );
      const land = () => {
        ghost.remove();
        to.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }],
          { duration: 260, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
        );
      };
      flight.onfinish = land;
      flight.oncancel = () => ghost.remove();
      // Whatever happens to the animation, the copy does not outstay it.
      window.setTimeout(() => ghost.remove(), FLIGHT_MS + 400);
    });
  }

  function goFurther() {
    const target = document.getElementById(trialId);
    if (!target) return;
    target.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  }

  const steps = [quick.listen, quick.word, quick.keep];
  const further = [trial.tabs.understand, trial.tabs.exchange, trial.tabs.review].join(" · ");

  return (
    <section className={styles.card} aria-label={quick.ariaLabel}>
      <ol className={styles.steps}>
        {steps.map((label, index) => (
          <li key={label} data-done={done[index] || undefined}>
            <span aria-hidden="true">
              {done[index] ? <Check size={11} strokeWidth={3} /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <div className={styles.phraseRow}>
        <button
          type="button"
          className={styles.phrase}
          aria-expanded={open}
          aria-controls={readingId}
          onClick={() => setOpen(value => !value)}
        >
          <span ref={phraseRef} className={styles.phraseText} lang={journey.phraseLang}>
            <Said text={journey.phrase} speech={phrase.speech} />
          </span>
          <span className={styles.reading} lang={journey.phraseLang}>
            {journey.reading}
          </span>
        </button>
        <span onClickCapture={() => setHeard(true)}>
          <ListenButton
            id="quick-phrase"
            text={journey.phrase}
            speech={phrase.speech}
            speaker={speaker}
            play={trial.listen.play}
            playing={trial.listen.playing}
            label={`${trial.listen.play}: ${journey.phrase}`}
            className={styles.listen}
            iconOnly
          />
        </span>
      </div>

      <div id={readingId} className={styles.yumi} hidden={!open}>
        <p className={styles.yumiLabel}>
          <Sparkles size={12} aria-hidden="true" /> {journey.understand.label}
        </p>
        <p>{journey.understand.meaning}</p>
        <p className={styles.equivalent}>
          {journey.understand.equivalentLabel}: <strong>{journey.understand.equivalent}</strong>
        </p>
      </div>

      <div className={styles.foot}>
        <button
          type="button"
          className={styles.keep}
          onClick={keep}
          aria-pressed={kept}
        >
          {kept ? <Check size={15} aria-hidden="true" /> : <Bookmark size={15} aria-hidden="true" />}
          {kept ? quick.kept : quick.keep}
        </button>
        <span
          ref={pillRef}
          className={styles.notebook}
          data-filled={notebook.length > 0 || undefined}
          role="status"
        >
          <Bookmark size={13} aria-hidden="true" />
          {quick.notebook.replace("{count}", String(notebook.length))}
        </span>
      </div>

      <button type="button" className={styles.further} onClick={goFurther}>
        {quick.more.replace("{steps}", further)}
        <ArrowDown size={14} aria-hidden="true" />
      </button>
    </section>
  );
}
