"use client";

import { Mic } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import { micPermission, type MicPermission } from "@/lib/voice/micAccess";

/* The check-up records and meters: its own chunk, fetched when opened. */
const MicCheckSheet = dynamic(() => import("@/components/settings/MicCheckSheet"), { ssr: false });

/**
 * Settings › Microphone (Chi, 2026-11-27: 麥克風健檢). What the browser says
 * about the microphone, without asking, and a check-up of the whole way
 * from the microphone to Yumi's hearing.
 */
export default function MicrophoneSettingsRow() {
  const { t } = useTranslation();
  const copy = t.settings.microphone;
  const [state, setState] = useState<MicPermission>("unknown");
  const [open, setOpen] = useState(false);
  const [built, setBuilt] = useState(false);

  useEffect(() => {
    let alive = true;
    const read = () => { void micPermission().then(next => { if (alive) setState(next); }); };
    read();
    document.addEventListener("visibilitychange", read);
    return () => { alive = false; document.removeEventListener("visibilitychange", read); };
  }, []);

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        icon={<Mic size={16} strokeWidth={1.8} />}
        tone={state === "granted" ? "emerald" : state === "denied" ? "amber" : "neutral"}
        value={copy.status[state]}
        onClick={() => { setBuilt(true); setOpen(true); }}
      />
      {built ? (
        <MicCheckSheet
          open={open}
          onClose={() => {
            setOpen(false);
            void micPermission().then(setState);
          }}
        />
      ) : null}
    </>
  );
}
