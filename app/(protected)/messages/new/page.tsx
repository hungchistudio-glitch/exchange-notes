import { redirect } from "next/navigation";

import {
  areFriends,
  getOrCreateConversationWithFriend,
  unhideConversationForUser,
} from "@/lib/friends";
import { requireUser } from "@/lib/auth/currentUser";
import { createClient } from "@/lib/supabase/server";

/*
 * The bridge between "a person" and "a conversation".
 *
 * Conversations are created lazily, so a friend you have never written to has
 * no id to route to yet. Rather than teaching every entry point — the Friends
 * tab, the friends page, the capture flow, the vocabulary share picker — how
 * to create one and then navigate, they all point here and this resolves it
 * server-side and redirects to the real conversation URL.
 *
 * The redirect replaces this route in the history stack, so pressing back
 * from the conversation lands on the list rather than bouncing through here
 * and straight forward again.
 */
export default async function NewConversationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { friend } = await searchParams;

  if (typeof friend !== "string" || !friend) {
    redirect("/messages");
  }

  const supabase = await createClient();

  // The protected layout has already turned away an unauthenticated visitor;
  // this is only here so the call below has a non-null id. It classifies the
  // answer the same way the layout does, so a route that cannot reach the auth
  // server fails the same way everywhere rather than signing someone out here
  // and not there.
  const user = await requireUser(supabase);

  /*
   * This route creates a row, and its only input is a user id from the URL.
   * Every legitimate entry point sends someone you are already friends with,
   * so anything else is a hand-typed URL and gets sent back to the list
   * rather than quietly opening a channel to a stranger.
   */
  if (!(await areFriends(supabase, user.id, friend))) {
    redirect("/messages");
  }

  const conversationId = await getOrCreateConversationWithFriend(
    supabase,
    user.id,
    friend,
  );

  /*
   * Writing to someone you had archived is an unarchiving act. Leaving it
   * hidden would open a conversation that does not appear anywhere in the
   * list you just came from.
   */
  await unhideConversationForUser(supabase, user.id, conversationId).catch(
    (error) => {
      console.warn("Could not unarchive this conversation:", error);
    },
  );

  redirect(`/messages/${conversationId}`);
}
