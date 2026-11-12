import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { announceOpened, closeWhenOtherOpens } from "@/lib/cosmic/disclosure";
import { arrivalOnMount, resetHomeArrivalForTests, spendFirstArrival } from "@/lib/cosmic/homeArrival";
import { setLaunching } from "@/lib/launchState";

/* =========================================================
   The Cosmic home as the obsidian bridge (Chi, 2026-11-12)

   Six features folded into an orbit key, one set of six open at a time,
   real readings only, and one owner for the home's arrival: the full wake
   once per app runtime, a short fade back from another page, nothing under
   the mode switch or reduced motion. The 3D Yumi, the search and the notes
   are stood in for: they have their own tests.
   ========================================================= */

const state = vi.hoisted(() => ({
  modeTransition: null as string | null,
  loading: false,
  unread: 4,
}));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));
vi.mock("@/contexts/InterfaceModeContext", () => ({
  useInterfaceMode: () => ({ modeTransition: state.modeTransition }),
  useOptionalInterfaceMode: () => null,
}));
vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({ learningLanguage: "en" }),
}));
vi.mock("@/contexts/VocabularyContext", () => ({
  useVocabulary: () => ({ items: Array.from({ length: 1234 }, (_, i) => ({ id: String(i) })), loading: state.loading }),
}));
vi.mock("@/hooks/useVocabularyStats", () => ({ default: () => ({ reviewStats: { due: 12 } }) }));
vi.mock("@/hooks/messages/useUnreadMessageCount", () => ({ default: () => ({ unreadCount: state.unread }) }));
vi.mock("@/components/cosmic/CosmicHomeYumi", () => ({
  default: ({ shrink, fit }: { shrink?: boolean; fit?: string }) => (
    <div data-testid="yumi" data-shrink={String(!!shrink)} data-fit={fit} />
  ),
}));
vi.mock("@/components/cosmic/OmniLexiconConsole", () => ({
  default: ({ onStateChange }: { onStateChange?: (state: string) => void }) => (
    <div>
      <input aria-label="search" />
      <button type="button" onClick={() => onStateChange?.("listening")}>listen</button>
    </div>
  ),
}));
vi.mock("@/components/notes/NotesHomeModule", () => ({ default: () => <div>notes</div> }));

const CommandDeck = (await import("@/components/cosmic/CommandDeck")).default;

function deck() {
  const view = render(<CommandDeck />);
  const root = view.container.querySelector<HTMLElement>("[data-own-arrival]")!;
  const key = screen.getByRole("button", { name: "Open home features" });
  const rooms = view.container.querySelector("nav")!;
  return { ...view, root, key, rooms };
}

beforeEach(() => {
  resetHomeArrivalForTests();
  setLaunching(false);
  state.modeTransition = null;
  state.loading = false;
  state.unread = 4;
  try {
    window.localStorage.clear();
  } catch {
    /* jsdom has storage. */
  }
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the home's arrival, one owner", () => {
  it("wakes in full once per app runtime, then only fades back in", () => {
    expect(arrivalOnMount()).toBe("full");
    const first = deck();
    expect(first.root.dataset.arrival).toBe("full");
    expect(first.root).toHaveAttribute("data-own-arrival", "whole");
    first.unmount();

    const again = deck();
    expect(again.root.dataset.arrival).toBe("return");
  });

  it("plays nothing when the mode switch brought it in, and counts that as seen", () => {
    state.modeTransition = "entering-cosmic";
    const { root, unmount } = deck();
    expect(root.dataset.arrival).toBe("none");
    unmount();
    state.modeTransition = null;
    expect(deck().root.dataset.arrival).toBe("return");
  });

  it("plays nothing for a reader who asked for less motion", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    try {
      expect(deck().root.dataset.arrival).toBe("none");
    } finally {
      window.matchMedia = original;
    }
  });

  it("waits for an opening on the screen, then wakes; and settles when done", async () => {
    vi.useFakeTimers();
    const overlay = document.createElement("div");
    overlay.setAttribute("data-launch-id", "test");
    overlay.getClientRects = () => [{}] as unknown as DOMRectList;
    document.body.append(overlay);
    setLaunching(true);
    try {
      const { root } = deck();
      expect(root.dataset.arrival).toBe("waiting");
      act(() => setLaunching(false));
      expect(root.dataset.arrival).toBe("full");
      /* The settle timer starts from the attribute's own change. */
      await act(async () => {});
      act(() => { vi.advanceTimersByTime(900); });
      expect(root.dataset.arrival).toBe("none");
    } finally {
      overlay.remove();
    }
  });

  it("finishes the wake at the first touch, so nothing can be typed in unseen", () => {
    const { root } = deck();
    expect(root.dataset.arrival).toBe("full");
    fireEvent.focus(screen.getByLabelText("search"));
    expect(root.dataset.arrival).toBe("none");
  });

  it("spends the first wake once, whatever remounts", () => {
    spendFirstArrival();
    spendFirstArrival();
    expect(arrivalOnMount()).toBe("return");
  });
});

describe("the readings", () => {
  it("shows only what the app holds, and a dash while it loads", () => {
    deck();
    const readings = screen.getByText("Lexicon").closest("dl")!;
    expect(within(readings).getByText("1,234")).toBeInTheDocument();
    expect(within(readings).getByText("12")).toBeInTheDocument();
    expect(within(readings).getByText("English")).toBeInTheDocument();
  });

  it("never shows a 0 that is not true yet", () => {
    state.loading = true;
    deck();
    const readings = screen.getByText("Lexicon").closest("dl")!;
    expect(within(readings).getAllByText("—")).toHaveLength(2);
    expect(within(readings).queryByText("0")).toBeNull();
  });
});

describe("the six, folded into the orbit key", () => {
  it("keeps them out of reach until the key opens them, each by its familiar name", () => {
    const { key, rooms } = deck();
    expect(rooms).toHaveAttribute("aria-hidden", "true");
    expect(rooms).toHaveAttribute("inert");
    expect(key).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("yumi")).toHaveAttribute("data-shrink", "false");
    expect(screen.getByTestId("yumi")).toHaveAttribute("data-fit", "stage");

    fireEvent.click(key);
    expect(rooms).toHaveAttribute("aria-hidden", "false");
    expect(rooms).not.toHaveAttribute("inert");
    expect(key).toHaveAttribute("aria-expanded", "true");
    expect(key).toHaveAccessibleName("Close home features");
    expect(screen.getByTestId("yumi")).toHaveAttribute("data-shrink", "true");

    const links = within(rooms).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/vocabulary", "/review", "/scanner/menu", "/messages", "/discover", "/profile",
    ]);
    expect(links.map((link) => link.textContent)).toEqual([
      "Vocabulary", "Review", "Menu Translator", "4Messages", "Discover", "Profile",
    ]);
    expect(within(rooms).getByRole("link", { name: /Messages — 4 unread/ })).toBeInTheDocument();
  });

  it("shows no unread count that is not there", () => {
    state.unread = 0;
    const { key, rooms } = deck();
    fireEvent.click(key);
    expect(within(rooms).getByRole("link", { name: "Messages" }).textContent).toBe("Messages");
  });

  it("closes with Escape, and hands the focus back to the key", () => {
    const { key, rooms } = deck();
    fireEvent.click(key);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(rooms).toHaveAttribute("aria-hidden", "true");
    expect(document.activeElement).toBe(key);
  });

  it("closes on a tap elsewhere, but not on a drag of Yumi", () => {
    const { key, rooms } = deck();
    fireEvent.click(key);
    const yumi = screen.getByTestId("yumi");

    fireEvent.pointerDown(yumi, { clientX: 100, clientY: 100 });
    fireEvent.click(yumi, { clientX: 160, clientY: 130 });
    expect(rooms).toHaveAttribute("aria-hidden", "false");

    fireEvent.pointerDown(yumi, { clientX: 100, clientY: 100 });
    fireEvent.click(yumi, { clientX: 102, clientY: 101 });
    expect(rooms).toHaveAttribute("aria-hidden", "true");
  });

  it("closes when a room is chosen, without holding the navigation back", () => {
    const { key, rooms } = deck();
    fireEvent.click(key);
    fireEvent.click(within(rooms).getByRole("link", { name: "Review" }));
    expect(rooms).toHaveAttribute("aria-hidden", "true");
  });

  it("steps aside while the search listens", () => {
    const { key, rooms } = deck();
    fireEvent.click(key);
    fireEvent.click(screen.getByRole("button", { name: "listen" }));
    expect(rooms).toHaveAttribute("aria-hidden", "true");
  });
});

describe("one set of six at a time", () => {
  it("closes the star core's rail when the orbit opens, and closes for the rail", () => {
    const railClosed = vi.fn();
    const stop = closeWhenOtherOpens("core-rail", railClosed);
    const { key, rooms } = deck();

    fireEvent.click(key);
    expect(railClosed).toHaveBeenCalledTimes(1);

    act(() => announceOpened("core-rail"));
    expect(rooms).toHaveAttribute("aria-hidden", "true");
    stop();
  });

  it("never sets itself off", () => {
    const self = vi.fn();
    const stop = closeWhenOtherOpens("home-orbit", self);
    announceOpened("home-orbit");
    expect(self).not.toHaveBeenCalled();
    stop();
  });
});

describe("the orbit key's word, once", () => {
  it("is said once on a device, after the wake, and not again", () => {
    vi.useFakeTimers();
    const first = deck();
    expect(screen.queryByRole("status")).toBeNull();
    act(() => { vi.advanceTimersByTime(1200); });
    expect(screen.getByRole("status")).toHaveTextContent("Your six features are in here");
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByRole("status")).toBeNull();
    first.unmount();

    deck();
    act(() => { vi.advanceTimersByTime(7000); });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
