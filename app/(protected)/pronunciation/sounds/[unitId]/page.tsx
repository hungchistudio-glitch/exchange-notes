import SoundDetail from "@/components/pronunciation/lab/SoundDetail";

/*
 * Server component only so it can await `params` — which is a promise in
 * this version of Next — and hand the plain id to the client component that
 * needs the Lab's context.
 */
export default async function SoundDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;

  return <SoundDetail unitId={decodeURIComponent(unitId)} />;
}
