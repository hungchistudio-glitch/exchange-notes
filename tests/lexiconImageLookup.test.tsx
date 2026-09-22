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
