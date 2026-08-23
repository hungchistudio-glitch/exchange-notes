import { isLanguageCode } from "@/lib/languages";

import type { PronunciationLanguagePack } from "./types";

/* =========================================================
   Pack validation

   Hand-rolled rather than schema-driven. A pack is a module constant, not
   untrusted input — the compiler already guarantees its shape, so what is
   left to check are the things types cannot express: that ids are unique,
   that a group referenced by a unit exists, that a minimal pair points at
   units that are actually in the pack.

   Those are exactly the mistakes a new language pack makes, and they are
   worth catching at the moment the pack is written rather than when a
   screen renders an empty group. Adding a validation dependency to catch
   four rules would cost more than it saves.
   ========================================================= */

export type PackValidationIssue = {
  packLanguage: string;
  path: string;
  message: string;
};

export function validatePronunciationPack(
  pack: PronunciationLanguagePack,
): PackValidationIssue[] {
  const issues: PackValidationIssue[] = [];

  const report = (path: string, message: string) =>
    issues.push({ packLanguage: pack.language, path, message });

  if (!isLanguageCode(pack.language)) {
    report("language", `Unknown language code "${pack.language}".`);
  }

  const groupIds = new Set<string>();
  for (const category of pack.categories) {
    if (groupIds.has(category.id)) {
      report(`categories.${category.id}`, "Duplicate category id.");
    }
    groupIds.add(category.id);
  }

  const unitIds = new Set<string>();
  for (const unit of pack.units) {
    const path = `units.${unit.id}`;

    if (unitIds.has(unit.id)) report(path, "Duplicate unit id.");
    unitIds.add(unit.id);

    if (unit.language !== pack.language) {
      report(path, `Unit language "${unit.language}" does not match the pack.`);
    }
    if (!unit.symbol.trim()) {
      report(path, "Unit has no symbol to display.");
    }
    if (!groupIds.has(unit.group)) {
      report(path, `Unit is in group "${unit.group}", which the pack does not declare.`);
    }
    if (unit.examples.length === 0) {
      report(path, "Unit has no examples.");
    }
    for (const [index, example] of unit.examples.entries()) {
      if (!example.text.trim()) {
        report(`${path}.examples[${index}]`, "Example has no text.");
      }
      if (
        example.highlight &&
        !example.text.includes(example.highlight) &&
        !example.phonetic?.includes(example.highlight)
      ) {
        report(
          `${path}.examples[${index}]`,
          `Highlight "${example.highlight}" does not occur in the example.`,
        );
      }
    }
    if (unit.difficulty < 1 || unit.difficulty > 5) {
      report(path, `Difficulty ${unit.difficulty} is outside 1–5.`);
    }
  }

  const pairIds = new Set<string>();
  for (const pair of pack.minimalPairs) {
    const path = `minimalPairs.${pair.id}`;

    if (pairIds.has(pair.id)) report(path, "Duplicate minimal pair id.");
    pairIds.add(pair.id);

    if (pair.language !== pack.language) {
      report(path, `Pair language "${pair.language}" does not match the pack.`);
    }
    for (const target of pair.targets) {
      if (!unitIds.has(target)) {
        report(path, `Target "${target}" is not a unit in this pack.`);
      }
    }
    if (pair.examples.length === 0) {
      report(path, "Minimal pair has no example sets.");
    }
    for (const [index, set] of pair.examples.entries()) {
      if (set.length < 2) {
        report(`${path}.examples[${index}]`, "A contrast needs at least two words.");
      }
      for (const example of set) {
        if (!unitIds.has(example.unitId)) {
          report(
            `${path}.examples[${index}]`,
            `Example points at unit "${example.unitId}", which is not in this pack.`,
          );
        }
      }
    }
  }

  const lessonIds = new Set<string>();
  for (const lesson of pack.lessons) {
    const path = `lessons.${lesson.id}`;

    if (lessonIds.has(lesson.id)) report(path, "Duplicate lesson id.");
    lessonIds.add(lesson.id);

    if (lesson.language !== pack.language) {
      report(path, `Lesson language "${lesson.language}" does not match the pack.`);
    }
    if (lesson.phrases.length === 0) {
      report(path, "Lesson has no phrases.");
    }
    for (const phrase of lesson.phrases) {
      if (phrase.beats.length === 0) {
        report(`${path}.${phrase.id}`, "Phrase has no beats.");
      }
      for (const beat of phrase.beats) {
        if (beat.stress < 0 || beat.stress > 1) {
          report(`${path}.${phrase.id}`, `Stress ${beat.stress} is outside 0–1.`);
        }
      }
    }
  }

  return issues;
}
