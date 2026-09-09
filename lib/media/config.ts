/* =========================================================
   Every number the media pipeline is allowed to have an opinion about

   Before this file the same decisions lived in four places and disagreed:
   the capture screen resized to 1280, the search sheet's shared helper to
   1280 for preview and 768 for the model, and the menu camera to 1800 at
   quality 0.92 — with a comment explaining, correctly, that a menu is 9pt
   type and every pixel dropped comes back as a wrong price.

   That comment is the reason this is a table rather than a constant. The
   right size depends on what is being read, so each reader names its own
   profile here and nowhere else. A number that appears in a component is a
   bug; a number that appears here has a sentence next to it saying why.
   ========================================================= */

/**
 * The long edge of the copy that is kept forever.
 *
 * The spec's range is 2048–2560. The lower end is the choice: the retained
 * source exists to be re-read by a better model later and to regenerate
 * crops, not to be looked at directly, and 2048 already carries more detail
 * than the 1280 that has been shipping. Going to 2560 would cost about 55%
 * more bytes per word for detail nothing currently reads.
 */
export const SOURCE_MAX_EDGE = 2048;

/**
 * The card image shown above a saved word.
 *
 * 16:9 at 1200 wide, which is two-times a 600pt phone card and therefore
 * sharp on every display this app runs on without being sharp for nobody.
 */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 675;

/** 16/9, derived rather than written twice. */
export const CARD_ASPECT = CARD_WIDTH / CARD_HEIGHT;

/**
 * The narrowest a card image may be generated.
 *
 * CARD_WIDTH is a ceiling, not a target: a target crop of 300 pixels drawn
 * into a 1200-wide card is a 4x enlargement, which is three parts artefact
 * to one part word. The card is generated at the crop's own scale instead,
 * and only comes up to this floor — below roughly 480 the container starts
 * looking broken rather than soft, and that is the one place a small crop
 * is deliberately enlarged.
 */
export const MIN_CARD_WIDTH = 480;

/**
 * How much context is kept around a recognised target.
 *
 * The spec's range is 15–25%. 18% is inside it and was chosen at the low
 * end deliberately: the padding exists so accents, descenders and a sign's
 * border are not shaved off, not to reframe the shot. Expressed as a
 * fraction of the target's own size, so a small target gets a small margin.
 */
export const TARGET_PADDING = 0.18;

/**
 * The target when nobody has chosen one.
 *
 * The middle of the frame, and roughly 16:9 so the commonest case needs no
 * blurred extension. Three screens want this — the camera before the first
 * tap, the imported-photo viewer, and the search sheet, which has no target
 * UI at all — and three copies of it would be three slightly different
 * middles.
 */
export const DEFAULT_TARGET_RECT = {
  x: 0.5 - 0.32,
  y: 0.5 - 0.18,
  width: 0.64,
  height: 0.36,
} as const;

/**
 * The smallest a target may be, normalised.
 *
 * A crop below this is either a mis-tap or a detector artefact, and blowing
 * six percent of a photo up to 1200px wide produces a card that is mostly
 * compression noise.
 */
export const MIN_TARGET_SIZE = 0.06;

/**
 * How much of the target may be trimmed to fill the card frame before the
 * crop is fitted inside it instead.
 *
 * The spec is explicit that the target must never be cut merely to satisfy
 * the layout. This is the tolerance for "not really cutting it": a crop
 * within 12% of 16:9 fills the frame, and anything further off — a tall
 * bottle, a narrow street sign — is fitted whole against a blurred
 * extension of itself.
 */
export const CARD_COVER_TOLERANCE = 0.12;

/**
 * What a picked file may weigh before it is refused.
 *
 * Unchanged from lib/lexicon/imageRecognition, which this replaces: the
 * limit is about refusing a 40MB screenshot cheaply, and that has not
 * changed.
 */
export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Byte budgets, as targets rather than as limits.
 *
 * The quality ladder stops descending once it is under the budget, and
 * stops descending at MIN_QUALITY whether or not it got there. The spec is
 * clear about which way that trade goes: a card that is 200KB over budget
 * is a bill, a card whose text has been compressed into mush is a lost
 * word.
 */
export const SOURCE_MAX_BYTES = 1_600_000;
export const CARD_MAX_BYTES = 320_000;

/**
 * The quality ladder for adaptive compression.
 *
 * Descending, tried in order, stopping at the first rung under budget. The
 * floor is 0.62 rather than something lower because below roughly 0.6 JPEG
 * and WebP both start eating the thin strokes that OCR and a reader's eye
 * need most.
 */
export const QUALITY_LADDER = [0.86, 0.78, 0.7, 0.62] as const;
export const MIN_QUALITY = QUALITY_LADDER[QUALITY_LADDER.length - 1];

/**
 * What the retained source and the card are written as.
 *
 * WebP rather than the HEIC the spec would prefer, and not by preference:
 * a browser canvas can only encode jpeg, png and webp — `toBlob` with an
 * image/heic type silently hands back a PNG. WebP is supported by every
 * browser this app targets and is roughly 25-30% smaller than JPEG at
 * matched quality, so it is the best of what is actually available.
 *
 * The JPEG fallback is real, not defensive dressing: it is what a browser
 * that refuses the WebP encode returns, and it is detected by reading the
 * blob's own type rather than by trusting the request.
 */
export const PREFERRED_FORMAT = "image/webp";
export const FALLBACK_FORMAT = "image/jpeg";

/**
 * The version stamped onto every asset this pipeline writes.
 *
 * Recorded on the row so a future change of policy can find the assets
 * written under the old one and decide what to do about them — without
 * which the only options are migrating every image or migrating none.
 */
export const COMPRESSION_VERSION = 1;

/* ---------- what each reader is sent ---------- */

/**
 * The long edge of the copy that goes to the model, per kind of reading.
 *
 * These are separate from the retained source on purpose. The source is
 * kept for the future; these are what a particular model needs today, and
 * they move when the model does.
 */
export const RECOGNITION_EDGE = {
  /**
   * A single object, nearest the centre.
   *
   * Gemini bills images as 768x768 tiles, so 768 is one tile and 1280 is
   * four. Naming the object in the middle of a frame does not need the
   * other three.
   */
  object: 768,

  /**
   * A page of a menu.
   *
   * 1800, carried over unchanged from the menu camera along with its
   * reasoning: a menu is 9pt type photographed from a metre away, and this
   * is the single biggest lever on whether the prices come back right.
   */
  document: 1800,
} as const;

export type RecognitionKind = keyof typeof RECOGNITION_EDGE;

/**
 * Quality for the copy sent to a model, which is not kept.
 *
 * Higher than anything on the storage ladder because it is paid for once,
 * in one request, and never stored — there is no reason to economise on an
 * image that exists for four seconds.
 */
export const RECOGNITION_QUALITY = 0.92;
