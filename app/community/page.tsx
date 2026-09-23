import InfoPage from "@/components/info/InfoPage";
import { buildInfoMetadata } from "@/lib/info/metadata";

export async function generateMetadata() {
  return buildInfoMetadata("community");
}

export default function Page() {
  return <InfoPage page="community" publicView />;
}
