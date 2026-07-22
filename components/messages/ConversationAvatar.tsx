"use client";

import Image from "next/image";
import type { FriendProfile } from "@/lib/friends";

type ConversationAvatarProps = {
  friend: FriendProfile;
  size?: "sm" | "md";
};

export default function ConversationAvatar({
  friend,
  size = "md",
}: ConversationAvatarProps) {
  const label = friend.displayName ?? friend.exchangeId;
  const initial = label.slice(0, 1).toUpperCase();

  const dimension = size === "sm" ? 44 : 56;

  if (friend.avatarUrl) {
    return (
      <Image
        src={friend.avatarUrl}
        alt={label}
        width={dimension}
        height={dimension}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: dimension,
        height: dimension,
      }}
      className="flex shrink-0 items-center justify-center rounded-full bg-[#ECE9E2] font-semibold text-black"
    >
      {initial}
    </div>
  );
}
