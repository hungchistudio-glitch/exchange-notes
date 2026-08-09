"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import TutorialOverlay from "@/components/tutorial/TutorialOverlay";
import { SketchUnderline } from "@/components/tutorial/HandDrawn";
import useTranslation from "@/hooks/i18n/useTranslation";
import useTutorialSeen from "@/hooks/preferences/useTutorialSeen";

/**
 * The tour's home-screen entry point, and the thing that opens it unprompted
 * the very first time.
 *
 * First-run is derived, not assigned: the overlay is on screen whenever the
 * device has not seen it, so there is no effect writing state on mount and no
 * frame where the home screen is visible before the tour covers it. Dismissing
 * flips the stored flag, the store notifies, and this unmounts on its own.
 */
export default function TutorialLauncher() {
  const { t } = useTranslation();
  const copy = t.tutorial;

  const seen = useTutorialSeen();
  const [reopened, setReopened] = useState(false);

  const showing = reopened || !seen;

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
