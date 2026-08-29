"use client";

import { Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";

/*
 * Fetched on the tap, for the same reason as on the home screen — see
 * TutorialLauncher. This entry point never opens by itself, so there is not
 * even a first run to weigh against: Settings has no reason to carry eleven
 * slides of tour in its own bundle on the chance that someone asks for them.
 */
const TutorialOverlay = dynamic(
  () => import("@/components/tutorial/TutorialOverlay"),
  { ssr: false },
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
