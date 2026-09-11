import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth/GoogleLoginButton", () => ({
  default: ({
    label,
    analyticsEvent,
  }: {
    label: ReactNode;
    analyticsEvent?: string;
  }) => <button data-event={analyticsEvent}>{label}</button>,
}));

vi.mock("@/components/vocabulary/pet/YumiMark", () => ({
  default: ({ mood }: { mood: string }) => (
    <div data-testid="landing-yumi" data-mood={mood} />
  ),
}));

vi.mock("@/lib/analytics/track", () => ({
  track: vi.fn(),
}));

import LandingPage from "@/components/landing/LandingPage";
import { track } from "@/lib/analytics/track";
import { setInterfaceLanguage } from "@/lib/appPreferences";
import * as i18n from "@/lib/i18n";

describe("the pre-login product tour", () => {
  beforeEach(() => {
    vi.mocked(track).mockClear();
    setInterfaceLanguage("english");
  });

  it("explains the real product before asking for sign-in", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        name: "Keep the moment before it disappears.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "A useful word can keep moving." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Learning feels lighter with someone nearby.",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText("Start journaling — Continue with Google"),
    ).toHaveLength(2);
    expect(
      screen.getByText(
        "Write what you're thinking. Say what you can't quite write. Show Yumi what you're seeing.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Write it. · Say it. · Show it.")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("landing_view");
  });

  it("offers every interface language before sign-in and changes the whole introduction", async () => {
    render(<LandingPage />);

    for (const name of ["English", "繁體中文", "Español", "Français", "Italiano"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(
      await screen.findByRole("heading", {
        name: "Guarda el momento antes de que desaparezca.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Empieza tu diario — Continuar con Google"),
    ).toHaveLength(2);
    expect(document.documentElement).toHaveAttribute("lang", "es");
  });

  it("keeps the current language when a dictionary chunk cannot load", async () => {
    const load = vi
      .spyOn(i18n, "loadTranslations")
      .mockRejectedValueOnce(new Error("offline"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      render(<LandingPage />);
      fireEvent.click(screen.getByRole("button", { name: "Français" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "That language couldn't be loaded. Check your connection and try again.",
      );
      expect(document.documentElement).toHaveAttribute("lang", "en");
    } finally {
      load.mockRestore();
      consoleError.mockRestore();
    }
  });

  it("teaches the product as a controllable three-dimensional tour", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("region", {
        name: "A three-step tour of Exchange Notes",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Capture the moment" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play tour" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "Next step" }));

    expect(
      screen.getByRole("heading", { name: "Understand it in five languages" }),
    ).toBeInTheDocument();
    for (const language of ["English", "繁體中文", "Español", "Français", "Italiano"]) {
      expect(screen.getAllByText(language).length).toBeGreaterThanOrEqual(2);
    }

    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(
      screen.getByRole("heading", { name: "Return when it matters" }),
    ).toBeInTheDocument();
  });

  it("stays manual by default and only auto-advances after play is selected", () => {
    vi.useFakeTimers();

    try {
      render(<LandingPage />);

      act(() => vi.advanceTimersByTime(13_000));
      expect(
        screen.getByRole("heading", { name: "Capture the moment" }),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Play tour" }));
      expect(screen.getByRole("button", { name: "Pause tour" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      act(() => vi.advanceTimersByTime(6_500));
      expect(
        screen.getByRole("heading", { name: "Understand it in five languages" }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("supports horizontal touch swipes without stealing vertical scrolling", () => {
    render(<LandingPage />);
    const viewport = screen.getByTestId("hero-tour-viewport");

    fireEvent.pointerDown(viewport, {
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      clientX: 220,
      clientY: 100,
    });
    fireEvent.pointerUp(viewport, {
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      clientX: 130,
      clientY: 110,
    });
    expect(
      screen.getByRole("heading", { name: "Understand it in five languages" }),
    ).toBeInTheDocument();

    fireEvent.pointerDown(viewport, {
      pointerId: 2,
      pointerType: "touch",
      isPrimary: true,
      clientX: 130,
      clientY: 100,
    });
    fireEvent.pointerUp(viewport, {
      pointerId: 2,
      pointerType: "touch",
      isPrimary: true,
      clientX: 145,
      clientY: 175,
    });
    expect(
      screen.getByRole("heading", { name: "Understand it in five languages" }),
    ).toBeInTheDocument();

    fireEvent.pointerDown(viewport, {
      pointerId: 3,
      pointerType: "touch",
      isPrimary: true,
      clientX: 120,
      clientY: 100,
    });
    fireEvent.pointerUp(viewport, {
      pointerId: 3,
      pointerType: "touch",
      isPrimary: true,
      clientX: 210,
      clientY: 105,
    });
    expect(
      screen.getByRole("heading", { name: "Capture the moment" }),
    ).toBeInTheDocument();
  });

  it("lets the focused tour move with arrow keys", () => {
    render(<LandingPage />);
    const tour = screen.getByRole("region", {
      name: "A three-step tour of Exchange Notes",
    });

    tour.focus();
    fireEvent.keyDown(tour, { key: "ArrowRight" });

    expect(
      screen.getByRole("heading", { name: "Understand it in five languages" }),
    ).toBeInTheDocument();
  });

  it("introduces voice and camera recognition as first-class capture modes", () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("button", { name: "Voice" }));
    expect(
      screen.getByText("Voice recognized · transcript ready"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voice" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    expect(screen.getByText("Scene recognized")).toBeInTheDocument();
    expect(screen.getByText("Ginkgo leaves in evening light")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Camera" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("switches between the two things the camera can do", () => {
    render(<LandingPage />);

    // Opens on the menu scan.
    const menu = screen.getByRole("button", { name: /Translate a menu/ });
    const target = screen.getByRole("button", { name: /Focus on one thing/ });

    expect(menu).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Sliced pork with garlic sauce")).toBeInTheDocument();

    fireEvent.click(target);

    expect(target).toHaveAttribute("aria-pressed", "true");
    expect(menu).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("teapot")).toBeInTheDocument();
    expect(
      screen.queryByText("Sliced pork with garlic sauce"),
    ).not.toBeInTheDocument();
  });

  it("says which of the two only exists in Cosmic Mode", () => {
    // The menu scanner's only entry point is the Cosmic Mode Command Deck, so
    // a reader who goes looking for it in the standard app would not find it.
    // Target focus is on the ordinary capture screen and carries no badge.
    render(<LandingPage />);

    const menu = screen.getByRole("button", { name: /Translate a menu/ });
    const target = screen.getByRole("button", { name: /Focus on one thing/ });

    expect(menu).toHaveTextContent("Yumi Cosmic Mode");
    expect(target).not.toHaveTextContent("Yumi Cosmic Mode");
  });

  it("keeps hero and final conversion events distinct", () => {
    render(<LandingPage />);

    const ctas = screen.getAllByText(
      "Start journaling — Continue with Google",
    );
    expect(ctas[0]).toHaveAttribute("data-event", "landing_primary_cta_click");
    expect(ctas[1]).toHaveAttribute("data-event", "landing_final_cta_click");
  });
});
