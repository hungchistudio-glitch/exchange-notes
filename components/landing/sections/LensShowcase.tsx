"use client";

import { useState } from "react";

import { ListenButton, useSpeaker } from "@/components/landing/listen";
import type { TranslationDictionary } from "@/lib/i18n/types";

import styles from "./LandingSections.module.css";

type LensCopy = TranslationDictionary["landing"]["lens"];
type LensFeature = "menu" | "target";

/*
 * What the camera does, shown rather than listed.
 *
 * Two features that are both "point it at something", and are otherwise
 * nothing alike: one reads a whole printed document and keeps its shape, the
 * other reads exactly one rectangle out of a crowded frame. They share a
 * panel because a reader deciding whether this app is for them is asking one
 * question — can it read the thing in front of me — and gets both answers.
 *
 * Each preview does the one thing its feature is for: a dish on the menu
 * can be tapped and heard, which is how you order it; and of the three
 * frames in the viewfinder the reader chooses the one it reads, because
 * choosing is the feature.
 *
 * The previews are drawn here rather than borrowed from the real screens.
 * MenuOverlayView and TargetOverlay want a scanned document and a live camera
 * between them, and neither belongs in the bundle of a page that has to paint
 * before anyone has signed in.
 */
export default function LensShowcase({ copy }: { copy: LensCopy }) {
  const [feature, setFeature] = useState<LensFeature>("menu");

  const features: ReadonlyArray<{
    key: LensFeature;
    label: string;
    blurb: string;
    cosmic?: boolean;
  }> = [
    { key: "menu", label: copy.menu.label, blurb: copy.menu.blurb, cosmic: true },
    { key: "target", label: copy.target.label, blurb: copy.target.blurb },
  ];

  const details =
    feature === "menu"
      ? [copy.menu.detailOne, copy.menu.detailTwo, copy.menu.detailThree]
      : [copy.target.detailOne, copy.target.detailTwo, copy.target.detailThree];

  return (
    <div className={styles.lens}>
      <div className={styles.lensStage} aria-label={copy.previewAriaLabel} role="group">
        {feature === "menu" ? <MenuScan copy={copy} /> : <TargetFocus copy={copy.target} />}
      </div>

      <div className={styles.lensPanel}>
        <div className={styles.lensButtons} role="group" aria-label={copy.pickerAriaLabel}>
          {features.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFeature(item.key)}
              aria-pressed={feature === item.key}
              className={styles.lensButton}
            >
              <span className={styles.lensButtonLabel}>
                {item.label}
                {item.cosmic ? <span className={styles.lensCosmicTag}>{copy.cosmicBadge}</span> : null}
              </span>
              <small>{item.blurb}</small>
            </button>
          ))}
        </div>

        <ul className={styles.lensDetails}>
          {details.map(detail => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/*
 * A menu, read and kept in place.
 *
 * Shows the printed line above the translation rather than instead of it —
 * that ordering is the feature. The price is repeated exactly as a menu
 * would print it, because "point at this on the real menu" only works if
 * the app did not tidy it into a number.
 */
function MenuScan({ copy }: { copy: LensCopy }) {
  const menu = copy.menu;
  const dishes = [
    { source: menu.demoSource, name: menu.demoName, reading: menu.demoIpa, price: menu.demoPrice },
    { source: menu.demoSecondSource, name: menu.demoSecondName, reading: menu.demoSecondIpa, price: menu.demoSecondPrice },
  ];
  const [chosen, setChosen] = useState(0);
  const speaker = useSpeaker();

  return (
    <div className={styles.menuScan}>
      <ul className={styles.menuList}>
        {dishes.map((dish, index) => (
          <li key={dish.source} className={styles.menuRow} data-chosen={chosen === index || undefined}>
            <button
              type="button"
              className={styles.menuPick}
              aria-pressed={chosen === index}
              onClick={() => setChosen(index)}
            >
              <span className={styles.menuSource} lang="zh-Hant">{dish.source}</span>
              <span className={styles.menuName}>{dish.name}</span>
              <span className={styles.menuIpa} lang="zh-Latn-pinyin">{dish.reading}</span>
            </button>
            <span className={styles.menuPrice}>{dish.price}</span>
            {chosen === index ? (
              <ListenButton
                id={`dish-${index}`}
                text={dish.source}
                speech="zh-TW"
                speaker={speaker}
                play={copy.listen}
                playing={copy.playing}
                label={`${copy.listen}: ${dish.source}`}
                className={styles.iconButton}
                iconOnly
              />
            ) : null}
          </li>
        ))}
      </ul>
      <p className={styles.menuFoot}>
        <span>{menu.demoConfidence}</span>
        <span>{menu.hint}</span>
      </p>
    </div>
  );
}

/*
 * A viewfinder with more than one thing in it.
 *
 * The candidates are thin and unfilled and the chosen one is marked at its
 * corners, which is how the real overlay draws them — selection is never
 * carried by colour alone there, and a preview that invented a different
 * rule would be teaching the wrong thing.
 */
function TargetFocus({ copy }: { copy: LensCopy["target"] }) {
  const [chosen, setChosen] = useState(0);

  return (
    <div className={styles.viewfinder}>
      {copy.demoOptions.map((option, index) => (
        <button
          key={option}
          type="button"
          className={styles.targetBox}
          data-slot={index}
          aria-pressed={chosen === index}
          aria-label={`${copy.demoCandidate}: ${option}`}
          onClick={() => setChosen(index)}
        >
          {chosen === index ? (
            <>
              <i aria-hidden="true" />
              <i aria-hidden="true" />
              <i aria-hidden="true" />
              <i aria-hidden="true" />
              <span className={styles.targetTag} aria-hidden="true">{copy.demoSelected}</span>
            </>
          ) : null}
        </button>
      ))}
      <p className={styles.targetResult} aria-live="polite">{copy.demoOptions[chosen]}</p>
      <p className={styles.targetHint}>{copy.hint}</p>
    </div>
  );
}
