"use client";

import { Check, LoaderCircle, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
import { listFriends, type FriendProfile } from "@/lib/friends";
import { fetchNoteShares, revokeNoteShare, shareNote } from "@/lib/notes/repository";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics/track";

export default function NotesShareSheet({
  open,
  onClose,
  noteId,
  ownerId,
}: {
  open: boolean;
  onClose: () => void;
  noteId: string;
  ownerId: string;
}) {
  const { t } = useTranslation();
  const copy = t.home.notes;
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());
  /*
   * Loading before the request has been made — see the same reasoning in
   * useVocabularyFriendPicker. The fetch below is deferred by a timeout, so
   * starting at false painted the "no friends yet" state first and corrected
   * it a frame later, moving a sheet that was still animating in.
   */
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(() => {
      // Already true on first open; this covers reopening for another note.
      setLoading(true);
      setError("");
      const supabase = createClient();

      void Promise.all([
        listFriends(supabase, ownerId),
        fetchNoteShares(supabase, noteId),
      ]).then(([nextFriends, shares]) => {
        if (!active) return;
        setFriends(nextFriends);
        setSharedIds(new Set(shares.map((share) => share.recipientId)));
      }).catch((loadError) => {
        console.error("Note share list failed", loadError);
        if (active) setError(copy.shareError);
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [copy.shareError, noteId, open, ownerId]);

  async function toggle(friendId: string) {
    if (busyId) return;
    setBusyId(friendId);
    setError("");
    const supabase = createClient();
    const alreadyShared = sharedIds.has(friendId);
    const succeeded = alreadyShared
      ? await revokeNoteShare(supabase, noteId, friendId)
      : await shareNote(supabase, noteId, ownerId, friendId);

    if (!succeeded) {
      setError(copy.shareError);
      setBusyId(null);
      return;
    }

    setSharedIds((current) => {
      const next = new Set(current);
      if (alreadyShared) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
    track(alreadyShared ? "notes.share_revoked" : "notes.shared", { permission: "view" });
    setBusyId(null);
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={copy.shareTitle}
      description={copy.shareDescription}
      /*
       * Picking a friend is a question, not a screen. Left at the sheet's
       * default this climbed to 94% of a phone's screen with only a handful
       * of friends in the list.
       */
      maxHeight="min(60dvh, 640px)"
    >
      {/*
       * One height for loading, for an empty list and for a short one. The
       * sheet is anchored to the bottom, so its height is also its position:
       * swapping a spinner for a list of a different size moved the panel
       * while it was still animating in, which is what looked like the sheet
       * overshooting and dropping back.
       */}
      <div className="min-h-[184px]">
      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="animate-spin text-ink-soft" size={22} />
        </div>
      ) : friends.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
          {copy.noFriends}
        </p>
      ) : (
        <div className="space-y-2">
          {friends.map((friend) => {
            const shared = sharedIds.has(friend.id);
            return (
              <button
                key={friend.id}
                type="button"
                onClick={() => void toggle(friend.id)}
                disabled={busyId !== null}
                aria-pressed={shared}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-3 py-3 text-left disabled:opacity-60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/[0.05]">
                  {friend.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : <UserRound size={17} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{friend.displayName || friend.exchangeId}</span>
                  <span className="mt-0.5 block truncate text-xs text-ink-faint">@{friend.exchangeId} · {copy.viewOnly}</span>
                </span>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${shared ? "bg-black text-white" : "border border-line"}`}>
                  {busyId === friend.id ? <LoaderCircle size={15} className="animate-spin" /> : shared ? <Check size={15} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
      </div>
      {error ? <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
    </BottomSheet>
  );
}
