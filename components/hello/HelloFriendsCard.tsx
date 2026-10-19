"use client";

import { ArrowRight, Gift } from "lucide-react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { readRecentHello } from "@/lib/hello/recent";
import { helloPath } from "@/lib/hello/url";

const noSubscription = () => () => {};

/*
 * The friends screen's way into Yumi hellos: the reader's own list, and —
 * for someone who arrived from a hello, signed up and came back later —
 * the way back to the one they came from (lib/hello/recent.ts).
 *
 * The recent hello is read once the page is on the device (it lives in
 * localStorage), as its raw id, so the server and first client render agree.
 */
export default function HelloFriendsCard() {
  const { t } = useTranslation();
  const copy = t.hello;
  const recentKey = useSyncExternalStore(
    noSubscription,
    () => {
      const recent = readRecentHello();
      return recent ? `${recent.id}\n${recent.name}` : "";
    },
    () => "",
  );
  const recent = useMemo(() => {
    if (!recentKey) return null;
    const [id, ...name] = recentKey.split("\n");
    return { id, name: name.join("\n") };
  }, [recentKey]);

  return (
    <section className="mt-6 space-y-2">
      {recent ? (
        <Link
          href={helloPath(recent.id)}
          className="flex min-h-[56px] items-center justify-between gap-3 rounded-[24px] border border-line bg-white px-5 py-3 shadow-sm"
        >
          <span className="text-[0.9375rem] font-semibold text-black">{fill(copy.recentHello, { name: recent.name })}</span>
          <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-ink-soft" />
        </Link>
      ) : null}
      <Link
        href="/invitations"
        className="flex min-h-[56px] items-center justify-between gap-3 rounded-[24px] border border-line bg-white px-5 py-3 shadow-sm"
      >
        <span className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-black">
          <Gift size={18} aria-hidden="true" />
          {copy.manageTitle}
        </span>
        <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-ink-soft" />
      </Link>
    </section>
  );
}
