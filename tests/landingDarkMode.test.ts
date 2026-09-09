import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const landingCss = readFileSync(
  resolve(process.cwd(), "components/landing/LandingPage.module.css"),
  "utf8",
);

function channelToLinear(channel: number) {
  const srgb = channel / 255;
  return srgb <= 0.04045
    ? srgb / 12.92
    : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => channelToLinear(Number.parseInt(channel, 16)));

  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a six-digit hex colour, received ${hex}`);
  }

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function darkPalette() {
  const block = landingCss.match(
    /@media \(prefers-color-scheme: dark\) \{\s*\.page \{([\s\S]*?)\n\s*\}\s*\n\}/,
  )?.[1];

  if (!block) {
    throw new Error("The landing page has no system Dark Mode palette");
  }

  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map(
      ([, name, value]) => [name, value.toLowerCase()],
    ),
  );
}

describe("the public landing page Dark Mode palette", () => {
  it("follows the device appearance without changing the signed-in mode", () => {
    expect(landingCss).toContain("color-scheme: light dark");
    expect(landingCss).toContain("@media (prefers-color-scheme: dark)");
    expect(landingCss).toContain("--yumi-canvas: #0d0d11");
    expect(landingCss).toContain("--yumi-mark: #ffffff");
  });

  it.each([
    ["landing-ink", "landing-paper"],
    ["landing-soft", "landing-paper"],
    ["landing-faint", "landing-paper"],
    ["landing-ink", "landing-card"],
    ["landing-soft", "landing-card"],
    ["landing-faint", "landing-card"],
    ["landing-on-ink", "landing-ink"],
    ["landing-recognition-ink", "landing-amber-wash"],
  ])("keeps %s readable on %s", (foregroundName, backgroundName) => {
    const palette = darkPalette();
    const foreground = palette[foregroundName];
    const background = palette[backgroundName];

    expect(foreground, `${foregroundName} should be a solid colour`).toBeDefined();
    expect(background, `${backgroundName} should be a solid colour`).toBeDefined();
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
