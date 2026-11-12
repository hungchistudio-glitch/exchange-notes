import Link from "next/link";

import FeatureMark from "@/components/features/FeatureMark";
import type { HaloCapabilityKey } from "@/lib/pet/commandHalo";

const MARKS: Record<string, HaloCapabilityKey> = {
  practice: "review",
  create: "add",
  speak: "speak",
  collect: "collect",
};

/*
 * A stand-in feature page, as slow as the real ones are on a phone, with
 * the mark Yumi's key lands on. Scan stands in for the camera: black, and
 * no title, as the real one is when the halo opens it.
 */
export default async function VocabularyYumiFeaturePage({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  await new Promise(resolve => setTimeout(resolve, 450));
  if (feature === "scan") {
    return <main className="min-h-[100dvh] bg-black" aria-label="Viewfinder" />;
  }
  const title = feature.charAt(0).toUpperCase() + feature.slice(1);
  const mark = MARKS[feature];
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-xl bg-surface px-5 pt-6 pb-28">
      <Link href="/vocabulary-yumi-review" className="text-sm text-ink-soft">‹ Vocabulary</Link>
      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink-soft">Feature</p>
      <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-semibold">
        {mark ? <FeatureMark feature={mark} /> : null}
        <span>{title}</span>
      </h1>
      <div className="mt-5 rounded-[26px] bg-black p-5 text-white">
        <p className="text-xs uppercase tracking-[0.2em] opacity-60">Today</p>
        <p className="mt-2 text-4xl font-semibold">21</p>
      </div>
      <ul className="mt-5 space-y-3">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="rounded-2xl bg-black/[0.04] p-4">
            <p className="font-medium">{title} item {index + 1}</p>
            <p className="text-sm text-ink-soft">A line of supporting text.</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
