"use client";

import type { FriendProfile } from "@/lib/friends";
import ConversationAvatar from "@/components/messages/ConversationAvatar";

type Props = {
  friend: FriendProfile;
};

function languageName(language: FriendProfile["nativeLanguage"]) {
  return language === "english" ? "English" : "繁體中文";
}

export default function ConversationCard({ friend }: Props) {
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
    </div>
  );
}
