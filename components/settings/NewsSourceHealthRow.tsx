"use client";

import { Newspaper } from "lucide-react";
import { useEffect, useState } from "react";

import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { GuardianKeyStatus } from "@/lib/news/guardianKey";

/** Where a new free Guardian key is asked for. */
const GUARDIAN_KEY_PAGE = "https://open-platform.theguardian.com/access/";

/**
 * One line, for the app's owner only, when the Guardian will not take the
 * news's key (Chi, 2026-11-15). The news carries on through the Guardian's
 * public feeds, with shorter excerpts, until a new free key is set. Anyone
 * else, and the owner while the key works, sees nothing.
 */
export default function NewsSourceHealthRow() {
  const { t } = useTranslation();
  const copy = t.settings.newsSource;
  const [status, setStatus] = useState<GuardianKeyStatus | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/news/source-health", { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { owner?: boolean; guardian?: GuardianKeyStatus } | null) => {
        if (body?.owner && body.guardian) setStatus(body.guardian);
      })
      .catch(() => {
        /* Offline, or left the page: nothing to say. */
      });
    return () => controller.abort();
  }, []);

  if (status !== "refused" && status !== "missing") return null;

  return (
    <SettingsRow
      // Out of the app, in a tab of its own: the PWA keeps its place.
      onClick={() => window.open(GUARDIAN_KEY_PAGE, "_blank", "noopener,noreferrer")}
      title={copy.rowTitle}
      description={status === "missing" ? copy.missing : copy.refused}
      value={copy.fix}
      tone="amber"
      icon={<Newspaper size={16} strokeWidth={1.8} />}
    />
  );
}
