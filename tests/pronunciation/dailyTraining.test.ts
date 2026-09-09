import { describe, expect, it } from "vitest";

import {
  buildDailyTraining,
  dateKeyFor,
} from "@/lib/pronunciation/lab/dailyTraining";
import { deriveMastery, emptyProgress } from "@/lib/pronunciation/lab/progress";
import { getPronunciationPack } from "@/lib/pronunciation/lab/registry";
import type { ProgressByUnit } from "@/lib/pronunciation/lab/types";
import type { VocabularyPronunciationTarget } from "@/lib/pronunciation/lab/words";

const spanish = getPronunciationPack("es");
const now = new Date("2026-08-22T09:00:00");

const word: VocabularyPronunciationTarget = {
  itemId: "item-1",
  text: "perro",
  meaning: "dog",
  unitIds: ["rr"],
  reason: "weak",
};

function weakOn(unitId: string): ProgressByUnit {
  const base = { ...emptyProgress("es", unitId), attempts: 8, correctAttempts: 1 };
  return { [unitId]: { ...base, mastery: deriveMastery(base) } };
}

describe("buildDailyTraining", () => {
  it("produces the same plan twice for the same day and progress", () => {
    const a = buildDailyTraining({ pack: spanish, progress: {}, words: [], now });
    const b = buildDailyTraining({ pack: spanish, progress: {}, words: [], now });

    // Closing the app and coming back must not reshuffle a session you are
    // halfway through, which also makes the plan testable at all.
    expect(a.items.map((item) => item.id)).toEqual(b.items.map((item) => item.id));
  });

  it("covers listening, speaking and rhythm rather than five of one thing", () => {
    const plan = buildDailyTraining({
      pack: spanish,
      progress: {},
      words: [word],
      now,
    });

    const modules = new Set(plan.items.map((item) => item.module));

    expect(modules.has("sounds")).toBe(true);
    expect(modules.has("listen")).toBe(true);
    expect(modules.has("rhythm")).toBe(true);
    expect(modules.has("speak")).toBe(true);
    expect(modules.has("words")).toBe(true);
  });

  it("leads with the sound the learner is worst at", () => {
    const plan = buildDailyTraining({
      pack: spanish,
      progress: weakOn("rr"),
      words: [],
      now,
    });

    expect(plan.items[0].targetId).toBe("rr");
  });

  it("chooses a contrast that involves what is being practised", () => {
    const plan = buildDailyTraining({
      pack: spanish,
      progress: weakOn("rr"),
      words: [],
      now,
    });

    const pair = plan.items.find((item) => item.kind === "minimal-pair");
    expect(pair?.targetId).toBe("r-rr");
  });

  it("is shorter rather than padded when there are no words saved", () => {
    const withWord = buildDailyTraining({
      pack: spanish,
      progress: {},
      words: [word],
      now,
    });

    const without = buildDailyTraining({
      pack: spanish,
      progress: {},
      words: [],
      now,
    });

    expect(withWord.items.some((item) => item.kind === "word")).toBe(true);
    expect(without.items.some((item) => item.kind === "word")).toBe(false);
    expect(without.items.length).toBe(withWord.items.length - 1);
  });

  it("keeps the estimate consistent with the items", () => {
    const plan = buildDailyTraining({
      pack: spanish,
      progress: {},
      words: [word],
      now,
    });

    expect(plan.totalSeconds).toBe(
      plan.items.reduce((sum, item) => sum + item.estimatedSeconds, 0),
    );
  });

  it("builds a plan for every language", () => {
    for (const code of ["en", "zh-TW", "es", "fr", "it"] as const) {
      const plan = buildDailyTraining({
        pack: getPronunciationPack(code),
        progress: {},
        words: [],
        now,
      });

      expect(plan.language).toBe(code);
      expect(plan.items.length).toBeGreaterThan(0);

      // Nothing from another language may end up in a plan.
      const ids = new Set(getPronunciationPack(code).units.map((unit) => unit.id));
      for (const item of plan.items) {
        if (item.kind === "sound" || item.kind === "speak") {
          expect(ids.has(item.targetId)).toBe(true);
        }
      }
    }
  });
});

describe("dateKeyFor", () => {
  it("uses the local calendar day", () => {
    expect(dateKeyFor(new Date(2026, 7, 22, 23, 30))).toBe("2026-08-22");
    expect(dateKeyFor(new Date(2026, 0, 5, 0, 5))).toBe("2026-01-05");
  });
});
