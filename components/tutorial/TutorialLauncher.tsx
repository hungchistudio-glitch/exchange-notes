"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import TutorialOverlay from "@/components/tutorial/TutorialOverlay";
import { SketchUnderline } from "@/components/tutorial/HandDrawn";
import useTranslation from "@/hooks/i18n/useTranslation";
import useTutorialPending from "@/hooks/preferences/useTutorialPending";

/**
 * The tour's home-screen entry point, and the thing that opens it unprompted
 * the very first time.
 *
 * It opens by itself only when onboarding has just finished and left a tour
 * pending — never merely because this device has no record of one. An account
 * that has been in use for months has no pending tour and is left alone; its
 * owner reaches the tour through this button or through Settings.
 *
 * Pending is derived, not assigned: the overlay is on screen while the flag is
 * set, so no effect writes state on mount. Dismissing clears the flag, the
 * store notifies, and this unmounts on its own.
 */
export default function TutorialLauncher() {
  const { t } = useTranslation();
  const copy = t.tutorial;

  const pending = useTutorialPending();
  const [reopened, setReopened] = useState(false);

  const showing = reopened || pending;

  return (
    <>
      <button
        type="button"
        onClick={() => setReopened(true)}
        className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-[22px] border border-line bg-white px-5 py-4 text-left transition-transform active:scale-[0.99]"
      >
        <Sparkles
          size={17}
          strokeWidth={1.8}
          aria-hidden="true"
          className="shrink-0 text-amber-500"
        />

        <span className="relative">
          <span className="text-sm font-semibold text-black">
            {copy.homeButton}
          </span>

          <SketchUnderline
            className="absolute -bottom-1.5 left-0 h-1.5 w-full text-amber-500/50"
          />
        </span>
      </button>

      {showing && (
        <TutorialOverlay onClose={() => setReopened(false)} />
      )}
    </>
  );
}
