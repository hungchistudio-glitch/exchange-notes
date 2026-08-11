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
  page: "var(--discover-page)",
  card: "var(--discover-card)",
  text: "var(--discover-text)",
  textSecondary: "var(--discover-text-secondary)",
  divider: "var(--discover-divider)",
  // A much quieter divider for dense editorial lists — pacing comes from
  // vertical whitespace, this line is just a faint seam, not a boundary.
  dividerSoft: "var(--discover-divider-soft)",
  // One signature accent for the whole experience — deep forest green,
  // used sparingly (categories, audio progress, selected micro-actions),
  // never as a default button fill.
  accent: "var(--discover-accent)",
  accentSoft: "var(--discover-accent-soft)",
  selected: "var(--discover-selected)",
  // Text sitting on top of an accent fill. Named rather than hard-coded to
  // white because the accent is not always dark — see app/cosmic.css.
  onAccent: "var(--discover-on-accent)",
} as const;

// Only category labels use accent colors; everything else in the
// interface stays neutral. Categories without an explicit brief mapping
// fall back to DISCOVER_COLORS.accent via categoryAccent() below.
const CATEGORY_ACCENTS: Record<string, string> = {
  world: "var(--discover-accent)",
  business: "var(--discover-category-business)",
  technology: "var(--discover-category-technology)",
  science: "var(--discover-category-science)",
  culture: "var(--discover-category-culture)",
  health: "var(--discover-category-health)",
  environment: "var(--discover-category-environment)",
  politics: "var(--discover-category-politics)",
};

export function categoryAccent(category: string): string {
  const key = category.trim().toLowerCase();
  return CATEGORY_ACCENTS[key] ?? DISCOVER_COLORS.accent;
}
