import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const recognition = vi.hoisted(() => ({
  fileToModelImage: vi.fn(),
  identifyImage: vi.fn(),
}));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

vi.mock("@/lib/lexicon/imageRecognition", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/lexicon/imageRecognition")
  >();

  return {
    ...actual,
    fileToModelImage: recognition.fileToModelImage,
    identifyImage: recognition.identifyImage,
  };
});

const { ImageRecognitionError } = await import(
  "@/lib/lexicon/imageRecognition"
);
const { default: useLexiconImageLookup } = await import(
  "@/hooks/lexicon/useLexiconImageLookup"
);

beforeEach(() => {
  recognition.fileToModelImage.mockReset();
  recognition.identifyImage.mockReset();
});

describe("the shared lexicon image lookup", () => {
  it("hands one recognised term to whichever search surface invoked it", async () => {
    const onTerm = vi.fn();
    const photo = new File(["photo"], "sign.jpg", { type: "image/jpeg" });
    recognition.fileToModelImage.mockResolvedValue(
      "data:image/jpeg;base64,cGhvdG8=",
    );
    recognition.identifyImage.mockResolvedValue({ term: "bonjour" });
    const { result } = renderHook(() => useLexiconImageLookup({ onTerm }));

    await act(async () => result.current.handleFile(photo));

    expect(recognition.fileToModelImage).toHaveBeenCalledOnce();
    expect(recognition.identifyImage).toHaveBeenCalledOnce();
    expect(onTerm).toHaveBeenCalledWith("bonjour");
    expect(result.current.reading).toBe(false);
    expect(result.current.error).toBe("");
  });

  it("uses the shared translated error and does not invent a term", async () => {
    const onTerm = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    recognition.fileToModelImage.mockRejectedValue(
      new ImageRecognitionError("too-large"),
    );
    const { result } = renderHook(() =>
      useLexiconImageLookup({ onTerm }),
    );

    await act(async () =>
      result.current.handleFile(
        new File(["photo"], "large.jpg", { type: "image/jpeg" }),
      ),
    );

    expect(onTerm).not.toHaveBeenCalled();
    expect(result.current.error).toContain("10 MB");
    expect(result.current.reading).toBe(false);
  });
});
