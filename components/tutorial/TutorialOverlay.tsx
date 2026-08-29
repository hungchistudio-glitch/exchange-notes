"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import CameraIcon from "@/components/foundation/icons/CameraIcon";
import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavSearchIcon from "@/components/foundation/icons/NavSearchIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import CosmicPreview from "@/components/tutorial/CosmicPreview";
import NavKeyMap from "@/components/tutorial/NavKeyMap";
import OrbitIcon from "@/components/tutorial/OrbitIcon";
import TutorialStage from "@/components/tutorial/TutorialStage";
import TutorialLanguageSetup from "@/components/tutorial/TutorialLanguageSetup";
import { SketchUnderline } from "@/components/tutorial/HandDrawn";
import styles from "@/components/tutorial/TutorialOverlay.module.css";
import useTranslation from "@/hooks/i18n/useTranslation";
import { setTutorialPending } from "@/lib/appPreferences";
import { insertValues } from "@/lib/utils";

type StepKey =
  | "setup"
  | "meet"
  | "keys"
  | "name"
  | "search"
  | "capture"
  | "vocabulary"
  | "discover"
  | "messages"
  | "cosmic"
  | "done";

/*
 * Eleven slides, and the shape of the list is the argument.
 *
 * It was thirteen, of which five were the same slide five times: one dock icon
 * turning inside a pair of rings, with a paragraph naming the screen it opens.
 * They are now one — `keys` — which draws the whole dock and lets the active
 * ring walk along it. That is both shorter and a better explanation, because
 * the thing worth knowing about the dock is not what any single key does, it
 * is that the row never rearranges itself.
 *
 * `friends` folded into `messages`, which was already describing half of it;
 * `senses` folded into `vocabulary`, where the first-meeting idea is about the
 * screen that actually holds those first meetings; and `home` folded into
 * `meet`, since Yumi introducing herself and Yumi saying where she lives were
 * two slides making one point.
 *
 * Language selection stays first. Everything on screen runs through the i18n
 * dictionary and useTranslation reads the stored interface language as an
 * external store, so choosing 繁體中文 here re-renders every remaining step in
 * 繁體中文 immediately. Asking later would mean introducing the app in a
 * language the reader had not chosen.
 */
const STEP_ORDER: StepKey[] = [
  "setup",
  "meet",
  "keys",
  "name",
  "search",
  "capture",
  "vocabulary",
  "discover",
  "messages",
  "cosmic",
  "done",
];

/*
 * Steps that end somewhere real. Following one closes the tour and marks it
 * seen — arriving on the capture screen ready to photograph something is a
 * better outcome than being returned to slide six.
 */
const STEP_HREF: Partial<Record<StepKey, string>> = {
  capture: "/capture",
  discover: "/discover",
  messages: "/friends",
};

/* Below this, a horizontal drag is a scroll or a stray finger rather than a
   deliberate swipe. */
const SWIPE_THRESHOLD_PX = 56;

type TutorialOverlayProps = {
  onClose: () => void;
};

/** yu and mi, as two halves of one exchange. */
function ExchangeMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-black/15 text-xl font-bold text-black">
        yu
      </span>

      <span className={`text-xl font-bold text-ink-faint ${styles.trade}`}>
        +
      </span>

      <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-black/15 text-xl font-bold text-black">
        mi
      </span>
    </div>
  );
}

function stepVisual(step: StepKey): ReactNode {
  switch (step) {
    // The two choice rows are this step's content; a mark above them would
    // only push them off a small screen.
    case "setup":
      return null;

    case "keys":
      return <NavKeyMap />;

    case "name":
      return <ExchangeMark />;

    case "search":
      return (
        <OrbitIcon
          render={(active) => (
            <NavSearchIcon className="h-7 w-7" active={active} />
          )}
        />
      );

    case "capture":
      return <OrbitIcon render={() => <CameraIcon className="h-7 w-7" />} />;

    case "vocabulary":
      return (
        <OrbitIcon
          render={(active) => (
            <NavVocabularyIcon className="h-7 w-7" active={active} />
          )}
        />
      );

    case "discover":
      return (
        <OrbitIcon
          render={(active) => (
            <NavDiscoverIcon className="h-7 w-7" active={active} />
          )}
        />
      );

    case "messages":
      return (
        <OrbitIcon
          render={() => (
            <UserPlus size={26} strokeWidth={1.6} aria-hidden="true" />
          )}
        />
      );

    case "cosmic":
      return <CosmicPreview />;
  }
}

export default function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  /*
   * Every hook this component owns runs before useTranslation, and that order
   * is load-bearing rather than stylistic.
   *
   * useTranslation reads its dictionary out of a cache and falls back to
   * `use(loadTranslations(language))` on the one render where that cache is
   * cold — which suspends. A suspended render is discarded and replayed, and
   * any hook sitting *after* the suspending one never ran on the first
   * attempt: React compares the two attempts, finds a hook list that grew by
   * one, and reports a change in hook order.
   *
   * That is not theoretical here. Step one of this tour is where the reader
   * chooses the interface language, so the first thing a new account does is
   * hand this component a language whose dictionary is not loaded yet — which
   * is exactly the render that suspends.
   *
   * With the suspending call last there is nothing after it to lose, and the
   * replay is invisible.
   */
  const [index, setIndex] = useState(0);

  /*
   * Which way the last move went, so a slide enters from the side it came
   * from. Without it every step arrived from the same direction and going
   * back looked identical to going forward — which is the one thing an
   * animation on a paged interface is actually for.
   */
  const [direction, setDirection] = useState<1 | -1>(1);

  const goBack = useCallback(() => {
    setDirection(-1);
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setDirection(1);
    setIndex((current) => Math.min(STEP_ORDER.length - 1, current + 1));
  }, []);

  /*
   * Clearing the pending flag is unconditional — finished, skipped, or
   * followed out to a destination all count. Someone who skipped has made a
   * decision, and asking again next time would override it. Both entry points
   * are permanent, so nothing is lost by taking them at their word.
   */
  const dismiss = useCallback(() => {
    setTutorialPending(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
        return;
      }

      /*
       * Arrow keys, but never while the reader is inside a control. The setup
       * step is a grid of buttons, and Left/Right is how a keyboard user moves
       * between them — stealing those would make the one interactive slide in
       * the tour the one slide a keyboard cannot operate.
       */
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, select, textarea")) return;

      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goBack();
    }

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [dismiss, goBack, goNext]);

  /*
   * Swipe. Pointer events rather than touch events, so a trackpad drag and a
   * stylus work too, and the whole gesture is read on one element instead of
   * three listeners that can miss a cancel.
   */
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  /*
   * Every step starts at its own top.
   *
   * The scrolling panel is one element reused across all eleven slides, so its
   * scroll offset survived the advance: a reader who scrolled to the end of a
   * long step and pressed next arrived on the following one already scrolled
   * past its title. On a short screen that meant the next slide opened
   * mid-paragraph, which reads as the tour having skipped something.
   *
   * `instant` is explicit because globals.css sets `scroll-behavior: smooth`
   * on the document and this inherits it — without it the panel visibly runs
   * back up through the outgoing step's copy while the new step fades in.
   */
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [index]);

  // The suspending read, last — see the note at the top of this component.
  const { t } = useTranslation();
  const copy = t.tutorial;

  const step = STEP_ORDER[index];
  const isFirst = index === 0;
  const isLast = index === STEP_ORDER.length - 1;

  const stepCopy = copy.steps[step];
  const href = STEP_HREF[step];
  const visual = stepVisual(step);
  const isYumiStep = step === "meet" || step === "done";

  function handlePointerDown(event: React.PointerEvent) {
    if (event.pointerType === "mouse") return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: React.PointerEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;

    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    // Vertical intent wins: this panel scrolls, and a scroll that also pages
    // the tour is a scroll nobody can control.
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) {
      return;
    }

    if (dx < 0 && !isLast) goNext();
    if (dx > 0 && !isFirst) goBack();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.rowTitle}
      className={`fixed inset-0 z-[120] flex flex-col overflow-hidden bg-surface ${styles.root}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipeStart.current = null;
      }}
    >
      {/* Two washes drifting behind everything, on their own long clocks. The
          tour is the one screen in Standard Mode that is allowed some weather. */}
      <span aria-hidden="true" className={styles.aura} />

      <header className="relative flex shrink-0 items-center justify-between gap-3 px-7 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          {insertValues(copy.stepLabel, {
            current: index + 1,
            total: STEP_ORDER.length,
          })}
        </span>

        <button
          type="button"
          onClick={dismiss}
          className="-mr-3 min-w-0 shrink rounded-full px-3 py-2 text-[13px] font-semibold text-ink-faint transition-transform active:scale-95"
        >
          <span className="block truncate">
            {isLast ? copy.close : copy.skip}
          </span>
        </button>
      </header>

      <div
        ref={scrollerRef}
        className="relative flex-1 overflow-y-auto overscroll-contain px-7"
      >
        {/*
         * `my-auto` rather than `justify-center` on the scroller.
         *
         * A centred flex child that is taller than its scroll container
         * overflows equally in both directions, and the half above the start
         * edge cannot be scrolled to — which is how the setup step, the
         * tallest in the tour, ended up with its footnote unreachable on a
         * short screen. Auto margins collapse to zero when there is no room,
         * so this centres when it fits and starts at the top when it does not.
         */}
        <div
          className="mx-auto my-auto flex w-full max-w-md flex-col py-8"
          style={
            {
              "--enter-x": direction > 0 ? "26px" : "-26px",
            } as CSSProperties
          }
        >
          {/* Keyed by step so every entrance animation in the slide restarts
              on each advance — that punctuation is most of what makes the
              tour feel alive. */}
          {(isYumiStep || visual) && (
            <div
              key={step}
              className="mb-7 flex min-h-[9.5rem] w-full items-end"
            >
              {isYumiStep ? (
                <TutorialStage
                  performance={step === "done" ? "finale" : "enter"}
                />
              ) : (
                <TutorialStage performance="prop">{visual}</TutorialStage>
              )}
            </div>
          )}

          {/*
           * The copy arrives after the visual and in its own order — title,
           * then the stroke under it, then the paragraph. Keyed together with
           * the visual above so the whole slide is one gesture rather than a
           * picture that animates over text that does not.
           */}
          <div key={`${step}-copy`} className={styles.copy}>
            <h2
              className={`text-balance text-[1.55rem] font-bold leading-[1.22] tracking-[-0.025em] text-black ${styles.copyTitle}`}
            >
              {stepCopy.title}
            </h2>

            {/* One confident stroke. The hand-drawn feel lives here, not in a
                frame around everything. */}
            <SketchUnderline
              className={`mt-2.5 h-2 w-32 text-amber-500/70 ${styles.copyRule}`}
            />

            <p
              className={`mt-5 max-w-[30rem] text-pretty text-[14.5px] leading-[1.8] text-ink-soft ${styles.copyBody}`}
            >
              {stepCopy.body}
            </p>
          </div>

          {step === "setup" && <TutorialLanguageSetup />}

          {href && "action" in stepCopy && (
            <Link
              key={`${step}-action`}
              href={href}
              onClick={dismiss}
              /*
               * Wrapping, not `whitespace-nowrap`. "Buscar mi primera palabra
               * en una historia" and "Trouver mon premier mot dans une
               * histoire" are both wider than a 320px screen at this size, and
               * a nowrap pill simply ran off the edge of the frame in Spanish,
               * French and Italian.
               */
              className={`mt-7 inline-flex min-h-12 max-w-full items-center justify-center gap-2 self-start rounded-[26px] bg-black px-6 py-3.5 text-center text-[13.5px] font-semibold leading-snug text-white transition-transform active:scale-[0.985] ${styles.copyAction}`}
            >
              {stepCopy.action}
            </Link>
          )}

          {isLast && (
            <p
              key={`${step}-replay`}
              className={`mt-7 text-[13px] leading-6 text-ink-faint ${styles.copyAction}`}
            >
              {copy.replay}
            </p>
          )}
        </div>
      </div>

      <footer className="relative shrink-0 px-7 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={isFirst}
            aria-label={copy.back}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/10 text-ink-soft transition-transform active:scale-[0.94] disabled:invisible"
          >
            <ChevronLeft size={19} strokeWidth={1.9} aria-hidden="true" />
          </button>

          {/*
           * A track with a fill, and the dots sitting on it.
           *
           * Eleven dots in a row told you which slide you were on but not how
           * much was left, which on a tour is the thing a reader actually
           * wants to know before deciding to stay. The dots survive because
           * they are what make the tour feel finite; the fill is what makes it
           * feel short.
           */}
          <div
            aria-hidden="true"
            className={`relative flex min-w-0 flex-1 items-center ${styles.track}`}
          >
            <span
              className={styles.trackFill}
              style={{
                transform: `scaleX(${(index + 1) / STEP_ORDER.length})`,
              }}
            />

            <div className="relative flex w-full items-center justify-between">
              {STEP_ORDER.map((key, dot) => (
                <span
                  key={key}
                  className={`${styles.dot} ${
                    dot <= index ? styles.dotDone : ""
                  } ${dot === index ? styles.dotActive : ""}`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => (isLast ? dismiss() : goNext())}
            aria-label={isLast ? copy.finish : copy.next}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-white transition-transform active:scale-[0.94] ${
              isLast ? styles.finish : ""
            }`}
          >
            {isLast ? (
              <ArrowRight size={19} strokeWidth={2} aria-hidden="true" />
            ) : (
              <ChevronRight size={19} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
