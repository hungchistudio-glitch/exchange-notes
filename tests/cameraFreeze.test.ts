import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCameraStream } from "@/hooks/camera/useCameraStream";

/* =========================================================
   The preview stops on the frame that was taken

   Reported twice: after the shutter the camera carried on moving, for the
   three to seven seconds recognition takes, behind a progress message. It
   reads as the tap not having landed.

   The mechanism is two lines — pause the element, and remember that we did
   — and the second line is the one worth testing. iOS suspends a video when
   the app goes to the background and does not always resume it, so this hook
   plays a paused video whenever the page becomes visible again. Without a
   flag, that helpful behaviour immediately undoes a deliberate freeze.
   ========================================================= */

/** A video element that records what was asked of it. */
function fakeVideo() {
  const video = {
    paused: false,
    srcObject: {} as MediaStream,
    pause: vi.fn(function (this: { paused: boolean }) {
      video.paused = true;
    }),
    /*
     * Returns undefined, exactly as jsdom and older mobile browsers do.
     * `.catch` on that throws, which is a real crash this hook shipped
     * with once.
     */
    play: vi.fn(() => undefined),
  };

  return video;
}

beforeEach(() => {
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: undefined });
});

function mounted() {
  const { result } = renderHook(() => useCameraStream());
  const video = fakeVideo();

  act(() => {
    result.current.videoRef.current = video as never;
  });

  return { result, video };
}

describe("holding the frame", () => {
  it("pauses the preview", () => {
    const { result, video } = mounted();

    act(() => result.current.freeze());

    expect(video.pause).toHaveBeenCalled();
  });

  it("keeps it held when the app comes back to the foreground", () => {
    /*
     * The case the flag exists for. Returning to the app mid-recognition
     * must not restart the picture the reader is waiting on.
     */
    const { result, video } = mounted();

    act(() => result.current.freeze());
    video.play.mockClear();

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });

    expect(video.play).not.toHaveBeenCalled();
  });

  it("lets it run again once released", () => {
    const { result, video } = mounted();

    act(() => result.current.freeze());
    act(() => result.current.unfreeze());

    expect(video.play).toHaveBeenCalled();
  });

  it("resumes on foreground again after being released", () => {
    // Unfreezing has to clear the flag, not just call play once.
    const { result, video } = mounted();

    act(() => result.current.freeze());
    act(() => result.current.unfreeze());

    video.paused = true;
    video.play.mockClear();

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(video.play).toHaveBeenCalled();
  });

  it("survives a play() that returns nothing", () => {
    /*
     * jsdom and older mobile browsers return undefined rather than a
     * promise. Calling .catch on that threw, and unfreeze runs on mount —
     * so it took six unrelated tests down with it.
     */
    const { result } = mounted();

    expect(() => act(() => result.current.unfreeze())).not.toThrow();
  });

  it("does nothing at all when there is no element yet", () => {
    // Freezing before the video has mounted must not throw.
    const { result } = renderHook(() => useCameraStream());

    expect(() => act(() => result.current.freeze())).not.toThrow();
    expect(() => act(() => result.current.unfreeze())).not.toThrow();
  });
});
