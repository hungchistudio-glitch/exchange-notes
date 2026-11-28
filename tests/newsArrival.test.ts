import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { comprehension } from "@/lib/discover/comprehension";
import { clearLaserScan, meaningNearby, requestLaserScan, subscribeLaserScan } from "@/lib/discover/laserScan";
import { SEED_GLYPHS, createNewsWind, glyphPool, letterTargets, windAt } from "@/lib/discover/newsWind";
import { prepareNewsWind, takeFullArrival } from "@/lib/discover/newsWindDay";
import { cityOf, greatCircle, project, receiverPlace, signalsOf } from "@/lib/discover/signalSources";
import type { DailyNewsCard } from "@/lib/types/dailyNews";

/* =========================================================
   The news page (Chi, 2026-11-28): a wind of today's letters that the page
   condenses out of, the Yumi logo dropped in last, a comprehension
   scanner on every story, a laser scan for a held word, and the map of
   where today's signals come from.
   ========================================================= */

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("the wind", () => {
  it("blows today's letters once they are known, every script before", () => {
    expect(glyphPool("")).toEqual(Array.from(SEED_GLYPHS));
    const pool = glyphPool("Hoor Al Qasimi Named Curator of 2028 Venice Biennale!");
    expect(pool).not.toContain(" ");
    expect(pool).not.toContain("!");
    expect(pool.slice(0, 4)).toEqual(["H", "o", "o", "r"]);
  });

  it("pushes from the right everywhere, with swirls in it", () => {
    for (const [x, y, t] of [[0, 0, 0], [200, 400, 1.3], [390, 844, 7]] as const) {
      expect(windAt(x, y, t, 390, 844).vx).toBeLessThan(0);
    }
    expect(windAt(100, 100, 0, 390, 844)).not.toEqual(windAt(100, 300, 0, 390, 844));
  });

  it("carries letters, sends each to its place, and clears", async () => {
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "clientWidth", { value: 390 });
    Object.defineProperty(canvas, "clientHeight", { value: 844 });
    let n = 0;
    const wind = createNewsWind(canvas, { cosmic: false, budget: 60, glyphs: () => ["a", "b"], random: () => ((n = (n * 9301 + 49297) % 233280) / 233280) });
    wind.blow();
    let now = 1000;
    for (let i = 0; i < 30; i += 1) wind.step((now += 16));
    expect(wind.count()).toBeGreaterThan(10);
    expect(wind.count()).toBeLessThanOrEqual(60);

    const targets = Array.from({ length: 12 }, (_, i) => ({ x: 40 + i * 20, y: 300, char: "N", font: "700 30px serif", size: 30, color: "#000" }));
    let landed = false;
    void wind.assemble(targets, 400).then(() => { landed = true; });
    for (let i = 0; i < 40; i += 1) wind.step((now += 16));
    await Promise.resolve();
    expect(landed).toBe(true);

    let cleared = false;
    void wind.clear(200).then(() => { cleared = true; });
    for (let i = 0; i < 20; i += 1) wind.step((now += 16));
    await Promise.resolve();
    expect(cleared).toBe(true);
    expect(wind.count()).toBe(0);
  });

  it("gives a place only to letters that can be seen, not past a line clamp", () => {
    const block = document.createElement("p");
    const text = document.createElement("span");
    text.textContent = "Venice Biennale";
    block.appendChild(text);
    document.body.appendChild(block);
    // The block clamps to one line; the second word wraps below it.
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => ({
      fontSize: "20px", fontWeight: "700", fontStyle: "normal", fontFamily: "serif", color: "rgb(0, 0, 0)",
      overflowX: element === block ? "hidden" : "visible", overflowY: element === block ? "hidden" : "visible",
      getPropertyValue: () => "",
    }) as unknown as CSSStyleDeclaration);
    block.getBoundingClientRect = () => new DOMRect(0, 100, 300, 26);
    text.getBoundingClientRect = () => new DOMRect(0, 100, 300, 52);
    let calls = 0;
    // jsdom lays nothing out: where each letter would be drawn, by hand.
    const had = Object.getOwnPropertyDescriptor(Range.prototype, "getBoundingClientRect");
    Range.prototype.getBoundingClientRect = () => {
      const index = calls++;
      // "Venice" on the first line, "Biennale" on the second.
      return index < 6 ? new DOMRect(index * 12, 100, 11, 26) : new DOMRect((index - 6) * 12, 126, 11, 26);
    };
    try {
      const targets = letterTargets([text], 100, 844);
      expect(targets.map((target) => target.char).join("")).toBe("Venice");
    } finally {
      if (had) Object.defineProperty(Range.prototype, "getBoundingClientRect", had);
      else delete (Range.prototype as { getBoundingClientRect?: unknown }).getBoundingClientRect;
      block.remove();
    }
  });
});

describe("the day's full arrival", () => {
  beforeEach(() => window.localStorage.clear());

  it("plays in full once a day, and a short gust after", () => {
    const morning = new Date(2026, 10, 28, 8, 0);
    expect(takeFullArrival(morning)).toBe(true);
    // React's double mount asks again at once: the same answer.
    expect(takeFullArrival(new Date(morning.getTime() + 10))).toBe(true);
    expect(takeFullArrival(new Date(morning.getTime() + 60_000))).toBe(false);
    expect(takeFullArrival(new Date(2026, 10, 29, 8, 0))).toBe(true);
  });

  it("hides the page under the wind, and nothing under reduced motion", () => {
    const stage = document.createElement("div");
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    prepareNewsWind(stage);
    expect(stage.getAttribute("data-news-wind")).toBe("gust");

    const still = document.createElement("div");
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    prepareNewsWind(still);
    expect(still.hasAttribute("data-news-wind")).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe("the comprehension scanner", () => {
  it("counts a story's key words found in the library, not its little words", () => {
    const text = "The festival opens with a new exhibition about water";
    // "festival" and "water" are kept words.
    const ranges = [{ start: 4, end: 12 }, { start: 47, end: 52 }];
    const reading = comprehension(text, "en-US", "en", ranges);
    expect(reading.total).toBe(4); // festival, opens, exhibition, water
    expect(reading.known).toBe(2);
    expect(reading.percent).toBe(50);
    expect(reading.fresh[0]).toBe("exhibition");
  });

  it("reads Chinese by the characters that carry meaning", () => {
    const reading = comprehension("台灣公布風電計畫。", "zh-TW", "zh-TW", [{ start: 0, end: 2 }]);
    expect(reading.total).toBe(8);
    expect(reading.known).toBe(2);
    expect(reading.percent).toBe(25);
  });
});

describe("the laser scan", () => {
  const rect = new DOMRect(10, 200, 60, 20);

  it("is the plain lookup where nothing draws it", () => {
    expect(requestLaserScan({ word: "swamped", rect, language: "en", meaningLanguage: "zh-TW" })).toBe(false);
    const stop = subscribeLaserScan(() => {});
    expect(requestLaserScan({ word: "swamped", rect, language: "en", meaningLanguage: "zh-TW" })).toBe(true);
    clearLaserScan();
    stop();
  });

  it("means what the reader's library says first, then the story's own word list", () => {
    const request = {
      word: "Curator",
      rect,
      language: "en" as const,
      meaningLanguage: "zh-TW" as const,
      storyWords: [{ texts: { en: "curator", "zh-TW": "策展人（本則）" }, partOfSpeech: "noun", examples: {} }],
    };
    expect(meaningNearby(request, [])).toEqual({ meaning: "策展人（本則）", partOfSpeech: "noun", source: "story" });
    const library = [{ word: "curator", word_language: "en" as const, translation: "策展人", texts: { en: "curator", "zh-TW": "策展人" }, part_of_speech: "noun" }];
    expect(meaningNearby(request, library)).toEqual({ meaning: "策展人", partOfSpeech: "noun", source: "library" });
    expect(meaningNearby({ ...request, word: "biennale", storyWords: [] }, library)).toBeNull();
  });
});

describe("the signal map", () => {
  const card = (sourceName: string, category = "world") => ({ sourceName, category }) as DailyNewsCard;

  it("places each story where its newsroom is", () => {
    expect(cityOf(card("The Guardian"))).toBe("london");
    expect(cityOf(card("Focus Taiwan", "taiwan"))).toBe("taipei");
    expect(cityOf(card("The Japan Times"))).toBe("tokyo");
    expect(cityOf(card("The Korea Herald"))).toBe("seoul");
    expect(cityOf(card("ARTnews"))).toBe("newYork");
    expect(cityOf(card("FashionUnited"))).toBe("amsterdam");
    expect(cityOf(card("Somewhere New", "japan"))).toBe("tokyo");
  });

  it("gathers today's stories by city, busiest first", () => {
    const signals = signalsOf([card("The Guardian"), card("Focus Taiwan"), card("The Guardian"), card("Vogue")]);
    expect(signals.map((signal) => [signal.city, signal.cards.length])).toEqual([["london", 2], ["taipei", 1], ["newYork", 1]]);
  });

  it("draws the front of the globe and runs arcs end to end", () => {
    expect(project(0, 0, 0, 0)).toMatchObject({ x: 0, y: -0, front: true });
    expect(project(0, 180, 0, 0).front).toBe(false);
    const arc = greatCircle({ lat: 51.51, lon: -0.13 }, { lat: 25.03, lon: 121.56 }, 10);
    expect(arc).toHaveLength(11);
    expect(arc[0].lat).toBeCloseTo(51.51, 1);
    expect(arc[10].lon).toBeCloseTo(121.56, 1);
    expect(receiverPlace("Asia/Taipei")).toEqual({ lat: 25.03, lon: 121.56 });
    expect(receiverPlace("Pacific/Nowhere", -540).lon).toBe(135);
  });
});
