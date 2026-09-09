/*
 * The shape of a scanned menu, shared by the API route, the AI layer and
 * every view that renders one.
 *
 * Geometry is normalised (0–1) rather than pixels, so the same document
 * renders correctly over a 390pt phone, a rotated tablet, or a downscaled
 * thumbnail — nothing downstream needs to know what size the photo was.
 */

import {
  LANGUAGE_CODES,
  pickLanguage,
  type ByLanguage,
  type LanguageCode,
} from "@/lib/languages";

export type MenuConfidence = "high" | "medium" | "low";

export type MenuRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MenuItem = {
  id: string;
  // The line exactly as printed, in the language of the list itself —
  // normalised to Traditional characters when that language is Chinese.
  sourceName: string;
  /*
   * The name in every language the scan returned, keyed by language.
   *
   * Both sides arrive, always, whatever the list was written in: a word card
   * has two sides, a review session asks in one and answers in the other, and
   * a friend receives both. A dish that arrived with only one of them was a
   * dish you could read but not learn — and scanning a Chinese menu with the
   * app set to Chinese produced exactly that.
   *
   * A map rather than a field per language because the field names were the
   * limit: englishName and chineseName could not hold a Spanish dish however
   * well the model read one.
   */
  names: ByLanguage;
  // IPA per language, without slashes, for the languages that have one.
  ipa: ByLanguage;
  sourceDescription: string;
  descriptions: ByLanguage;
  // Kept as written on the menu ("¥1,200", "12,50") rather than parsed into a
  // number: a price the user can match against the physical menu is worth
  // more than one this app can do arithmetic with.
  price: string;
  currency: string;
  region: MenuRegion;
  ocrConfidence: MenuConfidence;
  translationConfidence: MenuConfidence;
};

export type MenuSection = {
  id: string;
  sourceTitle: string;
  titles: ByLanguage;
  region: MenuRegion;
  items: MenuItem[];
};

export type MenuDocument = {
  sourceLanguage: string;
  targetLanguage: LanguageCode;
  detectedCuisine: string;
  overallConfidence: MenuConfidence;
  sections: MenuSection[];
};

/*
 * Which stage of the pipeline produced what the user is looking at. Reported
 * per stage rather than as one boolean, because a menu that read and
 * translated but could not be rebuilt is still a menu the user can order
 * from — see the partial-success rule in the spec.
 */
export type MenuStageState = "pending" | "processing" | "completed" | "failed";

export type MenuScanProgress = {
  ocr: MenuStageState;
  translation: MenuStageState;
  reconstruction: MenuStageState;
};

export type MenuAnalyzeResponse = {
  id: string;
  state: "translation_ready" | "partial" | "failed";
  progress: MenuScanProgress;
  document: MenuDocument | null;
  // Set when the image was read but no menu was found in it. Not an error —
  // pointing the camera at a wall is a thing people do.
  notMenu?: boolean;
  error?: string;
  code?: string;
};

export function countMenuItems(document: MenuDocument | null): number {
  if (!document) return 0;

  return document.sections.reduce(
    (total, section) => total + section.items.length,
    0,
  );
}

export function hasLowConfidence(item: MenuItem): boolean {
  return item.ocrConfidence === "low" || item.translationConfidence === "low";
}

/**
 * Which of the two languages leads, and which follows.
 *
 * The one the user asked for is the headline; the other is always shown
 * underneath rather than hidden, because seeing both is the point.
 */
export function itemNames(item: MenuItem, targetLanguage: LanguageCode) {
  // Whatever else the scan returned, in table order. Derived rather than
  // named, so a scan carrying three languages shows the other two instead of
  // whichever one the code happened to know about.
  const others = LANGUAGE_CODES.filter(
    (code) => code !== targetLanguage && item.names[code],
  );

  return {
    primary: item.names[targetLanguage] || item.sourceName,
    secondary: pickLanguage(item.names, others) ?? "",
    primaryDescription: item.descriptions[targetLanguage] ?? "",
  };
}

export function sectionTitle(
  section: MenuSection,
  targetLanguage: LanguageCode,
): string {
  return section.titles[targetLanguage] || section.sourceTitle;
}

/**
 * Clamps a region into the image and gives it a minimum size.
 *
 * A model that returns a zero-height box for a one-line dish name is not
 * wrong about where the dish is, only about how much room it takes; a box
 * that cannot be seen or tapped is the one failure mode worth correcting
 * before anything tries to draw it.
 */
export function normaliseRegion(region: MenuRegion): MenuRegion {
  const x = Math.min(Math.max(region.x, 0), 1);
  const y = Math.min(Math.max(region.y, 0), 1);

  return {
    x,
    y,
    width: Math.min(Math.max(region.width, 0.02), 1 - x),
    height: Math.min(Math.max(region.height, 0.012), 1 - y),
  };
}
