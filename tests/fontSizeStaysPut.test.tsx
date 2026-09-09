import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

/* =========================================================
   The font-size control stays under the finger using it

   Font size is the root font size, so every rem in the app answers to it —
   including all the settings rows stacked above this one. Changing it relaid
   the page while the scroller kept the same scrollTop, and scrollTop is
   measured in pixels, so the control moved. Measured in a browser on an
   812px screen with the row parked 400px down: Large put it at 960px, off
   the bottom of the screen entirely, and Small pulled it to 325px. Comparing
   three sizes means using the control three times, and it was gone after the
   first.

   jsdom lays nothing out, so the movement is supplied here rather than
   measured. What is being checked is the compensation: that the component
   reads the control's position on both sides of the change and hands the
   scroller back exactly the difference.
   ========================================================= */

const { default: FontSizeSettingsButton } = await import(
  "@/components/settings/FontSizeSettingsButton"
);
const { getAppFontSize, setAppFontSize } = await import(
  "@/lib/appPreferences"
);

/* How far the page moves the control, per step of font size. */
const DRIFT_PER_STEP = 187;

const realGetBoundingClientRect =
  Element.prototype.getBoundingClientRect;

afterEach(() => {
  Element.prototype.getBoundingClientRect = realGetBoundingClientRect;
  setAppFontSize("medium");
});

function renderRow() {
  render(
    <div data-app-scroll-viewport style={{ overflowY: "auto" }}>
      <FontSizeSettingsButton />
    </div>,
  );

  const scroller = document.querySelector<HTMLElement>(
    "[data-app-scroll-viewport]",
  );

  if (!scroller) throw new Error("The scroller did not render.");

  /*
   * Everything above the control grows with the font size, so the control
   * slides down the viewport as the size goes up. Small is one step below
   * medium, large is one step above.
   */
  const steps = { small: -1, medium: 0, large: 1 } as const;

  Element.prototype.getBoundingClientRect = function () {
    return {
      ...realGetBoundingClientRect.call(this),
      top: 400 + steps[getAppFontSize()] * DRIFT_PER_STEP,
    } as DOMRect;
  };

  return scroller;
}

describe("changing the font size", () => {
  it("gives the scroller back exactly what the relayout moved", () => {
    const scroller = renderRow();
    scroller.scrollTop = 800;

    fireEvent.click(screen.getByRole("radio", { name: /large/i }));

    expect(getAppFontSize()).toBe("large");
    expect(scroller.scrollTop).toBe(800 + DRIFT_PER_STEP);
  });

  it("compensates in both directions", () => {
    const scroller = renderRow();
    scroller.scrollTop = 800;

    fireEvent.click(screen.getByRole("radio", { name: /small/i }));

    expect(getAppFontSize()).toBe("small");
    expect(scroller.scrollTop).toBe(800 - DRIFT_PER_STEP);
  });
});
