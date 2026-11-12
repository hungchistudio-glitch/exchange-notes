import PocketLookup from "@/components/pocket/PocketLookup";

/*
 * Yumi Pocket Lookup (Chi, 2026-11-12): the screen the iPhone widget opens.
 * `input=voice` opens straight onto listening; `widgetNonce` makes a second
 * tap on the widget a fresh lookup rather than the last one's result.
 */
export default async function LookupPage({
  searchParams,
}: {
  searchParams: Promise<{ input?: string; widgetNonce?: string }>;
}) {
  const params = await searchParams;
  return (
    <PocketLookup
      key={params.widgetNonce ?? "lookup"}
      inputMode={params.input === "voice" ? "voice" : "text"}
    />
  );
}
