export type VocabularyItem = {
  word: string;
  translation: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
};

export type DailyNewsCard = {
  id: string;
  category: string;
  englishTitle: string;
  chineseTitle: string;
  englishSummary: string;
  chineseSummary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  vocabulary: VocabularyItem[];
  imageUrl: string | null;
  englishCaption: string | null;
  chineseCaption: string | null;
};

// Categories worth illustrating — protests, cultural events, and science
// discoveries read well as photos; abstract finance/market and technology
// coverage tends to stay text-only rather than reaching for generic stock
// imagery. Selective use is deliberate: not every row should have a photo.
const IMAGE_FRIENDLY_CATEGORIES = new Set(["world", "science", "culture"]);

export function isImageFriendlyCategory(category: string): boolean {
  return IMAGE_FRIENDLY_CATEGORIES.has(category.trim().toLowerCase());
}

export type SpeechRate = 0.75 | 1 | 1.25;

export type AudioPlaybackMode = "en" | "zh";

// A page-scoped editorial palette for Discover — deliberately not folded
// into the app-wide --surface/--line CSS variables, since this is a
// one-page art direction exercise rather than a global token change.
// Three surface levels (page < card < selected-control) so depth reads
// from layering rather than shadows.
export const DISCOVER_COLORS = {
  page: "#F3F0E8",
  card: "#FBFAF6",
  text: "#151515",
  textSecondary: "#77736C",
  divider: "#E7E2D9",
  // A much quieter divider for dense editorial lists — pacing comes from
  // vertical whitespace, this line is just a faint seam, not a boundary.
  dividerSoft: "rgba(231,226,217,0.28)",
  // One signature accent for the whole experience — deep forest green,
  // used sparingly (categories, audio progress, selected micro-actions),
  // never as a default button fill.
  accent: "#244B3A",
  accentSoft: "#E7EEE9",
  selected: "#FFFFFF",
} as const;

// Only category labels use accent colors; everything else in the
// interface stays neutral. Categories without an explicit brief mapping
// fall back to DISCOVER_COLORS.accent via categoryAccent() below.
const CATEGORY_ACCENTS: Record<string, string> = {
  world: "#244B3A",
  business: "#7A3226",
  technology: "#2E4C7A",
  science: "#5C4A7A",
  culture: "#7A5A35",
  health: "#2E6B5E",
  environment: "#5B6B35",
  politics: "#55524A",
};

export function categoryAccent(category: string): string {
  const key = category.trim().toLowerCase();
  return CATEGORY_ACCENTS[key] ?? DISCOVER_COLORS.accent;
}
