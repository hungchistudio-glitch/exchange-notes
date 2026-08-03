"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
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
};

const REACTION_DURATION_MS = 2200;
// Fallback durations, slightly longer than the CSS animations they back
// up: onAnimationEnd never fires when prefers-reduced-motion disables the
// animation entirely (or in any other edge case where the event is
// missed), which would otherwise leave Yumi frozen in the intro/eating
// pose forever instead of returning to its always-on idle loop.
const WAKE_FALLBACK_MS = 2000;
const EAT_FALLBACK_MS = 1100;

// Replaces the old data-dashboard at the top of the Vocabulary page: Yumi
// is fed one "cookie" per saved word and grows/reacts over time, so every
// word added reads as caring for a companion rather than a stat ticking up.
export default function YumiCompanion({
  items,
  dailyGoal,
  dailyProgress,
  searchHasNoResults,
  cardGlancePulse,
}: YumiCompanionProps) {
  const { t } = useTranslation();
  const copy = t.vocabulary.mascot;

  const [petState, setPetState] = useState<PetState | null>(null);
  const [daysSinceLastOpen, setDaysSinceLastOpen] = useState(0);
  const [isWaking, setIsWaking] = useState(true);
  const [glanceDown, setGlanceDown] = useState(false);
  const [eatingId, setEatingId] = useState<string | null>(null);
  const [reactionMood, setReactionMood] = useState<YumiMood | null>(null);

  const yumiZoneRef = useRef<HTMLDivElement>(null);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eatFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (eatFallbackRef.current) clearTimeout(eatFallbackRef.current);
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

  function handleEatEnd() {
    if (eatFallbackRef.current) clearTimeout(eatFallbackRef.current);
    setEatingId(null);
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

  function handleFeed(cookie: Cookie) {
    setEatingId(cookie.id);
    triggerReaction(cookieReactionMood(cookie.type), REACTION_DURATION_MS);

    if (eatFallbackRef.current) clearTimeout(eatFallbackRef.current);
    eatFallbackRef.current = setTimeout(() => setEatingId(null), EAT_FALLBACK_MS);

    void persistFeed(cookie);
  }

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

  return (
    <section className={styles.section}>
      <p className={styles.greeting}>{greeting}</p>

      <div ref={yumiZoneRef} className={styles.yumiZone}>
        <YumiMark
          mood={mood}
          isWaking={isWaking}
          isEating={Boolean(eatingId)}
          growthStage={growthStage}
          crownEarned={crownEarned}
          glanceDown={glanceDown}
          onWakeAnimationEnd={handleWakeEnd}
          onEatAnimationEnd={handleEatEnd}
        />
      </div>

      <p className={styles.moodStatus}>{copy.moodStatus[mood]}</p>
      <p className={styles.summaryLine}>{summaryLine}</p>

      <div className={styles.foodZone}>
        <CookieTray
          cookies={cookies}
          yumiZoneRef={yumiZoneRef}
          onFeed={handleFeed}
          disabled={!petState}
          copy={copy}
        />
      </div>

      <div className={styles.links}>
        <Link href="/review?from=vocabulary" className={styles.link}>
          {copy.reviewLinkLabel}
        </Link>
        <span className={styles.linkDivider} aria-hidden="true" />
        <Link href="/vocabulary/collections" className={styles.link}>
          {copy.collectionsLinkLabel}
        </Link>
      </div>
    </section>
  );
}
