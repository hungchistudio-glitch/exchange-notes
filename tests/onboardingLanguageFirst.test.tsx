import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const supabaseUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: (values: unknown) => {
        supabaseUpdate(values);
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

vi.mock("@/components/onboarding/steps/NameStep", () => ({
  default: ({ onContinue }: { onContinue: () => void }) => (
    <div>
      <h1>Name step</h1>
      <button type="button" onClick={onContinue}>
        Save name
      </button>
    </div>
  ),
}));

import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { setInterfaceLanguage } from "@/lib/appPreferences";
import english from "@/lib/i18n/en";

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

  /*
   * The loop a new reader in Taiwan filmed on 2026-09-25: saving the name
   * went back to the language gate, the gate went to Welcome, Welcome to
   * Name, and round again. Saving the name has to move forward.
   */
  it("goes from the name straight to the two languages, never back to the gate", async () => {
    render(
      <OnboardingFlow
        userId="reader-1"
        initialDisplayName="Benny"
        initialExchangeId="benny_f"
        initialAvatarUrl={null}
        initialNativeLanguage={null}
        initialLearningLanguage={null}
        initialStep={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Get started|Start setup|Continue/ }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Save name" }));

    expect(supabaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_step: "languages" }),
    );
    expect(
      await screen.findByRole("heading", { name: english.onboarding.languages.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Choose your app language" }),
    ).toBeNull();
  });
});
