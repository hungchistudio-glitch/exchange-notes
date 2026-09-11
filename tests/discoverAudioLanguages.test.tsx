import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AudioRail from "@/components/discover/AudioRail";
import english from "@/lib/i18n/en";

describe("Discover featured-story audio languages", () => {
  it("labels and selects the actual Spanish to French pair", async () => {
    const onModeChange = vi.fn();

    render(
      <AudioRail
        copy={english.discover}
        isPlaying={false}
        progress={0}
        mode="primary"
        pair={["es", "fr"]}
        onModeChange={onModeChange}
        onTogglePlay={() => {}}
      />,
    );

    const spanish = screen.getByRole("button", { name: "Español" });
    const french = screen.getByRole("button", { name: "Français" });

    expect(spanish).toHaveTextContent("Es");
    expect(spanish).toHaveAttribute("aria-pressed", "true");
    expect(french).toHaveTextContent("Fr");
    expect(french).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(french);

    expect(onModeChange).toHaveBeenCalledWith("secondary");
  });
});
