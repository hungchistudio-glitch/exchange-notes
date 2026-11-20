"use client";

import { Flag } from "lucide-react";
import { useEffect, useState } from "react";

import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";

/**
 * The way to readers' reports, for the app's owner only (Chi, 2026-11-16:
 * 回報問題), with how many are open. Anyone else sees nothing: /api/reports
 * answers them `owner: false`.
 */
export default function ReportsOwnerRow() {
  const { t } = useTranslation();
  const copy = t.reports;
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/reports", { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { owner?: boolean; reports?: unknown[] } | null) => {
        if (body?.owner && Array.isArray(body.reports)) setOpen(body.reports.length);
      })
      .catch(() => {
        /* Offline, or left the page: nothing to say. */
      });
    return () => controller.abort();
  }, []);

  if (open === null) return null;

  return (
    <SettingsRow
      href="/reports"
      title={copy.ownerRow}
      description={fill(copy.ownerRowDescription, { count: open })}
      tone={open > 0 ? "amber" : "neutral"}
      icon={<Flag size={16} strokeWidth={1.8} />}
    />
  );
}
