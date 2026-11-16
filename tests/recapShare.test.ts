import { describe, expect, it } from "vitest";

import { FIXTURE_LIBRARY } from "@/lib/hello/fixtures";
import { drawHelloCard } from "@/lib/hello/shareImage";
import { milestoneToOffer, parseMilestone } from "@/lib/recap/milestones";
import { countUp, drawShareCard, SHARE_SIZES } from "@/lib/recap/shareCard";
import { decodeText, isoWeek } from "@/lib/share/hud";

/*
 * The recap made to share and to bring people in (Chi, 2026-11-15): the
 * reader's own Yumi, the week's numbers counting up in the video, one word
 * to learn from the image, a friend code, two shapes, and milestones
 * offered once. A word sent with Yumi goes out on the same instrument card
 * (lib/share/hud.ts).
 */

function fakeContext() {
  const canvas = { width: 0, height: 0 };
  const texts: string[] = [];
  const images: unknown[] = [];
  const noop = () => undefined;
  const ctx = new Proxy(
    {
      canvas,
      fillText: (text: string) => texts.push(text),
      drawImage: (image: unknown) => images.push(image),
      measureText: (text: string) => ({ width: text.length * 20 }),
      createRadialGradient: () => ({ addColorStop: noop }),
      createLinearGradient: () => ({ addColorStop: noop }),
    } as Record<string, unknown>,
    { get: (target, key) => (key in target ? target[key as string] : noop), set: (target, key, value) => ((target[key as string] = value), true) },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, canvas, texts, images };
}

const input = {
  cosmic: false,
  title: "This week",
  range: "11/09 – 11/15",
  code: "WK 46",
  stats: [{ label: "Right", value: "100%" }, { label: "Days learning", value: "3/7", days: [true, false, true, false, false, true, false] }],
  lesson: { label: "Word of the week", word: "exuberant", reading: "/ɪɡˈzuːbərənt/", meaning: "熱情洋溢的" },
  footer: "587 words in your library · Exchange Notes",
  yumi: { width: 300, height: 300 } as unknown as CanvasImageSource,
  qr: { width: 340, height: 340 } as unknown as CanvasImageSource,
  qrLabel: "Scan to learn with me",
};

describe("the share card", () => {
  it("is a story or a post, each its own size", () => {
    const story = fakeContext();
    drawShareCard(story.ctx, { ...input, format: "story" });
    expect([story.canvas.width, story.canvas.height]).toEqual([SHARE_SIZES.story.width, SHARE_SIZES.story.height]);
    const post = fakeContext();
    drawShareCard(post.ctx, { ...input, format: "square" });
    expect([post.canvas.width, post.canvas.height]).toEqual([1080, 1080]);
  });

  it("carries Yumi, the numbers, the week's word and the friend code", () => {
    const { ctx, texts, images } = fakeContext();
    drawShareCard(ctx, { ...input, format: "story" });
    expect(texts).toEqual(expect.arrayContaining(["This week", "100%", "3/7", "exuberant", "熱情洋溢的", "Scan to learn with me →"]));
    expect(images).toEqual([input.yumi, input.qr]);
  });

  it("decodes its title and word in over the video's opening", () => {
    const { ctx, texts } = fakeContext();
    drawShareCard(ctx, { ...input, format: "square", progress: 0, tick: 3 });
    expect(texts).not.toContain("This week");
    expect(texts).not.toContain("exuberant");
    expect(texts).toContain("0%");
  });

  it("counts the numbers up over the video's opening", () => {
    expect(countUp("100%", 0)).toBe("0%");
    expect(countUp("3/7", 0.5)).toBe("3/7".replace("3", String(Math.round(3 * (1 - 0.5 ** 3)))));
    expect(countUp("100%", 1)).toBe("100%");
    expect(countUp("—", 0.2)).toBe("—");
  });
});

describe("the instrument look", () => {
  it("decodes letters from the left and leaves spaces be", () => {
    expect(decodeText("Word of the week", 1, 0)).toBe("Word of the week");
    const half = decodeText("Word of the week", 0.5, 2);
    expect(half.slice(0, 5)).toBe("Word ");
    expect(half).not.toBe("Word of the week");
    expect(half.split(" ").length).toBe(4);
  });

  it("names the week by its ISO number", () => {
    expect(isoWeek(new Date(2026, 10, 15))).toBe(46);
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1);
  });
});

describe("a word sent with Yumi", () => {
  const hello = {
    hello: FIXTURE_LIBRARY,
    qr: { width: 296, height: 296 } as unknown as CanvasImageSource,
    greeting: "Fixture's Yumi came to say hello.",
    gift: "Here's a word for you today.",
    scanCaption: "Scan to open",
    languageNames: ["English", "Traditional Chinese"] as const,
    url: "https://exchange-notes-app.vercel.app/hello/fixtureLib01",
  };

  it("carries the greeting, both words, Yumi and the code, in both shapes", () => {
    for (const format of ["story", "square"] as const) {
      const { ctx, canvas, texts, images } = fakeContext();
      const yumi = { width: 400, height: 300 } as unknown as CanvasImageSource;
      drawHelloCard(ctx, { ...hello, format, yumi });
      expect([canvas.width, canvas.height]).toEqual([SHARE_SIZES[format].width, SHARE_SIZES[format].height]);
      expect(texts).toEqual(expect.arrayContaining(["library", "圖書館"]));
      /* The sender's ID sits in the header, tracked a letter at a time. */
      expect(texts.join("")).toContain("@fixture_reader");
      /* Written out whole, on one line or two, for whoever cannot scan. */
      expect(texts.join("").replace(/\s/g, "")).toContain("exchange-notes-app.vercel.app/hello/fixtureLib01");
      expect(images).toEqual([yumi, hello.qr]);
    }
  });

  it("draws her picture whole where the live figure is cut to fill", () => {
    const calls: unknown[][] = [];
    const { ctx } = fakeContext();
    (ctx as unknown as Record<string, unknown>).drawImage = (...args: unknown[]) => calls.push(args);
    const poster = { width: 720, height: 720 } as unknown as CanvasImageSource;
    drawHelloCard(ctx, { ...hello, format: "story", yumi: poster, yumiIsPoster: true });
    expect(calls[0]).toHaveLength(5);
    const live = { width: 720, height: 720 } as unknown as CanvasImageSource;
    calls.length = 0;
    drawHelloCard(ctx, { ...hello, format: "story", yumi: live });
    expect(calls[0]).toHaveLength(9);
  });
});

describe("milestones", () => {
  it("offers the highest reached, the run of days first, and each only once", () => {
    expect(milestoneToOffer({ totalWords: 587, streak: 3 }, new Set())).toMatchObject({ id: "words-500" });
    expect(milestoneToOffer({ totalWords: 587, streak: 8 }, new Set())).toMatchObject({ id: "streak-7" });
    expect(milestoneToOffer({ totalWords: 587, streak: 8 }, new Set(["streak-7", "words-500"]))).toBeNull();
    expect(milestoneToOffer({ totalWords: 9, streak: 2 }, new Set())).toBeNull();
  });

  it("reads only real milestones from a link", () => {
    expect(parseMilestone("words-500")).toMatchObject({ kind: "words", value: 500 });
    expect(parseMilestone("words-501")).toBeNull();
    expect(parseMilestone("<script>")).toBeNull();
  });
});
