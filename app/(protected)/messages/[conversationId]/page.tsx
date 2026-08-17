import ConversationRoom from "@/components/messages/ConversationRoom";

/*
 * Page B: one conversation, using the whole primary workspace.
 *
 * The segment is the conversation's own id rather than the friend's, so the
 * URL names the thing on screen and the page can be opened cold — from a
 * notification, a bookmark, a reload — without first having to work out which
 * conversation a given person maps to.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  return <ConversationRoom conversationId={conversationId} />;
}
