import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const voice = vi.hoisted(() => ({
  start: vi.fn(),
  toggle: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

vi.mock("@/contexts/VocabularyContext", () => ({
  useVocabulary: () => ({ items: [], addItem: vi.fn() }),
}));

vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({ pair: ["fr", "en"] }),
}));

vi.mock("@/hooks/lexicon/useLexiconSearch", () => ({
  default: () => ({
    query: "",
    setQuery: vi.fn(),
    submit: vi.fn(),
    reset: vi.fn(),
    status: "idle",
    result: null,
    savedMatches: [],
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
    start: voice.start,
    stop: vi.fn(),
    toggle: voice.toggle,
  }),
}));

vi.mock("@/hooks/lexicon/useKeyboardInset", () => ({
  default: () => 0,
}));

vi.mock("@/components/foundation/overlays/useSheetMotion", () => ({
  default: () => ({
    rendered: true,
    requestClose: vi.fn(),
    backdropClassName: "",
    panelClassName: "",
    backdropProps: {},
    panelProps: { style: {} },
  }),
}));

vi.mock("@/components/lexicon/LexiconResults", () => ({
  default: () => null,
}));

vi.mock("@/components/vocabulary/FriendPickerModal", () => ({
  default: () => null,
}));

vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
  callback(0);
  return 1;
});
vi.stubGlobal("cancelAnimationFrame", vi.fn());

const { default: LexiconSearchSheet } = await import(
  "@/components/lexicon/LexiconSearchSheet"
);

beforeEach(() => {
  vi.useFakeTimers();
  voice.start.mockReset();
  voice.toggle.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("direct actions from the home search bar", () => {
  it("starts listening when the home microphone opens the sheet", () => {
    render(
      <LexiconSearchSheet
        open
        onClose={vi.fn()}
        initialAction="voice"
      />,
    );

    act(() => vi.advanceTimersByTime(160));

    expect(voice.start).toHaveBeenCalledTimes(1);
  });

  it("opens the three-source camera menu without visiting capture", async () => {
    render(
      <LexiconSearchSheet
        open
        onClose={vi.fn()}
        initialAction="camera"
      />,
    );

    await act(async () => undefined);

    expect(screen.getByRole("menu", { name: "Image source" })).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  });
});
