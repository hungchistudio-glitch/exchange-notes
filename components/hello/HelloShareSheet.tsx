"use client";

import { Check, Copy, Download, Image as ImageIcon, LoaderCircle, Share2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { composeShareImage } from "@/lib/hello/shareImage";
import type { HelloSnapshot } from "@/lib/hello/types";
import { getLanguageName } from "@/lib/languages";

import { senderName } from "./HelloInvitation";

/* =========================================================
   Sending a hello

   The link first — it always works — then the picture, made here from the
   same Yumi picture, words and name as the page (lib/hello/shareImage.ts),
   with the QR code drawn below at a size its modules can be read at.

   The link itself is not written out on this screen (Chi: a long address
   reads like a scam): the QR, the buttons and the picture carry it. When
   it goes out it goes with who it is from and the word it brings, so the
   person receiving it knows what it is before they open it.

     share link     the system sheet where there is one, else copy
     share image    only where this device can share a file; elsewhere
                    the picture is downloaded and the link copied instead
     download       the picture, as a file
     copy           the link; if the clipboard refuses, the link is shown
                    selected so it can be copied by hand

   Cancelling the system sheet is neither a success nor a failure: nothing
   is said. A picture that fails to make leaves the link working and offers
   to try again; it never makes another hello.
   ========================================================= */

/** Pixels per QR module the shared picture keeps at least. */
const QR_PIXELS = 296;

type ImageState = { status: "preparing" } | { status: "ready"; blob: Blob; url: string } | { status: "failed" };

function isCancel(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function HelloShareSheet({
  hello,
  url,
  test,
  poster,
}: {
  hello: HelloSnapshot;
  url: string;
  test: boolean;
  /** The picture just taken, if this device took it: avoids fetching it back. */
  poster?: Blob | null;
}) {
  const { t, language } = useTranslation();
  const copy = t.hello;
  const name = senderName(hello);
  const word = [hello.sense[hello.pair[0]]?.text, hello.sense[hello.pair[1]]?.text].filter(Boolean).join(" · ");
  const message = fill(copy.shareText, { name, word });
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<ImageState>({ status: "preparing" });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;

    void (async () => {
      try {
        const qr = qrRef.current;
        if (!qr) throw new Error("No QR");
        let decoded: CanvasImageSource | null = null;
        if (poster) {
          decoded = await createImageBitmap(poster);
        } else if (hello.yumi.posterUrl) {
          const picture = new Image();
          picture.crossOrigin = "anonymous";
          picture.src = hello.yumi.posterUrl;
          await picture.decode();
          decoded = picture;
        }
        const blob = await composeShareImage({
          hello,
          poster: decoded,
          qr,
          greeting: fill(copy.greeting, { name }),
          gift: copy.gift,
          scanCaption: copy.scanCaption,
          languageNames: [getLanguageName(hello.pair[0], language), getLanguageName(hello.pair[1], language)],
          url,
        });
        if (cancelled) return;
        made = URL.createObjectURL(blob);
        setImage({ status: "ready", blob, url: made });
      } catch {
        if (!cancelled) setImage({ status: "failed" });
      }
    })();

    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [attempt, copy.gift, copy.greeting, copy.scanCaption, hello, language, name, poster, url]);

  const file = image.status === "ready" ? new File([image.blob], `yumi-hello-${hello.id}.png`, { type: "image/png" }) : null;
  const canShareFile =
    file !== null && typeof navigator !== "undefined" && Boolean(navigator.canShare?.({ files: [file] }));

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }, [url]);

  const shareLink = async () => {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: fill(copy.pageTitle, { name }), text: message, url });
    } catch (error) {
      if (!isCancel(error)) await copyLink();
    }
  };

  const shareImage = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: fill(copy.pageTitle, { name }), text: `${message}\n${url}` });
    } catch {
      /* Cancelled, or the sheet would not take it: download and copy remain. */
    }
  };

  const button =
    "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 text-[0.875rem] font-semibold text-ink-strong transition-colors hover:bg-black/[0.03] disabled:opacity-40";

  return (
    <section aria-label={copy.created} className="space-y-4 rounded-3xl border border-black/[0.06] bg-white p-5">
      <h2 className="text-[1.125rem] font-semibold">{copy.created}</h2>

      {test ? <p className="rounded-2xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900">{copy.testLink}</p> : null}

      <div className="flex justify-center">
        <div className="rounded-2xl bg-white p-2 ring-1 ring-black/[0.08]">
          {/* Standard QR: dark on white, the full four-module quiet zone, never tinted. */}
          <QRCodeCanvas
            ref={qrRef}
            value={url}
            size={QR_PIXELS}
            marginSize={4}
            level="M"
            bgColor="#ffffff"
            fgColor="#111111"
            style={{ width: 148, height: 148 }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" className={button} onClick={() => void shareLink()}>
          <Share2 size={17} aria-hidden="true" />
          {copy.shareLink}
        </button>
        <button type="button" className={button} onClick={() => void copyLink()}>
          {copyState === "copied" ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
          {copyState === "copied" ? copy.copied : copy.copyLink}
        </button>
        {canShareFile ? (
          <button type="button" className={button} onClick={() => void shareImage()}>
            <ImageIcon size={17} aria-hidden="true" />
            {copy.shareImage}
          </button>
        ) : null}
        {image.status === "ready" ? (
          <a className={button} href={image.url} download={`yumi-hello-${hello.id}.png`}>
            <Download size={17} aria-hidden="true" />
            {copy.downloadImage}
          </a>
        ) : null}
      </div>

      {copyState === "failed" ? (
        <div role="status">
          <p className="text-[0.8125rem] text-ink-soft">{copy.copyFailed}</p>
          <input
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-2 w-full rounded-xl border border-black/[0.1] px-3 py-2 font-mono text-[0.75rem]"
          />
        </div>
      ) : null}

      <div role="status" className="text-[0.8125rem] text-ink-soft">
        {image.status === "preparing" ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
            {copy.imagePreparing}
          </span>
        ) : image.status === "failed" ? (
          <span className="flex flex-wrap items-center gap-2">
            {copy.imageFailed}
            <button
              type="button"
              className="font-semibold underline underline-offset-2"
              onClick={() => {
                setImage({ status: "preparing" });
                setAttempt((value) => value + 1);
              }}
            >
              {copy.retryImage}
            </button>
          </span>
        ) : null}
      </div>

      {image.status === "ready" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt={copy.imageAlt} className="w-full rounded-2xl ring-1 ring-black/[0.06]" />
      ) : null}
    </section>
  );
}
