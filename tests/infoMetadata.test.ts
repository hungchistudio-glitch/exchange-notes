import { describe, expect, it, vi } from "vitest";

import type { InterfaceLanguage } from "@/lib/appPreferences";

/* =========================================================
   What a shared link to a public page says

   /about, /community and /privacy are the only routes in this app a person
   can open without an account, which makes them the only ones that are ever
   pasted into a message or indexed. All three shipped under the root
   layout's metadata — titled "Exchange Notes", described as a dictionary —
   so three different pages previewed identically and none of them said what
   it was.
   ========================================================= */

let serverLanguage: InterfaceLanguage = "english";

vi.mock("@/lib/preferences/serverPreferences", () => ({
  getServerInterfaceLanguage: async () => serverLanguage,
}));

const { buildInfoMetadata } = await import("@/lib/info/metadata");
const { getTranslations, loadTranslations, TRANSLATION_LANGUAGES } = await import(
  "@/lib/i18n"
);

describe("metadata for the pages a signed-out reader can open", () => {
  it("titles each page as the page titles itself", async () => {
    const copy = getTranslations("english")!.info;

    for (const page of ["about", "community", "privacy"] as const) {
      const metadata = await buildInfoMetadata(page);
      expect(metadata.title).toBe(copy.nav[page]);
      expect(metadata.description).toBeTruthy();
    }
  });

  it("describes each page with its own opening line, not the app's", async () => {
    const copy = getTranslations("english")!.info;

    expect((await buildInfoMetadata("about")).description).toBe(copy.about.tagline);
    expect((await buildInfoMetadata("community")).description).toBe(copy.community.intro);
    expect((await buildInfoMetadata("privacy")).description).toBe(copy.privacy.intro);
  });

  /*
   * The same cookie the root layout reads, so a French reader shares a
   * French title and the preview matches the first heading on the page that
   * opens.
   */
  it("follows the reader's interface language", async () => {
    for (const language of TRANSLATION_LANGUAGES) {
      serverLanguage = language;
      await loadTranslations(language);

      const metadata = await buildInfoMetadata("privacy");
      expect(metadata.title).toBe(getTranslations(language)!.info.nav.privacy);
    }

    serverLanguage = "english";
  });

  it("gives the shared card a title that names the app as well as the page", async () => {
    const metadata = await buildInfoMetadata("about");
    const openGraph = metadata.openGraph as { title?: string; locale?: string };

    expect(openGraph.title).toBe(
      `${getTranslations("english")!.info.nav.about} · Exchange Notes`,
    );
    expect(openGraph.locale).toBe("en");
  });
});
