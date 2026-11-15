"use client";

import { Headphones, Newspaper, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import PageTitle from "@/components/foundation/layout/PageTitle";
import Screen from "@/components/foundation/layout/Screen";
import { SpokenText } from "@/components/speech/Spoken";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import useVocabulary from "@/hooks/useVocabulary";
import { fill } from "@/lib/i18n/format";
import { MAX_NEWS, newsItems, wordItems, type ListenItem } from "@/lib/listen/playlist";
import { playSpoken, stopSpoken } from "@/lib/spokenWords";
import type { DailyNewsCard } from "@/lib/types/dailyNews";

/* =========================================================
   Listening mode (Chi, 2026-11-15: 通勤收聽模式)

   One key reads today's due words, each with its meaning and example, and
   then the day's news, one item after another with a breath between. Each
   word lights as it is said, as on every speaker. Built for a walk or a
   ride:

   - The screen is kept awake while it plays (Wake Lock). A phone's browser
     stops speaking when the screen locks, and a commute is exactly when it
     would.
   - The phone's own media controls (Media Session) play, pause and skip
     where the platform offers them for a web page.
   - Pausing stops and remembers the item; playing again starts it over,
     which every engine does the same way, unlike speechSynthesis.pause().
   ========================================================= */

/** The breath between two items. */
const GAP_MS = 900;
const RUN = "listen";

type WakeLockSentinelLike = { release: () => Promise<void> };

async function fetchNews(signal: AbortSignal): Promise<DailyNewsCard[]> {
  const response = await fetch("/api/daily-news", { cache: "no-store", signal, headers: { Accept: "application/json" } });
  if (!response.ok) return [];
  const payload = (await response.json()) as { cards?: DailyNewsCard[] };
  return (payload.cards ?? []).slice(0, MAX_NEWS * 2);
}

export default function ListenMode() {
  const { t } = useTranslation();
  const copy = t.listen;
  const params = useSearchParams();
  const { items, loading } = useVocabulary();
  const { learningLanguage, supportLanguage } = useDisplayLanguages();

  const [withWords, setWithWords] = useState(params.get("from") !== "news");
  const [withNews, setWithNews] = useState(true);
  const [cards, setCards] = useState<DailyNewsCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const gap = useRef<number | null>(null);
  /* Each item played gets a number, so the callbacks of one that has been
     replaced (by the next, or by a skip) change nothing. */
  const playing_ = useRef(0);
  const wake = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchNews(controller.signal).then(setCards).catch(() => setCards([]));
    return () => controller.abort();
  }, []);

  const words = useMemo(
    () => (loading ? [] : wordItems(items, learningLanguage, supportLanguage)),
    [items, loading, learningLanguage, supportLanguage],
  );
  const news = useMemo(() => newsItems(cards ?? [], learningLanguage), [cards, learningLanguage]);
  const list = useMemo<ListenItem[]>(
    () => [...(withWords ? words : []), ...(withNews ? news : [])],
    [withWords, words, withNews, news],
  );
  const current = list[Math.min(index, Math.max(0, list.length - 1))];

  const clearGap = () => {
    if (gap.current !== null) window.clearTimeout(gap.current);
    gap.current = null;
  };

  /* Plays one item; at its end, after a breath, the next. Read from a ref so
     a callback from an item that has since been replaced plays nothing. */
  const playAtRef = useRef<(at: number) => void>(() => undefined);
  const playAt = useCallback(
    (at: number) => {
      clearGap();
      const item = list[at];
      if (!item) {
        setPlaying(false);
        setDone(true);
        stopSpoken();
        return;
      }
      const own = ++playing_.current;
      const onward = () => {
        if (own !== playing_.current) return;
        gap.current = window.setTimeout(() => playAtRef.current(at + 1), GAP_MS);
      };
      playSpoken({
        run: RUN,
        parts: item.parts,
        wordByWord: false,
        onEnd: onward,
        onError: onward,
        onCancel: () => {
          if (own === playing_.current) setPlaying(false);
        },
      });
      setIndex(at);
      setDone(false);
      setPlaying(true);
    },
    [list],
  );
  useEffect(() => {
    playAtRef.current = playAt;
  }, [playAt]);

  const pause = useCallback(() => {
    clearGap();
    playing_.current += 1;
    stopSpoken();
    setPlaying(false);
  }, []);

  useEffect(() => () => {
    clearGap();
    stopSpoken();
  }, []);

  /* Awake while playing; asked again when the page comes back to the front,
     since the platform lets a hidden page's lock go. */
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };
    if (!playing || !nav.wakeLock) return;
    let released = false;
    const take = () => {
      nav.wakeLock?.request("screen").then((lock) => {
        if (released) void lock.release();
        else wake.current = lock;
      }).catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") take();
    };
    take();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      void wake.current?.release().catch(() => undefined);
      wake.current = null;
    };
  }, [playing]);

  /* The phone's own controls, where the platform shows them for a page. */
  useEffect(() => {
    const session = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!session) return;
    try {
      if (current && typeof MediaMetadata !== "undefined") {
        session.metadata = new MediaMetadata({
          title: current.parts[0]?.text ?? copy.title,
          artist: current.parts[1]?.text ?? "",
          album: copy.title,
        });
      }
      session.playbackState = playing ? "playing" : "paused";
      session.setActionHandler("play", () => playAtRef.current(index));
      session.setActionHandler("pause", pause);
      session.setActionHandler("nexttrack", () => playAtRef.current(index + 1));
      session.setActionHandler("previoustrack", () => playAtRef.current(Math.max(0, index - 1)));
    } catch {
      /* An action this platform does not take: the page's own keys remain. */
    }
    return () => {
      try {
        for (const action of ["play", "pause", "nexttrack", "previoustrack"] as const) session.setActionHandler(action, null);
      } catch {
        /* Nothing to undo. */
      }
    };
  }, [current, index, pause, playing, copy.title]);

  const waiting = loading || cards === null;
  const empty = !waiting && list.length === 0;

  const toggle = (which: "words" | "news") => {
    pause();
    setIndex(0);
    setDone(false);
    if (which === "words") setWithWords((on) => !on);
    else setWithNews((on) => !on);
  };

  return (
    <Screen>
      <PageTitle
        back={{ href: params.get("from") === "news" ? "/discover" : "/review", label: t.common.back }}
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      <div className="space-y-4 px-4 pb-10 sm:px-6">
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={copy.sources}>
          {(
            [
              ["words", withWords, words.length, copy.words, Headphones],
              ["news", withNews, news.length, copy.news, Newspaper],
            ] as const
          ).map(([which, on, count, label, Icon]) => (
            <button
              key={which}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => toggle(which)}
              className={`listen-source flex h-9 items-center gap-2 rounded-full border px-3.5 text-[0.8125rem] font-semibold transition-colors ${
                on ? "border-black bg-black text-white" : "border-black/15 bg-white text-ink-soft"
              }`}
              data-on={on ? "" : undefined}
            >
              <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
              {fill(label, { count })}
            </button>
          ))}
        </div>

        <section className="hud-panel listen-deck rounded-[28px] border border-line bg-white p-6" aria-live="polite">
          {waiting ? (
            <p className="py-10 text-center text-sm text-ink-soft">{t.common.loading}</p>
          ) : empty ? (
            <p className="py-10 text-center text-sm leading-6 text-ink-soft">{copy.empty}</p>
          ) : done ? (
            <div className="py-8 text-center">
              <p className="text-lg font-semibold">{copy.done}</p>
              <button
                type="button"
                onClick={() => playAt(0)}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold"
              >
                <RotateCcw size={15} aria-hidden="true" />
                {copy.again}
              </button>
            </div>
          ) : current ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="hud-led" data-state={playing ? "alert" : "off"} aria-hidden="true" />
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  {current.kind === "word" ? copy.wordKind : copy.newsKind}
                </span>
                <span className="hud-figure ml-auto text-[0.75rem] text-ink-soft">
                  {fill(copy.progress, { n: index + 1, total: list.length })}
                </span>
              </div>

              <div className="mt-5 space-y-3" data-listen-now="">
                {current.parts.map((part, at) => (
                  <p
                    key={`${current.id}-${at}`}
                    lang={part.lang}
                    className={
                      at === 0
                        ? current.kind === "word"
                          ? "text-[2rem] font-bold leading-tight tracking-[-0.02em]"
                          : "text-[1.25rem] font-bold leading-snug"
                        : at === 1 && current.kind === "word"
                          ? "text-[1.0625rem] text-ink-soft"
                          : "text-[0.9375rem] leading-7 text-ink-strong"
                    }
                  >
                    <SpokenText text={part.text} lang={part.lang} />
                  </p>
                ))}
              </div>

              <div className="mt-7 flex items-center justify-center gap-5">
                <button
                  type="button"
                  onClick={() => playAt(Math.max(0, index - 1))}
                  disabled={index === 0}
                  aria-label={copy.previous}
                  title={copy.previous}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-line disabled:opacity-35"
                >
                  <SkipBack size={18} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => (playing ? pause() : playAt(index))}
                  aria-label={playing ? copy.pause : copy.play}
                  title={playing ? copy.pause : copy.play}
                  aria-pressed={playing}
                  className="listen-play flex h-16 w-16 items-center justify-center rounded-full bg-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-transform active:scale-95"
                >
                  {playing ? (
                    <Pause size={24} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                  ) : (
                    <Play size={24} fill="currentColor" strokeWidth={0} className="translate-x-0.5" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => playAt(index + 1)}
                  disabled={index >= list.length - 1}
                  aria-label={copy.next}
                  title={copy.next}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-line disabled:opacity-35"
                >
                  <SkipForward size={18} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                </button>
              </div>

              <p className="mt-5 text-center text-[0.6875rem] leading-4 text-ink-faint">{copy.screenOn}</p>
            </>
          ) : null}
        </section>

        {!waiting && !empty && list.length > 1 ? (
          <section aria-label={copy.upNext}>
            <p className="px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">{copy.upNext}</p>
            <ol className="mt-2 space-y-1.5">
              {list.map((item, at) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => playAt(at)}
                    aria-current={at === index ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                      at === index ? "listen-row-now bg-black/[0.06]" : "bg-surface"
                    }`}
                  >
                    <span className="hud-figure w-6 shrink-0 text-[0.75rem] text-ink-faint">{at + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-semibold" lang={item.parts[0]?.lang}>
                        {item.parts[0]?.text}
                      </span>
                      {item.parts[1] ? (
                        <span className="block truncate text-[0.75rem] text-ink-soft" lang={item.parts[1].lang}>
                          {item.parts[1].text}
                        </span>
                      ) : null}
                    </span>
                    {item.kind === "news" ? <Newspaper size={14} className="shrink-0 text-ink-faint" aria-hidden="true" /> : null}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </Screen>
  );
}
