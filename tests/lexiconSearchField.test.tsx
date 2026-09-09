import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InterfaceLanguage } from "@/lib/appPreferences";
import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   Two language axes, one real field

   The home control is an input now, not a button that opens a second screen.
   These tests keep the five-language placeholder matrix and assert that text,
   voice and camera all act where the field already is.
   ========================================================= */

const axes = vi.hoisted(() => ({
  interfaceLanguage: "english" as InterfaceLanguage,
  learning: "fr" as LanguageCode,
  native: "en" as LanguageCode,
}));

const controls = vi.hoisted(() => ({
  query: "",
  setQuery: vi.fn(),
  submit: vi.fn(),
  reset: vi.fn(),
  voiceToggle: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => axes.interfaceLanguage,
}));

vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({
    learningLanguage: axes.learning,
    nativeLanguage: axes.native,
  }),
}));

vi.mock("@/contexts/VocabularyContext", () => ({
  useVocabulary: () => ({ items: [], addItem: vi.fn() }),
}));

vi.mock("@/hooks/lexicon/useLexiconOnboarding", () => ({
  default: () => ({ visible: false, dismiss: controls.dismiss }),
}));

vi.mock("@/hooks/lexicon/useLexiconSearch", () => ({
  default: () => ({
    query: controls.query,
    setQuery: controls.setQuery,
    submit: controls.submit,
    reset: controls.reset,
    status: controls.query ? "typing" : "idle",
    result: null,
    preview: null,
    error: "",
    savedMatches: [],
    kind: "word",
    chooseLanguage: vi.fn(),
    retry: vi.fn(),
    inputMode: "type",
  }),
}));

vi.mock("@/hooks/lexicon/useLexiconSave", () => ({
  default: () => ({}),
}));

vi.mock("@/hooks/lexicon/useLexiconShare", () => ({
  default: () => ({ share: vi.fn(), copied: false }),
}));

vi.mock("@/hooks/useVocabularyFriendPicker", () => ({
  default: () => ({
    friendPickerItem: null,
    friends: [],
    friendsLoading: false,
    friendsError: "",
    sendingFriendId: null,
    shareCard: vi.fn(),
    handleClosePicker: vi.fn(),
    handlePickFriend: vi.fn(),
    retryFriends: vi.fn(),
  }),
}));

vi.mock("@/hooks/useVoiceInput", () => ({
  default: () => ({
    supported: true,
    listening: false,
    toggle: controls.voiceToggle,
  }),
}));

vi.mock("@/components/lexicon/LexiconResults", () => ({
  default: () => <div data-testid="inline-results" />,
}));

vi.mock("@/components/vocabulary/FriendPickerModal", () => ({
  default: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const { default: UniversalSearchField } = await import(
  "@/components/lexicon/UniversalSearchField"
);

beforeEach(() => {
  controls.query = "";
  controls.setQuery.mockReset();
  controls.submit.mockReset();
  controls.reset.mockReset();
  controls.voiceToggle.mockReset();
  controls.dismiss.mockReset();
});

function placeholderFor(
  interfaceLanguage: InterfaceLanguage,
  learning: LanguageCode,
  native: LanguageCode = "en",
) {
  axes.interfaceLanguage = interfaceLanguage;
  axes.learning = learning;
  axes.native = native;

  const { unmount } = render(<UniversalSearchField />);
  const placeholder = screen.getByRole("textbox").getAttribute("placeholder") ?? "";

  unmount();
  return placeholder;
}

describe("the home search field's placeholder", () => {
  it("is written in the interface language and names the learning one", () => {
    expect(placeholderFor("english", "fr")).toContain("French");
    expect(placeholderFor("english", "it")).toContain("Italian");
  });

  it("does not fall back to English when the interface is Chinese", () => {
    const label = placeholderFor("traditional-chinese", "fr");

    expect(label).toContain("法文");
    expect(label).not.toContain("French");
    expect(label).not.toContain("Search");
  });

  it("keeps the two axes independent in every interface language", () => {
    expect(placeholderFor("spanish", "en")).toContain("Inglés");
    expect(placeholderFor("french", "it")).toContain("Italien");

    const italian = placeholderFor("italian", "zh-TW", "it");
    expect(italian).toContain("Cinese tradizionale");
    expect(italian).not.toContain("Chinese");
  });

  it("changes when the learning language changes, interface untouched", () => {
    const french = placeholderFor("traditional-chinese", "fr");
    const spanish = placeholderFor("traditional-chinese", "es");

    expect(french).not.toBe(spanish);
    expect(french).toContain("法文");
    expect(spanish).toContain("西班牙文");
  });
});

describe("the home field works in place", () => {
  it("is a real input and submits its lookup without opening another view", () => {
    controls.query = "bonjour";
    axes.interfaceLanguage = "english";
    axes.learning = "fr";

    render(<UniversalSearchField />);

    expect(screen.getByRole("textbox")).toHaveValue("bonjour");
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);

    expect(controls.submit).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("inline-results")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("runs voice here and opens the app's own camera", () => {
    axes.interfaceLanguage = "traditional-chinese";
    axes.learning = "fr";

    const { container } = render(<UniversalSearchField />);

    fireEvent.click(screen.getByRole("button", { name: "語音" }));

    expect(controls.voiceToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "掃描" })).toBeInTheDocument();

    /*
     * No picker sits in the field any more. The key used to be a bare file
     * input, which on iOS meant "Take Photo" handed over to Apple's camera
     * — a different camera from the one every other capture surface in this
     * app uses. It opens TargetCamera now, and the picker moved inside it.
     */
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(0);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
