import InfoPage from "@/components/info/InfoPage";
import { loadLegalCopy } from "@/lib/legal";
import { getServerInterfaceLanguage } from "@/lib/preferences/serverPreferences";

/*
 * The signed-in copy of a page that also exists at /privacy. Same words, and
 * deliberately not indexed: the public route is the one a search engine
 * should find, and this one is behind a session it can never hold.
 */
export const metadata = { robots: { index: false, follow: false } };

export default async function Page() {
  const language = await getServerInterfaceLanguage();
  const copy = await loadLegalCopy(language);
  return <InfoPage page="privacy" legal={{ language, copy }} />;
}
