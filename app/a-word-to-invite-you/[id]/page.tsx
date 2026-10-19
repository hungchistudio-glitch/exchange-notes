import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import HelloPage from "@/components/hello/HelloPage";
import { getServerInterfaceLanguage } from "@/lib/preferences/serverPreferences";
import { loadHello } from "@/lib/hello/load";
import { isLiveOrigin } from "@/lib/hello/url";
import { loadTranslations } from "@/lib/i18n";
import { fill } from "@/lib/i18n/format";

/*
 * Yumi's hello, for anyone holding the link — signed in or not.
 *
 * Outside the protected layout on purpose: a visitor reads it, hears it and
 * switches its languages before being asked for anything. Rendered on every
 * request, so a hello turned off stops showing at once, and never indexed:
 * "anyone with the link" is not "anyone searching". One that is off or was
 * never there answers 404 (./not-found.tsx says which).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [lookup, language] = await Promise.all([loadHello(id), getServerInterfaceLanguage()]);
  const t = await loadTranslations(language);
  const robots = { index: false, follow: false };

  if (lookup.status !== "active") {
    return { title: lookup.status === "revoked" ? t.hello.revokedTitle : t.hello.missingTitle, robots };
  }

  const { hello } = lookup;
  const name = hello.sender.name ?? `@${hello.sender.exchangeId}`;
  const [a, b] = hello.pair;
  const title = fill(t.hello.pageTitle, { name });
  const description = [hello.sense[a]?.text, hello.sense[b]?.text].filter(Boolean).join(" · ");

  return {
    title,
    description,
    robots,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HelloRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lookup, headerList] = await Promise.all([loadHello(id), headers()]);
  /* Off or never there: a real 404, drawn by ./not-found.tsx. */
  if (lookup.status !== "active") notFound();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  const test = !isLiveOrigin(`${protocol}://${host}`);

  return <HelloPage lookup={lookup} test={test} />;
}
