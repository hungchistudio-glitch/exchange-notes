import type { Metadata } from "next";

import { loadTranslations } from "@/lib/i18n";
import { getInterfaceLanguageMeta } from "@/lib/languages";
import { getServerInterfaceLanguage } from "@/lib/preferences/serverPreferences";

export type InfoPageKind = "about" | "community" | "privacy";

/* =========================================================
   What a link to one of these pages looks like when it leaves the app

   These three are the only routes in Exchange Notes a person can open
   without an account, which makes them the only ones that are ever pasted
   into a message, indexed, or previewed. They shipped carrying the root
   layout's metadata: every one of them titled "Exchange Notes" and
   described as a dictionary, which is neither what they are nor how anyone
   would find them.

   Read on the server from the same cookie the root layout reads, so a
   reader sharing the French page shares a French title rather than an
   English one — and so the title matches the first heading on the page
   that opens.
   ========================================================= */
export async function buildInfoMetadata(page: InfoPageKind): Promise<Metadata> {
  const language = await getServerInterfaceLanguage();
  const copy = (await loadTranslations(language)).info;

  const title = copy.nav[page];
  const description =
    page === "about" ? copy.about.tagline : copy[page].intro;

  return {
    title,
    description,
    openGraph: {
      title: `${title} · Exchange Notes`,
      description,
      locale: getInterfaceLanguageMeta(language).htmlLang,
      type: "website",
    },
  };
}
