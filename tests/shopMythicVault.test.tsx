import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { YumiOutfit } from "@/lib/shop/catalog";
import { MYTHIC_ITEMS } from "@/lib/shop/mythicCollection";
import { createPreviewWallet } from "@/lib/shop/wallet";

/* =========================================================
   The shop's Mythic Vault (Chi, 2026-10-26): the 33 limited pieces on a
   shelf of their own, apart from the 333; the ones not yet won only as
   shadows, never named, never tried on; the ones won worn like any other;
   and none of them ever for sale.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));
vi.mock("@/components/shop/ShopStage", () => ({
  default: ({ outfit }: { outfit: YumiOutfit }) => <div data-testid="stand" data-outfit={JSON.stringify(outfit)} />,
}));
vi.mock("@/components/shop/EnergyCookie", () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock("@/components/shop/ShopThumb", () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock("@/lib/yumi3d/thumbnails", () => ({
  cachedThumbnail: () => undefined,
  requestThumbnails: () => {},
  subscribeToThumbnails: () => () => {},
  shippedThumbnail: (id: string) => `/shop-thumbs/${id}.webp`,
  pauseThumbnails: () => {},
}));

const { default: YumiShop } = await import("@/components/shop/YumiShop");

const won = MYTHIC_ITEMS.slice(0, 2);

describe("the Mythic Vault in the shop", () => {
  it("shelves all 33 apart, the won ones by name and the rest as sealed shadows", async () => {
    render(<YumiShop wallet={createPreviewWallet(240, won.map(item => item.id))} isCosmic={false} onToggleMode={() => {}} preview />);
    const shelf = (await screen.findByRole("heading", { name: /The Mythic Vault/ })).closest("section")!;
    expect(await within(shelf).findByText("2 / 33 collected")).toBeInTheDocument();
    for (const item of won) expect(within(shelf).getByText(item.names.english)).toBeInTheDocument();
    const sealed = within(shelf).getAllByRole("button", { name: "Still sealed · The Mythic Vault" });
    expect(sealed).toHaveLength(31);
    // A sealed piece's name is nowhere on the page.
    expect(screen.queryByText(MYTHIC_ITEMS[2].names.english)).toBeNull();
  });

  it("says where a sealed piece is found, and never tries it on", async () => {
    render(<YumiShop wallet={createPreviewWallet(240)} isCosmic={false} onToggleMode={() => {}} preview />);
    const shelf = (await screen.findByRole("heading", { name: /The Mythic Vault/ })).closest("section")!;
    await waitFor(() => expect(within(shelf).getAllByRole("button")[0]).toBeEnabled());
    const before = screen.getByTestId("stand").getAttribute("data-outfit");
    fireEvent.click(within(shelf).getAllByRole("button", { name: "Still sealed · The Mythic Vault" })[0]);
    expect(await screen.findByText(/the seventh holds a premium chest/)).toBeInTheDocument();
    expect(screen.getByTestId("stand").getAttribute("data-outfit")).toBe(before);
  });

  it("dresses her in a piece she has won", async () => {
    render(<YumiShop wallet={createPreviewWallet(240, won.map(item => item.id))} isCosmic={false} onToggleMode={() => {}} preview />);
    const shelf = (await screen.findByRole("heading", { name: /The Mythic Vault/ })).closest("section")!;
    const piece = (await within(shelf).findByText(won[1].names.english)).closest("button")!;
    await waitFor(() => expect(piece).toBeEnabled());
    fireEvent.click(piece);
    await waitFor(() => expect(JSON.parse(screen.getByTestId("stand").getAttribute("data-outfit")!)[won[1].slot]).toBe(won[1].id));
  });

  it("is never for sale", async () => {
    await expect(createPreviewWallet(9999).buy(MYTHIC_ITEMS[0].id)).rejects.toThrow();
  });
});
