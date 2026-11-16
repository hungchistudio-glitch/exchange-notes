"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

import ShareStudio, { type ShareFrame } from "@/components/share/ShareStudio";
import Yumi3DFigure, { type YumiCamera } from "@/components/yumi3d/Yumi3DFigure";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { drawHelloCard } from "@/lib/hello/shareImage";
import type { HelloSnapshot } from "@/lib/hello/types";
import { getLanguageName } from "@/lib/languages";
import { loadHudFonts, readHudFonts, type HudFonts } from "@/lib/share/hud";

import { senderName } from "./HelloInvitation";

/* =========================================================
   Sending a hello

   The link first — it always works — then the card, made here from the
   same Yumi, words and name as the page (lib/hello/shareImage.ts), with
   the QR code drawn on it at a size its modules can be read at.

   Since 2026-11-15 the card is the shared cards' (Chi: 送一個字的分享圖換
   新卡): Yumi stands here in the outfit saved with the hello, and is drawn
   as the sharer turns her, in a story's 9:16 or a post's 1:1, as a
   picture or three seconds of video (components/share/ShareStudio). Where
   the live figure cannot be had, her picture taken with the hello stands
   in, never another Yumi.

   The link itself is not written out on this screen (Chi: a long address
   reads like a scam): the QR, the buttons and the card carry it. When
   it goes out it goes with who it is from and the word it brings, so the
   person receiving it knows what it is before they open it.

     share link     the system sheet where there is one, else copy
     copy           the link; if the clipboard refuses, the link is shown
                    selected so it can be copied by hand
     the card       shared where this device can share a file, else saved

   Cancelling the system sheet is neither a success nor a failure: nothing
   is said. A card that fails to make leaves the link working and offers
   to try again; it never makes another hello.
   ========================================================= */

/** Pixels per QR module the shared picture keeps at least. */
const QR_PIXELS = 296;

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
  const camera = useRef<YumiCamera | null>(null);
  const fonts = useRef<HudFonts | null>(null);
  const [picture, setPicture] = useState<CanvasImageSource | null>(null);
  /* Counts Yumi coming live and each turn of her ending: the card is made again. */
  const [turns, setTurns] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  /* Her picture, for where the live figure cannot be had. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (poster) {
        const bitmap = await createImageBitmap(poster);
        if (!cancelled) setPicture(bitmap);
      } else if (hello.yumi.posterUrl) {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = hello.yumi.posterUrl;
        await image.decode();
        if (!cancelled) setPicture(image);
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hello.yumi.posterUrl, poster]);

  const greeting = fill(copy.greeting, { name });
  const languageNames = [getLanguageName(hello.pair[0], language), getLanguageName(hello.pair[1], language)] as const;
  const draw = (ctx: CanvasRenderingContext2D, frame: ShareFrame) => {
    const qr = qrRef.current;
    if (!qr) throw new Error("No QR");
    const live = camera.current?.canvas ?? null;
    drawHelloCard(ctx, {
      ...frame,
      hello,
      fonts: fonts.current ?? undefined,
      yumi: live ?? picture,
      yumiIsPoster: !live,
      qr,
      greeting,
      gift: copy.gift,
      scanCaption: copy.scanCaption,
      languageNames,
      url,
    });
  };
  const prepare = async () => {
    const read = (fonts.current ??= readHudFonts());
    await loadHudFonts(read, [greeting, copy.gift, copy.scanCaption, word, ...languageNames].join(""));
  };
  const version = JSON.stringify([hello.id, hello.yumi.mode, greeting, languageNames, url, Boolean(picture), turns]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const shareLink = async () => {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: fill(copy.pageTitle, { name }), text: message, url });
    } catch (error) {
      if (!isCancel(error)) await copyLink();
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

      {/* Her, in the outfit saved with the hello: turned here, drawn as turned.
          A piece gone from the shop would dress the live figure differently
          from the hello sent, so then only her picture is drawn. */}
      {hello.yumi.complete ? (
        <>
          <div className="hello-share-yumi relative -mx-1 h-[220px]" onPointerUp={() => setTurns((count) => count + 1)}>
            <Yumi3DFigure inspect outfit={hello.yumi.outfit} cameraRef={camera} fill={0.36} onLive={() => setTurns((count) => count + 1)} />
          </div>
          <p className="-mt-2 text-center text-[0.6875rem] text-ink-faint">{t.shareStudio.turnHint}</p>
        </>
      ) : null}

      <ShareStudio
        draw={draw}
        camera={camera}
        version={version}
        prepare={prepare}
        fileStem={`yumi-hello-${hello.id}`}
        shareTitle={fill(copy.pageTitle, { name })}
        shareText={`${message}\n${url}`}
      />
    </section>
  );
}
