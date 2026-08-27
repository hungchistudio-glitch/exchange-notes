import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

const { default: LexiconImageMenu } = await import(
  "@/components/lexicon/LexiconImageMenu"
);

describe("the search camera source chooser", () => {
  it("delegates to one native image picker without drawing a second menu", () => {
    const inputClick = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);
    const { container } = render(<LexiconImageMenu onFile={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Scan" }));

    expect(inputClick).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(1);
    expect(container.querySelector('input[type="file"]')).toHaveAttribute(
      "accept",
      "image/*",
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });

  it("hands the one selected image to recognition", () => {
    const onFile = vi.fn();
    const { container } = render(<LexiconImageMenu onFile={onFile} />);
    const input = container.querySelector('input[type="file"]');
    const image = new File(["image"], "lamp.jpg", { type: "image/jpeg" });

    fireEvent.change(input!, { target: { files: [image] } });

    expect(onFile).toHaveBeenCalledWith(image);
  });
});
