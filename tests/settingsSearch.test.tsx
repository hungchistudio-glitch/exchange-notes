import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsSearch from "@/components/settings/SettingsSearch";
import SettingsAnchor from "@/components/settings/SettingsAnchor";
import english from "@/lib/i18n/en";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  platform: "desktop",
  isStandalone: false,
  canPromptInstall: false,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/hooks/pwa/usePwaInstall", () => ({ default: () => mocks }));
vi.mock("@/hooks/i18n/useTranslation", () => ({ default: () => ({ t: english, language: "english" }) }));

describe("settings search navigation", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.platform = "desktop";
    window.history.replaceState(null, "", "/profile");
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("keeps keyboard focus in the modal and restores focus and inertness on cancel", async () => {
    const user = userEvent.setup();
    const { container } = render(<><button>Background</button><SettingsSearch /></>);
    const trigger = screen.getByRole("button", { name: english.settings.search.open });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByRole("searchbox", { name: english.settings.search.placeholder });
    expect(input).toHaveFocus();
    expect(container).toHaveAttribute("inert");
    await user.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: english.settings.search.cancel })).toHaveFocus();
    await user.tab();
    expect(input).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container).not.toHaveAttribute("inert");
    expect(trigger).toHaveFocus();
  });

  it("focuses the selected control and preserves router history state", async () => {
    const user = userEvent.setup();
    window.history.replaceState({ router: "preserved" }, "", "/profile");
    render(<><SettingsSearch /><SettingsAnchor id="setting-daily-goal"><button>Change goal</button></SettingsAnchor></>);
    await user.click(screen.getByRole("button", { name: english.settings.search.open }));
    await user.type(screen.getByRole("searchbox"), "daily");
    await user.click(screen.getByRole("button", { name: new RegExp(english.settings.dailyGoal.rowTitle) }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Change goal" })).toHaveFocus());
    expect(window.location.hash).toBe("#setting-daily-goal");
    expect(window.history.state).toEqual({ router: "preserved" });
  });

  it("excludes unavailable install actions but navigates to available nested settings", async () => {
    const user = userEvent.setup();
    render(<SettingsSearch />);
    await user.click(screen.getByRole("button", { name: english.settings.search.open }));
    await user.type(screen.getByRole("searchbox"), "install");
    expect(screen.queryByRole("button", { name: new RegExp(english.pwa.settingsRowTitle) })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "tour" } });
    await user.click(screen.getByRole("button", { name: new RegExp(english.tutorial.rowTitle) }));
    expect(mocks.push).toHaveBeenCalledWith("/profile/help#setting-tour");
  });

  /*
   * The flash that points at the found row is `.settings-anchor:target` in
   * globals.css, and `:target` only resolves on a real fragment navigation —
   * history.replaceState moves location.hash without touching it, so routing
   * the hash through the history API alone scrolls the reader to a row with
   * nothing marking it. A fragment navigation fires hashchange; replaceState
   * never does, which is what this asserts.
   */
  it("navigates the fragment rather than rewriting it, so :target still resolves", async () => {
    const user = userEvent.setup();
    const hashChanged = vi.fn();
    window.addEventListener("hashchange", hashChanged);

    render(<><SettingsSearch /><SettingsAnchor id="setting-daily-goal"><button>Change goal</button></SettingsAnchor></>);
    await user.click(screen.getByRole("button", { name: english.settings.search.open }));
    await user.type(screen.getByRole("searchbox"), "daily");
    await user.click(screen.getByRole("button", { name: new RegExp(english.settings.dailyGoal.rowTitle) }));

    await waitFor(() => expect(hashChanged).toHaveBeenCalled());
    window.removeEventListener("hashchange", hashChanged);
  });

  it("focuses a deep-linked setting when its destination mounts", async () => {
    window.history.replaceState(null, "", "/profile/help#setting-tour");
    render(<SettingsAnchor id="setting-tour"><button>Start tour</button></SettingsAnchor>);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start tour" })).toHaveFocus());
  });
});
