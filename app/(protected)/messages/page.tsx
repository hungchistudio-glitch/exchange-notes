import { redirect } from "next/navigation";

import MessagesHub from "@/components/messages/MessagesHub";

/*
 * Page A of the two-page messaging architecture: the conversation list, and
 * nothing else. Opening a conversation is a real navigation to
 * /messages/[conversationId] rather than a swap of what this route renders,
 * which is what gives the browser a history entry to go back to and the
 * conversation a screen of its own.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { with: friendId } = await searchParams;

  /*
   * The old shape of this route was /messages?with=<friendId>, and links in
   * that shape are already out in the world — inside push notifications that
   * have been delivered, and in anything a user has bookmarked. They are
   * forwarded to the conversation rather than broken.
   */
  if (typeof friendId === "string" && friendId) {
    redirect(`/messages/new?friend=${encodeURIComponent(friendId)}`);
  }

  return <MessagesHub />;
}
