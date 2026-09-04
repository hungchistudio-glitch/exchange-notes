import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import YumiMinimalLaunch from "@/components/launch/YumiMinimalLaunch";
import {
  DEFAULT_LAUNCH_SOUND_ENABLED,
  setLaunchSoundEnabled,
} from "@/lib/appPreferences";

/* =========================================================
   The opening animation making a sound

   It never did. The two controls that call play() sit behind
   showReviewControls, which only the review routes set — so on a real load
   the audio element mounted, downloaded its 45KB, and was never once asked
   to play. soundState stayed "silent" for the life of the document.

   Wiring it up is not enough on its own. The opening runs at document load,
   before any interaction, which is exactly what autoplay policies refuse:
   desktop Chrome often allows it, iOS Safari on a cold start essentially
   never does, and no amount of unlocking on a previous visit survives a new
   document. So a refusal arms a one-shot listener and the first touch
   anywhere starts it from wherever the animation has got to.

   A reader who touches nothing gets a silent opening, which is what they had
   before — the point is that it is now the worst case rather than the only
   case.
   ========================================================= */

const audio = vi.hoisted(() => ({
  playCalls: 0,
  allow: true,
  paused: true,
  currentTime: 0,
}));

beforeEach(() => {
  audio.playCalls = 0;
  audio.allow = true;
  audio.paused = true;
  audio.currentTime = 0;

  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(
    function play(this: HTMLMediaElement) {
      audio.playCalls += 1;

      if (!audio.allow) {
        return Promise.reject(new DOMException("blocked", "NotAllowedError"));
      }

      audio.paused = false;
      return Promise.resolve();
    },
  );
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {
    audio.paused = true;
  });

  setLaunchSoundEnabled(DEFAULT_LAUNCH_SOUND_ENABLED);
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

function sound(container: HTMLElement) {
  return container
    .querySelector("[data-launch-id]")
    ?.getAttribute("data-sound");
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("the opening's sound", () => {
  it("asks to play on the real opening, not only on the review route", async () => {
    const { container } = render(<YumiMinimalLaunch launchId="test" />);
    await settle();

    expect(audio.playCalls).toBe(1);
    expect(sound(container)).toBe("playing");
  });

  it("takes the first touch as permission when the browser refuses", async () => {
    audio.allow = false;

    const { container } = render(<YumiMinimalLaunch launchId="test" />);
    await settle();

    expect(audio.playCalls).toBe(1);
    expect(sound(container)).toBe("blocked");

    // The reader touches the screen while the opening is still running.
    audio.allow = true;
    await act(async () => {
      window.dispatchEvent(new Event("pointerdown"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(audio.playCalls).toBe(2);
    expect(sound(container)).toBe("playing");
  });

  it("only takes one gesture, however many arrive", async () => {
    audio.allow = false;

    render(<YumiMinimalLaunch launchId="test" />);
    await settle();

    audio.allow = true;
    await act(async () => {
      window.dispatchEvent(new Event("pointerdown"));
      window.dispatchEvent(new Event("pointerdown"));
      window.dispatchEvent(new Event("keydown"));
      await Promise.resolve();
    });

    // The initial attempt, and exactly one from the gesture.
    expect(audio.playCalls).toBe(2);
  });

  it("stays quiet when the reader has turned the sound off", async () => {
    setLaunchSoundEnabled(false);

    const { container } = render(<YumiMinimalLaunch launchId="test" />);
    await settle();

    expect(audio.playCalls).toBe(0);
    expect(sound(container)).toBe("silent");

    // And a touch does not sneak it back in.
    await act(async () => {
      window.dispatchEvent(new Event("pointerdown"));
      await Promise.resolve();
    });

    expect(audio.playCalls).toBe(0);
  });

  it("stays quiet for a reader who asked for less motion", async () => {
    const { container } = render(
      <YumiMinimalLaunch launchId="test" forceReducedMotion />,
    );
    await settle();

    expect(audio.playCalls).toBe(0);
    expect(sound(container)).toBe("silent");
  });

  it("leaves the review route to its own controls", async () => {
    render(<YumiMinimalLaunch launchId="test" reviewMode />);
    await settle();

    expect(audio.playCalls).toBe(0);
  });

  it("stops the sound and lets go of the listener when the opening unmounts", async () => {
    audio.allow = false;

    const view = render(<YumiMinimalLaunch launchId="test" />);
    await settle();

    view.unmount();
    audio.allow = true;

    await act(async () => {
      window.dispatchEvent(new Event("pointerdown"));
      await Promise.resolve();
    });

    expect(audio.playCalls).toBe(1);
    expect(audio.paused).toBe(true);
  });
});
