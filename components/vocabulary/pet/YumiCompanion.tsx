"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import useYumiFeedingSequence from "@/hooks/pet/useYumiFeedingSequence";
import useYumiOrbitMenu from "@/hooks/pet/useYumiOrbitMenu";
import {
  buildAvailableCookies,
  computeGrowthStage,
  computeMood,
  computeWordStreak,
  cookieReactionMood,
  daysSince,
  hasCrown,
} from "@/lib/pet/moodEngine";
import { feedCookie, getOrCreatePetState, touchOpened } from "@/lib/pet/repository";
import type { Cookie, YumiMood, PetState } from "@/lib/pet/types";
import { createClient } from "@/lib/supabase/client";
import type { VocabularyItem } from "@/lib/types/app";

import CookieTray from "./CookieTray";
import YumiMark from "./YumiMark";
import YumiOrbitMenu from "./YumiOrbitMenu";

import styles from "./YumiCompanion.module.css";

type YumiCompanionProps = {
  items: VocabularyItem[];
  dailyGoal: number;
  dailyProgress: number;
  // True while the search box has text but the list came back empty — lets
  // Yumi read as aware of what's happening on the page instead of sitting
  // above it as a disconnected header.
  searchHasNoResults: boolean;
  // Bumped by the parent every time a vocabulary card is opened, so Yumi
  // can throw a quick curious glance without any deeper wiring.
  cardGlancePulse: number;
  onStartReview: () => void;
  onAddWord: () => void;
  onOpenCamera: () => void;
};

const REACTION_DURATION_MS = 3900;
// Fallback duration, slightly longer than the CSS animation it backs up:
// onAnimationEnd never fires when prefers-reduced-motion disables it.
const WAKE_FALLBACK_MS = 2000;

// Replaces the old data-dashboard at the top of the Vocabulary page: Yumi
// is fed one "cookie" per saved word and grows/reacts over time, so every
// word added reads as caring for a companion rather than a stat ticking up.
export default function YumiCompanion({
  items,
  dailyGoal,
  dailyProgress,
  searchHasNoResults,
  cardGlancePulse,
  onStartReview,
  onAddWord,
  onOpenCamera,
}: YumiCompanionProps) {
  const { t } = useTranslation();
  const copy = t.vocabulary.mascot;

  const [petState, setPetState] = useState<PetState | null>(null);
  const [daysSinceLastOpen, setDaysSinceLastOpen] = useState(0);
  const [isWaking, setIsWaking] = useState(true);
  const [glanceDown, setGlanceDown] = useState(false);
  const [reactionMood, setReactionMood] = useState<YumiMood | null>(null);
  const [isTrackingFood, setIsTrackingFood] = useState(false);
  const orbit = useYumiOrbitMenu();

  const yumiZoneRef = useRef<HTMLDivElement>(null);
  const feedTargetRef = useRef<HTMLSpanElement>(null);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchGlanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTrackingTouch, setIsTrackingTouch] = useState(false);
  // Baselines for the two "weak awareness" effects below — null on the very
  // first render so neither one fires just because the page loaded with
  // existing words or a pulse count of 0.
  const previousItemCountRef = useRef<number | null>(null);
  const previousGlancePulseRef = useRef(cardGlancePulse);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled || !user) return;

        const initial = await getOrCreatePetState(supabase, user.id);
        if (cancelled) return;

        const { previousOpenedAt, state } = await touchOpened(supabase, initial);
        if (cancelled) return;

        setDaysSinceLastOpen(previousOpenedAt ? daysSince(previousOpenedAt) : 0);
        setPetState(state);
      } catch {
        // Not signed in yet, or yumi_pet_state hasn't been migrated on the
        // live database — Yumi still renders and reacts, it just won't
        // remember growth across visits until that resolves.
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  // Belt-and-suspenders: force Yumi out of the wake pose even if the CSS
  // animationend event never arrives.
  useEffect(() => {
    wakeFallbackRef.current = setTimeout(() => {
      setIsWaking((current) => (current ? false : current));
    }, WAKE_FALLBACK_MS);

    return () => {
      if (wakeFallbackRef.current) clearTimeout(wakeFallbackRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
      if (glanceTimeoutRef.current) clearTimeout(glanceTimeoutRef.current);
      if (touchGlanceTimeoutRef.current) {
        clearTimeout(touchGlanceTimeoutRef.current);
      }
    };
  }, []);

  // Right after Yumi wakes up, a brief downward glance toward the
  // vocabulary list — a small acknowledgment that it's part of the same
  // page, not just a header sitting above it.
  function handleWakeEnd() {
    if (wakeFallbackRef.current) clearTimeout(wakeFallbackRef.current);
    setIsWaking(false);
    setGlanceDown(true);
    glanceTimeoutRef.current = setTimeout(() => setGlanceDown(false), 1600);
  }

  // Shared by feeding, the card-glance reaction, and the new-word bump —
  // all three are the same shape: show a mood for a bit, then let the
  // steady/search-driven mood take back over.
  function triggerReaction(nextMood: YumiMood, durationMs: number) {
    setReactionMood(nextMood);
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(
      () => setReactionMood(null),
      durationMs,
    );
  }

  // Weak awareness #1: opening a vocabulary card throws Yumi a quick
  // curious glance — a small acknowledgment, not a full interruption.
  useEffect(() => {
    if (cardGlancePulse !== previousGlancePulseRef.current) {
      previousGlancePulseRef.current = cardGlancePulse;
      triggerReaction("curious", REACTION_DURATION_MS);
    }
  }, [cardGlancePulse]);

  // Weak awareness #2: any time the word count goes up — whether from this
  // page, AI lookup, or elsewhere — Yumi gets a happy bump. Tracking via a
  // ref means this works with zero cross-component event wiring.
  useEffect(() => {
    const previous = previousItemCountRef.current;
    previousItemCountRef.current = items.length;

    if (previous !== null && items.length > previous) {
      triggerReaction("happy", REACTION_DURATION_MS);
    }
  }, [items.length]);

  const streak = computeWordStreak(items);
  const cookies: Cookie[] = buildAvailableCookies(
    items,
    petState?.fed_word_ids ?? [],
  );
  const growthStage = computeGrowthStage(petState?.total_cookies_fed ?? 0);
  const crownEarned = hasCrown(streak.currentStreak);
  const goalCompleted = dailyGoal > 0 && dailyProgress >= dailyGoal;

  const steadyMood = computeMood({
    wordsToday: dailyProgress,
    streakDays: streak.currentStreak,
    cookiesAvailable: cookies.length,
    daysSinceLastOpen,
    goalCompleted,
  });

  const mood = reactionMood ?? (searchHasNoResults ? "confused" : steadyMood);
  const greeting = dailyProgress === 0 ? copy.greetingWaiting : copy.greetingDefault;

  async function persistFeed(cookie: Cookie) {
    if (!petState) return;

    try {
      const supabase = createClient();
      const updated = await feedCookie(supabase, petState, cookie.id);
      setPetState(updated);
    } catch {
      // Optimistic UI already played the reaction — a failed write here
      // just means growth won't be remembered next visit.
    }
  }

  function handleCookieConsumed(cookie: Cookie) {
    triggerReaction(cookieReactionMood(cookie.type), REACTION_DURATION_MS);
    void persistFeed(cookie);
  }

  const feeding = useYumiFeedingSequence({
    onConsume: handleCookieConsumed,
  });

  function handleFeedStart(cookie: Cookie) {
    orbit.close();
    feeding.beginApproach(cookie);
  }

  function handleYumiActivate() {
    if (feeding.isFeeding) return;
    orbit.toggle();
  }

  function handleYumiPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    const zone = yumiZoneRef.current;
    if (!zone || feeding.isFeeding) return;

    const rect = zone.getBoundingClientRect();
    const normalizedX = Math.max(
      -1,
      Math.min(
        1,
        (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2),
      ),
    );
    const normalizedY = Math.max(
      -1,
      Math.min(
        1,
        (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2),
      ),
    );

    zone.style.setProperty("--yumi-gaze-x", `${normalizedX * 9}px`);
    zone.style.setProperty("--yumi-gaze-y", `${normalizedY * 8}px`);
    setIsTrackingTouch(true);

    if (touchGlanceTimeoutRef.current) {
      clearTimeout(touchGlanceTimeoutRef.current);
    }
    touchGlanceTimeoutRef.current = setTimeout(
      () => setIsTrackingTouch(false),
      65,
    );
  }

  const handleCookieDragPoint = useCallback(
    (point: { x: number; y: number } | null) => {
      const zone = yumiZoneRef.current;

      if (!point || !zone) {
        zone?.style.removeProperty("--yumi-gaze-x");
        zone?.style.removeProperty("--yumi-gaze-y");
        setIsTrackingFood(false);
        return;
      }

      const rect = zone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const normalizedX = Math.max(
        -1,
        Math.min(1, (point.x - centerX) / Math.max(rect.width / 2, 1)),
      );
      const normalizedY = Math.max(
        -1,
        Math.min(1, (point.y - centerY) / Math.max(rect.height / 2, 1)),
      );

      zone.style.setProperty("--yumi-gaze-x", `${normalizedX * 9}px`);
      zone.style.setProperty("--yumi-gaze-y", `${normalizedY * 8}px`);
      setIsTrackingFood(true);
    },
    [],
  );

  const totalCookiesFed = petState?.total_cookies_fed ?? 0;
  const wordsText = (
    dailyProgress === 1 ? copy.summaryWordSingular : copy.summaryWordPlural
  ).replace("{count}", String(dailyProgress));
  const cookiesText = (
    totalCookiesFed === 1 ? copy.summaryCookieSingular : copy.summaryCookiePlural
  ).replace("{count}", String(totalCookiesFed));
  const streakText = copy.summaryStreak.replace(
    "{count}",
    String(streak.currentStreak),
  );
  const summaryLine = `${wordsText} · ${cookiesText} · ${streakText} · ${copy.moodShort[mood]}`;
  const moodStatus = (() => {
    if (orbit.isOpen && feeding.phase === "idle") return copy.menuPrompt;

    switch (feeding.phase) {
      case "anticipating":
        return copy.feedingAnticipating;
      case "biting":
      case "chewing":
        return copy.feedingEating;
      case "swallowing":
        return copy.feedingSwallowing;
      case "satisfied":
        return copy.feedingSatisfied;
      case "idle":
        return copy.moodStatus[mood];
    }
  })();

  return (
    <section className={styles.section} data-menu-open={orbit.isVisible}>
      <p className={styles.greeting}>{greeting}</p>

      <div ref={yumiZoneRef} className={styles.yumiZone}>
        <button
          type="button"
          className={styles.yumiButton}
          onClick={handleYumiActivate}
          onPointerDown={handleYumiPointerDown}
          aria-label={
            orbit.isVisible
              ? copy.closeActionsAriaLabel
              : copy.openActionsAriaLabel
          }
          aria-expanded={orbit.isVisible}
          disabled={feeding.isFeeding}
        >
          <YumiMark
            mood={mood}
            isWaking={isWaking}
            isEating={feeding.isFeeding}
            feedingPhase={feeding.phase}
            chewBeat={feeding.chewBeat}
            feedTargetRef={feedTargetRef}
            growthStage={growthStage}
            crownEarned={crownEarned}
            glanceDown={glanceDown}
            orbitPhase={orbit.phase}
            lookTarget={
              isTrackingFood || isTrackingTouch ? "food" : orbit.lookTarget
            }
            onWakeAnimationEnd={handleWakeEnd}
          />
        </button>

        <YumiOrbitMenu
          phase={orbit.phase}
          showHints={orbit.showHints}
          copy={copy}
          onClose={orbit.close}
          onLook={orbit.lookAt}
          onReview={onStartReview}
          onAddWord={onAddWord}
          onCamera={onOpenCamera}
        />
      </div>

      <p className={styles.moodStatus}>{moodStatus}</p>
      <p className={styles.summaryLine}>{summaryLine}</p>

      <div className={styles.foodZone}>
        <CookieTray
          cookies={cookies}
          yumiZoneRef={yumiZoneRef}
          onFeed={feeding.consume}
          onFeedStart={handleFeedStart}
          feedTargetRef={feedTargetRef}
          disabled={!petState || feeding.isFeeding}
          copy={copy}
          onDragPoint={handleCookieDragPoint}
        />
      </div>

    </section>
  );
}
