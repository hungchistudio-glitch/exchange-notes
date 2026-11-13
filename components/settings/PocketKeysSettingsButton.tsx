"use client";

import { KeyRound } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import { insideIphoneApp } from "@/lib/pocket/device";

type PocketKey = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
};

const subscribeNever = () => () => {};

async function fetchKeys(): Promise<PocketKey[]> {
  const response = await fetch("/api/pocket/key", { cache: "no-store" });
  if (!response.ok) throw new Error(String(response.status));
  const data = (await response.json()) as { keys?: PocketKey[] };
  return data.keys ?? [];
}

/**
 * Settings → Devices: Yumi Pocket Lookup's share keys (Chi, 2026-11-12:
 * 專用小鑰匙, revocable in Settings). Each iPhone the app is opened on gets
 * one (lib/pocket/device.ts); this lists those in force and revokes any of
 * them, which stops it at once (/api/pocket/key).
 *
 * Shown inside the iPhone app, and anywhere once a key exists (so a lost
 * phone's key can be revoked from the laptop); a reader who has never
 * opened the app on an iPhone is not shown a row about it.
 */
export default function PocketKeysSettingsButton() {
  const { t, locale } = useTranslation();
  const copy = t.settings.pocketKeys;
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<PocketKey[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const inApp = useSyncExternalStore(subscribeNever, insideIphoneApp, () => false);

  function load() {
    return fetchKeys().then(
      (next) => {
        setKeys(next);
        setFailed(false);
      },
      () => setFailed(true),
    );
  }

  useEffect(() => {
    let active = true;
    fetchKeys().then(
      (next) => {
        if (active) setKeys(next);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  async function revoke(id: string) {
    setRevoking(id);
    try {
      const response = await fetch(`/api/pocket/key?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(String(response.status));
      setKeys((current) => (current ?? []).filter((key) => key.id !== id));
    } catch {
      setFailed(true);
    } finally {
      setRevoking(null);
    }
  }

  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));

  const count = keys?.length ?? 0;

  if (!inApp && count === 0) return null;

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        icon={<KeyRound size={16} strokeWidth={1.8} />}
        tone={count > 0 ? "emerald" : "neutral"}
        value={keys === null ? "" : count > 0 ? copy.count.replace("{count}", String(count)) : copy.none}
        onClick={() => {
          setOpen(true);
          void load();
        }}
      />

      <BottomSheet open={open} onClose={() => setOpen(false)} title={copy.sheetTitle}>
        <div className="space-y-4">
          <p className="text-sm leading-6 text-ink-soft">{copy.intro}</p>

          {failed ? (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {copy.failed}
            </p>
          ) : null}

          {keys && keys.length === 0 ? (
            <p className="rounded-[20px] border border-black/[0.06] p-4 text-sm leading-6 text-ink-soft">{copy.empty}</p>
          ) : null}

          {keys && keys.length > 0 ? (
            <ul className="overflow-hidden rounded-[24px] border border-black/[0.06] bg-white">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-3.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-strong">{key.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-ink-soft">
                      {copy.created.replace("{date}", date(key.created_at))}
                      {" · "}
                      {key.last_used_at ? copy.lastUsed.replace("{date}", date(key.last_used_at)) : copy.neverUsed}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={revoking === key.id}
                    onClick={() => void revoke(key.id)}
                    className="min-h-[44px] shrink-0 rounded-full border border-black/[0.1] px-4 text-sm font-semibold text-ink-strong disabled:opacity-50"
                  >
                    {revoking === key.id ? copy.revoking : copy.revoke}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="text-xs leading-5 text-ink-faint">{copy.revokeNote}</p>
        </div>
      </BottomSheet>
    </>
  );
}
