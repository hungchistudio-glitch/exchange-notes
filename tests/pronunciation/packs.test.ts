import { describe, expect, it } from "vitest";

import { LANGUAGE_CODES } from "@/lib/languages";
import {
  getPronunciationPack,
  groupsForModule,
  listPronunciationPacks,
  moduleHasContent,
  unitsForModule,
} from "@/lib/pronunciation/lab/registry";
import { validatePronunciationPack } from "@/lib/pronunciation/lab/validate";

/*
 * The pack contract, checked against every language at once.
 *
 * Written as a loop over LANGUAGE_CODES rather than five copies, so adding
 * Japanese means adding a registry row and having it tested — not
 * remembering to add a sixth describe block.
 */

describe("pronunciation language packs", () => {
  it("has a pack for every language the app knows", () => {
    for (const code of LANGUAGE_CODES) {
      expect(getPronunciationPack(code)).toBeDefined();
      expect(getPronunciationPack(code).language).toBe(code);
    }
  });

  for (const pack of listPronunciationPacks()) {
    describe(pack.language, () => {
      it("passes validation", () => {
        expect(validatePronunciationPack(pack)).toEqual([]);
      });

      it("is not a placeholder", () => {
        // French and Italian are allowed to be leaner than English or
        // Chinese, but "leaner" is not "empty" — every pack has to be able
        // to teach a first session on its own.
        expect(pack.units.length).toBeGreaterThanOrEqual(15);
        expect(pack.lessons.length).toBeGreaterThanOrEqual(3);
        expect(pack.minimalPairs.length).toBeGreaterThanOrEqual(2);
      });

      it("gives every unit somewhere to be shown", () => {
        const soundUnits = unitsForModule(pack, "sounds");
        const rhythmUnits = unitsForModule(pack, "rhythm");

        expect(soundUnits.length + rhythmUnits.length).toBe(pack.units.length);
      });

      it("declares at least one group for Sounds", () => {
        expect(groupsForModule(pack, "sounds").length).toBeGreaterThan(0);
      });

      it("can offer all six modules", () => {
        for (const moduleId of [
          "sounds",
          "listen",
          "speak",
          "words",
          "rhythm",
          "review",
        ] as const) {
          expect(moduleHasContent(pack, moduleId)).toBe(true);
        }
      });

      it("gives every unit something to say out loud", () => {
        for (const unit of pack.units) {
          const speakable =
            unit.speechText ??
            unit.audio ??
            unit.examples.find((example) => example.text)?.text;

          expect(speakable, `${unit.id} has nothing playable`).toBeTruthy();
        }
      });

      it("names dimensions its own phonology cares about", () => {
        expect(pack.scoreDimensions.length).toBeGreaterThan(0);
      });
    });
  }

  it("gives each language its own Yumi instrument", () => {
    const instruments = listPronunciationPacks().map(
      (pack) => pack.yumiCalibration.instrument,
    );

    // Five languages, five different pieces of apparatus — the calibration
    // is supposed to say something about the language's phonetics, and two
    // languages sharing one would mean it does not.
    expect(new Set(instruments).size).toBe(instruments.length);
  });

  it("keeps unit ids unique within a language but free to repeat across them", () => {
    // "a" is a vowel in Spanish and in Italian, and both are correct. The
    // guarantee is per-pack, which is what makes progress rows safe to key
    // by (language, unit_id) rather than by a globally unique string.
    for (const pack of listPronunciationPacks()) {
      const ids = pack.units.map((unit) => unit.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("validatePronunciationPack", () => {
  it("catches a unit in a group the pack never declared", () => {
    const pack = getPronunciationPack("es");

    // One unit moved into a group nobody declared; everything else is left
    // alone, so any issue reported is caused by that change and not by the
    // rest of the pack having been removed with it.
    const broken = {
      ...pack,
      units: pack.units.map((unit, index) =>
        index === 0 ? { ...unit, group: "nonexistent" } : unit,
      ),
    };

    const issues = validatePronunciationPack(broken);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("nonexistent");
  });

  it("catches a minimal pair pointing at a unit that is not there", () => {
    const pack = getPronunciationPack("fr");

    const broken = {
      ...pack,
      minimalPairs: [
        { ...pack.minimalPairs[0], targets: ["not-a-unit"] },
      ],
    };

    const issues = validatePronunciationPack(broken);
    expect(issues.some((issue) => issue.message.includes("not-a-unit"))).toBe(
      true,
    );
  });

  it("catches a highlight that is not in the example it points at", () => {
    const pack = getPronunciationPack("it");

    const broken = {
      ...pack,
      units: pack.units.map((unit, index) =>
        index === 0
          ? { ...unit, examples: [{ text: "casa", highlight: "zz" }] }
          : unit,
      ),
    };

    const issues = validatePronunciationPack(broken);
    expect(issues.some((issue) => issue.message.includes("zz"))).toBe(true);
  });
});
