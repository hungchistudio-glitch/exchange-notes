import InfoPage from "@/components/info/InfoPage";
import { loadLegalCopy } from "@/lib/legal";
import { getServerInterfaceLanguage } from "@/lib/preferences/serverPreferences";

/* The signed-in copy of /terms; not indexed, for the same reason as privacy. */
export const metadata = { robots: { index: false, follow: false } };

export default async function Page() {
  const language = await getServerInterfaceLanguage();
  const copy = await loadLegalCopy(language);
  return <InfoPage page="terms" legal={{ language, copy }} />;
}
