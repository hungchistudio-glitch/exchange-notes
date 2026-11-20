/* =========================================================
   Readers' reports of something wrong (Chi, 2026-11-16: 回報問題)

   A reader who finds a wrong translation, reading or clue says so where
   they found it, and the app's owner reads every report on /reports. A
   report says where it came from (`surface`), which thing it is about
   (`itemKey`: a word in its language, a news card's id, a game word), what
   the reader was looking at (`quoted`) and, if they like, what is wrong
   with it (`note`).

   Stored by the server only (public.content_reports, service role); the
   reader can send, never read back, so nobody sees another reader's notes.
   ========================================================= */

export const REPORT_SURFACES = ["word", "news", "game", "lab"] as const;
export type ReportSurface = (typeof REPORT_SURFACES)[number];

/** Reports one reader may send in a day: plenty for a careful reader, too few to flood. */
export const DAILY_REPORT_LIMIT = 30;

export const REPORT_LIMITS = { itemKey: 200, language: 10, quoted: 500, note: 1000, page: 300 } as const;

export type ContentReportInput = {
  surface: ReportSurface;
  itemKey: string;
  language: string | null;
  quoted: string;
  note: string;
  page: string;
};

export type ContentReport = ContentReportInput & {
  id: string;
  createdAt: string;
  resolvedAt: string | null;
};

function clipped(value: unknown, limit: number): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

/** A report from a request body, or null when it is not one. */
export function parseReport(body: unknown): ContentReportInput | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const surface = raw.surface;
  if (typeof surface !== "string" || !(REPORT_SURFACES as readonly string[]).includes(surface)) return null;

  const itemKey = clipped(raw.itemKey, REPORT_LIMITS.itemKey);
  if (!itemKey) return null;

  const language = clipped(raw.language, REPORT_LIMITS.language);
  return {
    surface: surface as ReportSurface,
    itemKey,
    language: /^[a-z]{2}(?:-[A-Za-z]{2,4})?$/.test(language) ? language : null,
    quoted: clipped(raw.quoted, REPORT_LIMITS.quoted),
    note: clipped(raw.note, REPORT_LIMITS.note),
    // Only the path: never a query string, which may carry something private.
    page: clipped(typeof raw.page === "string" ? raw.page.split(/[?#]/)[0] : "", REPORT_LIMITS.page),
  };
}

/** Whether this user is the app's owner (NEWS_OWNER_USER_ID); fails closed. */
export function isAppOwner(userId: string | null | undefined): boolean {
  const owner = process.env.NEWS_OWNER_USER_ID?.trim();
  return Boolean(owner && userId && owner === userId);
}
