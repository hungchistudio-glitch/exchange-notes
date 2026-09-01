"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Mic,
  NotebookPen,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import CameraIcon from "@/components/foundation/icons/CameraIcon";
import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavHomeIcon from "@/components/foundation/icons/NavHomeIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import { SketchUnderline } from "@/components/tutorial/HandDrawn";
import CosmicPreview from "@/components/tutorial/CosmicPreview";
import NavKeyMap from "@/components/tutorial/NavKeyMap";
import OrbitIcon from "@/components/tutorial/OrbitIcon";
import TutorialStage from "@/components/tutorial/TutorialStage";
import stageStyles from "@/components/tutorial/TutorialStage.module.css";
import TutorialLanguageSetup from "@/components/tutorial/TutorialLanguageSetup";
import useTranslation from "@/hooks/i18n/useTranslation";
import { setTutorialPending } from "@/lib/appPreferences";
import { insertValues } from "@/lib/utils";

type StepKey =
  | "setup"
  | "meet"
  | "dock"
  | "search"
  | "notes"
  | "vocabulary"
  | "home"
  | "messages"
  | "settings"
  | "cosmic"
  | "done";

/*
 * Language selection comes before the introduction, not after it. Everything
 * on screen runs through the i18n dictionary, and useTranslation reads the
 * stored interface language as an external store — so choosing 繁體中文 here
 * re-renders every remaining step in 繁體中文 immediately. Asking later would
 * mean introducing the app in a language the user had not chosen.
 */
const STEP_ORDER: StepKey[] = [
  "setup",
  "meet",
  "dock",
  /*
   * The rest follows one human journey instead of the navigation tree:
   * notice something, keep it, remember it, return to it, share it, then tune
   * the space. That is the order someone learns the product in, even though
   * it is not the order its routes happen to be stored in.
   */
  "search",
  "notes",
  "vocabulary",
  "home",
  "messages",
  "settings",
  "cosmic",
  "done",
];

type TutorialOverlayProps = {
  onClose: () => void;
};

/** The first real action in the app: write it, say it, or show it. */
function CaptureModesRow() {
  const modes = [
    <Keyboard key="write" size={23} strokeWidth={1.65} aria-hidden="true" />,
    <Mic key="voice" size={23} strokeWidth={1.65} aria-hidden="true" />,
    <CameraIcon key="camera" className="h-6 w-6" />,
  ];

  return (
    <div className="flex items-center gap-3">
      {modes.map((mode, index) => (
        <span
          key={index}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-white text-ink-strong"
          style={{ transform: `rotate(${(index - 1) * 3}deg)` }}
        >
          {mode}
        </span>
      ))}
    </div>
  );
}

/** The six permanent dock keys, shown with the app's real icon components. */

/** Yumi is unchanged; Cosmic Mode adds the command-deck presentation. */

function stepVisual(step: StepKey): ReactNode {
  switch (step) {
    // The two choice rows are this step's content; a mark above them would
    // only push them off a small screen.
    case "setup":
      return null;

    case "dock":
      return <NavKeyMap />;

    case "home":
      return (
        <div className="flex items-center gap-3">
          <OrbitIcon
            render={(active) => (
              <NavHomeIcon className="h-7 w-7" active={active} />
            )}
          />
          <OrbitIcon
            render={(active) => (
              <NavDiscoverIcon className="h-7 w-7" active={active} />
            )}
          />
        </div>
      );

    case "search":
      return <CaptureModesRow />;

    case "notes":
      return (
        <OrbitIcon
          render={() => (
            <NotebookPen size={27} strokeWidth={1.65} aria-hidden="true" />
          )}
        />
      );

    case "vocabulary":
      return (
        <OrbitIcon
          render={(active) => (
            <NavVocabularyIcon className="h-7 w-7" active={active} />
          )}
        />
      );

    case "messages":
      return (
        <OrbitIcon
          render={(active) => (
            <NavMessagesIcon className="h-7 w-7" active={active} />
          )}
        />
      );

    case "settings":
      return (
        <OrbitIcon
          render={(active) => (
            <NavSettingsIcon className="h-7 w-7" active={active} />
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
   * any hook sitting after the suspending one never ran on the first attempt:
   * React compares the two attempts, finds a hook list that grew, and reports
   * a change in hook order before throwing.
   *
   * That is not theoretical here. Step one of this tour is where the reader
   * chooses the interface language, so the first thing a new account does is
   * hand this component a language whose dictionary is not loaded yet.
   */
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

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

  /*
   * A full-screen tour is still a modal. Freeze the page beneath it, return
   * focus to the control that opened it, and move focus to each new heading so
   * keyboard and screen-reader users hear the same progression sighted users
   * see. Without this, Tab eventually reaches controls hidden behind the tour.
   */
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  // The suspending read, last — see the note at the top of this component.
  const { t } = useTranslation();
  const copy = t.tutorial;

  const step = STEP_ORDER[index];
  const isFirst = index === 0;
  const isLast = index === STEP_ORDER.length - 1;

  const stepCopy = copy.steps[step];
  const visual = stepVisual(step);
  const isYumiStep = step === "meet" || step === "done";

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  /*
   * Every step starts at its own top.
   *
   * The scrolling panel is one element reused across all eleven slides, so its
   * offset survived the advance: a reader who scrolled to the end of a long
   * step and pressed next arrived on the following one already scrolled past
   * its title. On a short screen that reads as the tour having skipped
   * something.
   *
   * `instant` is explicit because globals.css sets `scroll-behavior: smooth`
   * on the document and this inherits it — without it the panel visibly runs
   * back up through the outgoing step while the new one fades in.
   */
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    /*
     * scrollTo when it exists, scrollTop when it does not. Not defensiveness
     * for its own sake: jsdom implements the property and not the method, so
     * the unguarded call threw inside an effect and took three passing tests
     * down with it. The fallback is also the honest one for older Safari.
     */
    if (typeof scroller.scrollTo === "function") {
      scroller.scrollTo({ top: 0, behavior: "instant" });
    } else {
      scroller.scrollTop = 0;
    }
  }, [index]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [dismiss]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-step-title"
      aria-describedby="tutorial-step-body"
      className="fixed inset-0 z-[120] flex flex-col bg-surface"
    >
      <header className="flex shrink-0 items-center justify-between px-7 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          {insertValues(copy.stepLabel, {
            current: index + 1,
            total: STEP_ORDER.length,
          })}
        </span>

        <button
          type="button"
          onClick={dismiss}
          className="-mr-3 shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-[0.8125rem] font-semibold text-ink-faint transition-transform active:scale-95"
        >
          {isLast ? copy.close : copy.skip}
        </button>
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-7"
      >
        {/*
         * `my-auto` rather than `justify-center` on the scroller.
         *
         * A centred flex child taller than its scroll container overflows
         * equally in both directions, and the half above the start edge cannot
         * be scrolled to — which is how the setup step, the tallest here, ended
         * up with its footnote unreachable on a short screen. Auto margins
         * collapse to zero when there is no room, so this centres when it fits
         * and starts at the top when it does not.
         */}
        <div className="mx-auto my-auto flex w-full max-w-md flex-col py-8">
          {/* Keyed by step so the CSS restarts on every advance — that
              punctuation is most of what makes the tour feel alive. */}
          {(isYumiStep || visual) && (
            <div
              key={step}
              className="mb-8 flex min-h-[9.5rem] items-end"
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

          <div key={`${step}-copy`} className={stageStyles.copyEnter}>
            <h2
              ref={headingRef}
              id="tutorial-step-title"
              tabIndex={-1}
              className="text-[1.6rem] font-bold leading-[1.2] tracking-[-0.025em] text-black outline-none"
            >
              {stepCopy.title}
            </h2>

            {/* One confident stroke. The hand-drawn feel lives here, not in a
                frame around everything. */}
            <SketchUnderline className="mt-2.5 h-2 w-32 text-amber-500/70" />

            <p
              id="tutorial-step-body"
              className="mt-5 max-w-[30rem] text-[0.90625rem] leading-[1.8] text-ink-soft"
            >
              {stepCopy.body}
            </p>

            {step === "setup" && <TutorialLanguageSetup />}

            {isLast && (
              <p className="mt-7 text-[0.8125rem] leading-6 text-ink-faint">
                {copy.replay}
              </p>
            )}
          </div>
        </div>
      </div>

      <footer className="shrink-0 px-7 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <button
            type="button"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={isFirst}
            aria-label={copy.back}
            /*
             * Pinned to real pixels, unlike everything else on this screen.
             *
             * Forty-eight is a thumb, not a type size. Once every rem in the
             * app follows the reader's font setting, `h-12 w-12` made these
             * two grow to 57px on "large" and the row stopped fitting a
             * 410px phone by seven pixels. The same reasoning as the input
             * floor in globals.css: a control sized for a hand should not
             * move because the text around it did.
             */
            className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full border border-black/10 text-ink-soft transition-transform active:scale-[0.94] disabled:invisible"
          >
            <ChevronLeft size={19} strokeWidth={1.9} aria-hidden="true" />
          </button>

          <div
            aria-hidden="true"
            className="flex flex-1 items-center justify-center gap-1.5"
          >
            {STEP_ORDER.map((key, dot) => (
              <span
                key={key}
                className={`h-1.5 rounded-full transition-all ${
                  dot === index
                    ? "w-6 bg-black"
                    : dot < index
                      ? "w-1.5 bg-black/30"
                      : "w-1.5 bg-black/10"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              isLast
                ? dismiss()
                : setIndex((current) =>
                    Math.min(STEP_ORDER.length - 1, current + 1),
                  )
            }
            aria-label={isLast ? copy.finish : copy.next}
            className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-black text-white transition-transform active:scale-[0.94]"
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
