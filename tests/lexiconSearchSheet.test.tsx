import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const controls = vi.hoisted(() => ({
  setQuery: vi.fn(),
  submit: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/i18n/useTranslation", () => ({
  default: () => ({
    language: "english",
    t: {
      lexicon: {
        close: "Close",
        open: "Open word search",
        fieldPlaceholderLanguage: "Search or add a word in {language}",
        inputAriaLabel: "Search words",
        clear: "Clear",
        search: "Search",
        modeType: "Type",
        modeVoice: "Voice",
        searching: "Searching",
      },
      capture: { analysis: { description: "Reading image" } },
    },
  }),
}));

vi.mock("@/contexts/VocabularyContext", () => ({
  useVocabulary: () => ({ items: [], addItem: vi.fn() }),
}));

vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({ pair: ["en", "zh-TW"] }),
}));

vi.mock("@/hooks/lexicon/useKeyboardInset", () => ({ default: () => 0 }));

vi.mock("@/hooks/lexicon/useLexiconSearch", () => ({
  default: () => ({
    query: "",
    setQuery: controls.setQuery,
    submit: controls.submit,
    reset: controls.reset,
    status: "idle",
    result: null,
  }),
}));

vi.mock("@/hooks/lexicon/useLexiconSave", () => ({ default: () => ({}) }));

vi.mock("@/hooks/lexicon/useLexiconShare", () => ({
  default: () => ({ share: vi.fn(), copied: false }),
}));

vi.mock("@/hooks/lexicon/useLexiconImageLookup", () => ({
  default: () => ({
    reading: false,
    error: "",
    handleFile: vi.fn(),
  }),
}));

vi.mock("@/hooks/useVoiceInput", () => ({
  default: () => ({ supported: true, listening: false, toggle: vi.fn() }),
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

vi.mock("@/components/lexicon/LexiconResults", () => ({
  default: () => <div>Search results</div>,
}));

vi.mock("@/components/lexicon/LexiconImageMenu", () => ({
  default: () => <button type="button">Camera</button>,
}));

vi.mock("@/components/vocabulary/FriendPickerModal", () => ({
  default: () => null,
}));

const { default: LexiconSearchSheet } = await import(
  "@/components/lexicon/LexiconSearchSheet"
);

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  vi.useFakeTimers();
  controls.setQuery.mockReset();
  controls.submit.mockReset();
  controls.reset.mockReset();

  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: () => true },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.useRealTimers();
});

describe("the word search drawer", () => {
  it("exposes a visible drag grip in both interface tones", () => {
    const { rerender } = render(
      <LexiconSearchSheet open onClose={vi.fn()} tone="cosmic" />,
    );

    let grip = document.querySelector<HTMLElement>(
      "[data-lexicon-drawer-handle]",
    );
    expect(grip).not.toBeNull();
    expect(grip?.firstElementChild).toHaveClass(
      "bg-[var(--cosmic-cyan-dim)]",
    );

    rerender(<LexiconSearchSheet open onClose={vi.fn()} tone="warm" />);
    grip = document.querySelector<HTMLElement>(
      "[data-lexicon-drawer-handle]",
    );
    expect(grip?.firstElementChild).toHaveClass("bg-black/15");
  });

  it("uses the restrained full-screen entrance and settles before focus", () => {
    window.matchMedia = vi.fn((query: string) => ({
      matches: query === "(pointer: coarse)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    render(<LexiconSearchSheet open onClose={vi.fn()} tone="warm" />);

    const dialog = screen.getByRole("dialog", { name: "Open word search" });
    const input = screen.getByRole("textbox", { name: "Search words" });

    expect(dialog).toHaveAttribute("data-presentation", "fullscreen");
    expect(dialog).toHaveAttribute("data-settled", "false");

    act(() => vi.advanceTimersByTime(450));

    expect(dialog).toHaveAttribute("data-settled", "true");
    expect(input).not.toHaveFocus();
  });

  it("closes when the grip is pulled down", () => {
    const onClose = vi.fn();
    render(<LexiconSearchSheet open onClose={onClose} tone="warm" />);

    const grip = document.querySelector<HTMLElement>(
      "[data-lexicon-drawer-handle]",
    );
    expect(grip).not.toBeNull();

    fireEvent.pointerDown(grip!, {
      button: 0,
      clientY: 12,
      pointerId: 9,
    });
    fireEvent.pointerMove(grip!, {
      button: 0,
      clientY: 220,
      pointerId: 9,
    });

    act(() => vi.advanceTimersByTime(400));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
