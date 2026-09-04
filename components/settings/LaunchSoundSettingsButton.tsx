"use client";

import { Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SettingsToggleRow } from "@/components/foundation/rows/SettingsRow";
import { YUMI_MINIMAL_AUDIO_SRC } from "@/components/launch/yumiMinimalTimeline";
import useTranslation from "@/hooks/i18n/useTranslation";
import useLaunchSoundEnabled from "@/hooks/preferences/useLaunchSound";
import { setLaunchSoundEnabled } from "@/lib/appPreferences";

/**
 * Whether the opening animation is allowed to make a sound, and a way to hear
 * what is being decided about.
 *
 * The preview is not a nicety. The opening plays for 2.8 seconds on a screen
 * nobody is looking at yet, and on a cold start the browser will usually
 * refuse to play it at all — so the switch governs something most readers
 * will never have heard. A button is the one place the sound is certain to
 * play, because a click is the user gesture every autoplay policy is waiting
 * for.
 *
 * It plays whether the setting is on or off. The setting governs the
 * *automatic* sound; asking to hear it is a separate, explicit act.
 */
export default function LaunchSoundSettingsButton() {
  const { t } = useTranslation();
  const copy = t.settings.launchSound;
  const enabled = useLaunchSoundEnabled();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const settleRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<"idle" | "playing" | "failed">("idle");

  useEffect(
    () => () => {
      settleRef.current?.();
      audioRef.current?.pause();
    },
    [],
  );

  function preview() {
    // Built on demand rather than rendered: the settings screen should not
    // fetch 45KB of audio for a row most readers scroll straight past.
    const audio = (audioRef.current ??= new Audio(YUMI_MINIMAL_AUDIO_SRC));

    settleRef.current?.();
    audio.pause();
    audio.currentTime = 0;

    /*
     * Four ways back to idle, because "ended" is not guaranteed to arrive.
     *
     * A backgrounded tab suspends media without ending it, the OS can pause
     * it, and a decode failure fires "error" instead — any of which used to
     * leave the button reading "Playing…" for the rest of the session, over
     * an audio element that had long since stopped. The timeout is the
     * backstop for the ones that fire nothing at all, sized from the clip
     * itself with a second of slack.
     */
    const settle = () => {
      if (settleRef.current !== settle) return;
      settleRef.current = null;

      clearTimeout(timer);
      audio.removeEventListener("ended", settle);
      audio.removeEventListener("pause", settle);
      audio.removeEventListener("error", settle);

      setState((current) => (current === "playing" ? "idle" : current));
    };

    const timer = setTimeout(
      settle,
      (Number.isFinite(audio.duration) ? audio.duration * 1000 : 3_000) + 1_000,
    );

    settleRef.current = settle;
    audio.addEventListener("ended", settle);
    audio.addEventListener("pause", settle);
    audio.addEventListener("error", settle);

    void audio.play().then(
      () => setState("playing"),
      () => {
        settle();
        setState("failed");
      },
    );
  }

  return (
    <>
      <SettingsToggleRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        icon={<Volume2 size={16} strokeWidth={1.8} />}
        checked={enabled}
        onChange={setLaunchSoundEnabled}
      />

      {/* Indented to the text column, so it reads as belonging to the row. */}
      <div className="px-4 pb-3.5 pl-[62px]">
        <button
          type="button"
          onClick={preview}
          aria-label={`${copy.previewLabel}: ${copy.rowTitle}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1.5 text-[0.8125rem] font-medium text-ink-soft transition-colors active:bg-black/[0.09]"
        >
          <Play size={13} strokeWidth={2} />
          {state === "playing" ? copy.previewPlaying : copy.previewLabel}
        </button>

        {state === "failed" ? (
          <p className="mt-1.5 text-xs leading-5 text-red-600">
            {copy.previewFailed}
          </p>
        ) : null}
      </div>
    </>
  );
}
