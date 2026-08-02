"use client";

import Link from "next/link";

import Card from "@/components/foundation/cards/Card";
import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import useTranslation from "@/hooks/i18n/useTranslation";

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

  return (
    <div className="space-y-3">
      <Link href="/messages" className="block">
        <Card className="flex items-center gap-3 border border-[#cdeac4] bg-gradient-to-br from-[#f2faee] to-white p-4 transition active:scale-[0.99]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dbead6] text-[#2f6c38]">
            <ExchangeNotesMark className="h-6 w-6" surfaceColor="#dbead6" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-neutral-400">
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
            <p className="mt-0.5 truncate text-xs text-neutral-400">
              {copy.description}
            </p>
          </div>
        </Card>
      </Link>
    </div>
  );
}
