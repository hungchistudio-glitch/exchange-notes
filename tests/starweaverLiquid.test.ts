import { afterEach, describe, expect, it } from "vitest";

import { LIQUID, LIQUID_EVENT, flowLiquid, sweepLiquid, type LiquidFlowRequest } from "@/lib/starweaver/liquid";

/* The arrival's sweep runs once from the top of the stage down the page
   (Chi, 2026-11-11), and the page itself now carries data-game too, so
   the stage must be found by its role, not by the attribute alone. */

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
    expect(LIQUID.sweep.seconds).toBeLessThan(1);
  });
});
