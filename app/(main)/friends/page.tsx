"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { ArrowLeft, CheckCircle2, Info, XCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  FriendProfile,
  IncomingRequest,
  OutgoingRequest,
  cancelRequest,
  findProfileByExchangeId,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  respondToRequest,
  sendFriendRequest,
} from "@/lib/friends";

type AddMethod = "exchange-id" | "qr";
type Banner = { tone: "success" | "error" | "info"; text: string } | null;

const QR_PREFIX = "exchange-notes:friend:";

export default function FriendsPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [myExchangeId, setMyExchangeId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [method, setMethod] = useState<AddMethod>("exchange-id");
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [bannerShow, setBannerShow] = useState(false);

  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  // ---- Load session + my exchange id ------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setLoadingSession(false);
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("exchange_id")
        .eq("id", user.id)
        .single();

      if (!cancelled) {
        setMyExchangeId(profile?.exchange_id ?? null);
        setLoadingSession(false);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // ---- Load friends + requests --------------------------------------------

  const refreshLists = useCallback(async () => {
    if (!userId) return;

    setListsLoading(true);
    try {
      const [friendsData, incomingData, outgoingData] = await Promise.all([
        listFriends(supabase, userId),
        listIncomingRequests(supabase, userId),
        listOutgoingRequests(supabase, userId),
      ]);

      setFriends(friendsData);
      setIncoming(incomingData);
      setOutgoing(outgoingData);
    } catch (loadError) {
      console.error("Failed to load friends:", loadError);
      setBanner({
        tone: "error",
        text: "Couldn't load your friends right now. Pull to refresh or try again shortly.",
      });
    } finally {
      setListsLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  // ---- My QR code ----------------------------------------------------------

  useEffect(() => {
    if (!myExchangeId) return;

    QRCode.toDataURL(`${QR_PREFIX}${myExchangeId}`, {
      margin: 1,
      width: 320,
      color: { dark: "#171717", light: "#f4f1ea" },
    })
      .then(setQrDataUrl)
      .catch((qrError) => console.error("QR generation failed:", qrError));
  }, [myExchangeId]);

  // ---- Banner enter/auto-dismiss animation --------------------------------

  useEffect(() => {
    if (!banner) return;

    setBannerShow(false);
    const enterTimer = setTimeout(() => setBannerShow(true), 10);
    const dismissDelay = banner.tone === "error" ? 6000 : 3500;
    const dismissTimer = setTimeout(() => setBannerShow(false), dismissDelay);
    const clearTimer = setTimeout(() => setBanner(null), dismissDelay + 300);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
      clearTimeout(clearTimer);
    };
  }, [banner]);

  // ---- Send a request --------------------------------------------------

  async function handleSendRequest(rawValue?: string) {
    if (!userId) {
      setBanner({
        tone: "error",
        text: "Log in first, then you can start adding friends.",
      });
      return;
    }

    const cleanValue = (rawValue ?? value).trim();

    if (!cleanValue) {
      setBanner({
        tone: "error",
        text: "Enter a friend's Exchange ID to send a request.",
      });
      return;
    }

    setSending(true);
    setBanner(null);

    try {
      const target = await findProfileByExchangeId(supabase, cleanValue);

      if (!target) {
        setBanner({
          tone: "error",
          text: `Couldn't find "@${cleanValue.replace(/^@/, "")}". Exchange IDs are lowercase, no spaces. Double check with your friend.`,
        });
        return;
      }

      const result = await sendFriendRequest(supabase, userId, target.id);

      if (result.status === "self") {
        setBanner({
          tone: "info",
          text: "That's your own Exchange ID. Try a friend's instead.",
        });
        return;
      }

      if (result.status === "already-friends") {
        setBanner({
          tone: "info",
          text: `You and @${target.exchangeId} are already friends.`,
        });
        return;
      }

      if (result.status === "already-pending") {
        setBanner({
          tone: "info",
          text: `Already sent. Waiting on @${target.exchangeId} to accept.`,
        });
        return;
      }

      setBanner({
        tone: "success",
        text: `Request sent to @${target.exchangeId}. They'll see it next time they open Friends.`,
      });
      setValue("");
      refreshLists();
    } catch (requestError) {
      console.error("Send friend request failed:", requestError);
      setBanner({
        tone: "error",
        text: "Something went wrong sending that request. Try again in a moment.",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleRespond(
    requestId: string,
    response: "accepted" | "declined",
  ) {
    setRespondingId(requestId);

    try {
      await respondToRequest(supabase, requestId, response);
      setIncoming((current) =>
        current.filter((request) => request.requestId !== requestId),
      );

      if (response === "accepted") {
        refreshLists();
      }
    } catch (respondError) {
      console.error("Respond to request failed:", respondError);
      setBanner({
        tone: "error",
        text: "Couldn't update that request. Try again.",
      });
    } finally {
      setRespondingId(null);
    }
  }

  async function handleCancel(requestId: string) {
    setRespondingId(requestId);

    try {
      await cancelRequest(supabase, requestId);
      setOutgoing((current) =>
        current.filter((request) => request.requestId !== requestId),
      );
    } catch (cancelError) {
      console.error("Cancel request failed:", cancelError);
      setBanner({
        tone: "error",
        text: "Couldn't cancel that request. Try again.",
      });
    } finally {
      setRespondingId(null);
    }
  }

  // ---- QR scanning --------------------------------------------------------

  const stopScanning = useCallback(() => {
    if (scanFrameRef.current !== null) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScanning(false);
  }, []);

  useEffect(() => stopScanning, [stopScanning]);

  function handleScannedValue(raw: string) {
    if (!raw.startsWith(QR_PREFIX)) {
      setScanError("That QR code isn't an Exchange Notes friend code.");
      return;
    }

    const scannedExchangeId = raw.slice(QR_PREFIX.length);
    stopScanning();
    setMethod("exchange-id");
    setValue(scannedExchangeId);
    handleSendRequest(scannedExchangeId);
  }

  function tickScan() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video ||
      !canvas ||
      video.readyState < video.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      scanFrameRef.current = requestAnimationFrame(tickScan);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(frame.data, frame.width, frame.height);

    if (code) {
      handleScannedValue(code.data);
      return;
    }

    scanFrameRef.current = requestAnimationFrame(tickScan);
  }

  async function startScanning() {
    setScanError("");
    stopScanning();

    if (!window.isSecureContext) {
      setScanError(
        "Camera access requires HTTPS or localhost. Open the secure version of this app.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError("Camera scanning isn't supported in this browser.");
      return;
    }

    setScanning(true);

    try {
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
      }

      streamRef.current = stream;

      let video: HTMLVideoElement | null = null;

      for (let attempt = 0; attempt < 30; attempt += 1) {
        video = videoRef.current;

        if (video) break;

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }

      if (!video) {
        throw new Error("Camera preview could not be initialized.");
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          resolve();
          return;
        }

        const timeout = window.setTimeout(() => {
          reject(new Error("Camera preview timed out."));
        }, 8000);

        video.onloadedmetadata = () => {
          window.clearTimeout(timeout);
          resolve();
        };

        video.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error("Camera preview failed."));
        };
      });

      await video.play();

      scanFrameRef.current = requestAnimationFrame(tickScan);
    } catch (scanStartError) {
      console.error("Could not start scanner:", scanStartError);
      stopScanning();

      const errorName =
        scanStartError instanceof DOMException ? scanStartError.name : "";

      if (errorName === "NotAllowedError") {
        setScanError(
          "Camera permission was denied. Enable Camera access in Safari or Chrome settings, then try again.",
        );
      } else if (errorName === "NotFoundError") {
        setScanError("No camera was found on this device.");
      } else if (errorName === "NotReadableError") {
        setScanError(
          "The camera is already being used by another app. Close it and try again.",
        );
      } else {
        setScanError(
          scanStartError instanceof Error
            ? scanStartError.message
            : "Could not open the camera.",
        );
      }
    }
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 pb-28 pt-6 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header>
          <Link
            href="/"
            aria-label="Back to home"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-black transition-colors hover:bg-black/5 active:bg-black/10"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2} />
          </Link>

          <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-neutral-500">
            Learning partners
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-black sm:text-5xl">
            Friends
          </h1>

          <p className="mt-3 text-lg leading-7 text-neutral-600">
            Add someone by Exchange ID or QR code.
          </p>
        </header>

        {!loadingSession && !userId && (
          <p className="mt-6 rounded-2xl bg-white p-4 font-semibold text-black shadow-sm">
            Log in to add and manage friends.
          </p>
        )}

        {/* ---- Add a friend ---- */}
        <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-2xl font-bold text-black">Add a friend</h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                stopScanning();
                setMethod("exchange-id");
                setBanner(null);
              }}
              className={`rounded-2xl border px-4 py-4 font-bold transition-colors ${
                method === "exchange-id"
                  ? "border-black bg-black text-white"
                  : "border-neutral-300 bg-white text-black"
              }`}
            >
              Exchange ID
            </button>

            <button
              type="button"
              onClick={() => {
                setMethod("qr");
                setBanner(null);
              }}
              className={`rounded-2xl border px-4 py-4 font-bold transition-colors ${
                method === "qr"
                  ? "border-black bg-black text-white"
                  : "border-neutral-300 bg-white text-black"
              }`}
            >
              Scan QR
            </button>
          </div>

          {method === "exchange-id" && (
            <>
              <label className="mt-5 block">
                <span className="text-sm font-bold text-black">
                  Friend&apos;s Exchange ID
                </span>

                <div className="mt-2 flex rounded-2xl border border-neutral-300 bg-white focus-within:border-black">
                  <span className="px-4 py-4 text-xl font-bold text-neutral-400">
                    @
                  </span>

                  <input
                    type="text"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSendRequest();
                    }}
                    placeholder="friendname"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-4 text-base text-black placeholder:text-neutral-400 outline-none"
                  />
                </div>
              </label>

              <button
                type="button"
                onClick={() => handleSendRequest()}
                disabled={sending || !userId}
                className="mt-5 w-full rounded-2xl bg-black px-5 py-4 font-bold text-white disabled:opacity-40"
              >
                {sending ? "Sending…" : "Send Friend Request"}
              </button>
            </>
          )}

          {method === "qr" && (
            <div className="mt-5">
              {!scanning ? (
                <button
                  type="button"
                  onClick={startScanning}
                  className="w-full rounded-2xl bg-black px-5 py-4 font-bold text-white"
                >
                  Open Camera to Scan
                </button>
              ) : (
                <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    disablePictureInPicture
                    className="h-full w-full object-cover"
                    style={{ WebkitTransform: "translateZ(0)" }}
                  />
                  <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />

                  <button
                    type="button"
                    onClick={stopScanning}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {scanError && (
                <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {scanError}
                </p>
              )}
            </div>
          )}

          {banner && (
            <div
              className={`mt-4 flex items-start gap-3 rounded-2xl p-4 font-semibold transition-all duration-300 ease-out ${
                bannerShow
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-1"
              } ${
                banner.tone === "success"
                  ? "bg-green-50 text-green-800"
                  : banner.tone === "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-[#f4f1ea] text-black"
              }`}
            >
              {banner.tone === "success" && (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              {banner.tone === "error" && (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              {banner.tone === "info" && (
                <Info className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <p>{banner.text}</p>
            </div>
          )}
        </section>

        {/* ---- Incoming requests ---- */}
        {incoming.length > 0 && (
          <section className="mt-7">
            <h2 className="text-xl font-bold text-black">
              Requests{" "}
              <span className="text-neutral-400">· {incoming.length}</span>
            </h2>

            <div className="mt-3 space-y-3">
              {incoming.map((request) => (
                <div
                  key={request.requestId}
                  className="flex items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-black">
                      @{request.sender.exchangeId}
                    </p>
                    <p className="text-sm text-neutral-500">wants to connect</p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleRespond(request.requestId, "declined")
                      }
                      disabled={respondingId === request.requestId}
                      className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleRespond(request.requestId, "accepted")
                      }
                      disabled={respondingId === request.requestId}
                      className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Outgoing requests ---- */}
        {outgoing.length > 0 && (
          <section className="mt-7">
            <h2 className="text-xl font-bold text-black">Sent</h2>

            <div className="mt-3 space-y-3">
              {outgoing.map((request) => (
                <div
                  key={request.requestId}
                  className="flex items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-black">
                      @{request.receiver.exchangeId}
                    </p>
                    <p className="text-sm text-neutral-500">
                      Waiting for a response
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCancel(request.requestId)}
                    disabled={respondingId === request.requestId}
                    className="shrink-0 rounded-full border border-neutral-300 px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- My QR code ---- */}
        <section className="mt-7 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-neutral-500">
            QR code
          </p>

          <h2 className="mt-2 text-2xl font-bold text-black">
            Share your profile
          </h2>

          <p className="mt-2 leading-7 text-neutral-600">
            Anyone who scans this adds you as a friend instantly.
          </p>

          <div className="mt-5 flex aspect-square max-w-xs items-center justify-center overflow-hidden rounded-3xl border border-neutral-200 bg-[#f4f1ea]">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Your friend QR code"
                className="h-full w-full"
              />
            ) : (
              <span className="text-center font-bold text-neutral-400">
                {loadingSession ? "Loading…" : "Log in to get your code"}
              </span>
            )}
          </div>

          {myExchangeId && (
            <p className="mt-3 text-center font-bold text-neutral-500">
              @{myExchangeId}
            </p>
          )}
        </section>

        {/* ---- Friends list ---- */}
        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-black">Your friends</h2>
            <span className="font-bold text-black">{friends.length}</span>
          </div>

          {listsLoading ? (
            <div className="mt-5 rounded-3xl bg-white p-7 text-center shadow-sm">
              <p className="font-semibold text-neutral-400">Loading friends…</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="mt-5 rounded-3xl bg-white p-7 text-center shadow-sm">
              <p className="text-xl font-bold text-black">No friends yet</p>
              <p className="mt-2 leading-7 text-neutral-600">
                Add your first learning partner to start sharing notes and
                messages.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {friends.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/messages?with=${friend.id}`}
                  className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f1ea] font-bold text-black">
                    {(friend.displayName ?? friend.exchangeId)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate font-bold text-black">
                      {friend.displayName ?? `@${friend.exchangeId}`}
                    </p>
                    <p className="truncate text-sm text-neutral-500">
                      @{friend.exchangeId}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <nav className="fixed inset-x-3 bottom-3 z-50 mx-auto grid max-w-md grid-cols-4 rounded-3xl border border-neutral-200 bg-white p-2 shadow-lg sm:hidden">
        <Link
          href="/"
          className="rounded-2xl px-2 py-3 text-center text-xs font-bold text-black"
        >
          Home
        </Link>
        <Link
          href="/friends"
          className="rounded-2xl bg-black px-2 py-3 text-center text-xs font-bold text-white"
        >
          Friends
        </Link>
        <Link
          href="/camera"
          className="rounded-2xl px-2 py-3 text-center text-xs font-bold text-black"
        >
          Camera
        </Link>
        <Link
          href="/messages"
          className="rounded-2xl px-2 py-3 text-center text-xs font-bold text-black"
        >
          Messages
        </Link>
      </nav>
    </main>
  );
}
