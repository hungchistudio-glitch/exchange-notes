"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Ear,
  Eye,
  Flower2,
  Hand,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import CameraIcon from "@/components/foundation/icons/CameraIcon";
import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavHomeIcon from "@/components/foundation/icons/NavHomeIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import { SketchUnderline } from "@/components/tutorial/HandDrawn";
import OrbitIcon from "@/components/tutorial/OrbitIcon";
import TutorialStage from "@/components/tutorial/TutorialStage";
import TutorialLanguageSetup from "@/components/tutorial/TutorialLanguageSetup";
import useTranslation from "@/hooks/i18n/useTranslation";
import { setTutorialPending } from "@/lib/appPreferences";
import { insertValues } from "@/lib/utils";

type StepKey =
  | "setup"
  | "meet"
  | "name"
  | "senses"
  | "home"
  | "vocabulary"
  | "capture"
  | "discover"
  | "messages"
  | "friends"
  | "settings"
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
  "name",
  "senses",
  "home",
  "vocabulary",
  "capture",
  "discover",
  "messages",
  "friends",
  "settings",
  "done",
];

/*
 * Steps that end somewhere real. Following one closes the tour and marks it
 * seen — arriving on the capture screen ready to photograph something is a
 * better outcome than being returned to slide seven.
 */
const STEP_HREF: Partial<Record<StepKey, string>> = {
  capture: "/capture",
  discover: "/discover",
  friends: "/friends",
  settings: "/profile",
};

type TutorialOverlayProps = {
  onClose: () => void;
};

/** The senses, drawn in a row. Smell has no icon of its own; a flower will do. */
function SensesRow() {
  const senses = [Hand, Eye, Ear, Flower2];

  return (
    <div className="flex items-center gap-3">
      {senses.map((Glyph, index) => (
        <span
          key={index}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-white text-black/70"
          style={{ transform: `rotate(${(index % 2 === 0 ? -1 : 1) * 4}deg)` }}
        >
          <Glyph size={24} strokeWidth={1.6} aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}

/** yu and mi, as two hands passing something between them. */
function ExchangeMark() {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-black/15 text-2xl font-bold text-black">
        yu
      </span>

      <span className="text-2xl font-bold text-black/25">+</span>

      <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-black/15 text-2xl font-bold text-black">
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

    case "name":
      return <ExchangeMark />;

    case "senses":
      return <SensesRow />;

    case "home":
      return (
        <OrbitIcon
          render={(active) => (
            <NavHomeIcon className="h-7 w-7" active={active} />
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

    case "capture":
      return <OrbitIcon render={() => <CameraIcon className="h-7 w-7" />} />;

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
          render={(active) => (
            <NavMessagesIcon className="h-7 w-7" active={active} />
          )}
        />
      );

    case "friends":
      return (
        <OrbitIcon
          render={() => (
            <UserPlus size={26} strokeWidth={1.6} aria-hidden="true" />
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
  }
}

export default function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const { t } = useTranslation();
  const copy = t.tutorial;

  const [index, setIndex] = useState(0);
  const step = STEP_ORDER[index];
  const isFirst = index === 0;
  const isLast = index === STEP_ORDER.length - 1;

  const stepCopy = copy.steps[step];
  const href = STEP_HREF[step];
  const visual = stepVisual(step);
  const isYumiStep = step === "meet" || step === "done";

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
      if (event.key === "Escape") dismiss();
    }

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [dismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.rowTitle}
      className="fixed inset-0 z-[120] flex flex-col bg-surface"
    >
      <header className="flex shrink-0 items-center justify-between px-7 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/30">
          {insertValues(copy.stepLabel, {
            current: index + 1,
            total: STEP_ORDER.length,
          })}
        </span>

        <button
          type="button"
          onClick={dismiss}
          className="-mr-3 shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold text-black/40 transition-transform active:scale-95"
        >
          {isLast ? copy.close : copy.skip}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-7">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-8">
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

          <h2 className="text-[1.6rem] font-bold leading-[1.2] tracking-[-0.025em] text-black">
            {stepCopy.title}
          </h2>

          {/* One confident stroke. The hand-drawn feel lives here, not in a
              frame around everything. */}
          <SketchUnderline className="mt-2.5 h-2 w-32 text-amber-500/70" />

          <p className="mt-5 max-w-[30rem] text-[14.5px] leading-[1.85] text-black/50">
            {stepCopy.body}
          </p>

          {step === "setup" && <TutorialLanguageSetup />}

          {href && "action" in stepCopy && (
            <Link
              href={href}
              onClick={dismiss}
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full bg-black px-6 py-3.5 text-[13.5px] font-semibold text-white transition-transform active:scale-[0.985]"
            >
              {stepCopy.action}
            </Link>
          )}

          {isLast && (
            <p className="mt-7 text-[13px] leading-6 text-black/35">
              {copy.replay}
            </p>
          )}
        </div>
      </div>

      <footer className="shrink-0 px-7 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <button
            type="button"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={isFirst}
            aria-label={copy.back}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/10 text-black/45 transition-transform active:scale-[0.94] disabled:invisible"
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
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-white transition-transform active:scale-[0.94]"
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
