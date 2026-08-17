import ArchivedConversations from "@/components/messages/ArchivedConversations";

/*
 * Archive is its own screen rather than a section that expands inside the
 * main list — putting a conversation away should actually take it out of the
 * place you go to find conversations.
 */
export default function ArchivedMessagesPage() {
  return <ArchivedConversations />;
}
