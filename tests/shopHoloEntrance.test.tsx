import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { holoDelayAt } from "@/components/shop/HoloEntrance";
import type { YumiOutfit } from "@/lib/shop/catalog";
import { createPreviewWallet } from "@/lib/shop/wallet";

/* =========================================================
   The shop's holographic way in (Chi, 2026-11-12)

   Chi chose a scan that materialises the page, about a second and a half
   on every visit, a tap to end it, and nothing under reduced motion. jsdom
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
    act(() => { vi.advanceTimersByTime(1400); });
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

  it("never runs under reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({
      matches: query.includes("reduce"), media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }) as MediaQueryList);
    render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview />);
    expect(page()).toHaveAttribute("data-holo", "done");
    expect(overlay()).toBeNull();
  });

  it("outlines what is on the first screen and holds each piece until the line reaches it", async () => {
    let next = 0;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (!this.hasAttribute("data-holo-frame")) return new DOMRect(0, 0, 0, 0);
      const top = 40 + (next++ % 8) * 90;
      return new DOMRect(16, top, 160, 80);
    });
    render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview />);
    await act(async () => { await new Promise(resolve => requestAnimationFrame(() => resolve(null))); });
    const frames = overlay()!.querySelectorAll("i");
    expect(frames.length).toBeGreaterThan(4);
    expect(frames.length).toBeLessThanOrEqual(18);
    const held = [...document.querySelectorAll<HTMLElement>("li")].filter(li => li.style.getPropertyValue("--holo-delay"));
    expect(held.length).toBeGreaterThan(0);
    for (const li of held) expect(parseInt(li.style.getPropertyValue("--holo-delay"), 10)).toBeGreaterThanOrEqual(60);
  });

  it("times the line from the top of the screen to the bottom in a second", () => {
    expect(holoDelayAt(0, 800)).toBe(60);
    expect(holoDelayAt(400, 800)).toBe(560);
    expect(holoDelayAt(1200, 800)).toBe(1060);
  });
});
