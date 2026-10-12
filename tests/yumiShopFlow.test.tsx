import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { toTraditional } from "@/lib/chinese/toTraditional";
import type { TranslationLanguage } from "@/lib/i18n/types";
import type { YumiOutfit } from "@/lib/shop/catalog";
import { createPreviewWallet } from "@/lib/shop/wallet";

/* =========================================================
   Trying on is free; buying asks first, charges once and dresses her

   The stand itself is WebGL, which jsdom does not have, so it is replaced
   by a stub that reports the outfit it was handed. Everything else is the
   real shop on the in-memory wallet the review screen uses.
   ========================================================= */

const reader = vi.hoisted(() => ({ language: "english" as TranslationLanguage }));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => reader.language,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/components/shop/ShopStage", () => ({
  default: ({ outfit }: { outfit: YumiOutfit }) => (
    <div data-testid="stand" data-outfit={JSON.stringify(outfit)} />
  ),
}));

vi.mock("@/lib/yumi3d/thumbnails", () => ({
  cachedThumbnail: () => undefined,
  requestThumbnails: () => {},
  subscribeToThumbnails: () => () => {},
}));

const { default: YumiShop } = await import("@/components/shop/YumiShop");

function stand(): YumiOutfit {
  return JSON.parse(screen.getByTestId("stand").getAttribute("data-outfit")!);
}

function card(name: string) {
  // The catalogue's cards are the toggles; the tag on a worn card comes first.
  return screen.getAllByRole("button").find(button =>
    button.hasAttribute("aria-pressed") && button.textContent?.includes(name))!;
}

describe("the Yumi shop", () => {
  it("tries on for free, buys after confirming, and puts the piece on", async () => {
    render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview />);
    await waitFor(() => expect(screen.getByLabelText(/50 energy cookies/)).toBeInTheDocument());

    // Too dear: on the stand at once, and the bar says how far short.
    fireEvent.click(card("Jade"));
    expect(stand()).toEqual({ material: "jade" });
    expect(screen.getByText("10 cookies short")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy" })).toBeDisabled();

    // Affordable: nothing is charged until the sheet is confirmed.
    fireEvent.click(card("Brass monocle"));
    expect(stand()).toEqual({ material: "jade", eyewear: "monocle" });
    fireEvent.click(screen.getByRole("button", { name: "Buy" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Buy Brass monocle?")).toBeInTheDocument();
    expect(screen.getByLabelText(/50 energy cookies/)).toBeInTheDocument();

    fireEvent.click(within(sheet).getByRole("button", { name: "Buy" }));
    await waitFor(() => expect(screen.getByText("Yumi is wearing Brass monocle")).toBeInTheDocument());
    expect(screen.getByLabelText(/20 energy cookies/)).toBeInTheDocument();
    expect(card("Brass monocle")).toHaveTextContent("Owned");

    // The jade she never bought stays on the stand only; reset takes it off.
    expect(stand()).toEqual({ material: "jade", eyewear: "monocle" });
    fireEvent.click(screen.getByRole("button", { name: "Reset outfit" }));
    expect(stand()).toEqual({ eyewear: "monocle" });
  }, 15_000);

  it("speaks the display language, in Traditional Chinese only", async () => {
    reader.language = "traditional-chinese";
    const { container } = render(<YumiShop wallet={createPreviewWallet(10)} isCosmic={false} onToggleMode={() => {}} preview />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Yumi 商店" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "精選" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "還原裝扮" })).toBeInTheDocument();
    expect(card("玉石綠")).toBeDefined();
    const text = container.textContent ?? "";
    expect(toTraditional(text)).toBe(text);
    reader.language = "english";
  });
});
