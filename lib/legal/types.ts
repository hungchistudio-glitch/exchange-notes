/*
 * The privacy policy and the terms of service, one shape for both.
 *
 * Kept out of the interface dictionaries (lib/i18n) on purpose: those ship
 * with every screen, and these are thousands of words a reader opens twice
 * a year. Each language is its own chunk, loaded by the two pages that need
 * it — see lib/legal/index.ts.
 */

export type LegalSection = {
  title: string;
  /** One paragraph per entry. */
  body?: string[];
  /** Read as a list, after the paragraphs. */
  points?: string[];
  /** Paragraphs that close the section, after the list. */
  after?: string[];
};

export type LegalDocument = {
  intro: string;
  /** The "in short" box at the top: the few things a reader most needs. */
  summaryTitle: string;
  summary: string[];
  sections: LegalSection[];
  /** Last line before the address; it ends in a colon. */
  contact: string;
};

export type LegalCopy = {
  /** "Effective {date}"; the date is LEGAL_EFFECTIVE_DATE, formatted per language. */
  effective: string;
  privacy: LegalDocument;
  terms: LegalDocument;
};
