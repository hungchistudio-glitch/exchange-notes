import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  RouteSkeleton,
  SkeletonBlock,
  SkeletonRows,
} from "@/components/foundation/layout/RouteSkeleton";

/* =========================================================
   Every dock destination has something to show while it loads

   Each of these is a dynamic route. Without a loading boundary the App
   Router changes nothing on screen between the tap and the server's answer
   — no moved highlight, no dimmed page, nothing — so the tap reads as
   dropped and the app reads as slow. It also means Next has nothing to
   prefetch, since a dynamic route is prefetched only as far as its nearest
   loading file.

   The destinations are read out of the dock's own source rather than
   listed here, so a seventh tab added later is checked the day it appears
   instead of the day someone notices the app got slower.
   ========================================================= */

const ROOT = process.cwd();
const NAV = "components/foundation/layout/ProtectedNav.tsx";

/** The routes the dock actually links to, taken from the dock. */
function dockDestinations(): string[] {
  const source = readFileSync(join(ROOT, NAV), "utf8");

  return [...source.matchAll(/href:\s*"(\/[a-z-]+)"/g)]
    .map((match) => match[1])
    .filter((href, index, all) => all.indexOf(href) === index);
}

describe("the dock's destinations", () => {
  it("finds the routes from the dock itself", () => {
    // If this ever comes back empty the rest of the file passes vacuously.
    expect(dockDestinations().length).toBeGreaterThanOrEqual(4);
  });

  it.each(dockDestinations())("%s has a loading boundary", (href) => {
    const boundary = join(ROOT, "app/(protected)", href, "loading.tsx");

    expect(
      existsSync(boundary),
      `${href} has no loading.tsx — tapping its tab will leave the screen ` +
        `unchanged until the server answers, and Next has nothing to prefetch.`,
    ).toBe(true);
  });
});

describe("what a destination shows while it loads", () => {
  it("announces itself as busy, once", () => {
    render(
      <RouteSkeleton>
        <SkeletonBlock className="h-10 w-10" />
      </RouteSkeleton>,
    );

    const status = screen.getByRole("status");

    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading")).toBeInTheDocument();
  });

  it("hides its placeholder blocks from assistive technology", () => {
    /*
     * A dozen nameless boxes announced on the way to a page is noise, and
     * there is nothing in them anyone can act on. The one announcement is
     * the status region above.
     */
    const { container } = render(
      <RouteSkeleton>
        <SkeletonRows count={5} />
      </RouteSkeleton>,
    );

    const blocks = container.querySelectorAll("div.bg-black\\/\\[0\\.055\\]");

    expect(blocks.length).toBe(5);
    blocks.forEach((block) =>
      expect(block).toHaveAttribute("aria-hidden", "true"),
    );
  });

  it("only animates when motion is welcome", () => {
    // A reader who asked for less motion gets a still outline rather than a
    // page that breathes at them.
    render(<RouteSkeleton>{null}</RouteSkeleton>);

    expect(screen.getByRole("status").className).toContain(
      "motion-safe:animate-pulse",
    );
  });
});
