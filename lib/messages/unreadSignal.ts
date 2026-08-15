/**
 * A same-tab signal that a conversation has just been marked read.
 *
 * The nav badge learns about reads from a Realtime subscription on
 * `conversation_members`, which is correct but not sufficient on its own: it
 * depends on that table being in the `supabase_realtime` publication, and it
 * costs a round trip before the badge reacts to something the user did right
 * here. When the publication was missing the table the badge could only ever
 * count up, so the dot never cleared.
 *
 * This closes both gaps. The tab that performed the read says so immediately,
 * and Realtime remains the path for reads that happen on another device.
 */
const CONVERSATION_READ_EVENT = "exchange-notes:conversation-read";

export function notifyConversationRead(conversationId: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<string>(CONVERSATION_READ_EVENT, {
      detail: conversationId,
    }),
  );
}

export function subscribeToConversationRead(
  listener: (conversationId: string) => void,
) {
  if (typeof window === "undefined") return () => undefined;

  function handle(event: Event) {
    listener((event as CustomEvent<string>).detail);
  }

  window.addEventListener(CONVERSATION_READ_EVENT, handle);
  return () => window.removeEventListener(CONVERSATION_READ_EVENT, handle);
}
