import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setInterfaceLanguage } from "@/lib/appPreferences";

vi.mock("@/components/tutorial/TutorialLanguageSetup", () => ({
  default: () => null,
}));

const { default: TutorialOverlay } = await import(
  "@/components/tutorial/TutorialOverlay"
);

describe("Yumi's guided product journey", () => {
  beforeEach(() => {
    setInterfaceLanguage("english");
  });

  it("moves from capture into Notes without interrupting the tour", () => {
    render(<TutorialOverlay onClose={() => undefined} />);

    for (let step = 0; step < 2; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    const dock = screen.getByRole("list", { name: "Primary navigation" });
    const dockItems = within(dock).getAllByRole("listitem");
    expect(dockItems).toHaveLength(6);
    expect(dockItems.every((item) => item.querySelector("svg"))).toBe(true);
    expect(
      dockItems.map((item) => item.textContent),
    ).toEqual(["Vocabulary", "Messages", "Home", "Search", "Discover", "Settings"]);

    for (let step = 0; step < 2; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(
      screen.getByRole("heading", {
        name: "Give the moment somewhere to belong",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("5 of 11")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("introduces Cosmic Mode as the same account and learning data", () => {
    render(<TutorialOverlay onClose={() => undefined} />);

    for (let step = 0; step < 9; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(
      screen.getByRole("heading", {
        name: "Same learning, a different atmosphere",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("10 of 11")).toBeInTheDocument();
    expect(screen.getByText(/not a second account/i)).toBeInTheDocument();
  });

  it("keeps focus inside the full-screen guide and freezes the page beneath it", () => {
    const { unmount } = render(
      <TutorialOverlay onClose={() => undefined} />,
    );

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
