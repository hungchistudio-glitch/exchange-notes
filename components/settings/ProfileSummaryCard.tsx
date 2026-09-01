"use client";

import { Pencil } from "lucide-react";

import Avatar from "@/components/foundation/media/Avatar";

type ProfileSummaryCardProps = {
  avatarUrl: string | null;
  displayName: string;
  exchangeId: string;
  email: string;
  loading: boolean;
  editLabel: string;
  onOpen: () => void;
};

/**
 * Identity, in one row of a card, and nothing else.
 *
 * Everything that used to live on the front of Settings — the camera button,
 * the remove-photo button, the QR code, the full-width Edit Profile bar — is
 * behind this card now. Not hidden: the whole card opens the same screen the
 * pencil does, so there is one target, and it is the size of the card.
 */
export default function ProfileSummaryCard({
  avatarUrl,
  displayName,
  exchangeId,
  email,
  loading,
  editLabel,
  onOpen,
}: ProfileSummaryCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={editLabel}
      className="flex w-full items-center gap-4 rounded-[18px] border border-black/[0.06] bg-white px-4 py-4 text-left transition-colors duration-100 ease-out hover:bg-black/[0.015] active:bg-black/[0.03]"
    >
      <Avatar src={avatarUrl} fallback={displayName} size="lg" />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[1.1875rem] font-bold tracking-[-0.03em] text-black">
          {displayName}
        </span>

        {exchangeId ? (
          <span className="mt-0.5 block truncate text-[0.875rem] font-semibold text-blue-600">
            @{exchangeId}
          </span>
        ) : null}

        {/*
          The address is the quietest line of the three: it identifies the
          account, but it is not what anyone came to this card to read.
        */}
        <span className="mt-0.5 block truncate text-[0.8125rem] leading-[1.125rem] text-ink-soft">
          {loading ? "" : email}
        </span>
      </span>

      {/*
        A span, not a button. It opens exactly what the card opens, and two
        controls that do the same thing would only be two things to miss.
      */}
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] text-ink-soft"
      >
        <Pencil size={15} strokeWidth={1.8} />
      </span>
    </button>
  );
}
