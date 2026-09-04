import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LaunchSoundSettingsButton from "@/components/settings/LaunchSoundSettingsButton";
import english from "@/lib/i18n/en";

/* =========================================================
   Hearing the sound you are deciding about

   The switch governs something most readers will never have heard: the
   opening plays for 2.8 seconds on a screen nobody is looking at yet, and on
   a cold start the browser usually refuses to play it at all. A button is the
   one place it is certain to play, because a click is the gesture every
   autoplay policy is waiting for.

   The state has four ways back to idle on purpose. "ended" is not guaranteed
   — a backgrounded tab suspends media without ending it, the OS can pause it,
   a decode failure fires "error" instead — and any of those left the button
   reading "Playing…" for the rest of the session over an audio element that
   had long since stopped.
   ========================================================= */

const copy = english.settings.launchSound;

const audio = vi.hoisted(() => ({
  allow: true,
  paused: true,
  duration: 2.8,
  listeners: new Map<string, Set<() => void>>(),
  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener();
  },
}));

beforeEach(() => {
  audio.allow = true;
  audio.paused = true;
  audio.listeners = new Map();

  vi.stubGlobal(
    "Audio",
    class {
      currentTime = 0;
      duration = audio.duration;
      play() {
        if (!audio.allow) return Promise.reject(new DOMException("no", "NotAllowedError"));
        audio.paused = false;
        return Promise.resolve();
      }
      pause() {
        audio.paused = true;
      }
      addEventListener(type: string, listener: () => void) {
        const set = audio.listeners.get(type) ?? new Set();
        set.add(listener);
        audio.listeners.set(type, set);
      }
      removeEventListener(type: string, listener: () => void) {
        audio.listeners.get(type)?.delete(listener);
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.localStorage.clear();
});

function previewButton() {
  return screen.getByRole("button", { name: `${copy.previewLabel}: ${copy.rowTitle}` });
}

async function click() {
  await act(async () => {
    previewButton().click();
    await Promise.resolve();
  });
}

describe("the preview button", () => {
  it("plays, and says so", async () => {
    render(<LaunchSoundSettingsButton />);

    await click();

    expect(previewButton()).toHaveTextContent(copy.previewPlaying);
    expect(audio.paused).toBe(false);
  });

  it("goes back to idle when the clip ends", async () => {
    render(<LaunchSoundSettingsButton />);
    await click();

    await act(async () => audio.emit("ended"));

    expect(previewButton()).toHaveTextContent(copy.previewLabel);
  });

  it("goes back to idle when the sound is paused instead of ended", async () => {
    // A backgrounded tab, or the OS taking the audio away.
    render(<LaunchSoundSettingsButton />);
    await click();

    await act(async () => audio.emit("pause"));

    expect(previewButton()).toHaveTextContent(copy.previewLabel);
  });

  it("does not sit on 'playing' when nothing fires at all", async () => {
    vi.useFakeTimers();
    render(<LaunchSoundSettingsButton />);

    await act(async () => {
      previewButton().click();
      await Promise.resolve();
    });
    expect(previewButton()).toHaveTextContent(copy.previewPlaying);

    // No ended, no pause, no error — the backstop has to carry it.
    await act(async () => {
      vi.advanceTimersByTime(4_000);
    });

    expect(previewButton()).toHaveTextContent(copy.previewLabel);
  });

  it("says so when the sound cannot be played", async () => {
    audio.allow = false;
    render(<LaunchSoundSettingsButton />);

    await click();

    expect(screen.getByText(copy.previewFailed)).toBeInTheDocument();
  });

  it("previews even when the automatic opening sound is switched off", async () => {
    render(<LaunchSoundSettingsButton />);

    // The switch governs the automatic sound; asking to hear it is its own act.
    await act(async () => {
      screen.getByRole("switch").click();
    });
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");

    await click();

    expect(audio.paused).toBe(false);
  });
});
