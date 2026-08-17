"use client";

import Link from "next/link";
import { BellOff } from "lucide-react";

import { formatConversationTime } from "@/lib/messages/format";
import { decodeWordCardMessage } from "@/lib/messages/wordCard";
import type { ConversationSummary } from "@/lib/friends";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { insertValues } from "@/lib/utils";

type MessagesCopy = TranslationDictionary["messages"];

/*
 * One conversation, at the size the redesign asks for: 76–92px tall on a
 * phone and 88–104px on a desktop, with three lines of room rather than two.
 *
 * The old sidebar row was compressed so more of them would fit beside a
 * thread. Nothing sits beside this list any more, so the constraint is gone
 * and comfort wins — this page is for choosing a person, and there is no
 * reward for showing eleven of them above the fold instead of eight.
 */

function previewText(
  summary: ConversationSummary,
  currentUserId: string | null,
  copy: MessagesCopy,
): string {
  const { lastMessage } = summary;
  if (!lastMessage) return copy.hub.neverMessaged;

  const prefix =
    currentUserId && lastMessage.senderId === currentUserId
      ? copy.youPrefix
      : "";

  if (lastMessage.attachmentType === "image") {
    return `${prefix}${copy.attachmentLabel}`;
  }

  if (lastMessage.attachmentType === "voice") {
    return `${prefix}${copy.voiceLabel}`;
  }

  const wordCard = decodeWordCardMessage(lastMessage.body);
  if (wordCard) {
    return `${prefix}${wordCard.word}`;
  }

  return `${prefix}${lastMessage.body}`;
}

type ConversationRowProps = {
  summary: ConversationSummary;
  href: string;
  currentUserId: string | null;
  copy: MessagesCopy;
  onOpen?: () => void;
  /*
   * Replaces the latest-message line. Search results use it to show the line
   * that actually matched, which is rarely the newest one.
   */
  previewOverride?: string;
};

export default function ConversationRow({
  summary,
  href,
  currentUserId,
  copy,
  onOpen,
  previewOverride,
}: ConversationRowProps) {
  const name = summary.friend.displayName ?? summary.friend.exchangeId;
  const initial = name.charAt(0).toUpperCase();
  const hasUnread = summary.unreadCount > 0;
  const isMuted = Boolean(summary.mutedAt);
  const phraseCount = summary.learningSignalCount;

  return (
    <Link
      href={href}
      onClick={onOpen}
      aria-label={insertValues(copy.hub.openConversation, { name })}
      className="flex min-h-[76px] items-center gap-3.5 rounded-[20px] border px-4 py-3.5 transition-colors sm:min-h-[88px] sm:gap-4 sm:px-5"
      style={{
        background: hasUnread
          ? "var(--msg-accent-soft)"
          : "var(--msg-surface)",
        borderColor: hasUnread ? "var(--msg-accent)" : "var(--msg-line)",
        boxShadow: hasUnread ? "var(--msg-glow)" : undefined,
      }}
    >
      <span className="relative shrink-0">
        {summary.friend.avatarUrl ? (
          <img
            src={summary.friend.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full object-cover sm:h-[52px] sm:w-[52px]"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold sm:h-[52px] sm:w-[52px]"
            style={{
              background: "var(--msg-surface-soft)",
              color: "var(--msg-ink)",
              border: "1px solid var(--msg-line)",
            }}
          >
            {initial}
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className={`truncate text-[15px] tracking-[-0.01em] sm:text-base ${
                hasUnread ? "font-bold" : "font-semibold"
              }`}
              style={{ color: "var(--msg-ink)" }}
            >
              {name}
            </span>
            {isMuted && (
              <BellOff
                size={12}
                strokeWidth={2}
                aria-label={copy.muted}
                className="shrink-0"
                style={{ color: "var(--msg-ink-faint)" }}
              />
            )}
          </span>

          {summary.lastMessage && (
            <time
              dateTime={summary.lastMessage.createdAt}
              className="shrink-0 text-[11px]"
              style={{ color: "var(--msg-ink-faint)" }}
            >
              {formatConversationTime(summary.lastMessage.createdAt)}
            </time>
          )}
        </span>

        <span
          className="mt-0.5 block truncate text-[12px]"
          style={{ color: "var(--msg-ink-faint)" }}
        >
          @{summary.friend.exchangeId}
        </span>

        <span className="mt-1 flex items-center justify-between gap-2">
          <span
            className="min-w-0 flex-1 truncate text-[13px] sm:text-sm"
            style={{
              color: hasUnread ? "var(--msg-ink)" : "var(--msg-ink-soft)",
            }}
          >
            {previewOverride ?? previewText(summary, currentUserId, copy)}
          </span>

          <span className="flex shrink-0 items-center gap-1.5">
            {phraseCount > 0 && !hasUnread && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  background: "var(--msg-accent-soft)",
                  color: "var(--msg-accent)",
                  border: "1px solid var(--msg-line)",
                }}
              >
                {insertValues(
                  phraseCount === 1
                    ? copy.hub.phraseSignal
                    : copy.hub.phraseSignalPlural,
                  { count: String(phraseCount) },
                )}
              </span>
            )}

            {hasUnread && (
              <span
                aria-label={insertValues(copy.hub.unreadLabel, {
                  count: String(summary.unreadCount),
                })}
                className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
                style={{
                  background: "var(--msg-accent)",
                  color: "var(--msg-accent-ink)",
                }}
              >
                {summary.unreadCount}
              </span>
            )}
          </span>
        </span>
      </span>
    </Link>
  );
}
