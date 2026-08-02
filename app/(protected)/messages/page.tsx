"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import ConversationList from "@/components/messages/ConversationList";
import ConversationThread from "@/components/messages/ConversationThread";

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const friendId = searchParams.get("with");

  if (friendId) {
    return <ConversationThread friendId={friendId} />;
  }

  return <ConversationList />;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesPageContent />
    </Suspense>
  );
}
