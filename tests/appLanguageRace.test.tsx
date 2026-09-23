import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import AppLanguageSettingsButton from "@/components/settings/AppLanguageSettingsButton";
import english from "@/lib/i18n/en";

const mocks = vi.hoisted(() => ({ load: vi.fn(), setLanguage: vi.fn() }));
vi.mock("@/lib/i18n", async (original) => ({
  ...await original<typeof import("@/lib/i18n")>(),
  loadTranslations: mocks.load,
  prefetchTranslations: vi.fn(),
}));
vi.mock("@/lib/appPreferences", async (original) => ({
  ...await original<typeof import("@/lib/appPreferences")>(),
  setInterfaceLanguage: mocks.setLanguage,
}));
vi.mock("@/hooks/i18n/useTranslation", () => ({ default: () => ({ t: english, language: "english" }) }));
vi.mock("@/components/foundation/overlays/BottomSheet", () => ({
  default: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <section role="dialog">{children}</section> : null,
}));

function deferred() {
  let resolve!: (value: typeof english) => void;
  const promise = new Promise<typeof english>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("interface language requests", () => {
  beforeEach(() => { mocks.load.mockReset(); mocks.setLanguage.mockReset(); });

  it("keeps the latest selection when dictionaries finish out of order", async () => {
    const user = userEvent.setup();
    const spanish = deferred();
    const french = deferred();
    mocks.load.mockImplementation((language) => language === "spanish" ? spanish.promise : french.promise);
    render(<AppLanguageSettingsButton />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button", { name: /Español/ }));
    await user.click(screen.getByRole("button", { name: /Français/ }));
    await act(async () => { french.resolve(english); });
    await act(async () => { spanish.resolve(english); });
    expect(mocks.setLanguage).toHaveBeenCalledExactlyOnceWith("french");
  });

  it("cancels a pending switch when the user reselects their current language", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    mocks.load.mockReturnValue(pending.promise);
    render(<AppLanguageSettingsButton />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button", { name: /Español/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /English/ }));
    await act(async () => { pending.resolve(english); });
    expect(mocks.setLanguage).not.toHaveBeenCalled();
  });
});
