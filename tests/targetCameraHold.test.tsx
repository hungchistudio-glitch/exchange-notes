import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The shutter holds the picture it took (Chi, 2026-09-28)

   Reported on an iPhone: the camera recognised things, but the moment the
   shutter was pressed the picture did not stay. The frame was paused — and
   let go again half a second later, when the phone's own recogniser
   answered, while the camera stayed open for the AI with nothing on it.

   Chi's answers: a white flash, then the frame held with the target
   breathing while it is read; the word found shown on the held frame for
   about a second, then the card; nothing found → stay on the held frame
   with the reason and a Retake key.
   ========================================================= */

const camera = vi.hoisted(() => ({
  videoRef: { current: null as HTMLVideoElement | null },
  freeze: vi.fn(),
  unfreeze: vi.fn(),
  suspend: vi.fn(),
  resume: vi.fn(),
  retry: vi.fn(),
}));

vi.mock("@/hooks/camera/useCameraStream", () => ({
  useCameraStream: () => ({
    videoRef: camera.videoRef,
    stream: null,
    status: "live",
    capabilities: { zoom: null, torch: false, tapToFocus: false, stops: [] },
    suspend: camera.suspend,
    resume: camera.resume,
    freeze: camera.freeze,
    unfreeze: camera.unfreeze,
    retry: camera.retry,
  }),
}));

vi.mock("@/lib/media/raster", () => ({
  rasterFromVideo: () => ({ source: {}, width: 640, height: 480, close: vi.fn() }),
}));

vi.mock("@/lib/media/regionDetection", () => ({
  detectRegions: () => [],
}));

const { default: TargetCamera, ANSWER_HOLD_MS } = await import(
  "@/components/camera/TargetCamera"
);

const copy = {
  close: "Close camera",
  shutter: "Capture photo",
  torchOn: "Torch on",
  torchOff: "Torch off",
  photoLibrary: "Photo library",
  importFile: "Import file",
  zoom: "Zoom",
  zoomLevel: "{level}×",
  hint: "Tap what you want to read",
  selectedTarget: "Selected target",
  candidateTarget: "Possible target",
  focused: "Focused",
  analysing: "Analysing target",
  permissionDenied: "Camera permission denied",
  unavailable: "Camera unavailable",
  retry: "Try again",
  retake: "Retake",
};

beforeEach(() => {
  camera.freeze.mockClear();
  camera.unfreeze.mockClear();
  /* A preview with real dimensions, so the held copy can be drawn. */
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
    configurable: true,
    get: () => 640,
  });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
    configurable: true,
    get: () => 480,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function held(container: HTMLElement) {
  return container.querySelector("canvas")?.getAttribute("data-held-frame") === "true";
}

function shutter() {
  return screen.getByRole("button", { name: copy.shutter });
}

describe("pressing the shutter", () => {
  it("holds the frame it took, flashes, and stops taking another", async () => {
    let finish: (value: unknown) => void = () => {};
    const onCapture = vi.fn(() => new Promise((resolve) => (finish = resolve)));

    const { container } = render(
      <TargetCamera
        copy={copy}
        onCapture={onCapture as never}
        onClose={vi.fn()}
        onPickPhoto={vi.fn()}
      />,
    );

    await act(async () => fireEvent.click(shutter()));

    expect(camera.freeze).toHaveBeenCalled();
    expect(held(container)).toBe(true);
    expect(container.querySelector("[class*='flash']")).not.toBeNull();
    expect(shutter()).toBeDisabled();

    await act(async () => finish({ kind: "none" }));
  });
});

describe("once a word is found", () => {
  it("shows it on the held frame, then closes after a moment", async () => {
    const onClose = vi.fn();
    const onCapture = vi.fn(async () => ({
      kind: "answer" as const,
      term: "chaise",
      translation: "椅子",
    }));

    const { container } = render(
      <TargetCamera
        copy={copy}
        onCapture={onCapture}
        onClose={onClose}
        onPickPhoto={vi.fn()}
      />,
    );

    await act(async () => fireEvent.click(shutter()));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("chaise");
    expect(status).toHaveTextContent("椅子");
    // Still the picture that was taken, not the live room.
    expect(held(container)).toBe(true);
    expect(camera.unfreeze).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), {
      timeout: ANSWER_HOLD_MS + 1000,
    });
  });
});

describe("when nothing could be found", () => {
  it("stays on the held frame with the reason, and a Retake key", async () => {
    const onClose = vi.fn();
    const onCapture = vi.fn(async () => ({
      kind: "error" as const,
      message: "Google's AI is unavailable right now.",
    }));

    const { container } = render(
      <TargetCamera
        copy={copy}
        onCapture={onCapture}
        onClose={onClose}
        onPickPhoto={vi.fn()}
      />,
    );

    await act(async () => fireEvent.click(shutter()));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Google's AI is unavailable right now.",
    );
    expect(held(container)).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /Retake/ })),
    );

    expect(camera.unfreeze).toHaveBeenCalled();
    expect(held(container)).toBe(false);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(shutter()).not.toBeDisabled();
  });
});

describe("a caller that runs its own wait (the capture screen)", () => {
  /*
   * The capture screen sets its own `busy` the moment the shutter hands it
   * the photograph, and closes the camera on success. On a failure the
   * preview comes back live, as it always has there.
   */
  function Harness() {
    const [busy, setBusy] = useState(false);

    return (
      <>
        <button type="button" onClick={() => setBusy(false)}>
          finish
        </button>
        <TargetCamera
          copy={copy}
          busy={busy}
          onCapture={() => setBusy(true)}
          onClose={vi.fn()}
          onPickPhoto={vi.fn()}
        />
      </>
    );
  }

  it("holds the frame while it says it is busy, and lets go when it is not", async () => {
    const { container } = render(<Harness />);

    await act(async () => fireEvent.click(shutter()));

    expect(held(container)).toBe(true);
    expect(camera.unfreeze).not.toHaveBeenCalled();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "finish" })));

    await waitFor(() => expect(held(container)).toBe(false));
    expect(camera.unfreeze).toHaveBeenCalled();
  });
});
