"use client";

import type { FriendProfile } from "@/lib/friends";
import ConversationAvatar from "@/components/messages/ConversationAvatar";
import useTranslation from "@/hooks/i18n/useTranslation";

type Props = {
  friend: FriendProfile;
  unreadCount?: number;
};

export default function ConversationCard({
  friend,
  unreadCount = 0,
}: Props) {
  const { t } = useTranslation();

  function languageName(language: FriendProfile["nativeLanguage"]) {
    return language === "english"
      ? t.messages.english
      : t.messages.traditionalChinese;
  }

  return (
    <div className="flex items-center gap-4 rounded-3xl border border-black/[0.06] bg-white px-5 py-4 shadow-sm transition hover:shadow-md">
      <ConversationAvatar friend={friend} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[16px] font-semibold text-black">
          {friend.displayName ?? friend.exchangeId}
        </h3>

        <p className="truncate text-sm text-neutral-500">
          @{friend.exchangeId}
        </p>

        <p className="mt-1 text-xs text-neutral-400">
          {languageName(friend.nativeLanguage)}
          {" → "}
          {languageName(friend.learningLanguage)}
        </p>
      </div>

      {unreadCount > 0 && (
        <span
          aria-label={`${unreadCount} unread messages`}
          className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-black px-1.5 text-[11px] font-semibold tabular-nums text-white"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </div>
  );
}
