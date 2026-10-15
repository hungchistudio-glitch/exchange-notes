import InfoPage from "@/components/info/InfoPage";
import { buildInfoMetadata } from "@/lib/info/metadata";
import { loadLegalCopy } from "@/lib/legal";
import { getServerInterfaceLanguage } from "@/lib/preferences/serverPreferences";

export async function generateMetadata() {
  return buildInfoMetadata("terms");
}

/* The terms of service, public and server-rendered like /privacy. */
export default async function Page() {
  const language = await getServerInterfaceLanguage();
  const copy = await loadLegalCopy(language);
  return <InfoPage page="terms" publicView legal={{ language, copy }} />;
}
