"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Card from "@/components/foundation/cards/Card";
import ExchangeNotesGlyph from "@/components/ui/ExchangeNotesGlyph";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getPendingIncomingRequestCount } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { insertValues } from "@/lib/utils";

function AddFriendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" strokeLinecap="round" />
      <path d="M18 8v6M15 11h6" strokeLinecap="round" />
    </svg>
  );
}

export default function LearningPartnerCard() {
  const { t } = useTranslation();
  const copy = t.home.community;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadPendingCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) return;

      try {
        const count = await getPendingIncomingRequestCount(supabase, user.id);
        if (!cancelled) setPendingCount(count);
      } catch {
        // Badge just stays at 0 if this fails — not worth surfacing an
        // error for a decorative count.
      }
    }

    void loadPendingCount();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      <Link href="/messages" className="block">
        <Card className="flex items-center gap-3 border border-[#cdeac4] bg-gradient-to-br from-[#f2faee] to-white p-4 transition active:scale-[0.99]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dbead6] text-[#2f6c38]">
            <ExchangeNotesGlyph className="h-6 w-6" eyeColor="#dbead6" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-ink-faint">
              {copy.partnerLabel}
            </p>

            <p className="mt-0.5 truncate text-sm font-semibold">
              {copy.partnerTagline}
            </p>
          </div>
        </Card>
      </Link>

      <Link href="/friends" className="block">
        <Card className="flex items-center gap-3 border border-line bg-white p-4 transition active:scale-[0.99]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-black">
            <AddFriendIcon />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{copy.findFriends}</p>
            <p className="mt-0.5 truncate text-xs text-ink-faint">
              {copy.description}
            </p>
          </div>

          {pendingCount > 0 && (
            <span
              aria-label={insertValues(copy.pendingRequestsBadge, {
                count: pendingCount,
              })}
              className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white"
            >
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </Card>
      </Link>
    </div>
  );
}
