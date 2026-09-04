"use client";

import { toWidgetLanguage } from "@/lib/widget/yumiWidgetBridge";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import CookieTray from "@/components/vocabulary/pet/CookieTray";
import YumiFeedingFace from "@/components/vocabulary/pet/YumiFeedingFace";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDailyGoalWords from "@/hooks/preferences/useDailyGoalWords";
import useFeedPersistence from "@/hooks/pet/useFeedPersistence";
import useYumiFeedingSequence from "@/hooks/pet/useYumiFeedingSequence";
import type { TranslationDictionary } from "@/lib/i18n/types";
import {
  computeHomeContext,
  computeSteadyHomeMood,
  cookieHomeReaction,
  type HomeMood,
  type HomeReactionMood,
} from "@/lib/pet/homeMoodEngine";
import { buildAvailableCookies } from "@/lib/pet/moodEngine";
import { subscribeToWordSaved } from "@/lib/pet/wordSaved";
import { getPronunciationData } from "@/lib/pronunciation";
import { getOrCreatePetState, touchOpened } from "@/lib/pet/repository";
import type { Cookie, PetState } from "@/lib/pet/types";
import { createClient } from "@/lib/supabase/client";
import type { VocabularyItem } from "@/lib/types/app";
import { postYumiWidgetUpdate } from "@/lib/widget/yumiWidgetBridge";

import styles from "./YumiHomeStage.module.css";

type YumiCopy = TranslationDictionary["home"]["yumi"];

type YumiHomeStageProps = {
  items: VocabularyItem[];
  onMoodChange?: (mood: HomeMood) => void;
};

const REACTION_DURATION_MS = 3900;

/*
 * A word arriving is a smaller event than a cookie being eaten, and its
 * reaction is shorter to match — long enough to be seen, short enough that a
 * reader saving three words in a row is not watching an animation queue.
 *
 * It also has to end before the reader's attention comes back to the screen:
 * the save happens inside a sheet that covers Yumi, so most of this plays
 * behind it and what is left when the sheet closes is the tail.
 */
const WORD_SAVED_REACTION_MS = 1100;
const DANCE_DURATION_MS = 4200;
const WELCOME_DURATION_MS = 3600;
const LONELY_TEAR_DURATION_MS = 2600;
const MAX_PUPIL_OFFSET = 9;
// Fallback durations, slightly longer than the CSS animations they back
// up: onAnimationEnd never fires when prefers-reduced-motion disables the
// animation entirely (or in any other edge case where the event is
// missed), which would otherwise leave Yumi frozen in the intro pose
// forever instead of returning to its always-on idle loop.
const WAKE_FALLBACK_MS = 1900;

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function localDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function newestWidgetWords(items: VocabularyItem[], limit = 12) {
  const sorted = [...items].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();

    return (Number.isNaN(rightTime) ? 0 : rightTime)
      - (Number.isNaN(leftTime) ? 0 : leftTime);
  });

  const todayWords = sorted.filter(
    (item) => localDateKey(item.created_at) === todayKey(),
  );

  const ordered = [
    ...todayWords,
    ...sorted.filter(
      (item) => localDateKey(item.created_at) !== todayKey(),
    ),
  ];

  return ordered.slice(0, limit);
}

function readFlag(name: string) {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(name) === todayKey();
  } catch {
    return false;
  }
}

function writeFlag(name: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(name, todayKey());
  } catch {
    // Storage unavailable (private mode etc.) — the intro will simply be
    // able to replay, which is harmless.
  }
}

function getStatusLines(mood: HomeMood, wordsToday: number, copy: YumiCopy) {
  switch (mood) {
    case "waiting":
      return { primary: copy.statusWaiting, secondary: copy.hintWaiting };
    case "curious":
      return { primary: copy.statusCurious, secondary: copy.hintOneWord };
    case "happy":
      return {
        primary: copy.statusHappy,
        secondary: copy.hintWordsToday.replace("{count}", String(wordsToday)),
      };
    case "dancing":
      return { primary: copy.statusDancing, secondary: copy.hintThreeWords };
    case "excited":
      return {
        primary: copy.statusExcited,
        secondary: copy.hintWordsCount.replace("{count}", String(wordsToday)),
      };
    case "hungry":
      return { primary: copy.statusHungry, secondary: copy.hintHungry };
    case "sad":
      return { primary: copy.statusSad, secondary: copy.hintSad };
    case "grumpy":
      return { primary: copy.statusGrumpy, secondary: copy.hintGrumpy };
    case "lonely":
      return { primary: copy.statusLonely, secondary: copy.hintLonely };
    case "sleeping":
      return { primary: copy.statusSleeping, secondary: copy.hintSleeping };
    case "welcomeBack":
      return { primary: copy.statusWelcomeBack, secondary: copy.hintWelcomeBack };
  }
}

function getReactionText(reaction: HomeReactionMood, copy: YumiCopy) {
  switch (reaction) {
    case "curious":
      return copy.reactionCurious;
    case "happy":
      return copy.reactionHappy;
  }
}

function scrollToDailyFocus() {
  document
    .getElementById("daily-focus-card")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// The Home page's "little stage" for Yumi — same breathing eye-mark as
// everywhere else, but here it roams a small ground, reacts to today's
// word count, and drifts into a quieter mood after a few days away. Shares
// the same yumi_pet_state row (and cookie tray) as the Vocabulary page's
// YumiCompanion, so it's the same pet remembering the same history.
export default function YumiHomeStage({ items, onMoodChange }: YumiHomeStageProps) {
  const { t, language } = useTranslation();
  const { learningLanguage } = useLearningLanguageContext();
  const copy = t.home.yumi;
  const cookieCopy = t.vocabulary.mascot;
  const dailyGoal = useDailyGoalWords();

  const [petState, setPetState] = useState<PetState | null>(null);
  const [isWaking, setIsWaking] = useState(true);
  const [introMood, setIntroMood] = useState<HomeMood | null>(null);
  const [reaction, setReaction] = useState<HomeReactionMood | null>(null);
  const [roamX, setRoamX] = useState(0);
  const [inView, setInView] = useState(true);
  const [pupilOffset, setPupilOffset] = useState<{ x: number; y: number } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const yumiZoneRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const feedTargetRef = useRef<HTMLSpanElement>(null);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotionRef = useRef(false);
  const stateRef = useRef({ inView: true, eating: false, intro: false });

  const feeding = useYumiFeedingSequence({
    onConsume: handleCookieConsumed,
  });

  const context = computeHomeContext(items);
  const steadyMood = computeSteadyHomeMood(context);
  const displayMood: HomeMood = introMood ?? steadyMood;

  const widgetWords = useMemo(
    () => newestWidgetWords(items),
    [items],
  );

  const widgetWordPayloads = useMemo(
    () =>
      widgetWords.map((item) => {
        const pronunciation = getPronunciationData({
          english: item.word,
          chinese: item.translation,
        });

        return {
          id: item.id,
          englishWord: item.word.trim(),
          traditionalChineseWord: item.translation.trim(),
          pinyin: pronunciation.pinyin ?? "",
          zhuyin: pronunciation.zhuyin ?? "",
        };
      }),
    [widgetWords],
  );

  const widgetWord = widgetWordPayloads[0] ?? null;

  // Kept in a ref (rather than read directly) so the roam-scheduling
  // timer below always sees the latest values without needing to be torn
  // down and rescheduled every time one of them changes.
  useEffect(() => {
    stateRef.current = {
      inView,
      eating: feeding.isFeeding,
      intro: Boolean(introMood),
    };
  }, [inView, feeding.isFeeding, introMood]);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

        const { state } = await touchOpened(supabase, initial);
        if (!cancelled) setPetState(state);
      } catch {
        // Not signed in yet, or yumi_pet_state hasn't been migrated on
        // the live database — Yumi still renders and reacts.
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  // Decide, once, whether to play a one-shot intro today: returning after
  // a gap wins over hitting today's 3-word milestone, which wins over the
  // quiet lonely-tear beat — each gated via a localStorage date-flag so it
  // only plays once per day. This genuinely needs to live in an effect
  // (not derived during render): "items" arrives async after mount, and
  // the flag read/write is an intentional one-time side effect, not state
  // that can be computed from props alone.
  useEffect(() => {
    if (context.justReturned && !readFlag("yumi-home-welcomed")) {
      writeFlag("yumi-home-welcomed");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIntroMood("welcomeBack");
      introTimeoutRef.current = setTimeout(
        () => setIntroMood(null),
        WELCOME_DURATION_MS,
      );
      return;
    }

    if (context.wordsToday >= 3 && !readFlag("yumi-home-danced")) {
      writeFlag("yumi-home-danced");
      setIntroMood("dancing");
      introTimeoutRef.current = setTimeout(
        () => setIntroMood(null),
        DANCE_DURATION_MS,
      );
      return;
    }

    if (steadyMood === "lonely" && !readFlag("yumi-home-lonely-tear")) {
      writeFlag("yumi-home-lonely-tear");
      setIntroMood("lonely");
      introTimeoutRef.current = setTimeout(
        () => setIntroMood(null),
        LONELY_TEAR_DURATION_MS,
      );
    }
  }, [context.justReturned, context.wordsToday, steadyMood]);

  useEffect(() => {
    onMoodChange?.(displayMood);
  }, [displayMood, onMoodChange]);

  // Gentle, occasional horizontal roam — paused off-screen, mid-interaction,
  // during a one-shot intro, or when reduced-motion is requested.
  useEffect(() => {
    function scheduleRoam() {
      const delay = 7000 + Math.random() * 6000;

      roamTimerRef.current = setTimeout(() => {
        const current = stateRef.current;

        if (
          current.inView &&
          !reducedMotionRef.current &&
          !current.eating &&
          !current.intro
        ) {
          setRoamX((Math.random() - 0.5) * 64);
        }

        scheduleRoam();
      }, delay);
    }

    scheduleRoam();

    return () => {
      if (roamTimerRef.current) clearTimeout(roamTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => observer.disconnect();
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
      if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    };
  }, []);

  function handleWakeEnd() {
    if (wakeFallbackRef.current) clearTimeout(wakeFallbackRef.current);
    setIsWaking(false);
  }

  const cookies: Cookie[] = buildAvailableCookies(
    items,
    petState?.fed_word_ids ?? [],
  );

  const persistFeed = useFeedPersistence(petState, setPetState);

  // Yumi's eyes glance toward whichever cookie is currently being
  // dragged, clamped to a small max offset so it reads as a glance rather
  // than the pupil detaching from the eye.
  const handleDragPoint = useCallback(
    (point: { x: number; y: number } | null) => {
      if (!point) {
        setPupilOffset(null);
        return;
      }

      const rect = figureRef.current?.getBoundingClientRect();
      if (!rect) {
        setPupilOffset(null);
        return;
      }

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      const distance = Math.hypot(dx, dy);
      const next =
        distance === 0
          ? { x: 0, y: 0 }
          : (() => {
              const clamped = Math.min(distance, MAX_PUPIL_OFFSET);

              return {
                x: (dx / distance) * clamped,
                y: (dy / distance) * clamped,
              };
            })();

      /*
       * Bail out when the eyes are already there.
       *
       * A fresh object on every report is a fresh render on every report, and
       * this one is reported from a pointermove — so a drag that paused with
       * the finger still down kept re-rendering the whole stage for nothing.
       */
      setPupilOffset((prev) =>
        prev && prev.x === next.x && prev.y === next.y ? prev : next,
      );
    },
    [],
  );

  function handleCookieConsumed(cookie: Cookie) {
    setReaction(cookieHomeReaction(cookie.type));

    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(
      () => setReaction(null),
      REACTION_DURATION_MS,
    );

    persistFeed(cookie);
  }

  /*
   * Yumi looks up when a word is saved, wherever it was saved from.
   *
   * A subscription rather than a prop: a word can now be kept from the search
   * sheet, the dock, the deck console or a photo, and threading a callback
   * from each of those down to whichever Yumi is mounted would put four
   * layouts in the business of knowing about a mascot. See lib/pet/wordSaved.
   *
   * setState inside the subscriber, never in the effect body — this is
   * synchronising with an external event, which is what the effect is for.
   */
  useEffect(() => {
    return subscribeToWordSaved(({ duplicate }) => {
      // Nothing was added, so there is nothing to be pleased about. A
      // celebration for a word the reader already had reads as a bug.
      if (duplicate) return;

      setReaction("happy");

      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
      reactionTimeoutRef.current = setTimeout(
        () => setReaction(null),
        WORD_SAVED_REACTION_MS,
      );
    });
  }, []);

  const lines = getStatusLines(displayMood, context.wordsToday, copy);

  useEffect(() => {
    postYumiWidgetUpdate({
      /*
       * The goal the user set in Settings, not a constant. Yumi's tray was
       * fixed at three words while the setting stored minutes nothing read;
       * now the tray is what the setting visibly drives — pick ten and Yumi
       * wants ten.
       */
      cookieCount: Math.min(context.wordsToday, dailyGoal),
      cookieGoal: dailyGoal,
      englishWord: widgetWord?.englishWord ?? "",
      traditionalChineseWord: widgetWord?.traditionalChineseWord ?? "",
      pinyin: widgetWord?.pinyin ?? "",
      zhuyin: widgetWord?.zhuyin ?? "",
      words: widgetWordPayloads,
      interfaceLanguage: toWidgetLanguage(language),
      learningLanguage: toWidgetLanguage(learningLanguage),
      moodKey: displayMood,
      localizedText: {
        headline: lines.primary,
        hint: lines.secondary,
        emptyWord: t.home.todayWord.emptyHeading,
        cookieUnit: "",
      },
    });
  }, [
    context.wordsToday,
    // Included so changing the goal in Settings pushes a fresh cookie target
    // to the widget instead of leaving the old one on the Home Screen.
    dailyGoal,
    displayMood,
    language,
    learningLanguage,
    lines.primary,
    lines.secondary,
    t.home.todayWord.emptyHeading,
    widgetWord?.englishWord,
    widgetWord?.pinyin,
    widgetWord?.traditionalChineseWord,
    widgetWord?.zhuyin,
    widgetWordPayloads,
  ]);

  const feedingText = (() => {
    switch (feeding.phase) {
      case "anticipating":
        return cookieCopy.feedingAnticipating;
      case "biting":
      case "chewing":
        return cookieCopy.feedingEating;
      case "swallowing":
        return cookieCopy.feedingSwallowing;
      case "satisfied":
        return cookieCopy.feedingSatisfied;
      case "idle":
        return null;
    }
  })();
  const primaryText = feedingText
    ?? (reaction ? getReactionText(reaction, copy) : lines.primary);
  const secondaryText = feeding.isFeeding || reaction ? "" : lines.secondary;

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      data-in-view={inView ? "true" : "false"}
    >
      <div ref={yumiZoneRef} className={styles.ground}>
        <div className={styles.ambientLight} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className={styles.moverAnchor}>
          <div
            className={styles.mover}
            style={{ transform: `translateX(${roamX}px)` }}
          >
            <div className={styles.shadow} data-mood={displayMood} aria-hidden="true" />

            <div
              ref={figureRef}
              className={`${styles.figure} ${isWaking ? styles.waking : ""} ${
                pupilOffset ? styles.tracking : ""
              }`}
              data-mood={displayMood}
              data-feeding={feeding.phase}
              style={
                pupilOffset
                  ? ({
                      "--pupil-x": `${pupilOffset.x}px`,
                      "--pupil-y": `${pupilOffset.y}px`,
                    } as CSSProperties)
                  : undefined
              }
              onAnimationEnd={(event) => {
                if (event.animationName.startsWith("homeWake")) handleWakeEnd();
              }}
            >
              {displayMood === "dancing" || displayMood === "welcomeBack" ? (
                <div className={styles.sparkles} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}

              {displayMood === "lonely" ? (
                <span className={styles.tear} aria-hidden="true" />
              ) : null}

              <ExchangeNotesMark
                className={styles.logo}
                pupilClassName={styles.pupil}
                upperLidClassName={`yumi-blink-upper ${styles.upperLid}`}
                lowerLidClassName={`yumi-blink-lower ${styles.lowerLid}`}
                surfaceColor="#faf7f0"
                highlightColor="#ffffff"
              />

              <YumiFeedingFace
                phase={feeding.phase}
                targetRef={feedTargetRef}
              />
            </div>
          </div>
        </div>

        <div className={styles.trayCorner}>
          <CookieTray
            cookies={cookies}
            yumiZoneRef={yumiZoneRef}
            onFeed={feeding.consume}
            onFeedStart={feeding.beginApproach}
            feedTargetRef={feedTargetRef}
            onDragPoint={handleDragPoint}
            /* Not disabled while Yumi is eating.
               A mouthful now runs ~1.6s, and gating the whole tray on it made
               feeding a queue: the tray went inert the moment a cookie left it
               and stayed inert until the chewing finished, so cookies had to be
               handed over one at a time. Yumi's sequence restarts cleanly on
               each bite, and each cookie flies on its own, so there is nothing
               left for the lock to protect. */
            disabled={!petState}
            copy={cookieCopy}
            maxVisible={3}
            hideHint
            /* The corner tray is three cookies wide and has a stage beside
               it; opening the full inventory in place would push Yumi off
               its own home screen. "+N more" stays a label here. */
            expandable={false}
          />
        </div>
      </div>

      <div className={styles.textBlock}>
        <p className={styles.primaryText}>{primaryText}</p>

        {secondaryText ? (
          <button
            type="button"
            className={styles.secondaryText}
            onClick={scrollToDailyFocus}
          >
            {secondaryText}
          </button>
        ) : null}
      </div>
    </div>
  );
}
