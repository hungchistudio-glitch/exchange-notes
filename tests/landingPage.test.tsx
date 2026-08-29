import { fireEvent, render, screen } from "@testing-library/react";
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

  it("uses one real Yumi component to preview selectable moods", () => {
    render(<LandingPage />);

    const proud = screen.getByRole("button", { name: "proud" });
    fireEvent.click(proud);

    expect(proud).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("landing-yumi").at(-1)).toHaveAttribute(
      "data-mood",
      "proud",
    );
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
