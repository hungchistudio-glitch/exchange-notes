import { LANGUAGE_CODES, type LanguageCode } from "@/lib/languages";

import { englishPronunciationPack } from "./packs/en";
import { frenchPronunciationPack } from "./packs/fr";
import { italianPronunciationPack } from "./packs/it";
import { spanishPronunciationPack } from "./packs/es";
import { traditionalChinesePronunciationPack } from "./packs/zh-TW";
import type {
  MinimalPairSet,
  PronunciationCategoryGroup,
  PronunciationLanguagePack,
  PronunciationLesson,
  PronunciationModuleId,
  PronunciationUnit,
} from "./types";

/* =========================================================
   The registry

   The one place a language becomes teachable. A Record rather than a
   Partial, so adding a LanguageCode without a pack fails the build here —
   one obvious file — instead of at whichever screen first asks for it.
   ========================================================= */

export const pronunciationLanguageRegistry: Record<
  LanguageCode,
  PronunciationLanguagePack
> = {
  en: englishPronunciationPack,
  "zh-TW": traditionalChinesePronunciationPack,
  es: spanishPronunciationPack,
  fr: frenchPronunciationPack,
  it: italianPronunciationPack,
};

export function getPronunciationPack(
  language: LanguageCode,
): PronunciationLanguagePack {
  return pronunciationLanguageRegistry[language];
}

/** Every pack, in the table order of lib/languages.ts. */
export function listPronunciationPacks(): PronunciationLanguagePack[] {
  return LANGUAGE_CODES.map(getPronunciationPack);
}

/* =========================================================
   Lookups

   Built once per pack and cached by pack identity. The packs are module
   constants, so this is a per-language cost paid once for the life of the
   process rather than a scan on every render.
   ========================================================= */

const unitIndexes = new WeakMap<
  PronunciationLanguagePack,
  Map<string, PronunciationUnit>
>();

function unitIndex(pack: PronunciationLanguagePack) {
  const cached = unitIndexes.get(pack);
  if (cached) return cached;

  const index = new Map(pack.units.map((unit) => [unit.id, unit]));
  unitIndexes.set(pack, index);
  return index;
}

export function findUnit(
  pack: PronunciationLanguagePack,
  unitId: string,
): PronunciationUnit | undefined {
  return unitIndex(pack).get(unitId);
}

export function findLesson(
  pack: PronunciationLanguagePack,
  lessonId: string,
): PronunciationLesson | undefined {
  return pack.lessons.find((lesson) => lesson.id === lessonId);
}

export function findMinimalPair(
  pack: PronunciationLanguagePack,
  pairId: string,
): MinimalPairSet | undefined {
  return pack.minimalPairs.find((pair) => pair.id === pairId);
}

export function unitsInGroup(
  pack: PronunciationLanguagePack,
  groupId: string,
): PronunciationUnit[] {
  return pack.units.filter((unit) => unit.group === groupId);
}

/**
 * The groups a module should render.
 *
 * A group with no `module` belongs to Sounds — the common case, so the
 * common case is the one that needs no annotation.
 */
export function groupsForModule(
  pack: PronunciationLanguagePack,
  module: PronunciationModuleId,
): PronunciationCategoryGroup[] {
  return pack.categories.filter(
    (category) => (category.module ?? "sounds") === module,
  );
}

/** Units a module should draw from, in pack order. */
export function unitsForModule(
  pack: PronunciationLanguagePack,
  module: PronunciationModuleId,
): PronunciationUnit[] {
  const groupIds = new Set(
    groupsForModule(pack, module).map((group) => group.id),
  );
  return pack.units.filter((unit) => groupIds.has(unit.group));
}

/**
 * Whether a module has anything to show for this language.
 *
 * Asked before a module is offered, so a language whose pack has no minimal
 * pairs does not present a Listen tile that opens onto nothing.
 */
export function moduleHasContent(
  pack: PronunciationLanguagePack,
  module: PronunciationModuleId,
): boolean {
  switch (module) {
    case "sounds":
      return unitsForModule(pack, "sounds").length > 0;
    case "listen":
      return pack.minimalPairs.length > 0 || pack.units.length > 0;
    case "rhythm":
      return pack.lessons.length > 0;
    case "speak":
    case "words":
    case "review":
      // These are driven by the learner's own material and progress rather
      // than by pack content, so they exist wherever the pack does.
      return pack.units.length > 0;
  }
}
