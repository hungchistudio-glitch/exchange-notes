import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The install prompt arrives after the reader does

   Reported as the card disappearing on reaching Home. Two things were wrong
   and only one of them was this component's.

   The other one — RouteStage swapping element type when the opening ended,
   which remounted the whole page and reset this back to closed — is covered
   in routeStage.test.tsx.

   This is the half that lives here: the 1.2s delay was counted from mount,
   and this mounts under an opening animation that owns the screen for 2.8
   seconds. So it opened behind the overlay and was simply already there when
   the screen was handed over. The delay is meant to put the prompt a moment
   after Home, and that moment is when the opening ends.
   ========================================================= */

vi.mock("@/hooks/pwa/usePwaInstall", () => ({
  default: () => ({
    platform: "ios",
    isStandalone: false,
    canPromptInstall: true,
  }),
}));

vi.mock("@/lib/pwaPreferences", () => ({
  shouldOfferInstallPrompt: () => true,
  recordInstallPromptDismissed: vi.fn(),
}));

vi.mock("@/components/pwa/PwaInstallOverlay", () => ({
  default: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="install-card">{children}</div> : null,
}));

vi.mock("@/components/pwa/InstallPromptCard", () => ({
  default: () => <p>Install Exchange Notes</p>,
}));

const HomeInstallPrompt = (
  await import("@/components/pwa/HomeInstallPrompt")
).default;
const { setLaunching } = await import("@/lib/launchState");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setLaunching(false);
});

function card() {
  return screen.queryByTestId("install-card");
}

describe("when the install prompt appears", () => {
  it("stays away for the whole opening animation", () => {
    setLaunching(true);
    render(<HomeInstallPrompt />);

    // Well past its own delay, but the opening still owns the screen.
    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(card()).toBeNull();
  });

  it("arrives a moment after the opening hands the screen over", () => {
    setLaunching(true);
    render(<HomeInstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(card()).toBeNull();

    act(() => setLaunching(false));

    // The delay is counted from here, not from mount.
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(card()).toBeNull();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(card()).not.toBeNull();
  });

  it("still appears on a screen that had no opening to wait for", () => {
    setLaunching(false);
    render(<HomeInstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(1_400);
    });

    expect(card()).not.toBeNull();
  });
});
