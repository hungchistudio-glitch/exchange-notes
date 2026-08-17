"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import Screen from "@/components/foundation/layout/Screen";
import { speak } from "@/lib/speech";

type SpeakPageClientProps = {
  language: "en-US" | "zh-TW";
  text: string;
};

type PlaybackState = "idle" | "playing" | "complete" | "error";

export default function SpeakPageClient({
  language,
  text,
}: SpeakPageClientProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const autoPlayedRef = useRef(false);

  const play = useCallback(() => {
    if (!text) {
      setPlaybackState("error");
      return;
    }

    setPlaybackState("playing");
    speak(text, language, {
      onStart: () => setPlaybackState("playing"),
      onEnd: () => setPlaybackState("complete"),
      onError: () => setPlaybackState("error"),
    });
  }, [language, text]);

  useEffect(() => {
    if (autoPlayedRef.current || !text) return;
    autoPlayedRef.current = true;

    const timeout = window.setTimeout(play, 120);

    return () => window.clearTimeout(timeout);
  }, [play, text]);

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  const isChinese = language === "zh-TW";
  const status =
    playbackState === "playing"
      ? isChinese
        ? "正在播放…"
        : "Playing…"
      : playbackState === "complete"
        ? isChinese
          ? "播放完成"
          : "Playback complete"
        : playbackState === "error"
          ? isChinese
            ? "無法自動播放，請點擊下方按鈕再試一次。"
            : "Automatic playback was blocked. Tap the button to try again."
          : isChinese
            ? "準備播放"
            : "Ready to play";

  return (
    // Every white and black below is written as a literal rather than as
    // `text-white` / `bg-white` / `bg-black`, and that is load-bearing.
    //
    // This page is permanently dark: the field behind it is an inline-styled
    // gradient, and the shell is a hardcoded #06101d. Neither can invert. The
    // utility versions do — Cosmic Mode repoints --color-white at #101a30 —
    // so `text-white` here resolved to deep navy on a deep navy page, 1.10:1,
    // and the glass panels and the play button went with it. Literals opt this
    // one page out of the inversion it was never built for. Standard Mode is
    // byte-for-byte what it was.
    <Screen
      className="bg-[#06101d] text-[#ffffff]"
      contentClassName="relative overflow-hidden px-5 pt-[max(20px,env(safe-area-inset-top))]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 18% 18%, rgba(77, 226, 255, 0.28), transparent 30%), radial-gradient(circle at 82% 28%, rgba(145, 108, 255, 0.3), transparent 34%), radial-gradient(circle at 50% 90%, rgba(255, 103, 176, 0.2), transparent 38%), linear-gradient(145deg, #071626 0%, #08101e 52%, #140d28 100%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between">
        <Link
          href="/vocabulary"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ffffff]/20 bg-[#ffffff]/10 text-[#ffffff] backdrop-blur"
          aria-label={isChinese ? "返回單字本" : "Back to vocabulary"}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>

        <div className="flex items-center gap-2 rounded-full border border-cyan-200/20 bg-[#ffffff]/10 px-3 py-2 text-xs font-semibold tracking-wide text-cyan-50 backdrop-blur">
          <Sparkles size={14} aria-hidden="true" />
          Yumi Voice
        </div>
      </header>

      <section className="relative z-10 flex min-h-[72dvh] flex-col items-center justify-center py-10 text-center">
        <div className="w-full rounded-[32px] border border-[#ffffff]/20 bg-[#ffffff]/[0.09] p-6 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] text-3xl font-black shadow-lg ${
              isChinese
                ? "border border-orange-300/50 bg-gradient-to-br from-[#20243b] to-[#03050d] text-[#ffffff] shadow-orange-950/30"
                : "bg-gradient-to-br from-[#ffd147] to-[#ff730a] text-[#221508] shadow-orange-950/30"
            }`}
          >
            {isChinese ? "ㄅ" : "A"}
          </div>

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.22em] text-cyan-100/70">
            {isChinese ? "繁體中文發音" : "English pronunciation"}
          </p>

          <h1 className="mt-3 break-words text-4xl font-black leading-tight text-[#ffffff]">
            {text || (isChinese ? "沒有可播放的文字" : "No text to play")}
          </h1>

          <p className="mt-4 min-h-6 text-sm text-[#ffffff]/65" aria-live="polite">
            {status}
          </p>

          <button
            type="button"
            onClick={play}
            disabled={!text || playbackState === "playing"}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffffff] px-5 py-3 font-bold text-[#071626] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {playbackState === "complete" || playbackState === "error" ? (
              <RotateCcw size={19} aria-hidden="true" />
            ) : (
              <Volume2
                size={19}
                className={playbackState === "playing" ? "animate-pulse" : ""}
                aria-hidden="true"
              />
            )}
            {isChinese ? "再播放一次" : "Play again"}
          </button>
        </div>

        <Link
          href="/pronunciation"
          className="mt-5 flex min-h-11 items-center gap-2 rounded-full border border-[#ffffff]/15 bg-[#000000]/15 px-5 py-2.5 text-sm font-semibold text-[#ffffff]/80 backdrop-blur"
        >
          <BookOpen size={17} aria-hidden="true" />
          {isChinese ? "前往發音練習室" : "Open pronunciation lab"}
        </Link>
      </section>
    </Screen>
  );
}
