"use client";

import Link from "next/link";
import { Ear, Eye, Flower2, Hand, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import CameraIcon from "@/components/foundation/icons/CameraIcon";
import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavHomeIcon from "@/components/foundation/icons/NavHomeIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import { CircledIcon, SketchUnderline } from "@/components/tutorial/HandDrawn";
import TutorialStage from "@/components/tutorial/TutorialStage";
import TutorialLanguageSetup from "@/components/tutorial/TutorialLanguageSetup";
import useTranslation from "@/hooks/i18n/useTranslation";
import { setTutorialSeen } from "@/lib/appPreferences";
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
        <CircledIcon tone="amber">
          <NavHomeIcon className="h-8 w-8" active />
        </CircledIcon>
      );

    case "vocabulary":
      return (
        <CircledIcon>
          <NavVocabularyIcon className="h-8 w-8" />
        </CircledIcon>
      );

    case "capture":
      return (
        <CircledIcon tone="emerald">
          <CameraIcon className="h-8 w-8" />
        </CircledIcon>
      );

    case "discover":
      return (
        <CircledIcon>
          <NavDiscoverIcon className="h-8 w-8" />
        </CircledIcon>
      );

    case "messages":
      return (
        <CircledIcon>
          <NavMessagesIcon className="h-8 w-8" />
        </CircledIcon>
      );

    case "friends":
      return (
        <CircledIcon tone="emerald">
          <UserPlus size={30} strokeWidth={1.6} aria-hidden="true" />
        </CircledIcon>
      );

    case "settings":
      return (
        <CircledIcon>
          <NavSettingsIcon className="h-8 w-8" />
        </CircledIcon>
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
   * Dismissing is always recorded, whether the tour was finished, skipped, or
   * followed out to a destination. Someone who skipped has made a decision,
   * and asking again next time would override it. Both entry points are
   * permanent, so nothing is lost by taking them at their word.
   */
  const dismiss = useCallback(() => {
    setTutorialSeen(true);
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/30">
          {insertValues(copy.stepLabel, {
            current: index + 1,
            total: STEP_ORDER.length,
          })}
        </span>

        <button
          type="button"
          onClick={dismiss}
          className="-mr-3 shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-black/40 transition-transform active:scale-95"
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
              className="mb-10 flex min-h-[11rem] items-end"
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

          <h2 className="text-[2.125rem] font-bold leading-[1.12] tracking-[-0.03em] text-black">
            {stepCopy.title}
          </h2>

          {/* One confident stroke. The hand-drawn feel lives here, not in a
              frame around everything. */}
          <SketchUnderline className="mt-3 h-2.5 w-44 text-amber-500/70" />

          <p className="mt-6 text-[17px] leading-[1.75] text-black/55">
            {stepCopy.body}
          </p>

          {step === "setup" && <TutorialLanguageSetup />}

          {href && "action" in stepCopy && (
            <Link
              href={href}
              onClick={dismiss}
              className="mt-8 inline-flex min-h-13 items-center justify-center self-start whitespace-nowrap rounded-full bg-black px-7 py-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.985]"
            >
              {stepCopy.action}
            </Link>
          )}

          {isLast && (
            <p className="mt-8 text-sm leading-6 text-black/35">
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
            className="min-h-13 shrink-0 whitespace-nowrap rounded-full py-4 pr-5 text-[15px] font-semibold text-black/45 transition-transform active:scale-[0.985] disabled:invisible"
          >
            {copy.back}
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
            className="min-h-13 shrink-0 whitespace-nowrap rounded-full bg-black px-7 py-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.985]"
          >
            {isLast ? copy.finish : copy.next}
          </button>
        </div>
      </footer>
    </div>
  );
}
