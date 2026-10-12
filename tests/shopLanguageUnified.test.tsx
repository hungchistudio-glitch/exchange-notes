import { act, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setInterfaceLanguage } from "@/lib/appPreferences";
import { createPreviewWallet } from "@/lib/shop/wallet";

/* =========================================================
   The shop and Settings share one display language

   Chi (2026-10-12): "設定頁的顯示語言設定與商店的顯示語言是連貫的統一的
   設定". The shop's language key opens the same sheet as Settings', and both
   write the one preference every screen reads — so a language picked in the
   shop is the one Settings shows, and the other way round.
   ========================================================= */

vi.mock("next/navigation", () => ({
  usePathname: () => "/shop",
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/components/shop/ShopStage", () => ({ default: () => <div /> }));

vi.mock("@/lib/yumi3d/thumbnails", () => ({
  cachedThumbnail: () => undefined,
  requestThumbnails: () => {},
  subscribeToThumbnails: () => () => {},
  shippedThumbnail: (id: string) => `/shop-thumbs/${id}.webp`,
  pauseThumbnails: () => {},
}));

const { default: YumiShop } = await import("@/components/shop/YumiShop");
const { default: AppLanguageSettingsButton } = await import("@/components/settings/AppLanguageSettingsButton");

afterEach(() => {
  act(() => setInterfaceLanguage("english"));
});

describe("one display language for the shop and Settings", () => {
  it("is changed from the shop and shown in Settings, and back again", async () => {
    render(
      <>
        <YumiShop wallet={createPreviewWallet(10)} isCosmic={false} onToggleMode={() => {}} preview />
        <AppLanguageSettingsButton />
      </>,
    );

    // From the shop's key: the same sheet Settings opens.
    act(() => screen.getByRole("button", { name: /^Interface language: English/ }).click());
    const sheet = await screen.findByRole("dialog", {}, { timeout: 5000 });
    act(() => within(sheet).getByRole("button", { name: /Français/ }).click());

    await waitFor(() => expect(screen.getByRole("heading", { name: "Boutique Yumi" })).toBeInTheDocument(), { timeout: 5000 });
    // Settings' row reads the same setting.
    expect(screen.getAllByText("Français").length).toBeGreaterThan(0);

    // And from Settings back, with the shop following.
    act(() => setInterfaceLanguage("italian"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Negozio Yumi" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^Lingua dell’interfaccia: Italiano/ })).toBeInTheDocument();
  }, 20_000);
});
