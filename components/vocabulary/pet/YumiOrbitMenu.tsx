"use client";

import { AudioLines, Brain, FolderHeart, ScanLine, Sparkles, X } from "lucide-react";
import { useState, type ComponentType, type CSSProperties } from "react";

import type { TranslationDictionary } from "@/lib/i18n/types";
import {
  placeCapabilities,
  type HaloCapabilityKey,
  type HaloSurface,
} from "@/lib/pet/commandHalo";
import type {
  YumiLookTarget,
  YumiOrbitPhase,
} from "@/hooks/pet/useYumiOrbitMenu";

import styles from "./YumiOrbitMenu.module.css";

type MascotCopy = TranslationDictionary["vocabulary"]["mascot"];

type YumiOrbitMenuProps = {
  phase: YumiOrbitPhase;
  copy: MascotCopy;
  /* Which page the halo was opened from — decides what the first orbit
     carries. See lib/pet/commandHalo.ts. */
  surface?: HaloSurface;
  onClose: () => void;
  onLook: (target: YumiLookTarget) => void;
  onReview: () => void;
  onAddWord: () => void;
  onCamera: () => void;
  onSpeak: () => void;
  onCollect: () => void;
};

const ICONS: Record<
  HaloCapabilityKey,
  ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  review: Brain,
  add: Sparkles,
  camera: ScanLine,
  speak: AudioLines,
  // The same glyph the vocabulary toolbar already uses for collections, so
  // the halo is a second door onto a room rather than a second room.
  collect: FolderHeart,
};

/*
 * The Yumi Cosmic Command Halo.
 *
 * What opens when Yumi is tapped is not a set of buttons parked beside the
 * character — it is Yumi's orbital system widening into the range where its
 * capabilities live. The halo itself is the sentence: Yumi is now actionable.
 *
 * Three rules make that read, and all three were missing before:
 *
 *   1. Nothing enters Yumi. Every node sits past a safe radius derived from
 *      Yumi's own size, so the character can grow or shrink and the halo
 *      follows it instead of landing on its face.
 *   2. Not every capability is equal. The top-ranked ones ride a nearer orbit
 *      at a larger size; the rest are smaller and further out.
 *   3. The ranking belongs to the page, not to this file. A halo opened over
 *      Messages should lead with Decode, not with review.
 *
 * All of that arithmetic is in lib/pet/commandHalo.ts. This component places
 * what it is handed and owns only the focus behaviour.
 */
export default function YumiOrbitMenu({
  phase,
  copy,
  surface = "vocabulary",
  onClose,
  onLook,
  onReview,
  onAddWord,
  onCamera,
  onSpeak,
  onCollect,
}: YumiOrbitMenuProps) {
  /*
   * Which node the finger or the focus ring is currently on. Held here rather
   * than left to :hover because the same state has to reach three places at
   * once — the node lifts, its siblings dim, and the connector to Yumi
   * appears — and because on a touch screen there is no hover to read.
   */
  const [focused, setFocused] = useState<HaloCapabilityKey | null>(null);

  if (phase === "closed") return null;

  const handlers: Record<HaloCapabilityKey, () => void> = {
    review: onReview,
    add: onAddWord,
    camera: onCamera,
    speak: onSpeak,
    collect: onCollect,
  };

  const names: Record<HaloCapabilityKey, string> = {
    review: copy.haloReviewName,
    add: copy.haloAddName,
    camera: copy.haloCameraName,
    speak: copy.haloSpeakName,
    collect: copy.haloCollectName,
  };

  const blurbs: Record<HaloCapabilityKey, string> = {
    review: copy.haloReviewBlurb,
    add: copy.haloAddBlurb,
    camera: copy.haloCameraBlurb,
    speak: copy.haloSpeakBlurb,
    collect: copy.haloCollectBlurb,
  };

  const labels: Record<HaloCapabilityKey, string> = {
    review: copy.reviewActionLabel,
    add: copy.addWordActionLabel,
    camera: copy.cameraActionLabel,
    speak: copy.speakActionLabel,
    collect: copy.collectActionLabel,
  };

  const capabilities = placeCapabilities(surface);

  function focus(key: HaloCapabilityKey, look: YumiLookTarget) {
    setFocused(key);
    onLook(look);
  }

  function blur() {
    setFocused(null);
    onLook("viewer");
  }

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        data-phase={phase}
        onClick={onClose}
        aria-label={copy.closeActionsAriaLabel}
      />

      <div
        className={styles.halo}
        data-phase={phase}
        data-focused={focused ? "true" : "false"}
        role="group"
        aria-label={copy.actionMenuAriaLabel}
      >
        {/*
          The halo itself: the 270° ring with its gap at the bottom, and a
          fainter second ring marking the utility orbit. Drawn before the
          nodes so the nodes sit on the ring rather than under it.
        */}
        <span className={styles.ring} aria-hidden="true" />
        <span className={styles.ringOuter} aria-hidden="true" />

        {/*
          One connector per capability, all anchored at Yumi's centre and
          rotated to their station. Invisible until focused — the line is the
          answer to "which of these am I touching", not decoration.
        */}
        {capabilities.map((capability) => (
          <span
            key={`link-${capability.key}`}
            className={styles.link}
            aria-hidden="true"
            data-active={focused === capability.key ? "true" : "false"}
            data-category={capability.category}
            data-tier={capability.tier}
            style={{ "--halo-angle": `${capability.angle}deg` } as CSSProperties}
          />
        ))}

        {capabilities.map((capability, index) => {
          const Icon = ICONS[capability.key];
          const isFocused = focused === capability.key;

          return (
            <div
              key={capability.key}
              className={styles.node}
              data-tier={capability.tier}
              data-category={capability.category}
              data-focused={isFocused ? "true" : "false"}
              style={
                {
                  "--halo-x": capability.x,
                  "--halo-y": capability.y,
                  // Nodes arrive in ranked order, so the eye lands on the most
                  // relevant capability first.
                  "--halo-delay": `${120 + index * 45}ms`,
                } as CSSProperties
              }
            >
              <button
                type="button"
                className={styles.action}
                onPointerEnter={() => focus(capability.key, capability.look)}
                onPointerLeave={blur}
                onFocus={() => focus(capability.key, capability.look)}
                onBlur={blur}
                onClick={() => {
                  onClose();
                  handlers[capability.key]();
                }}
                aria-label={labels[capability.key]}
              >
                <Icon size={capability.tier === "primary" ? 21 : 17} strokeWidth={1.7} />
              </button>

              {/*
                Named in full, always — not on hover.

                A ring of abstract glyphs asks every first-time user to guess,
                and a tooltip that only appears on hover answers the question
                for a mouse and never for a thumb. The name and its one line
                cost two rows of small text and remove the guessing entirely.
              */}
              <span className={styles.label} aria-hidden="true">
                <span className={styles.name}>{names[capability.key]}</span>
                <span className={styles.blurb}>{blurbs[capability.key]}</span>
              </span>
            </div>
          );
        })}

        {/*
          Dismiss sits in the gap, at 6 o'clock.

          The empty sector is the halo's exit, so the control that takes it is
          the one thing allowed to stand there — small, unlit, and clearly not
          a capability. The backdrop and Escape both close too; this exists so
          the exit is visible rather than only known.
        */}
        <button
          type="button"
          className={styles.dismiss}
          onClick={onClose}
          aria-label={copy.closeActionsAriaLabel}
        >
          <X size={14} strokeWidth={1.9} />
        </button>
      </div>
    </>
  );
}
