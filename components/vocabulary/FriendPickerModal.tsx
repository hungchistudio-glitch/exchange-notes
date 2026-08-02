"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { FriendProfile } from "@/lib/friends";

type FriendPickerModalProps = {
  friends: FriendProfile[];
  loading: boolean;
  errorMessage: string;
  sendingFriendId: string | null;
  onClose: () => void;
  onPick: (friendId: string) => void;
  onRetry: () => void;
};

export default function FriendPickerModal({
  friends,
  loading,
  errorMessage,
  sendingFriendId,
  onClose,
  onPick,
  onRetry,
}: FriendPickerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-to-partner-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={`flex w-full max-w-xl flex-col rounded-t-[28px] border border-white/40 bg-white/75 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out sm:rounded-[28px] ${
          mounted
            ? "translate-y-0"
            : "translate-y-full sm:translate-y-4 sm:opacity-0"
        }`}
        style={{
          maxHeight: "min(78vh, 640px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
        }}
      >
        <div className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-black/15 sm:hidden" />

        <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-3">
          <h2
            id="send-to-partner-title"
            className="text-base font-semibold tracking-tight text-black/90"
          >
            傳送給夥伴
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-black/50 transition-colors hover:bg-black/5 hover:text-black"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-2">
          {loading && (
            <div className="space-y-1.5 px-2 py-2">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="flex animate-pulse items-center gap-3 rounded-2xl bg-black/[0.03] p-3"
                >
                  <div className="h-9 w-9 shrink-0 rounded-full bg-black/10" />

                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-24 rounded-full bg-black/10" />
                    <div className="h-2.5 w-16 rounded-full bg-black/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && errorMessage && (
            <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
              <p className="text-sm text-red-600">{errorMessage}</p>

              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/5"
              >
                重試
              </button>
            </div>
          )}

          {!loading && !errorMessage && friends.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-black/40">
              還沒有朋友——先加一位才能分享單字。
            </p>
          )}

          {!loading &&
            !errorMessage &&
            friends.map((friend) => {
              const isSending = sendingFriendId === friend.id;
              const isDisabled = sendingFriendId !== null;

              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => onPick(friend.id)}
                  disabled={isDisabled}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-sm font-semibold text-black/70">
                    {(friend.displayName ?? friend.exchangeId)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black/85">
                      {friend.displayName ?? `@${friend.exchangeId}`}
                    </p>

                    <p className="truncate text-xs text-black/40">
                      @{friend.exchangeId}
                    </p>
                  </div>

                  {isSending && (
                    <LoaderCircle
                      size={16}
                      className="shrink-0 animate-spin text-black/40"
                    />
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
