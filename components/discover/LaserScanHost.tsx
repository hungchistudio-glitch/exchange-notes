"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { useOptionalVocabulary } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useKnownWords from "@/hooks/useKnownWords";
import {
  clearLaserScan,
  laserRequest,
  meaningNearby,
  subscribeLaserScan,
  type QuickMeaning,
} from "@/lib/discover/laserScan";

import styles from "./LaserScanHost.module.css";

const TAG_WIDTH = 248;
const SHOWN_MS = 12_000;

type Found = QuickMeaning | "looking" | "none";

/**
 * The laser scan's one drawing (lib/discover/laserScan.ts): the beam from
 * Yumi's eye, the scan over the held word and the hologram tag with what
 * it means. Mounted by DailyNews; draws nothing until a word is held.
 */
export default function LaserScanHost() {
  const request = useSyncExternalStore(subscribeLaserScan, laserRequest, () => null);
  const { t } = useTranslation();
  const copy = t.discover.laser;
  const library = useOptionalVocabulary()?.items;
  const { lookUp } = useKnownWords();
  /* The instant dictionary's answer, for the word it was asked about. */
  const [asked, setAsked] = useState<{ request: object; found: Found } | null>(null);
  const tagRef = useRef<HTMLDivElement | null>(null);

  /* Where the beam starts: the logo's eye in the header, or the top corner. */
  const geometry = useMemo(() => {
    if (!request || typeof window === "undefined") return null;
    const logo = document.querySelector<HTMLElement>("[data-wind-logo]")?.getBoundingClientRect();
    const eye = logo && logo.width > 0
      ? { x: logo.left + logo.width * 0.62, y: logo.top + logo.height * 0.45 }
      : { x: window.innerWidth - 40, y: 40 };
    const word = request.rect;
    const target = { x: word.left + word.width / 2, y: word.top + word.height / 2 };
    const above = word.top > 150;
    const left = Math.min(Math.max(8, target.x - TAG_WIDTH / 2), window.innerWidth - TAG_WIDTH - 8);
    return { eye, target, word, above, left, tagTop: above ? word.top - 12 : word.bottom + 12 };
  }, [request]);

  /* What it means: nearby at once (the library, the story), the instant
     dictionary otherwise. */
  const nearby = useMemo(() => (request ? meaningNearby(request, library ?? []) : null), [request, library]);
  const found: Found = nearby ?? (asked && asked.request === request ? asked.found : "looking");
  useEffect(() => {
    if (!request || nearby) return;
    const controller = new AbortController();
    void fetch("/api/classify-text/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: request.word }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((preview: { translation?: string; partOfSpeech?: string; translationUnavailable?: boolean } | null) => {
        if (controller.signal.aborted) return;
        const meaning = preview && !preview.translationUnavailable ? preview.translation?.trim() : "";
        setAsked({ request, found: meaning ? { meaning, partOfSpeech: preview?.partOfSpeech ?? null, source: "dictionary" } : "none" });
      })
      .catch(() => { if (!controller.signal.aborted) setAsked({ request, found: "none" }); });
    return () => controller.abort();
  }, [request, nearby]);

  /* Gone with a tap elsewhere, a scroll, Escape, or after a while. */
  useEffect(() => {
    if (!request) return;
    const away = (event: Event) => {
      if (tagRef.current?.contains(event.target as Node)) return;
      clearLaserScan();
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") clearLaserScan(); };
    // The press that held the word ends after this; listen from the next.
    const listen = window.setTimeout(() => {
      document.addEventListener("pointerdown", away, true);
      window.addEventListener("scroll", away, true);
    }, 300);
    document.addEventListener("keydown", key);
    const timer = window.setTimeout(clearLaserScan, SHOWN_MS);
    return () => {
      window.clearTimeout(listen);
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", away, true);
      window.removeEventListener("scroll", away, true);
      document.removeEventListener("keydown", key);
    };
  }, [request]);

  if (!request || !geometry || typeof document === "undefined") return null;
  const { eye, target, word, above, left, tagTop } = geometry;

  return createPortal(
    <div className={styles.layer} key={`${request.word}-${word.left}-${word.top}`} data-laser-scan="">
      <svg className={styles.beam} width="100%" height="100%" aria-hidden="true">
        <line className={styles.beamGlow} x1={eye.x} y1={eye.y} x2={target.x} y2={target.y} pathLength={100} />
        <line className={styles.beamCore} x1={eye.x} y1={eye.y} x2={target.x} y2={target.y} pathLength={100} />
        <circle className={styles.muzzle} cx={eye.x} cy={eye.y} r={3} />
      </svg>
      <div
        className={styles.scan}
        aria-hidden="true"
        style={{ left: word.left - 4, top: word.top - 3, width: word.width + 8, height: word.height + 6, "--scan-width": `${word.width + 8}px` } as React.CSSProperties}
      >
        <span className={styles.bar} />
      </div>
      <div
        ref={tagRef}
        role="dialog"
        aria-label={request.word}
        className={styles.tag}
        data-above={above || undefined}
        style={{ left, top: tagTop, width: TAG_WIDTH }}
      >
        <button type="button" className={styles.close} onClick={clearLaserScan} aria-label={copy.close} title={copy.close}>
          <X size={13} aria-hidden="true" />
        </button>
        <p className={styles.word} lang={request.language}>{request.word}</p>
        {typeof found === "object" && found.partOfSpeech ? <p className={styles.pos}>{found.partOfSpeech}</p> : null}
        <p className={styles.meaning} lang={typeof found === "object" ? request.meaningLanguage : undefined} aria-live="polite">
          {found === "looking" ? copy.scanning : found === "none" ? copy.noQuick : found.meaning}
        </p>
        <div className={styles.foot}>
          {typeof found === "object" && found.source !== "dictionary" ? (
            <span className={styles.badge}>{found.source === "library" ? copy.inLibrary : copy.fromStory}</span>
          ) : <span />}
          {lookUp ? (
            <button
              type="button"
              className={styles.full}
              onClick={() => {
                clearLaserScan();
                lookUp(request.word);
              }}
            >
              {copy.full} ›
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
