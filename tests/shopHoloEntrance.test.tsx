import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { YumiOutfit } from "@/lib/shop/catalog";
import { createPreviewWallet } from "@/lib/shop/wallet";

/* =========================================================
   The shop's holographic way in (Chi, 2026-11-12)

   Chi chose a scan that materialises the page, about a second and a half
   on every visit, a tap to end it, and nothing under reduced motion; then
   the soft-light version, about 1.2 seconds, drawn with the page. jsdom
   lays nothing out, so where the parts are is given here; the look of it
   is checked by eye in a browser.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));
vi.mock("@/components/shop/ShopStage", () => ({
  default: ({ outfit }: { outfit: YumiOutfit }) => <div data-testid="stand" data-holo-frame="" data-outfit={JSON.stringify(outfit)} />,
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

const page = () => document.querySelector("[data-holo]");
const overlay = () => document.querySelector("[data-holo-overlay]");

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the shop's way in", () => {
  it("opens as a hologram and is simply there once the scan has crossed the screen", () => {
    vi.useFakeTimers();
    render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview />);
    expect(page()).toHaveAttribute("data-holo", "scan");
    expect(overlay()).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1300); });
    expect(page()).toHaveAttribute("data-holo", "done");
    expect(overlay()).toBeNull();
  });

  it("ends at the first tap", () => {
    render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview />);
    expect(page()).toHaveAttribute("data-holo", "scan");
    act(() => { fireEvent.pointerDown(document.body); });
    expect(page()).toHaveAttribute("data-holo", "done");
    expect(overlay()).toBeNull();
  });

  it("never runs under reduced motion", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({
      matches: query.includes("reduce"), media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }) as MediaQueryList);
    render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview />);
    await waitFor(() => expect(page()).toHaveAttribute("data-holo", "done"));
    expect(overlay()).toBeNull();
  });

  it("outlines what is on the first screen, all in one drawing", () => {
    let next = 0;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (!this.hasAttribute("data-holo-frame")) return new DOMRect(0, 0, 0, 0);
      const top = 40 + (next++ % 8) * 90;
      return new DOMRect(16, top, 160, 80);
    });
    render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview />);
    const drawings = overlay()!.querySelectorAll("svg");
    expect(drawings).toHaveLength(1);
    const outlines = drawings[0].querySelectorAll("g");
    expect(outlines.length).toBeGreaterThan(4);
    expect(outlines.length).toBeLessThanOrEqual(18);
  });

  it("leaves the way in out when asked (the review screen's ?entrance=0)", () => {
    render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview entrance={false} />);
    expect(page()).toHaveAttribute("data-holo", "done");
    expect(overlay()).toBeNull();
  });
});
