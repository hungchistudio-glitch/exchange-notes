"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import Avatar from "@/components/foundation/media/Avatar";
import FriendQrScanner from "@/components/friends/FriendQrScanner";
import SwipeActionRow from "@/components/foundation/interaction/SwipeActionRow";
import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import usePageOrigin from "@/hooks/usePageOrigin";
import { UserX } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  findProfileByExchangeId,
  friendInviteUrl,
  FRIEND_INVITE_PARAM,
  getProfileById,
  listFriends,
  listIncomingRequests,
  removeFriend,
  respondToRequest,
  sendFriendRequest,
  type FriendProfile,
  type IncomingRequest,
} from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { insertValues, normalizeExchangeId } from "@/lib/utils";

function FriendsPageContent() {
  const supabase = createClient();
  const { t } = useTranslation();
  const copy = t.friends;
  const searchParams = useSearchParams();
  const invitedExchangeId = normalizeExchangeId(
    searchParams.get(FRIEND_INVITE_PARAM) ?? "",
  );

  const origin = usePageOrigin();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  /*
   * The friend QR encodes /friends?add=<exchangeId>, so scanning it with the
   * system camera lands here with the ID already known. Seed the field and
   * name whose code it was, but leave the send to a deliberate tap — a link
   * anyone can hold up to a camera must not fire off a friend request by
   * itself.
   */
  const [exchangeId, setExchangeId] = useState(invitedExchangeId);
  const [message, setMessage] = useState(() =>
    invitedExchangeId
      ? insertValues(copy.banners.invitePrefilled, {
          exchangeId: invitedExchangeId,
        })
      : "",
  );
  const [sending, setSending] = useState(false);
  const [addMode, setAddMode] = useState<"id" | "qr">("id");

  const [ownProfile, setOwnProfile] = useState<FriendProfile | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadData = useCallback(
    async (userId: string) => {
      setLoading(true);

      // Promise.allSettled rather than Promise.all: a failure in any one
      // of these (e.g. a single malformed request row) used to reject the
      // whole batch and leave friends/incoming/profile all at their empty
      // defaults — so one bad row could make an otherwise-healthy friends
      // list and a very real incoming request both silently disappear.
      // Each section now loads and fails independently.
      const [profileResult, friendListResult, incomingListResult] =
        await Promise.allSettled([
          getProfileById(supabase, userId),
          listFriends(supabase, userId),
          listIncomingRequests(supabase, userId),
        ]);

      if (profileResult.status === "fulfilled") {
        setOwnProfile(profileResult.value);
      }

      if (friendListResult.status === "fulfilled") {
        setFriends(friendListResult.value);
      }

      if (incomingListResult.status === "fulfilled") {
        setIncoming(incomingListResult.value);
      }

      const firstFailure = [
        friendListResult,
        incomingListResult,
        profileResult,
      ].find((result) => result.status === "rejected") as
        | PromiseRejectedResult
        | undefined;

      if (firstFailure) {
        console.error(firstFailure.reason);
        setMessage(copy.banners.loadFailed);
      }

      setLoading(false);
    },
    [supabase, copy.banners.loadFailed],
  );

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted || !user) return;

      setCurrentUserId(user.id);
      await loadData(user.id);
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [supabase, loadData]);

  /*
   * The in-app scanner lands in exactly the same place as a scan from the
   * system camera: field seeded, whose code it was named, sending left to a
   * deliberate tap. Switching back to the ID tab is what makes that filled
   * field visible — leaving the user on the camera view after a successful
   * read looks like nothing happened.
   */
  function handleScannedExchangeId(scannedExchangeId: string) {
    setAddMode("id");
    setExchangeId(scannedExchangeId);
    setMessage(
      insertValues(copy.banners.invitePrefilled, {
        exchangeId: scannedExchangeId,
      }),
    );
  }

  async function handleSendRequest() {
    const cleanValue = exchangeId.trim();

    if (!cleanValue) {
      setMessage(copy.banners.enterExchangeId);
      return;
    }

    if (!currentUserId) return;

    setSending(true);
    setMessage("");

    try {
      const targetProfile = await findProfileByExchangeId(
        supabase,
        cleanValue,
      );

      if (!targetProfile) {
        setMessage(
          insertValues(copy.banners.profileNotFound, {
            exchangeId: cleanValue,
          }),
        );
        return;
      }

      const result = await sendFriendRequest(
        supabase,
        currentUserId,
        targetProfile.id,
      );

      if (result.status === "sent") {
        setMessage(
          insertValues(copy.banners.requestSent, {
            exchangeId: targetProfile.exchangeId,
          }),
        );
        setExchangeId("");
      } else if (result.status === "already-friends") {
        setMessage(
          insertValues(copy.banners.alreadyFriends, {
            exchangeId: targetProfile.exchangeId,
          }),
        );
      } else if (result.status === "already-pending") {
        setMessage(
          insertValues(copy.banners.alreadyPending, {
            exchangeId: targetProfile.exchangeId,
          }),
        );
      } else {
        setMessage(copy.banners.ownExchangeId);
      }
    } catch (error) {
      console.error(error);
      setMessage(copy.banners.sendFailed);
    } finally {
      setSending(false);
    }
  }

  async function handleRespond(
    requestId: string,
    response: "accepted" | "declined",
  ) {
    if (!currentUserId) return;

    setRespondingId(requestId);

    try {
      await respondToRequest(supabase, requestId, response);
      await loadData(currentUserId);
    } catch (error) {
      console.error(error);
      setMessage(copy.banners.respondFailed);
    } finally {
      setRespondingId(null);
    }
  }

  async function handleRemoveFriend(friend: FriendProfile) {
    if (!currentUserId) return;

    setRemovingId(friend.id);
    const previousFriends = friends;

    setFriends((current) =>
      current.filter((existing) => existing.id !== friend.id),
    );

    try {
      await removeFriend(supabase, currentUserId, friend.id);
    } catch (error) {
      setFriends(previousFriends);
      console.error(error);
      setMessage(copy.banners.removeFriendFailed);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-surface px-4 pb-28 pt-6 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header>
          <Link
            href="/"
            aria-label="Back to Home"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-black transition hover:bg-black/[0.04]"
          >
            ←
          </Link>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
            {copy.eyebrow}
          </p>

          <h1 className="mt-1 text-3xl font-bold text-black">
            {copy.title}
          </h1>

          <p className="mt-2 text-black/60">{copy.subtitle}</p>
        </header>

        <section className="mt-6 rounded-[24px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-black">{copy.add.title}</h2>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-black/[0.04] p-1">
            <button
              type="button"
              onClick={() => setAddMode("id")}
              className={`rounded-full py-2 text-sm font-semibold transition-colors ${
                addMode === "id" ? "bg-black text-white" : "text-black/50"
              }`}
            >
              {copy.add.exchangeId}
            </button>

            <button
              type="button"
              onClick={() => setAddMode("qr")}
              className={`rounded-full py-2 text-sm font-semibold transition-colors ${
                addMode === "qr" ? "bg-black text-white" : "text-black/50"
              }`}
            >
              {copy.add.scanQr}
            </button>
          </div>

          {addMode === "id" ? (
            <div className="mt-5">
              <label className="block text-sm font-semibold text-black">
                {copy.add.fieldLabel}
              </label>

              <div className="mt-2 flex items-center rounded-2xl border border-line bg-white px-4 py-3">
                <span className="mr-1 text-black/40">@</span>
                <input
                  value={exchangeId}
                  onChange={(event) => setExchangeId(event.target.value)}
                  placeholder={copy.add.placeholder}
                  className="w-full bg-transparent text-black outline-none placeholder:text-black/30"
                />
                {exchangeId && (
                  <ClearFieldButton onClear={() => setExchangeId("")} />
                )}
              </div>

              <button
                type="button"
                onClick={handleSendRequest}
                disabled={sending}
                className="mt-4 w-full rounded-2xl bg-black px-5 py-4 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? copy.add.sending : copy.add.sendRequest}
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <FriendQrScanner onDetected={handleScannedExchangeId} />

              <div className="mt-6 flex flex-col items-center border-t border-line pt-5">
                <h3 className="text-sm font-semibold text-black">
                  {copy.profileQr.title}
                </h3>

                <p className="mt-1 text-center text-sm text-black/60">
                  {copy.profileQr.description}
                </p>

                <div className="mt-4 flex aspect-square w-full max-w-[220px] items-center justify-center rounded-3xl border border-line p-6">
                  {ownProfile && origin ? (
                    <QRCodeSVG
                      value={friendInviteUrl(ownProfile.exchangeId, origin)}
                      size={160}
                      bgColor="transparent"
                      fgColor="#000000"
                      level="M"
                      aria-label={copy.profileQr.imageAlt}
                    />
                  ) : (
                    <span className="text-center text-sm text-black/40">
                      {copy.profileQr.loading}
                    </span>
                  )}
                </div>

                {ownProfile && (
                  <p className="mt-3 text-sm font-semibold text-black/50">
                    @{ownProfile.exchangeId}
                  </p>
                )}
              </div>
            </div>
          )}

          {message && (
            <p className="mt-4 text-sm font-semibold text-black/60">
              {message}
            </p>
          )}
        </section>

        {incoming.length > 0 && (
          <section className="mt-7">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">
                {copy.incoming.title}
              </h2>
              <span className="font-bold text-black">{incoming.length}</span>
            </div>

            <div className="mt-4 space-y-3">
              {incoming.map((request) => (
                <div
                  key={request.requestId}
                  className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-white p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      src={request.sender.avatarUrl}
                      fallback={
                        request.sender.displayName ?? request.sender.exchangeId
                      }
                      size="sm"
                    />

                    <div className="min-w-0">
                      <p className="truncate font-bold text-black">
                        {request.sender.displayName ??
                          request.sender.exchangeId}
                      </p>
                      <p className="truncate text-sm text-black/50">
                        @{request.sender.exchangeId}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={respondingId === request.requestId}
                      onClick={() =>
                        handleRespond(request.requestId, "declined")
                      }
                      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                    >
                      {respondingId === request.requestId
                        ? copy.incoming.responding
                        : copy.incoming.decline}
                    </button>

                    <button
                      type="button"
                      disabled={respondingId === request.requestId}
                      onClick={() =>
                        handleRespond(request.requestId, "accepted")
                      }
                      className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {respondingId === request.requestId
                        ? copy.incoming.responding
                        : copy.incoming.accept}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-black">
              {copy.list.title}
            </h2>
            <span className="font-bold text-black">{friends.length}</span>
          </div>

          {loading ? (
            <div className="mt-5 rounded-3xl bg-white p-7 text-center shadow-sm">
              <p className="text-black/50">{copy.list.loading}</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="mt-5 rounded-3xl bg-white p-7 text-center shadow-sm">
              <p className="text-xl font-bold text-black">
                {copy.list.emptyTitle}
              </p>
              <p className="mt-2 leading-7 text-black">
                {copy.list.emptyDescription}
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {friends.map((friend) => (
                <SwipeActionRow
                  key={friend.id}
                  trailingAction={{
                    label: copy.deleteFriend,
                    icon: <UserX size={22} strokeWidth={1.8} />,
                    onAction: () => handleRemoveFriend(friend),
                  }}
                  disabled={removingId === friend.id}
                  className="rounded-3xl"
                >
                  <div className="flex items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        src={friend.avatarUrl}
                        fallback={friend.displayName ?? friend.exchangeId}
                        size="md"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-black">
                          {friend.displayName ?? friend.exchangeId}
                        </p>
                        <p className="truncate text-sm text-black/50">
                          @{friend.exchangeId}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/messages?with=${friend.id}`}
                      className="shrink-0 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white"
                    >
                      {t.messages.chatFallback}
                    </Link>
                  </div>
                </SwipeActionRow>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={null}>
      <FriendsPageContent />
    </Suspense>
  );
}
