import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import useShopReveal from "@/components/shop/useShopReveal";

/* =========================================================
   The shop's pieces arriving as they come into view

   Cards rise in as they scroll onto the screen, a beat apart in reading
   order, once each; cards added later (a filter, a collection) arrive
   the same way. Without IntersectionObserver everything is just shown.
   ========================================================= */

type Fire = (targets: Element[]) => void;
let fire: Fire = () => {};

class FakeObserver {
  observed = new Set<Element>();
  constructor(callback: IntersectionObserverCallback) {
    fire = targets => callback(targets.map((target, index) => ({
      target,
      isIntersecting: true,
      boundingClientRect: { top: 0, left: index * 100 } as DOMRect,
    } as IntersectionObserverEntry)), this as unknown as IntersectionObserver);
  }
  observe(element: Element) { this.observed.add(element); }
  unobserve(element: Element) { this.observed.delete(element); }
  disconnect() { this.observed.clear(); }
}

function Shelf({ count }: { count: number }) {
  const ref = useRef<HTMLElement>(null);
  useShopReveal(ref, "li");
  return (
    <section ref={ref} data-reveal="on">
      <ul>{Array.from({ length: count }, (_, i) => <li key={i}>piece {i}</li>)}</ul>
    </section>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("pieces arriving in the shop", () => {
  it("reveals the cards as they come into view, a beat apart", async () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const { container, rerender } = render(<Shelf count={3} />);
    const items = [...container.querySelectorAll("li")];
    expect(items.every(item => !item.dataset.revealed)).toBe(true);
    fire(items);
    expect(items.map(item => item.dataset.revealed)).toEqual(["true", "true", "true"]);
    expect(items.map(item => item.style.getPropertyValue("--reveal-delay"))).toEqual(["0ms", "45ms", "90ms"]);

    // A card added later arrives the same way.
    rerender(<Shelf count={4} />);
    await new Promise(resolve => setTimeout(resolve, 0));
    const added = container.querySelectorAll("li")[3];
    expect(added.dataset.revealed).toBeUndefined();
    fire([added]);
    expect(added.dataset.revealed).toBe("true");
  });

  it("simply shows everything without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<Shelf count={2} />);
    expect(container.querySelector("section")).toHaveAttribute("data-reveal", "off");
  });
});
