"use client";

import type { CSSProperties } from "react";

import type { CoreTone } from "@/lib/pet/moodEngine";
import type { Cookie } from "@/lib/pet/types";

import styles from "./LearningCore.module.css";

type LearningCoreProps = {
  cookie: Cookie;
  tone: CoreTone;
  /*
   * What this particular core is doing, which is also how much rendering it
   * is allowed to spend. "resting" is the tray's default and stays cheap on
   * purpose — see the note in the module CSS. Only the core in the user's
   * hand gets the lift, the brighter chamber and the wider glow.
   */
  state?: "resting" | "lifted" | "attracted" | "absorbing";
  /*
   * Rendered only when the word was added today, and passed in rather than
   * read from a dictionary here so this file stays pure presentation.
   */
  newBadgeLabel?: string;
  /*
   * Staggers the resting ember so eight cores do not breathe in unison, which
   * is the single thing that would give the whole tray away as one animation
   * playing eight times.
   */
  index?: number;
  /*
   * Whether this Core runs its resting ember at all.
   *
   * Expanding the tray can put every unfed word on screen at once, and past
   * the first screenful the ember is a composited layer breathing where nobody
   * is looking. The tray turns it off beyond the rows it shows by default —
   * see CookieTray — which keeps the cost of the collection flat no matter how
   * far behind on feeding the user is.
   */
  animated?: boolean;
};

/*
 * A cookie, wearing Cosmic Mode's shell.
 *
 * Six layers over one 12-sided footprint: a machined chassis, a rim, an
 * energy chamber, the vocabulary glyph, a specular sheen, and a projected pad
 * underneath. None of them is a texture — every one is a gradient, so a core
 * is a handful of composited layers rather than an image request per word,
 * and the whole tray still costs nothing to scroll past.
 *
 * The object underneath is unchanged and still a cookie: same id, same word,
 * same glyph, same place in the same economy. This file only decides what it
 * looks like while the deck is powered up. Nothing about earning, feeding or
 * counting a cookie is reachable from here, and that separation is the reason
 * the refit could be this thorough without touching progression at all.
 */
export default function LearningCore({
  cookie,
  tone,
  state = "resting",
  newBadgeLabel,
  index = 0,
  animated = true,
}: LearningCoreProps) {
  return (
    <span
      className={styles.core}
      data-tone={tone}
      data-state={state}
      data-animated={animated ? "true" : "false"}
      style={{ "--core-index": index } as CSSProperties}
    >
      <span className={styles.chassis} aria-hidden="true" />
      <span className={styles.rim} aria-hidden="true" />
      <span className={styles.chamber} aria-hidden="true" />

      <span className={styles.glyph}>{cookie.glyph}</span>

      <span className={styles.gloss} aria-hidden="true" />

      {cookie.isNew && newBadgeLabel ? (
        <span className={styles.badge} aria-hidden="true">
          {newBadgeLabel}
        </span>
      ) : null}

      <span className={styles.pad} aria-hidden="true" />
    </span>
  );
}
