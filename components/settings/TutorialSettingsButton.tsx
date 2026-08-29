"use client";

import { Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";

const TutorialOverlay = dynamic(
  () => import("@/components/tutorial/TutorialOverlay"),
  {
    loading: () => (
      <div
        className="fixed inset-0 z-[120] touch-none overscroll-none bg-surface"
        aria-hidden="true"
      />
    ),
  },
);

/**
 * The permanent way back into the tour. Unlike the home launcher this never
 * opens on its own — someone who reaches Settings is looking for something
 * specific, and a tour appearing over it would be in the way.
 */
export default function TutorialSettingsButton() {
  const { t } = useTranslation();
  const copy = t.tutorial;

  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={copy.rowValue}
        icon={<Sparkles size={16} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      />

      {open && <TutorialOverlay onClose={() => setOpen(false)} />}
    </>
  );
}
