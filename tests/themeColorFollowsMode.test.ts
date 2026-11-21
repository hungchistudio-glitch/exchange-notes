import { afterEach, describe, expect, it } from "vitest";

import { COLOR_SCHEME, THEME_COLOR, applyInterfaceMode } from "@/lib/appPreferences";

/*
 * The status bar follows the mode (2026-11-21, the mobile-native skill).
 *
 * The server writes theme-color and color-scheme into the head from the mode
 * cookie (generateViewport in app/layout.tsx). A switch in Settings changes
 * the mode with no reload, and used to leave both behind: a cream band along
 * the top of Yumi Cosmic's deep-space screen on an installed iPhone app, and
 * light form controls over obsidian, until the app was next opened.
 */
describe("switching the interface mode", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    delete document.documentElement.dataset.interfaceMode;
  });

  it("repaints the status bar colour and the browser's scheme with it", () => {
    document.head.innerHTML =
      `<meta name="theme-color" content="${THEME_COLOR.standard}">` +
      `<meta name="color-scheme" content="${COLOR_SCHEME.standard}">`;

    applyInterfaceMode("yumi-cosmic");
    expect(document.documentElement.dataset.interfaceMode).toBe("yumi-cosmic");
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content).toBe("#08090b");
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')!.content).toBe("dark");

    applyInterfaceMode("standard");
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content).toBe("#f5f3ed");
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')!.content).toBe("light");
  });

  it("adds the tags when the head has none, and never duplicates them", () => {
    applyInterfaceMode("yumi-cosmic");
    applyInterfaceMode("yumi-cosmic");
    expect(document.head.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="color-scheme"]')).toHaveLength(1);
  });
});
