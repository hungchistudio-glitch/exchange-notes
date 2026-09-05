import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/* =========================================================
   One crossfade, everywhere inside the signed-in app

   Standard Mode had no <ViewTransition> boundary at all — not an inert one —
   so navigating between screens was an instant swap. Cosmic Mode had six
   different arrivals, tagged by each control and mapped to named keyframes.

   Both are now the same 240ms crossfade. What is worth pinning is the one
   case that is not a transition at all: while the interface mode itself is
   changing, the shell underneath is being replaced, and that is the single
   moment a route animation must not also run — it is the same boundary whose
   child tree is being swapped, so the two would animate over each other.
   ========================================================= */

const mode = vi.hoisted(() => ({ modeTransition: false as boolean | string }));

vi.mock("@/contexts/InterfaceModeContext", () => ({
  useInterfaceMode: () => ({ isCosmic: false, modeTransition: mode.modeTransition }),
}));

/*
 * React's ViewTransition renders its children and nothing else, so a stand-in
 * that marks itself is the only way to see whether the boundary was there.
 */
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  return {
    ...actual,
    ViewTransition: ({
      children,
      default: fade,
    }: {
      children: React.ReactNode;
      default?: string;
    }) => <div data-view-transition={fade}>{children}</div>,
  };
});

const RouteStage = (await import("@/components/foundation/layout/RouteStage"))
  .default;

function boundary() {
  return document.querySelector("[data-view-transition]");
}

describe("the stage every protected route is played on", () => {
  it("wraps the page in one crossfade", () => {
    mode.modeTransition = false;

    render(
      <RouteStage>
        <p>a screen</p>
      </RouteStage>,
    );

    expect(boundary()).toHaveAttribute("data-view-transition", "page-fade");
    expect(screen.getByText("a screen")).toBeInTheDocument();
  });

  it("steps out of the way while the interface mode is changing", () => {
    // The mode sequence is replacing the shell underneath. A route animation
    // running at the same time would be animating over its own replacement.
    mode.modeTransition = "to-cosmic";

    render(
      <RouteStage>
        <p>a screen</p>
      </RouteStage>,
    );

    expect(boundary()).toBeNull();
    // And the page is still rendered — stepping aside must not mean vanishing.
    expect(screen.getByText("a screen")).toBeInTheDocument();
  });
});
