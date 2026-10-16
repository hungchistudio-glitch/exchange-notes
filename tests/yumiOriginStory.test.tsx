import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import YumiOriginStory from "@/components/landing/story/YumiOriginStory";
import {
  ACT_STILLS_MS,
  END_CARD_AT_MS,
  MERGE_AT_MS,
  STORY_ACTS,
  STORY_DURATION_MS,
  STORY_TRACKS,
  actAt,
  yumiAt,
} from "@/components/landing/story/storyTimeline";
import { getTranslations } from "@/lib/i18n";

const scene = vi.hoisted(() => ({
  handle: null as null | Record<string, ReturnType<typeof vi.fn>>,
}));

/* jsdom has no WebGL: a scene that records what the film asks of her. */
vi.mock("@/lib/yumi3d/scene", () => ({
  createYumiScene: () => {
    scene.handle = {
      frame: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
      setScreenAnchor: vi.fn(),
      setGaze: vi.fn(),
      setOutfit: vi.fn(),
      setParts: vi.fn(),
      pointerDown: vi.fn(),
      pointerMove: vi.fn(),
      pointerUp: vi.fn(),
      pointerCancel: vi.fn(),
    };
    return scene.handle;
  },
}));

const story = getTranslations("english")!.landing.story;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe("the film's clock", () => {
  it("has five acts in order, each with a still frame inside it", () => {
    expect(STORY_ACTS.map(item => item.id)).toEqual(["drift", "meet", "earth", "station", "land"]);
    STORY_ACTS.forEach((item, index) => {
      expect(actAt(item.start)).toBe(index);
      expect(actAt(ACT_STILLS_MS[index])).toBe(index);
    });
    expect(actAt(-1)).toBe(0);
    expect(actAt(STORY_DURATION_MS)).toBe(4);
    expect(END_CARD_AT_MS).toBeGreaterThan(STORY_ACTS[4].start);
    expect(END_CARD_AT_MS).toBeLessThan(STORY_DURATION_MS);
  });

  it("gives every painted layer keyframes across the whole film", () => {
    for (const [name, frames] of Object.entries(STORY_TRACKS)) {
      const offsets = frames.map(frame => frame.offset as number);
      expect(offsets[0], name).toBe(0);
      expect(offsets.at(-1), name).toBe(1);
      expect([...offsets].sort((a, b) => a - b), name).toEqual(offsets);
    }
  });

  it("opens on the stylesheet's own first frame, so nothing jumps when the film takes over", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/landing/story/YumiOriginStory.module.css"),
      "utf8",
    );
    // Every rule that names the layer, shared or its own.
    const rule = (name: string) =>
      [...css.matchAll(new RegExp(`\\n\\.${name} \\{([\\s\\S]*?)\\n\\}`, "g"))]
        .map(match => match[1])
        .join("\n");

    expect(STORY_TRACKS.planet[0]).toMatchObject({ opacity: 0 });
    expect(rule("planet")).toMatch(/opacity: 0;/);
    expect(rule("planet")).toMatch(/transform: translate3d\(22%, 26%, 0\) scale\(0\.55\);/);
    for (const name of ["flash", "ring", "orbit", "dock", "streaks", "sky", "flare"] as const) {
      expect(STORY_TRACKS[name][0], name).toMatchObject({ opacity: 0 });
      expect(rule(name), name).toMatch(/opacity: 0;/);
    }
    expect(rule("letterbox")).toMatch(/transform: scaleY\(1\.9\);/);
    expect(rule("progress")).toMatch(/transform: scaleX\(0\);/);
  });
});

describe("YU and MI", () => {
  it("drift apart as a U and an i, and close in until they are one", () => {
    const start = yumiAt(0, false, true);
    expect(start.parts).not.toBeNull();
    // A quarter turn each: the shell opens upward, the band stands upright.
    expect(start.parts!.yu.rotation).toBeCloseTo(Math.PI / 2);
    expect(start.parts!.mi.rotation).toBeCloseTo(Math.PI / 2);

    const gaps = [0, 3_000, 7_000, 9_000, 10_500, 10_900].map(time => {
      const { parts } = yumiAt(time, false, true);
      return distance(parts!.yu, parts!.mi);
    });
    expect(gaps[0]).toBeGreaterThan(8);
    expect(gaps.at(-1)).toBeLessThan(0.5);

    const joined = yumiAt(MERGE_AT_MS, false, true);
    expect(joined.parts).toBeNull();
  });

  it("is exactly the same picture at the same moment, played or scrubbed to", () => {
    expect(yumiAt(8_420, true, false)).toEqual(yumiAt(8_420, true, false));
  });

  it("looks at the planet, stands on the dock, then lands beside the end card and reads it", () => {
    expect(yumiAt(16_000).gaze?.x).toBeGreaterThan(0.5);
    const docked = yumiAt(24_000);
    expect(docked.x).toBeCloseTo(0.5);
    expect(docked.y).toBeCloseTo(0.5);
    expect(docked.parts).toBeNull();

    const landed = yumiAt(STORY_DURATION_MS);
    expect(landed.x).toBeGreaterThan(0.6);
    expect(landed.gaze?.x).toBeLessThan(0);
    // On a phone she lands below the words instead, and looks up at them.
    const phone = yumiAt(STORY_DURATION_MS, true);
    expect(phone.x).toBeCloseTo(0.5);
    expect(phone.y).toBeGreaterThan(0.7);
    expect(phone.gaze?.y).toBeLessThan(0);
  });
});

describe("the film on the page", () => {
  beforeEach(() => {
    scene.handle = null;
  });

  function renderStory(language: "english" | "traditional-chinese" = "english") {
    const copy = getTranslations(language)!.landing.story;
    render(
      <YumiOriginStory
        copy={copy}
        language={language}
        cta={<a href="/login">Start</a>}
      />,
    );
    return copy;
  }

  it("names all five scenes for a screen reader, without the clock", () => {
    renderStory();
    expect(screen.getByRole("heading", { level: 2, name: story.title })).toBeInTheDocument();
    const chapters = screen.getByRole("list", { name: story.chaptersLabel });
    expect(within(chapters).getAllByRole("button")).toHaveLength(5);
    for (const item of story.acts) {
      expect(screen.getByText(item.text, { selector: "li" , exact: false })).toBeInTheDocument();
    }
  });

  it("jumps to a scene and plays from there", async () => {
    renderStory();
    await act(async () => {});

    const station = screen.getByRole("button", { name: /Station 33/ });
    fireEvent.click(station);
    expect(station).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: story.pause })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: story.ariaLabel })).toHaveAttribute("data-act", "station");
  });

  it("tries the shop's real pieces on her at Station 33, and takes them off", async () => {
    renderStory();
    await waitFor(() => expect(scene.handle).not.toBeNull());

    fireEvent.click(screen.getByRole("button", { name: /Station 33/ }));
    const rail = await screen.findByRole("group", { name: story.tryOn.title });
    const monocle = within(rail).getByRole("button", { name: /Brass monocle/ });
    expect(within(rail).getAllByRole("button", { pressed: false })).toHaveLength(5);

    fireEvent.click(monocle);
    expect(monocle).toHaveAttribute("aria-pressed", "true");
    expect(scene.handle!.setOutfit).toHaveBeenLastCalledWith({ eyewear: "monocle" });
    // Trying something on stops the film to look.
    expect(screen.getByRole("button", { name: story.play })).toBeInTheDocument();

    fireEvent.click(within(rail).getByRole("button", { name: story.tryOn.takeOff }));
    expect(monocle).toHaveAttribute("aria-pressed", "false");
    expect(scene.handle!.setOutfit).toHaveBeenLastCalledWith({});
  });

  it("names the pieces in the page's language", async () => {
    const copy = renderStory("traditional-chinese");
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.acts[3].name) }));
    const rail = await screen.findByRole("group", { name: copy.tryOn.title });
    expect(within(rail).getByText("黃銅單片鏡")).toBeInTheDocument();
    expect(within(rail).getByText("30 塊餅乾")).toBeInTheDocument();
  });

  it("is written in every interface language", () => {
    for (const language of ["traditional-chinese", "spanish", "french", "italian"] as const) {
      const copy = getTranslations(language)!.landing.story;
      expect(copy.acts).toHaveLength(5);
      expect(copy.acts[0].text).not.toBe(story.acts[0].text);
      expect(copy.tryOn.cookies).toContain("{n}");
      expect(copy.sceneLabel).toContain("{n}");
    }
  });
});
