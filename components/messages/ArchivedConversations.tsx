"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Undo2 } from "lucide-react";

import ConversationRow from "@/components/messages/ConversationRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  listConversationSummaries,
  unhideConversationForUser,
  type ConversationSummary,
} from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";

/*
 * /messages/archived. Its own screen rather than a section that unfolds
 * inside the main list, so putting a conversation away actually removes it
 * from the place you look for conversations.
 */
export default function ArchivedConversations() {
  const { t } = useTranslation();
  const copy = t.messages;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted || !session?.user) return;
      setCurrentUserId(session.user.id);

      try {
        const rows = await listConversationSummaries(
          supabase,
          session.user.id,
          "archived",
        );
        if (isMounted) setSummaries(rows);
      } catch (error) {
        if (isMounted) {
          console.error(error);
          setErrorMessage(copy.errors.loadConversations);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [copy.errors.loadConversations]);

  async function handleUnarchive(summary: ConversationSummary) {
    if (!currentUserId || !summary.conversationId) return;

    const conversationId = summary.conversationId;
    setPendingId(summary.friend.id);
    const previous = summaries;

    setSummaries((current) =>
      current.filter((row) => row.friend.id !== summary.friend.id),
    );

    try {
      const supabase = createClient();
      await unhideConversationForUser(supabase, currentUserId, conversationId);
    } catch (error) {
      setSummaries(previous);
      console.error(error);
      setErrorMessage(copy.errors.updateConversation);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main
      className="min-h-[100dvh] px-4 pb-32 pt-6 sm:px-6"
      style={{ background: "var(--msg-page)", color: "var(--msg-ink)" }}
    >
      <div className="mx-auto w-full max-w-[720px] lg:max-w-[900px]">
        <div style={{ paddingTop: "env(safe-area-inset-top)" }} />

        <div className="flex items-center gap-3">
          <Link
            href="/messages"
            aria-label={copy.hub.backToMessages}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
            style={{
              background: "var(--msg-surface)",
              borderColor: "var(--msg-line)",
            }}
          >
            <ArrowLeft size={18} strokeWidth={1.9} />
          </Link>

          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-[-0.02em]">
              {copy.hub.archivedTitle}
            </h1>
            <p className="text-[13px]" style={{ color: "var(--msg-ink-soft)" }}>
              {copy.hub.archivedSubtitle}
            </p>
          </div>
        </div>

        {loading && (
          <p
            className="mt-12 text-center text-sm"
            style={{ color: "var(--msg-ink-soft)" }}
          >
            {copy.loadingConversations}
          </p>
        )}

        {!loading && errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-500"
          >
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && summaries.length === 0 && (
          <p
            className="mt-12 text-center text-sm"
            style={{ color: "var(--msg-ink-soft)" }}
          >
            {copy.hub.archivedEmpty}
          </p>
        )}

        {!loading && summaries.length > 0 && (
          <div className="mt-6 space-y-2.5">
            {summaries.map((summary) => (
              <div key={summary.friend.id} className="flex items-stretch gap-2">
                <div className="min-w-0 flex-1">
                  <ConversationRow
                    summary={summary}
                    href={`/messages/${summary.conversationId}`}
                    currentUserId={currentUserId}
                    copy={copy}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleUnarchive(summary)}
                  disabled={pendingId === summary.friend.id}
                  aria-label={copy.hub.unarchive}
                  title={copy.hub.unarchive}
                  className="flex w-14 shrink-0 items-center justify-center rounded-[20px] border disabled:opacity-50"
                  style={{
                    background: "var(--msg-surface)",
                    borderColor: "var(--msg-line)",
                    color: "var(--msg-accent)",
                  }}
                >
                  <Undo2 size={19} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
