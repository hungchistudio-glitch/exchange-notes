import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CameraCapture } from "@/components/camera/TargetCamera";
import type { CaptureOutcome } from "@/hooks/lexicon/useLexiconImageLookup";
import type { NormalizedRect } from "@/lib/media/geometry";

const mocks = vi.hoisted(() => ({
  identify: vi.fn(), device: vi.fn(), startCapture: vi.fn(), back: vi.fn(),
  replace: vi.fn(), openSearch: vi.fn(), decode: vi.fn(), copy: vi.fn(),
  originalClose: vi.fn(), frameClose: vi.fn(), hold: vi.fn(),
  params: new URLSearchParams("source=camera&from=vocabulary"),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.params,
  useRouter: () => ({ back: mocks.back, replace: mocks.replace, push: vi.fn() }),
}));
vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));
vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({ learningLanguage: "fr", nativeLanguage: "zh-TW" }),
}));
vi.mock("@/contexts/LexiconSearchContext", () => ({
  useLexiconSearchSheet: () => ({ openSearch: mocks.openSearch }),
}));
vi.mock("@/lib/media/pipeline", () => ({ startCapture: mocks.startCapture }));
vi.mock("@/lib/media/raster", () => ({ decodeBlob: mocks.decode, copyRaster: mocks.copy }));
vi.mock("@/lib/lexicon/pendingImageCapture", () => ({ holdImageCapture: mocks.hold }));
vi.mock("@/lib/vision/onDeviceClassifier", () => ({ recognizeOnDevice: mocks.device }));
vi.mock("@/lib/pronunciation/getPronunciation", () => ({ getPronunciationForPair: async () => null }));
vi.mock("@/lib/lexicon/imageRecognition", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/lexicon/imageRecognition")>(), identifyImage: mocks.identify,
}));
vi.mock("@/components/vocabulary/FriendPickerModal", () => ({ default: () => null }));

// TargetCamera's real hold/retake timing is covered by targetCameraHold.
// Here its contract is exercised against the real page + recognition hook.
vi.mock("@/components/camera/TargetCamera", () => ({
  default: function Camera({ onCapture, onClose, onPickPhoto }: {
    onCapture: (capture: CameraCapture) => Promise<CaptureOutcome>;
    onClose: () => void; onPickPhoto: (file: File) => void;
  }) {
    const [outcome, setOutcome] = useState<CaptureOutcome>();
    return <div role="dialog" aria-label="Camera">
      <button onClick={async () => setOutcome(await onCapture({
        raster: { source: {} as CanvasImageSource, width: 640, height: 480, close: mocks.frameClose },
        targetRect: { x: .2, y: .2, width: .4, height: .4 },
      }))}>Shutter</button>
      <button onClick={onClose}>Close camera</button>
      <button onClick={() => onPickPhoto(new File(["photo"], "photo.jpg", { type: "image/jpeg" }))}>Pick photo</button>
      {outcome?.kind === "answer" && <>
        <output>{outcome.term} · {outcome.translation}</output>
        <button onClick={onClose}>Finish answer hold</button>
      </>}
      {outcome?.kind === "error" && <p role="alert">{outcome.message}</p>}
    </div>;
  },
}));
vi.mock("@/components/camera/TargetImageViewer", () => ({
  default: ({ onConfirm, onClose, error, busy }: {
    onConfirm: (rect: NormalizedRect) => void; onClose: () => void; error?: string; busy: boolean;
  }) => <div role="dialog" aria-label="Photo target">
    <button disabled={busy} onClick={() => onConfirm({ x: 0, y: 0, width: 1, height: 1 })}>Read target</button>
    <button onClick={onClose}>Close photo</button>
    {error && <p role="alert">{error}</p>}
  </div>,
}));

import CapturePage from "@/app/(protected)/capture/page";
import { ImageRecognitionError } from "@/lib/lexicon/imageRecognition";

const answer = {
  term: "bouteille", translation: "瓶子", partOfSpeech: "noun", confidence: "high",
  termExample: "Une bouteille d’eau.", translationExample: "一瓶水。",
  termLanguage: "fr", translationLanguage: "zh-TW",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = new URLSearchParams("source=camera&from=vocabulary");
  mocks.identify.mockResolvedValue(answer);
  mocks.device.mockResolvedValue(null);
  mocks.decode.mockResolvedValue({ source: {}, width: 640, height: 480, close: mocks.originalClose });
  mocks.copy.mockReturnValue({ source: {}, width: 640, height: 480, close: mocks.frameClose });
  mocks.startCapture.mockImplementation(async ({ raster, sourceType, sourcePage }) => ({
    recognitionImage: "data:image/jpeg;base64,photo", cropRect: { x: 0, y: 0, width: 1, height: 1 },
    capture: Promise.resolve({ sourceType, sourcePage, card: { blob: new Blob(["photo"]) } }).finally(() => raster.close()),
  }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the capture page shares the search camera flow", () => {
  it("reads on the shutter, holds the word, then shows its card without navigating away", async () => {
    render(<CapturePage />);
    fireEvent.click(screen.getByText("Shutter"));
    await screen.findByText("bouteille · 瓶子");
    expect(mocks.identify).toHaveBeenCalledOnce();
    expect(mocks.startCapture).toHaveBeenCalledWith(expect.objectContaining({ recognitionScope: "target" }));
    expect(screen.getByRole("dialog", { name: "Camera" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Finish answer hold"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByText("bouteille").length).toBeGreaterThan(0);
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.back).not.toHaveBeenCalled();
  });

  it("keeps Google's outage explanation on the held camera for retaking", async () => {
    mocks.identify.mockRejectedValue(new ImageRecognitionError("google-down"));
    render(<CapturePage />);
    fireEvent.click(screen.getByText("Shutter"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Google");
    expect(screen.getByRole("dialog", { name: "Camera" })).toBeInTheDocument();
    mocks.identify.mockResolvedValue(answer);
    fireEvent.click(screen.getByText("Shutter"));
    await screen.findByText("bouteille · 瓶子");
  });

  it("can keep the phone's bilingual answer when the AI cannot answer", async () => {
    mocks.identify.mockRejectedValue(new ImageRecognitionError("google-down"));
    mocks.device.mockResolvedValue({ word: { en: "chair", fr: "chaise", "zh-TW": "椅子", es: "silla", it: "sedia" }, score: .8 });
    render(<CapturePage />);
    fireEvent.click(screen.getByText("Shutter"));
    await screen.findByText("chaise · 椅子");
    fireEvent.click(screen.getByText("Finish answer hold"));
    expect(screen.getAllByText("chaise").length).toBeGreaterThan(0);
    expect(screen.getAllByText("椅子").length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("drops a late answer after closing the camera", async () => {
    let finish!: (value: typeof answer) => void;
    mocks.identify.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<CapturePage />);
    fireEvent.click(screen.getByText("Shutter"));
    await waitFor(() => expect(mocks.identify).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByText("Close camera"));
    await act(async () => { finish(answer); });
    expect(screen.queryByText("bouteille")).not.toBeInTheDocument();
    expect(mocks.hold).not.toHaveBeenCalled();
  });

  it("keeps the picked original reusable after failure and frees it after success", async () => {
    mocks.identify.mockRejectedValueOnce(new ImageRecognitionError("google-down")).mockResolvedValueOnce(answer);
    render(<CapturePage />);
    fireEvent.click(screen.getByText("Pick photo"));
    fireEvent.click(await screen.findByText("Read target"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Google");
    expect(mocks.originalClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Read target"));
    await screen.findAllByText("bouteille");
    expect(mocks.copy).toHaveBeenCalledTimes(2);
    expect(mocks.originalClose).toHaveBeenCalledOnce();
    expect(mocks.frameClose).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
