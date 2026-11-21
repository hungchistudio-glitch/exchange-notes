import { render, screen, waitFor } from "@testing-library/react";

import { describe, expect, it } from "vitest";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import OverlayPortal from "@/components/foundation/overlays/OverlayPortal";
import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";

/*
 * The sheet opened last is drawn on top (2026-11-21).
 *
 * The lookup sheet sits on z-index 130; "Report a problem" in its results
 * opens a BottomSheet, which sits on 100. Inertness follows the order they
 * opened in, so the report became the one sheet that could be touched while
 * it was drawn under the lookup, and the lookup, on top, no longer answered:
 * on a phone nothing on the screen did. A sheet that opens is now lifted
 * above every sheet already open, and put back when it closes.
 */

function HighSheet() {
  const motion = useSheetMotion({ open: true, onClose: () => undefined });
  if (!motion.rendered) return null;
  return (
    <OverlayPortal>
      <div data-testid="high-layer" style={{ position: "fixed", zIndex: 130 }}>
        <section role="dialog" aria-label="Lookup" {...motion.panelProps}>
          lookup
        </section>
      </div>
    </OverlayPortal>
  );
}

/* Opened by a prop rather than a click: once the lookup is open, the page
   behind it is inert, as it is for a reader. */
function Harness({ reporting }: { reporting: boolean }) {
  return (
    <>
      <HighSheet />
      <BottomSheet open={reporting} onClose={() => undefined} title="Report a problem">
        <p>note</p>
      </BottomSheet>
    </>
  );
}

const layerOf = (element: Element) =>
  Array.from(document.body.children).find((child) => child.contains(element)) as HTMLElement;

describe("a sheet opened over another", () => {
  it("is drawn above it, and the one underneath is the inert one", async () => {
    const { rerender } = render(<Harness reporting={false} />);
    rerender(<Harness reporting />);

    const report = await screen.findByRole("dialog", { name: "Report a problem", hidden: true });
    const reportLayer = layerOf(report);
    const lookupLayer = screen.getByTestId("high-layer");

    // The lift comes in the effect after the sheet is rendered.
    await waitFor(() => expect(Number(reportLayer.style.zIndex)).toBeGreaterThan(130));
    expect(lookupLayer.hasAttribute("inert")).toBe(true);
    expect(reportLayer.hasAttribute("inert")).toBe(false);
  });

  it("goes back to its own layer when it closes", async () => {
    const { rerender } = render(<Harness reporting={false} />);
    rerender(<Harness reporting />);
    const reportLayer = layerOf(await screen.findByRole("dialog", { name: "Report a problem", hidden: true }));
    await waitFor(() => expect(reportLayer.style.zIndex).toBe("131"));

    rerender(<Harness reporting={false} />);
    await waitFor(() => expect(reportLayer.isConnected).toBe(false), { timeout: 2000 });
    expect(reportLayer.style.zIndex).toBe("");
  });
});
