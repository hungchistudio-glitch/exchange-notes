import { describe, expect, it } from "vitest";
import { leaseInlineStyles } from "@/lib/ui/inlineStyleLease";

describe("overlapping search and installation sheet locks", () => {
  for (const keyboardFirst of [true, false]) it(`restores scrolling when ${keyboardFirst ? "keyboard" : "sheet"} releases first`, () => {
    const root = document.createElement("div");
    root.style.overflow = "auto";
    root.style.scrollBehavior = "smooth";
    const keyboard = leaseInlineStyles(root, { overflow: "hidden", "scroll-behavior": "auto" });
    const sheet = leaseInlineStyles(root, { overflow: "hidden", "scroll-behavior": "auto" });
    (keyboardFirst ? keyboard : sheet)();
    expect(root.style.overflow).toBe("hidden");
    (keyboardFirst ? sheet : keyboard)();
    expect(root.style.overflow).toBe("auto");
    expect(root.style.scrollBehavior).toBe("smooth");
    keyboard(); sheet();
    expect(root.style.overflow).toBe("auto");
  });
});
