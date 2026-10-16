import InfoPage from "@/components/info/InfoPage";
import { buildInfoMetadata } from "@/lib/info/metadata";
import { loadLegalCopy } from "@/lib/legal";
import { getServerInterfaceLanguage } from "@/lib/preferences/serverPreferences";

export async function generateMetadata() {
  return buildInfoMetadata("privacy");
}

/*
 * The URL on Google's OAuth consent screen and the landing page's footer.
 * Rendered with the policy in the HTML, in the reader's language, so the
 * review that reads it and a reader on a slow phone both get the text
 * before any script runs.
 */
export default async function Page() {
  const language = await getServerInterfaceLanguage();
  const copy = await loadLegalCopy(language);
  return <InfoPage page="privacy" publicView legal={{ language, copy }} />;
}
