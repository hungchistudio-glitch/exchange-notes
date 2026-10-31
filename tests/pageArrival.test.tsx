import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARRIVAL_RISE_PX, arrivalDelay, arrivalLayers, holdsFixed } from "@/lib/motion/pageArrival";

/* =========================================================
   A page arrives in layers (Chi, 2026-10-30)

   The tap dims the page being left; an outline brightens as it goes up;
   the real page's blocks float up one after another, all of it inside
   about 0.35s. A block holding a fixed element only fades, and a page
   that plays its own arrival is left to it.
   ========================================================= */

const route = vi.hoisted(() => ({ pathname: "/home" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("@/contexts/InterfaceModeContext", () => ({
  useInterfaceMode: () => ({ modeTransition: false, isCosmic: false }),
}));

const { default: RouteStage } = await import("@/components/foundation/layout/RouteStage");
const { setLaunching } = await import("@/lib/launchState");

type Played = { element: Element; keyframes: Keyframe[]; options: KeyframeAnimationOptions };
const played: Played[] = [];
const cancelled: Element[] = [];

/** jsdom has no layout: every element with this attribute is "on screen". */
const ON_SCREEN = "data-test-rendered";

beforeEach(() => {
  route.pathname = "/home";
  // The opening is over: nothing is held back for it.
  setLaunching(false);
  played.length = 0;
  cancelled.length = 0;
  Element.prototype.animate = function animate(this: Element, keyframes, options) {
    played.push({ element: this, keyframes: keyframes as Keyframe[], options: options as KeyframeAnimationOptions });
    return { cancel: () => { cancelled.push(this); }, finished: Promise.resolve() } as unknown as Animation;
  } as Element["animate"];
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
    return (this.hasAttribute(ON_SCREEN) ? [{}] : []) as unknown as DOMRectList;
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const top = Number(this.getAttribute("data-test-top") ?? 0);
    return { top, bottom: top + 50, left: 0, right: 100, width: 100, height: 50, x: 0, y: top, toJSON() {} } as DOMRect;
  });
});

afterEach(() => vi.restoreAllMocks());

function Page({ name, fixedInside = false }: { name: string; fixedInside?: boolean }) {
  return (
    <main data-test-rendered="">
      <h1 data-test-rendered="">{name}</h1>
      <section data-test-rendered="">search</section>
      <section data-test-rendered="">
        rows
        {fixedInside && <div data-test-rendered="" style={{ position: "fixed" }}>composer</div>}
      </section>
      <section data-test-rendered="" data-test-top="5000">far below</section>
    </main>
  );
}

function Skeleton() {
  return <div data-route-skeleton="" data-test-rendered="">outline</div>;
}

function navigate(view: ReturnType<typeof render>, to: string, page: React.ReactNode) {
  route.pathname = to;
  view.rerender(<RouteStage>{page}</RouteStage>);
}

describe("the plan", () => {
  it("starts the first layer at once and every layer by 110ms", () => {
    expect(arrivalDelay(0, 4)).toBe(0);
    expect(arrivalDelay(3, 4)).toBeLessThanOrEqual(110);
    expect(arrivalDelay(20, 30)).toBeLessThanOrEqual(110);
    expect(arrivalDelay(1, 2)).toBe(40);
  });

  it("finds the layers through wrappers that hold one element each", () => {
    const stage = document.createElement("div");
    stage.innerHTML = `<div data-test-rendered><div data-test-rendered><p data-test-rendered>a</p><p data-test-rendered>b</p></div></div>`;
    expect(arrivalLayers(stage).map(layer => layer.textContent)).toEqual(["a", "b"]);
  });

  it("knows a layer that holds a fixed element", () => {
    const layer = document.createElement("section");
    layer.innerHTML = `<div style="position: fixed">composer</div>`;
    document.body.append(layer);
    expect(holdsFixed(layer)).toBe(true);
    layer.innerHTML = `<div>row</div>`;
    expect(holdsFixed(layer)).toBe(false);
    layer.remove();
  });
});

describe("a navigation", () => {
  it("floats the page's layers up in turn, and leaves those out of sight alone", () => {
    const view = render(<RouteStage><Page name="Home" /></RouteStage>);
    navigate(view, "/vocabulary", <Page name="Vocabulary" />);
    const layers = played.filter(entry => entry.element.tagName !== "DIV");
    expect(layers.map(entry => entry.element.textContent)).toEqual(["Vocabulary", "search", "rows"]);
    expect(layers.map(entry => entry.options.delay)).toEqual([0, 40, 80]);
    expect(layers[0].keyframes[0]).toMatchObject({ opacity: 0, translate: `0 ${ARRIVAL_RISE_PX}px` });
    expect(layers.every(entry => entry.options.fill === "backwards")).toBe(true);
  });

  it("only fades a layer that holds a fixed element", () => {
    const view = render(<RouteStage><Page name="Home" /></RouteStage>);
    navigate(view, "/messages/1", <Page name="A conversation" fixedInside />);
    const rows = played.find(entry => entry.element.textContent?.startsWith("rows"))!;
    expect(rows.keyframes[0]).toEqual({ opacity: 0 });
  });

  it("waits for the outline to leave, then the page arrives", async () => {
    const view = render(<RouteStage><Page name="Home" /></RouteStage>);
    navigate(view, "/discover", <Skeleton />);
    // The outline brightens the stage; no layer has moved yet.
    expect(played).toHaveLength(1);
    expect(played[0].element.textContent).toBe("outline");
    played.length = 0;
    // The mutation callback runs as a microtask: before the next paint in a
    // browser, after the render here.
    await act(async () => { view.rerender(<RouteStage><Page name="Discover" /></RouteStage>); });
    expect(played.map(entry => entry.element.textContent)).toEqual(["Discover", "search", "rows"]);
  });

  it("leaves a page that plays its own arrival to it", () => {
    const view = render(<RouteStage><Page name="Home" /></RouteStage>);
    navigate(view, "/shop", <div data-own-arrival="" data-test-rendered=""><Page name="Shop" /></div>);
    expect(played).toHaveLength(1);
    expect(played[0].keyframes).toEqual([{ opacity: 0.6 }, { opacity: 1 }]);
  });
});

describe("the tap", () => {
  it("dims the page being left at once, and lets go when the new page is in", () => {
    const view = render(
      <RouteStage>
        <a href="/vocabulary" data-test-rendered="">Vocabulary</a>
      </RouteStage>,
    );
    fireEvent.click(view.getByText("Vocabulary"));
    expect(played).toHaveLength(1);
    expect(played[0].keyframes.at(-1)).toEqual({ opacity: 0.7 });
    navigate(view, "/vocabulary", <Page name="Vocabulary" />);
    expect(cancelled).toContain(played[0].element);
  });

  it("does not dim for a new tab, another site, or this same page", () => {
    const view = render(
      <RouteStage>
        <a href="/vocabulary">Vocabulary</a>
        <a href="https://example.com/">Elsewhere</a>
        {/* jsdom's own address is "/": this page with another query. A
            plain anchor on purpose: the stage listens for any link. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/?tab=2">Here</a>
      </RouteStage>,
    );
    fireEvent.click(view.getByText("Vocabulary"), { metaKey: true });
    fireEvent.click(view.getByText("Elsewhere"));
    fireEvent.click(view.getByText("Here"));
    expect(played).toHaveLength(0);
  });
});
