import { isInterfaceLanguage } from "@/lib/appPreferences";
import { loadTranslations, TRANSLATION_LANGUAGES } from "@/lib/i18n";
import { getInterfaceLanguageMeta } from "@/lib/languages";
import { webManifest } from "@/lib/pwa/webManifest";

/*
 * One manifest per display language, built once at deploy. See
 * lib/pwa/webManifest.ts for why the language is in the address rather than
 * read from the cookie.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return TRANSLATION_LANGUAGES.map((language) => ({ language }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ language: string }> },
) {
  const { language } = await params;

  if (!isInterfaceLanguage(language)) {
    return new Response(null, { status: 404 });
  }

  const description = (await loadTranslations(language)).meta.appDescription;

  return Response.json(
    webManifest({
      description,
      lang: getInterfaceLanguageMeta(language).htmlLang,
    }),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
