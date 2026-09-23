import InfoPage from "@/components/info/InfoPage";
import { buildInfoMetadata } from "@/lib/info/metadata";

export async function generateMetadata() {
  return buildInfoMetadata("privacy");
}

export default function Page() {
  return <InfoPage page="privacy" publicView />;
}
