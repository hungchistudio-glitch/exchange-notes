"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { subscribeToHomeMoments, type HomeMoment } from "@/lib/home/homeMoments";
import {
  COACH_FINISHED,
  getCoachStep,
  getServerCoachStep,
  setCoachStep,
  subscribeToCoach,
} from "@/lib/home/tutorialCoach";
import { subscribeToWordSaved } from "@/lib/pet/wordSaved";

import styles from "./TutorialCoach.module.css";

/* =========================================================
   The tour you do

   The old one was seven pages of description, and the page about navigation
   described a dock that no longer exists. Somebody read it, pressed Finish,
   and arrived on a screen they had still never touched.

   This one asks. Each step names one thing to do on the screen the reader is
   already looking at, and then waits for that thing to actually happen — the
   ring coming out, a lookup coming back, a word being kept, a cookie
   reaching her. Nothing advances because a button was pressed to make the
   words go away.

   Which is why it does not cover anything. It is a strip at the top with no
   scrim under it: the whole point is that Yumi, the field and the biscuits
   are reachable while it is up. It gets out of the way entirely while the
   ring is out, because the ring lands where it is standing.

   The last two steps have nothing to press on this screen — a friend to send
   a word to and a note to write are both somewhere else — so they are
   offers with a door rather than pretending to be tasks.
   ========================================================= */

type Step = {
  key: "meet" | "ask" | "keep" | "feed" | "share" | "notes" | "close";
  /** The event that satisfies it. Absent on the steps that only invite. */
  awaits?: HomeMoment | "word-saved";
  href?: string;
};

const STEPS: Step[] = [
  { key: "meet", awaits: "ring-opened" },
  { key: "ask", awaits: "word-answered" },
  { key: "keep", awaits: "word-saved" },
  { key: "feed", awaits: "word-fed" },
  { key: "share", href: "/messages" },
  { key: "notes", href: "/notes" },
  { key: "close" },
];

/** Long enough to read one word, short enough not to be a wait. */
const DONE_BEAT_MS = 900;

export default function TutorialCoach() {
  const { t } = useTranslation();
  const copy = t.tutorial.coach;

  const step = useSyncExternalStore(
    subscribeToCoach,
    getCoachStep,
    getServerCoachStep,
  );

  const [satisfied, setSatisfied] = useState(false);

  const current = STEPS[step];
  const awaiting = current?.awaits;

  const advance = useCallback(() => {
    setSatisfied(false);
    setCoachStep(step + 1 >= STEPS.length ? COACH_FINISHED : step + 1);
  }, [step]);

  /*
   * Watching the screen rather than the reader's patience.
   *
   * Both stores are listened to at once because "the reader kept a word" is
   * announced by the vocabulary side and the other three by the home side,
   * and which module owns an event is not something this component should
   * make the reader care about.
   */
  useEffect(() => {
    if (!awaiting) return;

    let cancelled = false;

    const satisfy = () => {
      if (cancelled) return;
      setSatisfied(true);
    };

    const stopMoments = subscribeToHomeMoments((moment) => {
      if (moment === awaiting) satisfy();
    });

    const stopSaves =
      awaiting === "word-saved"
        ? subscribeToWordSaved(({ duplicate }) => {
            /* A word they already had is not a word they just kept, and
               telling them "good" for it would be the tour lying to make
               itself progress. */
            if (!duplicate) satisfy();
          })
        : () => {};

    return () => {
      cancelled = true;
      stopMoments();
      stopSaves();
    };
  }, [awaiting]);

  /* The beat between doing it and being asked for the next thing. */
  useEffect(() => {
    if (!satisfied) return;
    const timer = window.setTimeout(advance, DONE_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [advance, satisfied]);

  if (!current) return null;

  const stepCopy = copy.steps[current.key];
  const isLast = step === STEPS.length - 1;

  return (
    <aside
      className={styles.coach}
      /* Announced as a live region rather than as a dialog: it interrupts
         nothing, takes no focus, and the reader is meant to keep using the
         screen while it is up. */
      role="status"
      aria-live="polite"
    >
      <div className={styles.card}>
        <p className={styles.label}>
          {copy.label
            .replace("{current}", String(step + 1))
            .replace("{total}", String(STEPS.length))}
        </p>

        <p className={styles.body}>
          {satisfied ? copy.done : stepCopy.body}
        </p>

        <div className={styles.keys}>
          {/*
            A waiting step has no "next".

            Offering one would make every instruction optional, and an
            instruction the reader can dismiss is a sentence rather than a
            step. Skip is always there, because a tour nobody can leave is a
            worse thing than a tour nobody finishes.
          */}
          {current.href ? (
            <Link
              href={current.href}
              className={styles.door}
              onClick={advance}
            >
              {"action" in stepCopy ? stepCopy.action : ""}
            </Link>
          ) : null}

          {awaiting ? (
            <span className={styles.waiting} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          ) : (
            <button type="button" className={styles.next} onClick={advance}>
              {isLast ? copy.finish : copy.next}
            </button>
          )}

          <button
            type="button"
            className={styles.skip}
            onClick={() => setCoachStep(COACH_FINISHED)}
          >
            {copy.skip}
          </button>
        </div>
      </div>
    </aside>
  );
}
