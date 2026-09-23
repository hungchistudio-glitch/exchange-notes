import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setInterfaceLanguage } from "@/lib/appPreferences";

/*
 * What is left of the old eleven-step tour's tests.
 *
 * This file used to walk that tour: two clicks to the dock preview, six more
 * to Cosmic Mode, and assertions on "5 of 11" and "10 of 11". Those steps
 * were deliberately removed — the tour now hands over to the coach on the
 * home screen after two pages, and the coach has tests of its own — so the
 * assertions about them were asserting the thing that was replaced.
 *
 * The overlay itself still exists, and the part of it that was never about
 * any particular step is still worth holding: it takes focus when it opens,
 * it keeps focus inside itself, and it gives the page back when it goes.
 */

vi.mock("@/components/tutorial/TutorialLanguageSetup", () => ({
  default: () => null,
}));

// The overlay routes home when it hands over to the coach, so it asks for
// the router on render.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/home",
}));

const { default: TutorialOverlay } = await import(
  "@/components/tutorial/TutorialOverlay"
);

describe("the tour overlay", () => {
  beforeEach(() => {
    setInterfaceLanguage("english");
  });

  it("keeps focus inside the full-screen guide and frees the page beneath it", () => {
    const { unmount } = render(<TutorialOverlay onClose={() => undefined} />);

    expect(
      screen.getByRole("heading", { name: "Welcome. Let's make this yours" }),
    ).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    const next = screen.getByRole("button", { name: "Next" });
    next.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Skip for now" })).toHaveFocus();

    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
