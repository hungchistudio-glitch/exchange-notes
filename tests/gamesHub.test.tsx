import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GamesHub, { ENTRANCE_MS } from "@/components/games/GamesHub";
import { readGamesProgress, WORDVAULT_CHEST_AT } from "@/lib/games/progress";
import { NIGHTSCALE_ITEMS, WINS_PER_PIECE } from "@/lib/shop/nightscaleCollection";
import { STARWEAVER_ITEMS, VOYAGES_PER_RELIC } from "@/lib/shop/starweaverCollection";

/* =========================================================
   The games hub: one key on Home, then Hangyumi, Yumi Wordvault or Yumi
   Starweaver, with the cookies all three share (Chi, 2026-10-26; the third
   2026-11-10). Since 2026-11-12 one card layout in each game's colours,
   with a subtitle, how it is played, what it gives and how far the reader
   is towards its next piece, and a way in of its own for each.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));
vi.mock("@/components/shop/EnergyCookie", () => ({ default: () => <span aria-hidden="true" /> }));

const hrefs = { hangyumi: "/hangyumi", wordvault: "/wordvault", starweaver: "/starweaver" };
const someProgress = async () => readGamesProgress({
  hangyumi: { cycleProgress: 2, cycleLength: 3, collectedCount: 5, collectionSize: 24, collectionComplete: false },
  starweaver: { cycleProgress: 4, cycleLength: 7, collectedCount: 2, collectionSize: 17, collectionComplete: false },
  wordvault: { streak: 3, streakLength: 7 },
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the games hub", () => {
  it("offers the three games, each with a subtitle, how it is played and what it gives", async () => {
    render(<GamesHub loadToday={async () => 120} loadBalance={async () => 240} hrefs={hrefs} backHref="/home" />);
    expect(screen.getByRole("heading", { level: 1, name: /Yumi's games/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hangyumi.*A rope of night scales.*three misses.*Nightscale piece/ }))
      .toHaveAttribute("href", "/hangyumi");
    expect(screen.getByRole("link", { name: /Yumi Wordvault.*A vault of words.*step to the chest.*medium chest/ }))
      .toHaveAttribute("href", "/wordvault");
    expect(screen.getByRole("link", { name: /Yumi Starweaver.*A chart woven of stars.*star chart.*Starwoven Relic/ }))
      .toHaveAttribute("href", "/starweaver");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/home");
    expect(await screen.findByText("120 / 333 cookies today")).toBeInTheDocument();
    expect(screen.getByText("All three games share today's 333.")).toBeInTheDocument();
  });

  it("shows how far the reader is towards each game's next piece", async () => {
    const { container } = render(
      <GamesHub loadToday={async () => 0} loadProgress={someProgress} hrefs={hrefs} backHref="/home" />,
    );
    expect(await screen.findByText("Nightscale 5 / 24")).toBeInTheDocument();
    expect(screen.getByText("Streak 3 / 7")).toBeInTheDocument();
    expect(screen.getByText("Relics 2 / 17")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 of 3 words won towards the next Nightscale piece; 5 of 24 unlocked." }))
      .toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^3 words won in a row\./ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^4 of 7 voyages towards the next relic; 2 of 17/ })).toBeInTheDocument();

    const steps = (game: string) => container.querySelectorAll(`li[data-game="${game}"] [data-on]`).length;
    expect([steps("hangyumi"), steps("wordvault"), steps("starweaver")]).toEqual([2, 3, 4]);
    /* Wordvault's 4th and 7th words are its chests. */
    expect(container.querySelectorAll('li[data-game="wordvault"] [data-chest]')).toHaveLength(WORDVAULT_CHEST_AT.length);
  });

  it("says a finished collection is finished", async () => {
    render(
      <GamesHub
        loadToday={async () => 0}
        loadProgress={async () => readGamesProgress({
          hangyumi: { cycleProgress: 0, cycleLength: 3, collectedCount: 24, collectionSize: 24, collectionComplete: true },
          starweaver: {},
          wordvault: {},
        })}
        hrefs={hrefs}
        backHref="/home"
      />,
    );
    expect(await screen.findByText("All 24 Nightscale pieces unlocked")).toBeInTheDocument();
    expect(screen.getByText("Relics 0 / 17")).toBeInTheDocument();
  });

  it("leaves the progress out where there is none to read", async () => {
    const { container } = render(
      <GamesHub loadToday={async () => 0} loadProgress={async () => null} hrefs={hrefs} backHref="/home" />,
    );
    await screen.findByText("0 / 333 cookies today");
    expect(container.querySelectorAll("[role=img]")).toHaveLength(0);
    expect(screen.queryByText(/Nightscale \d/)).not.toBeInTheDocument();
  });

  it("comes in once, and a touch settles it", () => {
    vi.useFakeTimers();
    const { container, unmount } = render(<GamesHub loadToday={async () => 0} hrefs={hrefs} backHref="/home" />);
    const cards = () => container.querySelector("[data-entrance]")?.getAttribute("data-entrance");
    expect(cards()).toBe("play");
    act(() => { vi.advanceTimersByTime(ENTRANCE_MS); });
    expect(cards()).toBe("done");
    unmount();

    const again = render(<GamesHub loadToday={async () => 0} hrefs={hrefs} backHref="/home" />);
    expect(again.container.querySelector("[data-entrance]")).toHaveAttribute("data-entrance", "play");
    act(() => { fireEvent.pointerDown(window); });
    expect(again.container.querySelector("[data-entrance]")).toHaveAttribute("data-entrance", "done");
  });
});

describe("the hub's progress, as public.games_progress answers it", () => {
  it("falls back to the collections the shop ships", () => {
    const read = readGamesProgress(null);
    expect(read.hangyumi).toMatchObject({ cycleLength: WINS_PER_PIECE, collectionSize: NIGHTSCALE_ITEMS.length });
    expect(read.starweaver).toMatchObject({ cycleLength: VOYAGES_PER_RELIC, collectionSize: STARWEAVER_ITEMS.length });
    expect(read.wordvault).toEqual({ streak: 0, streakLength: 7 });
    expect(WORDVAULT_CHEST_AT).toEqual([4, 7]);
  });

  it("never shows more than a cycle or a collection holds", () => {
    const read = readGamesProgress({
      hangyumi: { cycleProgress: 9, cycleLength: 3, collectedCount: 40, collectionSize: 24 },
      starweaver: { cycleProgress: -2, collectedCount: "3" },
      wordvault: { streak: 12, streakLength: 7 },
    });
    expect(read.hangyumi).toMatchObject({ cycleProgress: 2, collectedCount: 24, collectionComplete: true });
    expect(read.starweaver).toMatchObject({ cycleProgress: 0, collectedCount: 0, collectionComplete: false });
    expect(read.wordvault.streak).toBe(6);
  });
});
