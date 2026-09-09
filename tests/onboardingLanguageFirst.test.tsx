import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { setInterfaceLanguage } from "@/lib/appPreferences";

describe("onboarding language gate", () => {
  beforeEach(() => {
    setInterfaceLanguage("english");
  });

  it("chooses the interface language before the welcome introduction", async () => {
    render(
      <OnboardingFlow
        userId="reader-1"
        initialDisplayName=""
        initialExchangeId=""
        initialAvatarUrl={null}
        initialNativeLanguage={null}
        initialLearningLanguage={null}
        initialStep={null}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Choose your app language" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Welcome to Exchange Notes" }),
    ).toBeNull();

    fireEvent.click(screen.getByText("Français"));

    expect(
      await screen.findByRole("heading", {
        name: "Choisissez la langue de l'app",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    expect(
      await screen.findByRole("heading", {
        name: "Bienvenue sur Exchange Notes",
      }),
    ).toBeInTheDocument();
  });
});
