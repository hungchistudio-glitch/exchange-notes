import { render } from "@testing-library/react";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import HtmlMarker from "@/components/foundation/HtmlMarker";

/* =========================================================
   Flags on <html> instead of :has() on <html> and <body>

   body:has([data-app-viewport]) and html:has(.cosmic-settings-page) made
   every DOM change on every page restyle the whole page (see
   components/foundation/HtmlMarker). The flags replace them; these tests
   keep the flags honest and keep the :has() from coming back.
   ========================================================= */

const root = document.documentElement;

describe("HtmlMarker", () => {
  it("raises its flag on <html> while mounted and lowers it after", () => {
    expect(root).not.toHaveAttribute("data-app-shell");
    const view = render(<HtmlMarker name="appShell" />);
    expect(root).toHaveAttribute("data-app-shell", "");
    view.unmount();
    expect(root).not.toHaveAttribute("data-app-shell");
  });

  it("keeps the flag up until the last one goes", () => {
    const first = render(<HtmlMarker name="cosmicSettings" />);
    const second = render(<HtmlMarker name="cosmicSettings" />);
    first.unmount();
    expect(root).toHaveAttribute("data-cosmic-settings", "");
    second.unmount();
    expect(root).not.toHaveAttribute("data-cosmic-settings");
  });

  it("sets the same flag from an inline script, inert once on the client", () => {
    const { container } = render(<HtmlMarker name="appShell" />);
    const script = container.querySelector("script")!;
    expect(script).toHaveAttribute("type", "text/plain");
    expect(script.textContent).toBe('document.documentElement.dataset.appShell=""');
  });
});

function files(pattern: string, include: string) {
  try {
    return execFileSync("grep", ["-rlE", pattern, `--include=${include}`, "app", "components"], {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

describe("the stylesheets", () => {
  it("never make <html> or <body> the subject of a :has()", () => {
    const offenders = files(":has\\(", "*.css").flatMap(file => {
      const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      return css
        .split(/[{}]/)
        .flatMap(block => block.split(","))
        .filter(selector => /(^|[\s>+~])(html|body)(\[[^\]]*\]|:not\([^)]*\)|\.[\w-]+)*:has\(/.test(selector.trim()))
        .map(selector => `${file}: ${selector.trim()}`);
    });
    expect(offenders).toEqual([]);
  });

  it("flag what the rules used to look for, wherever it is rendered", () => {
    const viewports = files("^\\s+data-app-viewport\\s*$", "*.tsx");
    expect(viewports.length).toBeGreaterThanOrEqual(3);
    for (const file of viewports) {
      expect(readFileSync(file, "utf8"), file).toContain('<HtmlMarker name="appShell" />');
    }

    const settingsPages = files('className="[^"]*\\bcosmic-settings-page\\b', "*.tsx");
    expect(settingsPages.length).toBeGreaterThanOrEqual(2);
    for (const file of settingsPages) {
      expect(readFileSync(file, "utf8"), file).toContain('<HtmlMarker name="cosmicSettings" />');
    }
  });
});
