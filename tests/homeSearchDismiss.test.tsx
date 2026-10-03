import { act, fireEvent, render, screen } from "@testing-library/react";
import { useCallback, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dismissHomeSearch } from "@/lib/home/homeMoments";

const services = vi.hoisted(() => ({
  submit: vi.fn(), cancelImage: vi.fn(), stopVoice: vi.fn(), stopSpeech: vi.fn(),
  voice: null as null | { onResult: (text: string) => void; onAudio: (audio: Blob) => Promise<void> },
  words: [{ id: "saved-apple", word: "apple", translation: "蘋果" }],
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));
vi.mock("@/hooks/useDisplayLanguages", () => ({ default: () => ({ pair: ["en", "zh-TW"] }) }));
vi.mock("@/contexts/VocabularyContext", () => ({ useVocabulary: () => ({ items: services.words, addItem: vi.fn() }) }));
vi.mock("@/hooks/lexicon/useLexiconOnboarding", () => ({ default: () => ({ visible: false, dismiss: vi.fn() }) }));
vi.mock("@/hooks/lexicon/useLexiconSave", () => ({ default: () => ({}) }));
vi.mock("@/hooks/lexicon/useLexiconShare", () => ({ default: () => ({}) }));
vi.mock("@/hooks/useVocabularyFriendPicker", () => ({ default: () => ({}) }));
vi.mock("@/hooks/lexicon/useLexiconImageLookup", () => ({ default: () => ({ cancel: services.cancelImage }) }));
vi.mock("@/hooks/useVoiceInput", () => ({ default: (callbacks: NonNullable<typeof services.voice>) => {
  services.voice = callbacks;
  return { supported: true, stop: services.stopVoice, toggle: vi.fn() };
} }));
vi.mock("@/lib/speech", () => ({ stopSpeech: services.stopSpeech }));
vi.mock("@/components/lexicon/LexiconImageMenu", () => ({ default: () => null }));
vi.mock("@/components/lexicon/LexiconResults", () => ({ default: () => <p>Dictionary answer</p> }));
vi.mock("@/hooks/lexicon/useLexiconSearch", () => ({ default: function Search() {
  const [query, setQuery] = useState("apple");
  const reset = useCallback(() => setQuery(""), []);
  return { query, reset, setQuery, status: query ? "ready" : "idle", savedMatches: [], result: null, submit: services.submit };
} }));

import UniversalSearchField from "@/components/lexicon/UniversalSearchField";

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("putting the home search away", () => {
  it("clears and blurs the field, stops audio and camera work, and keeps saved vocabulary", () => {
    render(<UniversalSearchField />);
    const input = screen.getByRole("textbox");
    act(() => input.focus());
    act(() => dismissHomeSearch());
    expect(input).toHaveValue("");
    expect(document.activeElement).not.toBe(input);
    expect(screen.queryByText("Dictionary answer")).not.toBeInTheDocument();
    expect(services.cancelImage).toHaveBeenCalledOnce();
    expect(services.stopVoice).toHaveBeenCalledOnce();
    expect(services.stopSpeech).toHaveBeenCalledOnce();
    expect(services.words).toEqual([{ id: "saved-apple", word: "apple", translation: "蘋果" }]);
  });

  it("drops a delayed voice transcript but accepts a newly started voice search", () => {
    render(<UniversalSearchField />);
    fireEvent.click(screen.getByRole("button", { name: "Voice" }));
    act(() => dismissHomeSearch());
    act(() => services.voice!.onResult("late apple"));
    expect(services.submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Voice" }));
    act(() => services.voice!.onResult("pear"));
    expect(services.submit).toHaveBeenCalledWith("pear", "voice");
  });

  it("drops a voice upload that finishes after returning home", async () => {
    let respond!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { respond = resolve; })));
    render(<UniversalSearchField />);
    fireEvent.click(screen.getByRole("button", { name: "Voice" }));
    const upload = services.voice!.onAudio(new Blob(["voice"]));
    act(() => dismissHomeSearch());
    await act(async () => {
      respond({ ok: true, json: async () => ({ heard: true, text: "apple" }) });
      await upload;
    });
    expect(services.submit).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});
