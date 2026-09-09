/*
 * The shell of a conversation, shown the instant the route is entered.
 *
 * Without this, a dynamic segment makes the browser wait on the server before
 * anything at all changes, and tapping a row would feel like the app had
 * stopped responding — the specific failure mode a multi-page structure has
 * to avoid to feel faster than the split-pane it replaced. See
 * node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md.
 *
 * Deliberately mute: it is scaffolding that should be gone in a frame or two,
 * so it draws the header, the column and the composer in place and nothing
 * that would flash.
 */
export default function ConversationLoading() {
  return (
    <main
      className="flex h-[100dvh] flex-col overflow-hidden"
      style={{ background: "var(--msg-page)" }}
      aria-hidden="true"
    >
      <div
        className="shrink-0 border-b"
        style={{
          background: "var(--msg-header)",
          borderColor: "var(--msg-line)",
        }}
      >
        <div
          className="mx-auto flex min-h-[68px] w-full max-w-[1100px] items-center gap-3 px-4 sm:px-8"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <span className="h-10 w-10 shrink-0" />
          <span
            className="h-10 w-10 shrink-0 rounded-full"
            style={{ background: "var(--msg-surface-soft)" }}
          />
          <span
            className="h-4 w-32 rounded-full"
            style={{ background: "var(--msg-surface-soft)" }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1" />

      <div
        className="shrink-0 border-t px-4 pb-6 pt-2.5 sm:px-8"
        style={{
          background: "var(--msg-header)",
          borderColor: "var(--msg-line)",
        }}
      >
        <div
          className="mx-auto h-[52px] w-full max-w-[1100px] rounded-[26px] border"
          style={{
            background: "var(--msg-surface)",
            borderColor: "var(--msg-line)",
          }}
        />
      </div>
    </main>
  );
}
