import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { toTraditional } from "@/lib/chinese/toTraditional";
import type { TranslationLanguage } from "@/lib/i18n/types";
import type { YumiOutfit } from "@/lib/shop/catalog";
import { createPreviewWallet, type ShopWallet, type WardrobeState } from "@/lib/shop/wallet";

/* =========================================================
   Trying on is free; buying asks first, charges once and dresses her

   The stand itself is WebGL, which jsdom does not have, so it is replaced
   by a stub that reports the outfit it was handed. Everything else is the
   real shop on the in-memory wallet the review screen uses.
   ========================================================= */

const navigation = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
const reader = vi.hoisted(() => ({ language: "english" as TranslationLanguage }));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => reader.language,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

vi.mock("@/components/shop/ShopStage", () => ({
  default: ({ outfit }: { outfit: YumiOutfit }) => (
    <div data-testid="stand" data-outfit={JSON.stringify(outfit)} />
  ),
}));

// Decorative SVGs are covered visually in the browser. Keep this suite
// focused on wardrobe transactions.
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

function stand(): YumiOutfit {
  return JSON.parse(screen.getByTestId("stand").getAttribute("data-outfit")!);
}

/** Opens a department's full grid; the shop window shows only a shelf of each. */
function department(name: string) {
  fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name }));
}

function card(name: string) {
  // The catalogue's cards are the toggles; the tag on a worn card comes first.
  return [...document.querySelectorAll<HTMLButtonElement>('button[data-coach-target="shop-item"]')].find(button =>
    button.hasAttribute("data-coach-target") && [...button.querySelectorAll("span")].some(span => span.textContent === name))!;
}

describe("the Yumi shop", () => {
  it("tries on for free, buys after confirming, and puts the piece on", async () => {
    render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview />);
    // The preview wallet answers after a short pause; a busy machine stretches it.
    await waitFor(() => expect(screen.getByLabelText(/50 energy cookies/)).toBeInTheDocument(), { timeout: 5000 });

    // Too dear: on the stand at once, and the bar says how far short.
    department("Body finishes");
    fireEvent.click(card("Jade"));
    expect(stand()).toEqual({ material: "jade" });
    expect(screen.getByText("10 cookies short")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy" })).toBeDisabled();

    // Affordable: nothing is charged until the sheet is confirmed.
    department("Eyewear");
    fireEvent.click(card("Brass monocle"));
    expect(stand()).toEqual({ material: "jade", eyewear: "monocle" });
    fireEvent.click(screen.getByRole("button", { name: "Buy" }));
    const sheet = await screen.findByRole("dialog", {}, { timeout: 5000 });
    expect(within(sheet).getByText("Buy Brass monocle?")).toBeInTheDocument();
    expect(screen.getByLabelText(/50 energy cookies/)).toBeInTheDocument();

    fireEvent.click(within(sheet).getByRole("button", { name: "Buy" }));
    await waitFor(() => expect(screen.getByText("Yumi is wearing Brass monocle")).toBeInTheDocument(), { timeout: 5000 });
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
    await waitFor(() => expect(screen.getByRole("heading", { name: "Yumi 商店" })).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByRole("button", { name: "全部商品" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "已穿上" })).not.toBeInTheDocument();
    department("身體材質");
    expect(card("玉石綠")).toBeDefined();
    const text = container.textContent ?? "";
    expect(toTraditional(text)).toBe(text);
    reader.language = "english";
  });
});

function wardrobeWallet(outfit: YumiOutfit, owned: string[]) {
  let state: WardrobeState = { earned: 500, paid: 0, spent: 0, balance: 500, owned, outfit };
  const wallet: ShopWallet = {
    load: vi.fn(async () => state),
    buy: vi.fn(async id => { state = { ...state, owned: [...state.owned, id] }; return { status: "bought" as const, state }; }),
    wear: vi.fn(async next => { state = { ...state, outfit: next }; return state; }),
  };
  return wallet;
}

describe("keeping purchased outfits", () => {
  it("automatically saves an owned try-on and restores it when the shop is reopened", async () => {
    const wallet = wardrobeWallet({}, ["monocle"]);
    const first = render(<YumiShop wallet={wallet} isCosmic={false} onToggleMode={() => {}} preview />);
    department("Eyewear");
    await waitFor(() => expect(card("Brass monocle")).not.toBeDisabled());
    fireEvent.click(card("Brass monocle"));
    await waitFor(() => expect(wallet.wear).toHaveBeenCalledWith({ eyewear: "monocle" }));
    await screen.findByText("Yumi has her new look on");
    first.unmount();
    render(<YumiShop wallet={wallet} isCosmic={false} onToggleMode={() => {}} preview />);
    await waitFor(() => expect(stand()).toEqual({ eyewear: "monocle" }));
  }, 15_000);

  it("preserves saved clothing under an unbought trial when buying a different slot", async () => {
    const wallet = wardrobeWallet({ material: "jade" }, ["jade"]);
    render(<YumiShop wallet={wallet} isCosmic={false} onToggleMode={() => {}} preview />);
    await waitFor(() => expect(stand()).toEqual({ material: "jade" }));
    department("Body finishes");
    fireEvent.click(card("Porcelain"));
    department("Eyewear");
    fireEvent.click(card("Brass monocle"));
    fireEvent.click(screen.getByRole("button", { name: "Buy" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Buy" }));
    await waitFor(() => expect(wallet.wear).toHaveBeenCalledWith({ material: "jade", eyewear: "monocle" }));
  }, 15_000);

  it("keeps an originally empty slot empty after a free trial", async () => {
    const wallet = wardrobeWallet({}, []);
    render(<YumiShop wallet={wallet} isCosmic={false} onToggleMode={() => {}} preview />);
    department("Body finishes");
    await waitFor(() => expect(card("Jade")).not.toBeDisabled());
    fireEvent.click(card("Jade"));
    fireEvent.click(card("Jade"));
    expect(stand()).toEqual({});
    expect(wallet.wear).not.toHaveBeenCalled();
  }, 15_000);

  it("saves explicit removal and waits for a pending save before leaving", async () => {
    const wallet = wardrobeWallet({ eyewear: "monocle" }, ["monocle"]);
    let resolve!: (state: WardrobeState) => void;
    wallet.wear = vi.fn(() => new Promise<WardrobeState>(done => { resolve = done; }));
    render(<YumiShop wallet={wallet} isCosmic={false} onToggleMode={() => {}} preview />);
    await waitFor(() => expect(stand()).toEqual({ eyewear: "monocle" }));
    navigation.back.mockClear(); navigation.push.mockClear();
    department("Eyewear");
    fireEvent.click(card("Brass monocle"));
    expect(wallet.wear).toHaveBeenCalledWith({});
    expect(card("Brass monocle")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(navigation.back).not.toHaveBeenCalled(); expect(navigation.push).not.toHaveBeenCalled();
    await act(async () => resolve({ ...(await wallet.load()), outfit: {} }));
    expect(navigation.back.mock.calls.length + navigation.push.mock.calls.length).toBe(1);
  }, 15_000);

  it("keeps a failed save out of the wardrobe and allows retry", async () => {
    const wallet = wardrobeWallet({}, ["monocle"]);
    const wear = vi.spyOn(wallet, "wear").mockRejectedValueOnce(new Error("offline"));
    render(<YumiShop wallet={wallet} isCosmic={false} onToggleMode={() => {}} preview />);
    department("Eyewear");
    await waitFor(() => expect(card("Brass monocle")).not.toBeDisabled());
    fireEvent.click(card("Brass monocle"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Put on" })).not.toBeDisabled());
    expect((await wallet.load()).outfit).toEqual({});
    fireEvent.click(screen.getByRole("button", { name: "Put on" }));
    await waitFor(() => expect(wear).toHaveBeenCalledTimes(2));
    await waitFor(async () => expect((await wallet.load()).outfit).toEqual({ eyewear: "monocle" }));
  }, 15_000);
});

it("keeps the shop open when an in-flight save fails during exit", async () => {
  const wallet = wardrobeWallet({}, ["monocle"]);
  let reject!: (error: Error) => void;
  wallet.wear = vi.fn(() => new Promise<WardrobeState>((_, fail) => { reject = fail; }));
  render(<YumiShop wallet={wallet} isCosmic={false} onToggleMode={() => {}} preview />);
  department("Eyewear");
  await waitFor(() => expect(card("Brass monocle")).not.toBeDisabled());
  navigation.back.mockClear(); navigation.push.mockClear();
  fireEvent.click(card("Brass monocle"));
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  await act(async () => reject(new Error("network failed")));
  expect(navigation.back).not.toHaveBeenCalled(); expect(navigation.push).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Put on" })).not.toBeDisabled();
}, 15_000);

it("filters by collection from tiles always in view, without losing the department", () => {
  reader.language = "english";
  render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview />);
  const tiles = screen.getByRole("group", { name: "Explore the collections" });
  fireEvent.click(within(tiles).getByRole("button", { name: /Deep Space Treasures/ }));
  expect(document.getElementById("shop-collection-story")).toHaveTextContent("dark technology");
  const shown = () => [...document.querySelectorAll<HTMLElement>('[data-coach-target="shop-item"]')];
  expect(shown().every(card => card.dataset.collection === "collection03")).toBe(true);

  // A department's full grid: Collection 03's and Collection 04's deep-space earrings.
  department("Earrings");
  const filtered = shown().length;
  expect(filtered).toBeGreaterThan(12);
  expect(filtered).toBeLessThan(37);
  fireEvent.click(screen.getByRole("button", { name: /Explore all collections/ }));
  expect(within(screen.getByRole("navigation")).getByRole("button", { name: "Earrings" })).toHaveAttribute("aria-pressed", "true");
  expect(shown()).toHaveLength(37);
}, 15_000);

it("opens on the shop window: the new arrivals, then a shelf of each department", () => {
  reader.language = "english";
  render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview />);
  const windowShelf = screen.getByRole("region", { name: /New arrivals/ });
  const newCards = within(windowShelf).getAllByRole("button", { pressed: false }).filter(button => button.hasAttribute("data-coach-target"));
  expect(newCards).toHaveLength(16);
  // Dealt across departments, not sixteen earrings.
  expect(screen.getByRole("region", { name: /^Earrings/ })).toBeInTheDocument();

  fireEvent.click(within(windowShelf).getByRole("button", { name: "See all 113" }));
  expect(document.querySelectorAll('[data-coach-target="shop-item"]')).toHaveLength(113);
  fireEvent.click(screen.getByRole("button", { name: /Close/ }));
  expect(screen.getByRole("region", { name: /New arrivals/ })).toBeInTheDocument();

  // "See all" on a shelf opens that department.
  fireEvent.click(within(screen.getByRole("region", { name: /^Eyes/ })).getByRole("button", { name: /See all/ }));
  expect(within(screen.getByRole("navigation")).getByRole("button", { name: "Eyes" })).toHaveAttribute("aria-pressed", "true");
  expect(document.querySelectorAll('[data-coach-target="shop-item"]')).toHaveLength(28);
}, 15_000);

it("opens the personal wardrobe with all owned items and saves dressing from it", async () => {
  const wallet = wardrobeWallet({}, ["monocle"]);
  render(<YumiShop wallet={wallet} isCosmic={false} onToggleMode={() => {}} preview startCollection="collection03" />);
  const wardrobe = await screen.findByRole("button", { name: /My wardrobe\s*1/ }, { timeout: 5000 });
  fireEvent.click(wardrobe);
  expect(document.querySelectorAll('[data-coach-target="shop-item"]')).toHaveLength(1);
  expect(card("Brass monocle")).toBeDefined();
  expect(card("Jade")).toBeUndefined();
  fireEvent.click(card("Brass monocle"));
  await waitFor(() => expect(wallet.wear).toHaveBeenCalledWith({ eyewear: "monocle" }));
  fireEvent.click(screen.getByRole("button", { name: "Shop" }));
  expect(screen.getByRole("region", { name: /New arrivals/ })).toBeInTheDocument();
  expect(stand()).toEqual({ eyewear: "monocle" });
});

it("filters from the sheet: nothing changes until its key is pressed, and each choice comes off on its own", async () => {
  reader.language = "english";
  render(<YumiShop wallet={createPreviewWallet(50)} isCosmic={false} onToggleMode={() => {}} preview />);
  department("Earrings");
  // No earring costs 24 or less, so that choice cannot be made here.
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  expect(within(await screen.findByRole("dialog", {}, { timeout: 5000 })).getByRole("button", { name: /≤ 24/ })).toBeDisabled();
  fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("button", { name: "Close" })[0]);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  const prices = () => [...document.querySelectorAll('[data-coach-target="shop-item"]')].map(card => card.textContent ?? "");
  const before = prices().length;

  // Chosen but not applied: closing the sheet leaves the catalogue alone.
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  let sheet = await screen.findByRole("dialog", {}, { timeout: 5000 });
  fireEvent.click(within(sheet).getByRole("button", { name: /27–39/ }));
  fireEvent.click(within(sheet).getAllByRole("button", { name: "Close" })[0]);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(prices()).toHaveLength(before);

  // Applied: the key says how many, and the catalogue shows exactly those.
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  sheet = await screen.findByRole("dialog", {}, { timeout: 5000 });
  const middle = within(sheet).getByRole("button", { name: /27–39/ });
  expect(middle).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(middle);
  // Colour is folded until opened.
  const colour = within(sheet).getByRole("button", { name: /^Colour/ });
  expect(colour).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(colour);
  expect(colour).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(within(sheet).getByRole("button", { name: /Gold & amber/ }));
  const apply = within(sheet.parentElement!).getByRole("button", { name: /^Show \d+ piece/ });
  const promised = Number(apply.textContent!.match(/\d+/)![0]);
  fireEvent.click(apply);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(prices()).toHaveLength(promised);
  expect(promised).toBeLessThan(before);
  expect(screen.getByRole("button", { name: "Filters" })).toHaveTextContent("2");

  // Each applied choice is a chip that takes itself off.
  fireEvent.click(screen.getByRole("button", { name: "Remove Gold & amber" }));
  expect(prices().length).toBeGreaterThanOrEqual(promised);
  fireEvent.click(screen.getByRole("button", { name: "Remove 27–39" }));
  expect(prices()).toHaveLength(before);
}, 20_000);
