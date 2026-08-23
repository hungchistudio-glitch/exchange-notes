import { describe, expect, it } from "vitest";

import {
  accuracyOf,
  applyAttempt,
  deriveMastery,
  emptyProgress,
  getCategoryMastery,
  getDueUnits,
  getLanguagePronunciationProgress,
  getRhythmProgress,
  getStarterUnits,
  getWeakUnits,
  getWeaknessMap,
  groupWeaknessByBand,
  isDue,
  lessonProgressKey,
} from "@/lib/pronunciation/lab/progress";
import { getPronunciationPack } from "@/lib/pronunciation/lab/registry";
import type {
  ProgressByUnit,
  PronunciationProgress,
} from "@/lib/pronunciation/lab/types";

const spanish = getPronunciationPack("es");

function progressFor(
  entries: Array<Partial<PronunciationProgress> & { unitId: string }>,
): ProgressByUnit {
  const map: ProgressByUnit = {};

  for (const entry of entries) {
    const base = emptyProgress("es", entry.unitId);
    const merged = { ...base, ...entry };
    map[entry.unitId] = {
      ...merged,
      mastery: deriveMastery(merged),
    };
  }

  return map;
}

describe("deriveMastery", () => {
  it("calls an untouched unit new", () => {
    expect(deriveMastery({ attempts: 0, correctAttempts: 0 })).toBe("new");
  });

  it("will not promote on one lucky answer", () => {
    expect(deriveMastery({ attempts: 1, correctAttempts: 1 })).toBe("learning");
    expect(deriveMastery({ attempts: 2, correctAttempts: 2 })).toBe("learning");
  });

  it("reads a long history of failure as learning, not improving", () => {
    expect(deriveMastery({ attempts: 10, correctAttempts: 3 })).toBe("learning");
  });

  it("calls a middling record improving", () => {
    expect(deriveMastery({ attempts: 6, correctAttempts: 4 })).toBe("improving");
  });

  it("only calls it mastered with both a record and enough of one", () => {
    expect(deriveMastery({ attempts: 5, correctAttempts: 5 })).toBe("mastered");
    // Same accuracy, not enough attempts behind it.
    expect(deriveMastery({ attempts: 4, correctAttempts: 4 })).toBe("improving");
  });
});

describe("applyAttempt", () => {
  it("counts the attempt and the outcome", () => {
    const next = applyAttempt(emptyProgress("es", "rr"), { correct: true });

    expect(next.attempts).toBe(1);
    expect(next.correctAttempts).toBe(1);
    expect(next.lastPracticedAt).toBeTruthy();
  });

  it("leaves a score alone when the attempt did not measure it", () => {
    const scored = applyAttempt(emptyProgress("es", "rr"), {
      correct: true,
      speakingScore: 80,
    });

    const unmeasured = applyAttempt(scored, { correct: true });

    // An analyzer that could not measure this attempt has not learned that
    // the learner got worse.
    expect(unmeasured.speakingScore).toBe(80);
  });

  it("blends scores rather than replacing them", () => {
    const first = applyAttempt(emptyProgress("es", "rr"), {
      correct: true,
      speakingScore: 100,
    });

    const second = applyAttempt(first, { correct: false, speakingScore: 0 });

    expect(second.speakingScore).toBeGreaterThan(0);
    expect(second.speakingScore).toBeLessThan(100);
  });

  it("never lets correct attempts exceed attempts", () => {
    let row = emptyProgress("es", "rr");
    for (let i = 0; i < 5; i += 1) row = applyAttempt(row, { correct: true });

    expect(row.correctAttempts).toBeLessThanOrEqual(row.attempts);
  });
});

describe("getLanguagePronunciationProgress", () => {
  it("reports nothing rather than zero before any practice", () => {
    const summary = getLanguagePronunciationProgress(spanish, {});

    // A 0% bar and "you have not started" look the same and mean different
    // things. This is the rule the whole progress layer exists to hold.
    expect(summary.masteredPercent).toBeNull();
    expect(summary.listening).toBeNull();
    expect(summary.speaking).toBeNull();
    expect(summary.practisedUnits).toBe(0);
    expect(summary.counts.new).toBe(spanish.units.length);
  });

  it("counts practice once there is some", () => {
    const summary = getLanguagePronunciationProgress(
      spanish,
      progressFor([
        { unitId: "rr", attempts: 6, correctAttempts: 6, speakingScore: 90 },
        { unitId: "r", attempts: 2, correctAttempts: 0 },
      ]),
    );

    expect(summary.practisedUnits).toBe(2);
    expect(summary.counts.mastered).toBe(1);
    expect(summary.counts.learning).toBe(1);
    expect(summary.speaking).toBe(90);
    expect(summary.masteredPercent).not.toBeNull();
  });
});

describe("getCategoryMastery", () => {
  it("is null until the group has been touched", () => {
    expect(getCategoryMastery(spanish, "vowels", {}).percent).toBeNull();
  });

  it("counts only units inside its own group", () => {
    const mastery = getCategoryMastery(
      spanish,
      "r-sounds",
      progressFor([{ unitId: "a", attempts: 9, correctAttempts: 9 }]),
    );

    expect(mastery.practised).toBe(0);
    expect(mastery.percent).toBeNull();
  });
});

describe("getRhythmProgress", () => {
  it("reads lesson keys, not unit keys", () => {
    const withLesson = getRhythmProgress(
      spanish,
      progressFor([
        { unitId: lessonProgressKey("word-stress"), attempts: 1, correctAttempts: 1 },
      ]),
    );

    expect(withLesson.practised).toBe(1);
    expect(withLesson.percent).not.toBeNull();
  });
});

describe("weakness", () => {
  it("ignores a unit with a single attempt behind it", () => {
    const map = getWeaknessMap(
      spanish,
      progressFor([{ unitId: "rr", attempts: 1, correctAttempts: 0 }]),
    );

    // One miss on first sight is not evidence, and a map that says
    // otherwise teaches the learner to distrust it.
    expect(map).toEqual([]);
  });

  it("bands units by their whole history", () => {
    const map = getWeaknessMap(
      spanish,
      progressFor([
        { unitId: "rr", attempts: 10, correctAttempts: 2 },
        { unitId: "r", attempts: 10, correctAttempts: 7 },
        { unitId: "a", attempts: 10, correctAttempts: 10 },
      ]),
    );

    const bands = groupWeaknessByBand(map);

    expect(bands.needsWork.map((entry) => entry.unit.id)).toEqual(["rr"]);
    expect(bands.improving.map((entry) => entry.unit.id)).toEqual(["r"]);
    expect(bands.strong.map((entry) => entry.unit.id)).toEqual(["a"]);
  });

  it("puts the weakest first", () => {
    const weak = getWeakUnits(
      spanish,
      progressFor([
        { unitId: "r", attempts: 10, correctAttempts: 5 },
        { unitId: "rr", attempts: 10, correctAttempts: 1 },
      ]),
    );

    expect(weak[0].id).toBe("rr");
  });
});

describe("review scheduling", () => {
  const DAY = 86_400_000;

  it("never calls an unpractised unit due", () => {
    expect(isDue(undefined)).toBe(false);
    expect(isDue(emptyProgress("es", "rr"))).toBe(false);
  });

  it("waits longer for a unit that is known better", () => {
    const now = new Date("2026-08-22T12:00:00Z");
    const threeDaysAgo = new Date(now.getTime() - 3 * DAY).toISOString();

    const learning = {
      ...emptyProgress("es", "r"),
      attempts: 3,
      correctAttempts: 1,
      mastery: "learning" as const,
      lastPracticedAt: threeDaysAgo,
    };

    const mastered = {
      ...emptyProgress("es", "a"),
      attempts: 9,
      correctAttempts: 9,
      mastery: "mastered" as const,
      lastPracticedAt: threeDaysAgo,
    };

    expect(isDue(learning, now)).toBe(true);
    expect(isDue(mastered, now)).toBe(false);
  });

  it("returns due units weakest first", () => {
    const now = new Date("2026-08-22T12:00:00Z");
    const longAgo = new Date(now.getTime() - 40 * DAY).toISOString();

    const due = getDueUnits(
      spanish,
      progressFor([
        { unitId: "r", attempts: 10, correctAttempts: 8, lastPracticedAt: longAgo },
        { unitId: "rr", attempts: 10, correctAttempts: 2, lastPracticedAt: longAgo },
      ]),
      now,
    );

    expect(due.map((unit) => unit.id)).toEqual(["rr", "r"]);
  });
});

describe("getStarterUnits", () => {
  it("opens on the easiest sounds, not on a rhythm rule", () => {
    const starters = getStarterUnits(spanish, 5);

    expect(starters.length).toBe(5);
    expect(starters[0].difficulty).toBeLessThanOrEqual(starters[4].difficulty);

    for (const unit of starters) {
      expect(["stress", "syllables"]).not.toContain(unit.group);
    }
  });
});

describe("accuracyOf", () => {
  it("is null with nothing to divide", () => {
    expect(accuracyOf(emptyProgress("es", "rr"))).toBeNull();
  });
});
