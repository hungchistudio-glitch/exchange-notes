import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

const { default: LexiconImageMenu } = await import(
  "@/components/lexicon/LexiconImageMenu"
);

function Harness({ onFile = vi.fn() }: { onFile?: (file: File) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <LexiconImageMenu
      open={open}
      onOpenChange={setOpen}
      onFile={onFile}
    />
  );
}

describe("the search camera source menu", () => {
  it("keeps one icon in the toolbar and offers exactly the three requested sources", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Scan" }));

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Photo Library",
      "Take Photo",
      "Choose File",
    ]);
    expect(screen.queryByRole("button", { name: "Image" })).not.toBeInTheDocument();
  });

  it("uses a camera-capture input only for Take Photo", () => {
    const { container } = render(<Harness />);
    const inputs = Array.from(container.querySelectorAll('input[type="file"]'));

    expect(inputs).toHaveLength(3);
    expect(inputs.filter((input) => input.getAttribute("capture") === "environment"))
      .toHaveLength(1);
  });
});
