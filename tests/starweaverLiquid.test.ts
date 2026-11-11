import { afterEach, describe, expect, it } from "vitest";

import { LIQUID, LIQUID_EVENT, PALETTES, flowLiquid, paletteFor, sweepLiquid, type LiquidFlowRequest } from "@/lib/starweaver/liquid";

/* The arrival's sweep runs once from the top of the stage down the page
   (Chi, 2026-11-11). Every game's stage says it is the target
   (data-liquid-stage); the page round it carries data-game too, and must
   never be mistaken for it. */

const listen = () => {
  const requests: LiquidFlowRequest[] = [];
  const onFlow = (event: Event) => requests.push((event as CustomEvent<LiquidFlowRequest>).detail);
  window.addEventListener(LIQUID_EVENT, onFlow);
  return { requests, stop: () => window.removeEventListener(LIQUID_EVENT, onFlow) };
};

const mount = () => {
  const page = document.createElement("div");
  page.dataset.game = "starweaver";
  page.getBoundingClientRect = () => new DOMRect(0, 0, 400, 900);
  const stage = document.createElement("div");
  stage.setAttribute("role", "img");
  stage.dataset.game = "starweaver";
  stage.dataset.liquidStage = "";
  stage.getBoundingClientRect = () => new DOMRect(20, 80, 360, 300);
  page.append(stage);
  document.body.append(page);
};

afterEach(() => { document.body.innerHTML = ""; });

describe("Starweaver liquid", () => {
  it("sweeps from the top of the stage to the bottom of the page", () => {
    mount();
    const { requests, stop } = listen();
    sweepLiquid();
    stop();
    expect(requests).toHaveLength(1);
    expect(requests[0].kind).toBe("sweep");
    expect(requests[0].from).toEqual({ x: 200, y: 80 });
    expect(requests[0].to).toEqual({ x: window.innerWidth / 2, y: window.innerHeight });
  });

  it("sweeps each game in on its own colours (Chi, 2026-11-11)", () => {
    mount();
    const { requests, stop } = listen();
    sweepLiquid("hangyumi");
    sweepLiquid("wordvault");
    sweepLiquid("starweaver");
    stop();
    expect(requests.map(request => [request.kind, request.game])).toEqual([
      ["sweep", "hangyumi"], ["sweep", "wordvault"], ["sweep", "starweaver"],
    ]);
    expect(requests.map(request => paletteFor(request))).toEqual([PALETTES.hangyumi, PALETTES.wordvault, PALETTES.starweaver]);
  });

  it("flows a guess toward the stage, not the page round it", () => {
    mount();
    const { requests, stop } = listen();
    flowLiquid("letter", new DOMRect(100, 700, 40, 40));
    stop();
    expect(requests[0].from).toEqual({ x: 120, y: 720 });
    expect(requests[0].to).toEqual({ x: 200, y: 230 });
  });

  it("keeps the sweep lighter than a won word", () => {
    expect(LIQUID.sweep.strength).toBeLessThan(LIQUID.word.strength);
  });

  it("plays a little slower than it did, and a miss shorter than any right guess (Chi, 2026-11-11)", () => {
    expect(LIQUID.letter.seconds).toBeCloseTo(0.7);
    expect(LIQUID.word.seconds).toBeCloseTo(1.4);
    expect(LIQUID.miss.seconds).toBeLessThan(LIQUID.letter.seconds);
  });

  it("colours each game its own way, and a miss dark red in every one", () => {
    expect(paletteFor({ kind: "letter", game: "hangyumi" })).toBe(PALETTES.hangyumi);
    expect(paletteFor({ kind: "word", game: "wordvault" })).toBe(PALETTES.wordvault);
    expect(paletteFor({ kind: "letter", game: "starweaver" })).toBe(PALETTES.starweaver);
    for (const game of ["hangyumi", "wordvault", "starweaver"] as const) {
      expect(paletteFor({ kind: "miss", game })).toBe(PALETTES.miss);
    }
    const [r, g, b] = PALETTES.miss.body;
    expect(r).toBeGreaterThan(g * 2);
    expect(r).toBeGreaterThan(b * 2);
  });
});
