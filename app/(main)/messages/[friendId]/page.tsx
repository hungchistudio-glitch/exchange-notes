"use client";

import { useParams } from "next/navigation";

import { ChatRoom } from "@/components/messages/ChatRoomClient";

export default function MessageConversationPage() {
  const params = useParams<{ friendId: string }>();
  const friendId = params.friendId;

  if (!friendId) {
    return null;
  }

  return <ChatRoom friendId={friendId} />;
}
