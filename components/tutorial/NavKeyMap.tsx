"use client";

import { useEffect, useState } from "react";

import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavHomeIcon from "@/components/foundation/icons/NavHomeIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSearchIcon from "@/components/foundation/icons/NavSearchIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import styles from "@/components/tutorial/NavKeyMap.module.css";
import useTranslation from "@/hooks/i18n/useTranslation";

/* The dock's own order, and it has to stay the dock's own order — the whole
   claim of this slide is that these six never move. See ProtectedNav. */
const KEYS = [
  { key: "vocabulary", Icon: NavVocabularyIcon },
  { key: "messages", Icon: NavMessagesIcon },
  { key: "home", Icon: NavHomeIcon },
  { key: "search", Icon: NavSearchIcon },
  { key: "discover", Icon: NavDiscoverIcon },
  { key: "settings", Icon: NavSettingsIcon },
] as const;

const DWELL_MS = 1500;

/**
 * The bottom dock, drawn at rest, with the active ring walking along it.
 *
 * This replaced five consecutive slides that each introduced one dock icon in
 * isolation. Five slides could say where each key was; none of them could show
 * the thing that actually matters about the dock, which is that the row does
 * not rearrange itself — and a ring travelling across a bar that stays put says
 * that in about two seconds without a word of copy.
 *
 * The name of the key under the ring is printed once, below, rather than
 * beside each of six icons. That is the layout decision this component exists
 * to make: six labels on one row is where the tour used to clip "Vocabulary"
 * down to "Vocabula" in English and had nowhere at all to put "Impostazioni".
 * One label at a time has the full width of the frame, so nothing is ever
 * shortened, in any of the five languages — and the caption box reserves the
 * height of two lines so a longer language does not make the slide jump.
 */
export default function NavKeyMap() {
  // useTranslation last: it suspends on a cold dictionary, and a hook declared
  // after it would not exist on the discarded first attempt. Same reasoning as
  // TutorialOverlay, which spells it out.
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % KEYS.length),
      DWELL_MS,
    );

    return () => window.clearInterval(timer);
  }, []);

  const { t } = useTranslation();

  return (
    <div className={styles.wrap}>
      {/*
       * A real list, not a decoration.
       *
       * The visible design shows one key name at a time — that is what stops
       * "Vocabulary" being clipped to "Vocabula" and gives "Impostazioni"
       * somewhere to go. But one name at a time is a solution to a width
       * problem, and a screen reader does not have a width problem: hiding the
       * dock from it would mean a reader who cannot see the icons never hears
       * what the six keys are, which is the entire content of this slide.
       *
       * So every key carries its own name in the accessibility tree and only
       * the caption below carries it on screen.
       */}
      <div
        className={styles.dock}
        role="list"
        aria-label={t.navigation.primaryLabel}
      >
        {/* One element, moved — not six that take turns being lit. The claim is
            that a single ring travels, so a single ring travels. */}
        <span
          aria-hidden="true"
          className={styles.indicator}
          style={{ transform: `translateX(${active * 100}%)` }}
        />

        {KEYS.map(({ key, Icon }, index) => (
          <span
            key={key}
            role="listitem"
            className={styles.key}
            data-active={index === active}
          >
            <Icon className={styles.icon} active={index === active} />
            <span className="sr-only">{t.navigation[key]}</span>
          </span>
        ))}
      </div>

      <p aria-hidden="true" className={styles.caption}>
        {/* Keyed so each name fades in on its own rather than cross-fading
            through a frame where the two overlap. */}
        <span key={KEYS[active].key} className={styles.captionText}>
          {t.navigation[KEYS[active].key]}
        </span>
      </p>
    </div>
  );
}
