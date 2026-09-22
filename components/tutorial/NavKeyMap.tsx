"use client";

import { useEffect, useState } from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import Yumi3DFigure from "@/components/yumi3d/Yumi3DFigure";
import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavHomeIcon from "@/components/foundation/icons/NavHomeIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSearchIcon from "@/components/foundation/icons/NavSearchIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import styles from "@/components/tutorial/NavKeyMap.module.css";
import useTranslation from "@/hooks/i18n/useTranslation";

/* The dock's own order, and it has to stay the dock's own order — the claim
   of the lower half of this slide is that these six never move, once you have
   left the home screen. See ProtectedNav. */
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
 * The six keys of the dock, each with its icon and its name.
 *
 * The layout is the whole point. The version this replaces set the icon beside
 * the name in a three-column grid at `max-w-[18rem]`, which leaves roughly
 * twenty-six pixels for a label once the icon, its circle and the padding have
 * taken their share — so English lost the end of "Vocabulary" and Italian had
 * nowhere at all to put "Impostazioni". Stacking the name under the icon hands
 * it the full width of its own cell, which is more than the longest of the five
 * languages needs even on a 320px screen.
 *
 * Nothing here is a still. The highlight walks the six on a loop, using each
 * icon's own `active` art — the same art the real dock shows when you tap it —
 * so the slide demonstrates the sentence its copy makes: the row does not
 * rearrange itself, only the ring moves.
 */
export default function NavKeyMap() {
  // useTranslation last: it throws on a dictionary that has not been loaded,
  // and a hook declared after a throwing call would not survive the replay.
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
        Two halves, because the app now navigates two ways and a slide that
        showed only one of them would be teaching something false. Above: the
        home screen, where Yumi is the navigation. Below: everywhere else,
        where the six keys are, in the order they are always in.
      */}
      <p className={styles.caption}>{t.tutorial.steps.dock.homeLabel}</p>

      <div className={styles.homeKey}>
        <div className={styles.yumiWell}>
          <Yumi3DFigure interactive={false} fill={0.44}>
            <ExchangeNotesMark />
          </Yumi3DFigure>
        </div>
        <span className={styles.ringHint} aria-hidden="true" />
      </div>

      <p className={styles.caption}>{t.tutorial.steps.dock.dockLabel}</p>

      <div
        className={styles.grid}
        role="list"
        aria-label={t.navigation.primaryLabel}
      >
        {KEYS.map(({ key, Icon }, index) => (
          <span
            key={key}
            role="listitem"
            className={styles.key}
            data-active={index === active}
          >
            <span aria-hidden="true" className={styles.iconWell}>
              <Icon className={styles.icon} active={index === active} />
            </span>

            <span className={styles.name}>{t.navigation[key]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
