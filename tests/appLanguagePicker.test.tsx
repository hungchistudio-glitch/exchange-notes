import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/profile" }));

import AppLanguageSettingsButton from "@/components/settings/AppLanguageSettingsButton";

/*
 * The picker builds itself from the language table, so this is the test that
 * proves shipping a dictionary is genuinely all it takes — and that each
 * language describes itself rather than falling through to English, which is
 * what the old if-chain did.
 */
describe("app language picker", () => {
  it("offers every language that ships a dictionary", async () => {
    render(<AppLanguageSettingsButton />);
    (await screen.findByRole("button")).click();

    for (const name of ["English", "繁體中文", "Español", "Français", "Italiano"]) {
      expect(await screen.findByText(name)).toBeInTheDocument();
    }
    expect(await screen.findByText("Display the app interface in French.")).toBeInTheDocument();
    expect(await screen.findByText("Display the app interface in Italian.")).toBeInTheDocument();
  });
});
