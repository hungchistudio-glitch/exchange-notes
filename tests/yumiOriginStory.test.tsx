import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import YumiOriginStory from "@/components/landing/story/YumiOriginStory";
import {
  ACT_STILLS_MS,
  ARRIVE_AT_MS,
  DOCKED_AT_MS,
  END_CARD_AT_MS,
  MERGE_AT_MS,
  STORY_ACTS,
  STORY_DURATION_MS,
  STORY_TRACKS,
  actAt,
  planetArrival,
  planetTrack,
  yumiAt,
} from "@/components/landing/story/storyTimeline";
import { getTranslations } from "@/lib/i18n";

const scene = vi.hoisted(() => ({
  handle: null as null | Record<string, ReturnType<typeof vi.fn>>,
  options: null as null | Record<string, unknown>,
  /** Resolves the scene's ready(); null means it is ready at once. */
  release: null as null | (() => void),
  hold: false,
}));

/* jsdom has no WebGL: a scene that records what the film asks of her. */
vi.mock("@/lib/yumi3d/scene", () => ({
  createYumiScene: (_canvas: unknown, options: Record<string, unknown>) => {
    scene.options = options;
    const ready = scene.hold
      ? new Promise<void>(resolve => { scene.release = resolve; })
      : Promise.resolve();
    scene.handle = {
      ready: vi.fn(() => ready),
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

  /*
   * A track hidden outside its acts (so that pressing play does not paint
   * every layer at its largest zoom at once) must already be invisible
   * whenever it is hidden; otherwise the hide would cut it off on screen.
   */
  it("hides a track only in acts where it is already at opacity 0", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/landing/story/YumiOriginStory.module.css"),
      "utf8",
    );
    const block = css.match(/Each track is drawn only[\s\S]*?\*\/\n([\s\S]*?)\{\n  visibility: hidden;/)?.[1];
    expect(block).toBeTruthy();
    const ids = STORY_ACTS.map(item => item.id);
    const opacityAt = (frames: Keyframe[], time: number) => {
      const keyed = frames.filter(frame => "opacity" in frame);
      if (!keyed.length) return 1;
      const at = (frame: Keyframe) => (frame.offset as number) * STORY_DURATION_MS;
      const after = keyed.findIndex(frame => at(frame) >= time);
      if (after <= 0) return Number(keyed[Math.max(after, 0)].opacity);
      const a = keyed[after - 1], b = keyed[after];
      const t = (time - at(a)) / (at(b) - at(a) || 1);
      return Number(a.opacity) + (Number(b.opacity) - Number(a.opacity)) * t;
    };
    let checked = 0;
    for (const selector of block!.split(",\n")) {
      const acts = [...selector.matchAll(/data-act="(\w+)"/g)].map(match => match[1]);
      const tracks = [...selector.matchAll(/data-track="(\w+)"/g)].map(match => match[1]) as (keyof typeof STORY_TRACKS)[];
      const hiddenIn = selector.includes(":not(") ? ids.filter(id => !acts.includes(id)) : acts;
      for (const name of tracks) {
        for (const act of hiddenIn) {
          const index = ids.indexOf(act as (typeof ids)[number]);
          const start = STORY_ACTS[index].start;
          const end = STORY_ACTS[index + 1]?.start ?? STORY_DURATION_MS;
          for (let time = start; time <= end; time += 10) {
            expect(opacityAt(STORY_TRACKS[name], time), `${name} in ${act} at ${time}ms`).toBe(0);
          }
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe("the descent to Station 33", () => {
  /* The planet does not cross-fade into a different Earth: it ends exactly on
     the station's horizon. Re-derive both circles from the stylesheets'
     numbers and check they coincide, on a desktop and a phone screen. */
  it.each([[1100, 524], [342, 428], [560, 700]])("lands the planet on the station's Earth on a %ix%i screen", (W, H) => {
    const end = planetArrival(W, H);
    const P = Math.min(0.44 * H, 0.52 * W);
    const pc = { x: -0.08 * W + 1.16 * W * 0.86 - P / 2, y: -0.08 * H + 1.16 * H * 0.19 + P / 2 };
    const inCamera = { x: pc.x + (end.x / 100) * P, y: pc.y + (end.y / 100) * P };
    const onScreen = {
      x: W / 2 + 1.02 * (inCamera.x - W / 2) - 0.05 * 1.16 * W,
      y: H / 2 + 1.02 * (inCamera.y - H / 2) - 0.01 * 1.16 * H,
    };
    const radius = (1.02 * end.scale * P) / 2;
    expect(radius).toBeCloseTo(0.875 * W, 0);
    expect(onScreen.x).toBeCloseTo(W / 2, 0);
    expect(onScreen.y - radius).toBeCloseTo(0.63 * H, 0);
  });

  it("checks those numbers against the stylesheets", () => {
    const film = readFileSync(resolve(process.cwd(), "components/landing/story/YumiOriginStory.module.css"), "utf8");
    const shop = readFileSync(resolve(process.cwd(), "components/shop/OrbitalBackdrop.module.css"), "utf8");
    expect(film).toMatch(/\.camera \{\n  inset: -8%;/);
    expect(film).toMatch(/\.planet,\n\.flare \{\n  position: absolute;\n  right: 14%;\n  top: 19%;\n  width: min\(44cqh, 52cqw\);/);
    expect(shop).toMatch(/\.earth \{\n  position: absolute;\n  left: 50%;\n  top: 63%;\n  width: 175%;/);
    const camera = STORY_TRACKS.camera.filter(frame => (frame.offset as number) * STORY_DURATION_MS >= 19_000);
    for (const frame of camera) expect(frame.transform).toBe("translate3d(-5%, -1%, 0) scale(1.02)");
  });

  it("arrives before the station is fully there, and docks her after", () => {
    expect(STORY_ACTS[3].start).toBeLessThan(ARRIVE_AT_MS);
    expect(ARRIVE_AT_MS).toBeLessThan(DOCKED_AT_MS);
    expect(planetTrack(342, 428).at(-1)).toMatchObject({ opacity: 0 });
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
    scene.options = null;
    scene.release = null;
    scene.hold = false;
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

  /* jsdom has no Web Animations, so the film runs on its plain clock, which
     reads performance.now(): moving that on moves the film on. */
  function skipAhead(ms: number) {
    const real = performance.now.bind(performance);
    return vi.spyOn(performance, "now").mockImplementation(() => real() + ms);
  }

  it("waits for Yumi to be ready before it starts on its own", async () => {
    scene.hold = true;
    renderStory();
    await waitFor(() => expect(scene.release).not.toBeNull());
    // On screen (jsdom has no observer, so it counts as fully visible), but
    // her shaders are still compiling: no start yet, so YU and MI never pop
    // in mid-drift.
    expect(screen.getByRole("button", { name: story.play })).toBeInTheDocument();
    expect(scene.options).toMatchObject({ embedded: true, exactAnchor: true, maxPixelRatio: 1.5 });

    await act(async () => { scene.release!(); });
    await waitFor(() => expect(screen.getByRole("button", { name: story.pause })).toBeInTheDocument());
  });

  it("never starts over a reader who has already pressed something", async () => {
    scene.hold = true;
    renderStory();
    await waitFor(() => expect(scene.release).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: story.play }));
    fireEvent.click(screen.getByRole("button", { name: story.pause }));

    await act(async () => { scene.release!(); });
    expect(screen.getByRole("button", { name: story.play })).toBeInTheDocument();
  });

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
    // The pieces wait until she has come down onto the stand.
    expect(screen.queryByRole("group", { name: story.tryOn.title })).not.toBeInTheDocument();
    const later = skipAhead(DOCKED_AT_MS - STORY_ACTS[3].start + 200);
    const rail = await screen.findByRole("group", { name: story.tryOn.title });
    later.mockRestore();
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
    const later = skipAhead(DOCKED_AT_MS - STORY_ACTS[3].start + 200);
    const rail = await screen.findByRole("group", { name: copy.tryOn.title });
    later.mockRestore();
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
