"use client";

import { Clapperboard, Download, LoaderCircle, Share2 } from "lucide-react";
import { useEffect, useRef, useState, type MutableRefObject } from "react";

import type { YumiCamera } from "@/components/yumi3d/Yumi3DFigure";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { ShareFormat } from "@/lib/share/hud";

/* =========================================================
   Sharing a card drawn with Yumi (Chi, 2026-11-15)

   Both shared cards go out through this: the weekly recap and a word sent
   with Yumi (送一個字). The caller draws; this chooses the shape (a story's
   9:16 or a post's 1:1), keeps the picture ready, shows it, and shares or
   saves it, or records three seconds of it as a video.

   The picture is made ahead, whenever what it shows changes (the shape,
   the caller's `version`: its data, Yumi coming live, a turn of her ended),
   not when the share key is pressed: a phone's share sheet opens only
   straight from a tap, and making the picture first would spend the tap.
   Yumi's canvas is read in the same task she is drawn in, before WebGL
   clears it (YumiCamera).

   The video takes three seconds to record, so it is offered afterwards,
   with keys of its own, rather than shared from the tap that started it.
   ========================================================= */

const VIDEO_MS = 3000;
/** The opening's share of the video: the numbers count up, the words decode. */
const OPENING_SHARE = 0.4;
/** One full turn over the video: lib/yumi3d/scene turns 0.012 rad a pixel. */
const TURN_PX_PER_MS = (Math.PI * 2) / 0.012 / VIDEO_MS;

export type ShareFrame = {
  format: ShareFormat;
  /** 0 to 1 through the opening; 1 for the still picture. */
  progress: number;
  /** 0 to 1 through the video; 0 for the still picture. */
  spin: number;
  tick: number;
};

type Made = { blob: Blob; url: string };
type HeldUrls = { still: string | null; video: string | null };

/** A new object URL in place of the one it replaces, which is given up. */
function swapUrl(held: HeldUrls, kind: keyof HeldUrls, blob: Blob): string {
  if (held[kind]) URL.revokeObjectURL(held[kind]!);
  const url = URL.createObjectURL(blob);
  held[kind] = url;
  return url;
}

function videoType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function canShare(file: File | null): boolean {
  if (!file || typeof navigator === "undefined") return false;
  const nav = navigator as Partial<Pick<Navigator, "share" | "canShare">>;
  return typeof nav.share === "function" && Boolean(nav.canShare?.({ files: [file] }));
}

export default function ShareStudio({
  draw,
  camera,
  version,
  disabled = false,
  prepare,
  fileStem,
  shareTitle,
  shareText,
}: {
  draw: (ctx: CanvasRenderingContext2D, frame: ShareFrame) => void;
  camera: MutableRefObject<YumiCamera | null>;
  /** Changes whenever what is drawn changes; the picture is made again. */
  version: string;
  disabled?: boolean;
  /** Loads what the drawing needs first: its fonts. */
  prepare?: () => Promise<void>;
  fileStem: string;
  shareTitle: string;
  shareText?: string;
}) {
  const { t } = useTranslation();
  const copy = t.shareStudio;
  const [format, setFormat] = useState<ShareFormat>("story");
  const [attempt, setAttempt] = useState(0);
  /* What is shown now. A picture or video made of something else is old:
     the picture stays up, dimmed, until its successor is ready; the video
     is no longer offered. */
  const key = `${format}|${version}`;
  const [still, setStill] = useState<(Made & { key: string }) | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [video, setVideo] = useState<(Made & { key: string; extension: string }) | null>(null);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState("");
  const stillKey = `${key}|${attempt}`;
  const stillState: "preparing" | "ready" | "failed" =
    still?.key === stillKey ? "ready" : failedKey === stillKey ? "failed" : "preparing";
  const shownVideo = video?.key === key ? video : null;

  const drawRef = useRef(draw);
  const prepareRef = useRef(prepare);
  useEffect(() => {
    drawRef.current = draw;
    prepareRef.current = prepare;
  });

  /* Object URLs given up when replaced, and when the screen goes. */
  const urls = useRef<HeldUrls>({ still: null, video: null });
  useEffect(() => {
    const held = urls.current;
    return () => {
      if (held.still) URL.revokeObjectURL(held.still);
      if (held.video) URL.revokeObjectURL(held.video);
    };
  }, []);

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await prepareRef.current?.();
          if (cancelled) return;
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("No 2D canvas");
          camera.current?.draw();
          drawRef.current(ctx, { format, progress: 1, spin: 0, tick: 0 });
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          if (!blob) throw new Error("No image");
          if (cancelled) return;
          setStill({ blob, url: swapUrl(urls.current, "still", blob), key: stillKey });
        } catch {
          if (!cancelled) setFailedKey(stillKey);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [format, disabled, stillKey, camera]);

  const stillFile = still ? new File([still.blob], `${fileStem}-${format}.png`, { type: "image/png" }) : null;
  const videoFile = shownVideo ? new File([shownVideo.blob], `${fileStem}-${format}.${shownVideo.extension}`, { type: shownVideo.blob.type }) : null;

  const share = async (file: File | null) => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: shareTitle, ...(shareText ? { text: shareText } : {}) });
    } catch {
      /* Cancelled, or the sheet would not take it: saving remains. */
    }
  };

  async function record() {
    const type = videoType();
    if (recording || disabled) return;
    if (!type) {
      setNotice(copy.videoUnsupported);
      return;
    }
    setRecording(true);
    setNotice("");
    const recordedKey = key;
    try {
      await prepareRef.current?.();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2D canvas");
      camera.current?.draw();
      drawRef.current(ctx, { format, progress: 0, spin: 0, tick: 0 });
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.start(250);

      /* Three seconds: the opening counts and decodes while Yumi makes one turn. */
      await new Promise<void>((resolve) => {
        const started = performance.now();
        let last = started;
        let tick = 0;
        const step = (now: number) => {
          const elapsed = Math.min(VIDEO_MS, now - started);
          camera.current?.rotateBy(TURN_PX_PER_MS * (now - last), 0);
          last = now;
          camera.current?.draw(now);
          drawRef.current(ctx, { format, progress: elapsed / (VIDEO_MS * OPENING_SHARE), spin: elapsed / VIDEO_MS, tick: tick++ });
          if (elapsed < VIDEO_MS) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });

      recorder.stop();
      await stopped;
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: type.split(";")[0] });
      setVideo({ blob, url: swapUrl(urls.current, "video", blob), key: recordedKey, extension: blob.type === "video/mp4" ? "mp4" : "webm" });
    } catch {
      setNotice(copy.videoUnsupported);
    } finally {
      setRecording(false);
    }
  }

  const primary =
    "ob-key flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50";
  const secondary =
    "share-key flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white px-5 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50";

  return (
    <div className="space-y-3" data-share-studio="">
      <div className="flex gap-2" role="radiogroup" aria-label={copy.format}>
        {(["story", "square"] as const).map((shape) => (
          <button
            key={shape}
            type="button"
            role="radio"
            aria-checked={format === shape}
            onClick={() => setFormat(shape)}
            className={`share-format flex h-10 flex-1 items-center justify-center rounded-full border text-[0.8125rem] font-semibold ${
              format === shape ? "border-black bg-black text-white" : "border-line bg-white text-ink-soft"
            }`}
            data-on={format === shape ? "" : undefined}
          >
            <span className="hud-figure">{shape === "story" ? copy.story : copy.square}</span>
          </button>
        ))}
      </div>

      <div className="share-preview flex min-h-[200px] items-center justify-center" aria-live="polite">
        {still ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={still.url}
            alt={copy.previewAlt}
            className={`max-h-[440px] w-auto max-w-full rounded-xl ring-1 ring-black/[0.08] transition-opacity ${stillState === "preparing" ? "opacity-60" : ""}`}
          />
        ) : stillState === "failed" ? null : (
          <span className="inline-flex items-center gap-2 text-[0.8125rem] text-ink-soft">
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
            {copy.preparing}
          </span>
        )}
      </div>
      {stillState === "failed" ? (
        <p className="flex flex-wrap items-center justify-center gap-2 text-[0.8125rem] text-ink-soft" role="status">
          {copy.failed}
          <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setAttempt((value) => value + 1)}>
            {copy.retry}
          </button>
        </p>
      ) : null}

      {canShare(stillFile) ? (
        <button type="button" className={primary} disabled={!still || stillState !== "ready"} onClick={() => void share(stillFile)}>
          <Share2 size={16} aria-hidden="true" />
          {copy.shareImage}
        </button>
      ) : null}
      {still ? (
        <a
          className={canShare(stillFile) ? secondary : primary}
          href={still.url}
          download={stillFile?.name}
          aria-disabled={stillState !== "ready" || undefined}
        >
          <Download size={16} aria-hidden="true" />
          {copy.downloadImage}
        </a>
      ) : null}

      {shownVideo ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {canShare(videoFile) ? (
            <button type="button" className={secondary} onClick={() => void share(videoFile)}>
              <Share2 size={16} aria-hidden="true" />
              {copy.shareVideo}
            </button>
          ) : null}
          <a className={secondary} href={shownVideo.url} download={videoFile?.name}>
            <Download size={16} aria-hidden="true" />
            {copy.downloadVideo}
          </a>
        </div>
      ) : (
        <button type="button" className={secondary} disabled={disabled || recording} onClick={() => void record()}>
          {recording ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Clapperboard size={16} aria-hidden="true" />}
          {recording ? copy.recording : copy.saveVideo}
        </button>
      )}
      {notice ? <p className="text-center text-[0.75rem] text-ink-soft" role="status">{notice}</p> : null}
    </div>
  );
}
