import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The search sheet's camera key

   Rewritten when this hook moved onto the shared media pipeline. It used to
   mock `fileToModelImage`, which no longer exists — decoding, sizing and
   compressing are lib/media's job now, and there is no canvas in this
   runner, so the pipeline is mocked at its own boundary instead.

   What is actually being checked has not changed: one term reaches the
   search surface, failures come back as translated sentences rather than
   invented words, and — new — the photograph is held for the save to claim.
   ========================================================= */

const recognition = vi.hoisted(() => ({
  identifyImage: vi.fn(),
}));

const onDeviceVision = vi.hoisted(() => ({
  recognizeOnDevice: vi.fn(),
}));

vi.mock("@/lib/vision/onDeviceClassifier", () => ({
  recognizeOnDevice: onDeviceVision.recognizeOnDevice,
}));

vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({ learningLanguage: "fr", nativeLanguage: "zh-TW" }),
}));

vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({
    learningLanguage: "fr",
    supportLanguage: "zh-TW",
    pair: ["fr", "zh-TW"] as const,
  }),
}));

const media = vi.hoisted(() => ({
  decodeBlob: vi.fn(),
  startCapture: vi.fn(),
  holdImageCapture: vi.fn(),
  openPdf: vi.fn(),
}));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

vi.mock("@/lib/lexicon/imageRecognition", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/lexicon/imageRecognition")
  >();

  return { ...actual, identifyImage: recognition.identifyImage };
});

vi.mock("@/lib/media/raster", () => ({
  decodeBlob: media.decodeBlob,
}));

vi.mock("@/lib/media/pipeline", () => ({
  startCapture: media.startCapture,
}));

vi.mock("@/lib/lexicon/pendingImageCapture", () => ({
  holdImageCapture: media.holdImageCapture,
}));

vi.mock("@/lib/media/pdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media/pdf")>();

  /* isPdf and PdfRenderError are real; only the renderer is a double, since
     opening a PDF needs pdf.js and a document that actually parses. */
  return { ...actual, openPdf: media.openPdf };
});

const { ImageRecognitionError, MAX_IMAGE_FILE_SIZE } = await import(
  "@/lib/lexicon/imageRecognition"
);
const { DEFAULT_TARGET_RECT } = await import("@/lib/media/config");
const { default: useLexiconImageLookup } = await import(
  "@/hooks/lexicon/useLexiconImageLookup"
);

/** A File of a stated size, without building the bytes for one. */
function photo(name: string, type = "image/jpeg", size = 1024): File {
  const file = new File(["photo"], name, { type });

  Object.defineProperty(file, "size", { value: size });

  return file;
}

const close = vi.fn();

beforeEach(() => {
  recognition.identifyImage.mockReset();
  /* The phone recognises nothing unless a case says otherwise. */
  onDeviceVision.recognizeOnDevice.mockReset().mockResolvedValue(null);
  media.decodeBlob.mockReset();
  media.startCapture.mockReset();
  media.holdImageCapture.mockReset();
  media.openPdf.mockReset();
  close.mockReset();

  media.openPdf.mockResolvedValue({
    pageCount: 3,
    renderPage: vi.fn().mockResolvedValue({
      source: {},
      width: 1400,
      height: 1980,
      close,
    }),
    close: vi.fn(),
  });

  media.decodeBlob.mockResolvedValue({
    source: {},
    width: 2048,
    height: 1536,
    close,
  });

  /*
   * startCapture hands back the model's copy immediately and the stored
   * derivatives as a promise still running — that ordering is the point of
   * it, so the double mirrors it rather than resolving everything at once.
   */
  media.startCapture.mockImplementation(async ({ raster }) => ({
    recognitionImage: "data:image/jpeg;base64,cGhvdG8=",
    cropRect: { x: 0, y: 0, width: 1, height: 1 },
    capture: Promise.resolve({ sourceType: "photo" }).finally(() =>
      // startCapture owns the raster and frees it when these settle.
      raster.close(),
    ),
  }));
});

describe("the shared lexicon image lookup", () => {
  it("hands one recognised term to whichever search surface invoked it", async () => {
    const onTerm = vi.fn();
    recognition.identifyImage.mockResolvedValue({ term: "bonjour" });

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo("sign.jpg")));

    expect(media.startCapture).toHaveBeenCalledOnce();
    expect(recognition.identifyImage).toHaveBeenCalledOnce();
    expect(onTerm).toHaveBeenCalledWith("bonjour");
    expect(result.current.reading).toBe(false);
    expect(result.current.error).toBe("");
  });

  it("sends the whole frame to the model and crops the card to the centre", async () => {
    /*
     * The two rectangles differ on purpose, and it is worth pinning: this
     * is a working recognition path whose prompt asks about the centre of
     * what it is given, so narrowing its input would change answers — while
     * a card of the entire photograph is exactly what the media spec
     * forbids.
     */
    const onTerm = vi.fn();
    recognition.identifyImage.mockResolvedValue({ term: "verre" });

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo("glass.jpg")));

    expect(media.startCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        recognitionScope: "frame",
        targetRect: DEFAULT_TARGET_RECT,
        sourceType: "photo",
      }),
    );
  });

  it("holds the photograph for the save to claim", async () => {
    const onTerm = vi.fn();
    recognition.identifyImage.mockResolvedValue({ term: "bouteille" });

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo("bottle.jpg")));

    expect(media.holdImageCapture).toHaveBeenCalledWith("bouteille", {
      sourceType: "photo",
    });
  });

  it("holds nothing when the model named nothing", async () => {
    const onTerm = vi.fn();
    recognition.identifyImage.mockResolvedValue({ term: "" });

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo("blur.jpg")));

    expect(media.holdImageCapture).not.toHaveBeenCalled();
    expect(onTerm).not.toHaveBeenCalled();
  });

  it("refuses an oversized file before decoding it", async () => {
    const onTerm = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () =>
      result.current.handleFile(
        photo("large.jpg", "image/jpeg", MAX_IMAGE_FILE_SIZE + 1),
      ),
    );

    // The point of checking first: a forty-megabyte screenshot is turned
    // away in a microsecond rather than after a second of decoding.
    expect(media.decodeBlob).not.toHaveBeenCalled();
    expect(onTerm).not.toHaveBeenCalled();
    expect(result.current.error).toContain("10 MB");
    expect(result.current.reading).toBe(false);
  });

  it("refuses something that is not an image at all", async () => {
    const onTerm = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () =>
      result.current.handleFile(photo("notes.pdf", "application/pdf")),
    );

    expect(media.decodeBlob).not.toHaveBeenCalled();
    expect(onTerm).not.toHaveBeenCalled();
    expect(result.current.error).not.toBe("");
  });

  it("uses the shared translated error and does not invent a term", async () => {
    const onTerm = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    recognition.identifyImage.mockRejectedValue(
      new ImageRecognitionError("daily-limit"),
    );

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo("sign.jpg")));

    expect(onTerm).not.toHaveBeenCalled();
    expect(result.current.error).not.toBe("");
    expect(result.current.reading).toBe(false);
  });

  it("releases the decoded frame even when recognition fails", async () => {
    /*
     * A raster is the full-resolution decode — tens of megabytes a reader
     * never gets back. Ownership moves to startCapture, which frees it when
     * its derivatives settle, so this holds whether or not the request that
     * ran alongside them succeeded.
     */
    const onTerm = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    recognition.identifyImage.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo("sign.jpg")));

    expect(close).toHaveBeenCalled();
  });

  it("frees a frame dropped because a read was already running", async () => {
    // A second shutter press while the first is still being read. Nothing
    // downstream ever sees that frame, so the hook has to free it itself.
    const onTerm = vi.fn();
    const dropped = { source: {}, width: 10, height: 10, close: vi.fn() };

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => {
      // Two in the same tick: the first takes the lock, the second is dropped.
      void result.current.handleCapture(
        { source: {}, width: 10, height: 10, close: vi.fn() } as never,
        { x: 0, y: 0, width: 1, height: 1 },
      );
      await result.current.handleCapture(dropped as never, {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      });
    });

    expect(dropped.close).toHaveBeenCalled();
  });

  /* =========================================================
     Documents

     Reading a word out of a PDF lived on the capture page, which was the
     only entry point in the app that took something that is not an image.
     Merging the camera doors would have taken it away with the page, so it
     moved here — and these hold it here.
     ========================================================= */

  it("reads the first page of a PDF instead of refusing it", async () => {
    recognition.identifyImage.mockResolvedValue({ term: "biblioteca" });

    const onTerm = vi.fn();
    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => {
      await result.current.handleFile(
        photo("menu.pdf", "application/pdf", 2048),
      );
    });

    const document_ = await media.openPdf.mock.results[0].value;

    /* Page one, not whichever page a reader last looked at: this path is
       for reading a word out of a document, not for browsing it. */
    expect(document_.renderPage).toHaveBeenCalledWith(1);
    expect(onTerm).toHaveBeenCalledWith("biblioteca");
    expect(result.current.error).toBe("");

    /* Filed as a document rather than as a photograph, because that is what
       the reader handed over. */
    expect(media.startCapture).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: "file" }),
    );

    /* The page is a canvas of its own, so the document goes as soon as it is
       rendered — and the capture still owns the bitmap. */
    expect(document_.close).toHaveBeenCalled();
    expect(media.decodeBlob).not.toHaveBeenCalled();
  });

  it("says a document it cannot open is unreadable, not the wrong type", async () => {
    const { PdfRenderError } = await import("@/lib/media/pdf");
    media.openPdf.mockRejectedValue(new PdfRenderError());

    const onTerm = vi.fn();
    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => {
      await result.current.handleFile(photo("broken.pdf", "application/pdf"));
    });

    /* "Select a photo" would be a lie — they did select one, and it is a
       kind this path accepts. This is the same sentence the capture page
       showed for the same failure; it says "image" where it now sometimes
       means "document", which is worth its own copy key one day. */
    expect(result.current.error).toBe("Could not process this image.");
    expect(onTerm).not.toHaveBeenCalled();
  });
});

/* =========================================================
   The phone answers first (2026-09-28)

   At a free-tier peak every Gemini model refused the camera at once. The
   classifier on the phone now names the object in a fraction of a second;
   the AI's answer, when it comes, replaces it, and when it does not, the
   phone's answer is what the reader keeps.
   ========================================================= */

describe("with the phone's classifier", () => {
  const chair = { en: "chair", "zh-TW": "椅子", es: "silla", fr: "chaise", it: "sedia" };

  it("shows the phone's word first, then hands on the AI's as an upgrade", async () => {
    const onTerm = vi.fn();
    onDeviceVision.recognizeOnDevice.mockResolvedValue({ word: chair, score: 0.8 });

    let answer: (value: { term: string }) => void = () => {};
    recognition.identifyImage.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    let reading: Promise<void> = Promise.resolve();
    await act(async () => {
      reading = result.current.handleFile(photo("chair.jpg"));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // In the learning language, with the word the card is built from.
    expect(onTerm).toHaveBeenCalledWith("chaise", { onDeviceWord: chair });
    // The shutter is free again while the AI is still reading.
    expect(result.current.reading).toBe(false);

    await act(async () => {
      answer({ term: "fauteuil" });
      await reading;
    });

    expect(onTerm).toHaveBeenLastCalledWith("fauteuil", { upgrade: true });
    expect(result.current.error).toBe("");
  });

  it("keeps the phone's word, with no error, when the AI is busy", async () => {
    const onTerm = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    onDeviceVision.recognizeOnDevice.mockResolvedValue({ word: chair, score: 0.8 });
    recognition.identifyImage.mockRejectedValue(new ImageRecognitionError("busy"));

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo("chair.jpg")));

    expect(onTerm).toHaveBeenCalledWith("chaise", { onDeviceWord: chair });
    // No second request: the phone's card is kept as the answer.
    expect(onTerm).toHaveBeenLastCalledWith("chaise", { finalOnDevice: true });
    expect(result.current.error).toBe("");
  });

  it("says busy as before when neither could name it", async () => {
    const onTerm = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    recognition.identifyImage.mockRejectedValue(new ImageRecognitionError("busy"));

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo("blur.jpg")));

    expect(onTerm).not.toHaveBeenCalled();
    expect(result.current.error).not.toBe("");
  });

  /* Chi, 2026-09-28: "告訴免費使用者 Google 掛掉" — in so many words. */
  it("says Google's AI is unavailable, and roughly for how long", async () => {
    const onTerm = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    recognition.identifyImage.mockRejectedValue(
      new ImageRecognitionError("google-down", {
        retryAt: Date.now() + 90_000,
        quotaOnly: false,
      }),
    );

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo("lamp.jpg")));

    expect(onTerm).not.toHaveBeenCalled();
    expect(result.current.error).toContain("Google");
    expect(result.current.error).toContain("2 min");
  });

  it("keeps the phone's word when Google is down", async () => {
    const onTerm = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    onDeviceVision.recognizeOnDevice.mockResolvedValue({ word: chair, score: 0.8 });
    recognition.identifyImage.mockRejectedValue(
      new ImageRecognitionError("google-down", { retryAt: null }),
    );

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo("chair.jpg")));

    expect(onTerm).toHaveBeenLastCalledWith("chaise", { finalOnDevice: true });
    expect(result.current.error).toBe("");
  });

  it("does not show the phone's word once the AI has already answered", async () => {
    const onTerm = vi.fn();
    let recognise: (value: unknown) => void = () => {};
    onDeviceVision.recognizeOnDevice.mockReturnValue(
      new Promise((resolve) => {
        recognise = resolve;
      }),
    );
    recognition.identifyImage.mockResolvedValue({ term: "tabouret" });

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo("stool.jpg")));
    await act(async () => {
      recognise({ word: chair, score: 0.8 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(onTerm).toHaveBeenCalledTimes(1);
    expect(onTerm).toHaveBeenCalledWith("tabouret");
  });

  it("can be turned off for a surface that asks for the word itself", async () => {
    const onTerm = vi.fn();
    recognition.identifyImage.mockResolvedValue({ term: "chaise" });

    const { result } = renderHook(() =>
      useLexiconImageLookup({ onTerm, onDevice: false }),
    );

    await act(async () => result.current.handleFile(photo("chair.jpg")));

    expect(onDeviceVision.recognizeOnDevice).not.toHaveBeenCalled();
    expect(onTerm).toHaveBeenCalledWith("chaise");
  });
});

/*
 * What the camera shows on the frame it took (Chi, 2026-09-28): the shutter
 * hears back at the first word found — the phone's, half a second in — not
 * when the AI finishes, so it can show that word on the held frame and
 * close. The AI's upgrade carries on in the card.
 */
describe("what the shutter hears back", () => {
  const chair = { en: "chair", "zh-TW": "椅子", es: "silla", fr: "chaise", it: "sedia" };
  const raster = () => ({ source: {}, width: 640, height: 480, close: vi.fn() });

  it("is the phone's word, as soon as it is shown, while the AI reads on", async () => {
    const onTerm = vi.fn();
    onDeviceVision.recognizeOnDevice.mockResolvedValue({ word: chair, score: 0.8 });
    let answer: (value: unknown) => void = () => {};
    recognition.identifyImage.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.handleCapture(raster() as never, DEFAULT_TARGET_RECT);
    });

    expect(outcome).toEqual({ kind: "answer", term: "chaise", translation: "椅子" });

    // The AI still answers into the card afterwards.
    await act(async () => {
      answer({ term: "fauteuil", translation: "扶手椅" });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(onTerm).toHaveBeenLastCalledWith("fauteuil", { upgrade: true });
  });

  it("is the AI's word when the phone had none", async () => {
    recognition.identifyImage.mockResolvedValue({ term: "lampe", translation: "檯燈" });

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm: vi.fn() }));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.handleCapture(raster() as never, DEFAULT_TARGET_RECT);
    });

    expect(outcome).toEqual({ kind: "answer", term: "lampe", translation: "檯燈" });
  });

  it("is the reason, when neither found anything", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    recognition.identifyImage.mockRejectedValue(
      new ImageRecognitionError("google-down", { retryAt: null }),
    );

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm: vi.fn() }));

    let outcome: { kind: string; message?: string } | undefined;
    await act(async () => {
      outcome = (await result.current.handleCapture(
        raster() as never,
        DEFAULT_TARGET_RECT,
      )) as typeof outcome;
    });

    expect(outcome?.kind).toBe("error");
    expect(outcome?.message).toContain("Google");
  });

  it("is a reason too when the model looked and named nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    recognition.identifyImage.mockResolvedValue({ term: "" });

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm: vi.fn() }));

    let outcome: { kind: string } | undefined;
    await act(async () => {
      outcome = (await result.current.handleCapture(
        raster() as never,
        DEFAULT_TARGET_RECT,
      )) as typeof outcome;
    });

    expect(outcome?.kind).toBe("error");
  });
});

describe("one request per photograph", () => {
  it("files the recognition as the card for the word it found", async () => {
    window.localStorage.clear();
    const onTerm = vi.fn();
    recognition.identifyImage.mockResolvedValue({
      term: "chaise",
      translation: "椅子",
      partOfSpeech: "noun",
      termExample: "La chaise est en bois.",
      translationExample: "這張椅子是木頭做的。",
      confidence: "high",
      termLanguage: "fr",
      translationLanguage: "zh-TW",
      termIpa: "/ʃɛz/",
    });

    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));
    await act(async () => result.current.handleFile(photo("chair.jpg")));

    const { readCachedEntry } = await import("@/lib/lexicon/cache");
    const cached = readCachedEntry({
      query: "chaise",
      pair: ["fr", "zh-TW"],
      native: "zh-TW",
      head: null,
    });

    // So the search that is handed "chaise" shows this, without asking again.
    expect(cached).toMatchObject({
      term: "chaise",
      translation: "椅子",
      termIpa: "/ʃɛz/",
      termExample: "La chaise est en bois.",
    });
    expect(onTerm).toHaveBeenCalledWith("chaise");
  });
});
