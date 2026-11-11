import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GamesHub from "@/components/games/GamesHub";

/* =========================================================
   The games hub: one key on Home, then Hangyumi, Yumi Wordvault or Yumi
   Starweaver, with the cookies all three share (Chi, 2026-10-26; the third
   2026-11-10).
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));
vi.mock("@/components/shop/EnergyCookie", () => ({ default: () => <span aria-hidden="true" /> }));

describe("the games hub", () => {
  it("offers the three games and today's shared 333", async () => {
    render(
      <GamesHub
        loadToday={async () => 120}
        loadBalance={async () => 240}
        hrefs={{ hangyumi: "/hangyumi", wordvault: "/wordvault", starweaver: "/starweaver" }}
        backHref="/home"
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: /Yumi's games/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hangyumi.*free Yumi/ })).toHaveAttribute("href", "/hangyumi");
    expect(screen.getByRole("link", { name: /Yumi Wordvault.*open the chest/ })).toHaveAttribute("href", "/wordvault");
    expect(screen.getByRole("link", { name: /Yumi Starweaver.*open the star gate/ })).toHaveAttribute("href", "/starweaver");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/home");
    expect(await screen.findByText("120 / 333 cookies today")).toBeInTheDocument();
    expect(screen.getByText("All three games share today's 333.")).toBeInTheDocument();
  });
});
