"use client";

import { Shuffle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";

import PageTitle from "@/components/foundation/layout/PageTitle";
import Screen from "@/components/foundation/layout/Screen";
import ShareStudio, { type ShareFrame } from "@/components/share/ShareStudio";
import Yumi3DFigure, { type YumiCamera } from "@/components/yumi3d/Yumi3DFigure";
import useTranslation from "@/hooks/i18n/useTranslation";
import useCosmicMode from "@/hooks/useCosmicMode";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import usePageOrigin from "@/hooks/usePageOrigin";
import usePhonetics from "@/hooks/usePhonetics";
import useVocabulary from "@/hooks/useVocabulary";
import { friendInviteUrl, getProfileById } from "@/lib/friends";
import { fill } from "@/lib/i18n/format";
import { getLanguage } from "@/lib/languages";
import { loadActivity } from "@/lib/recap/activity";
import { markMilestoneSeen, parseMilestone } from "@/lib/recap/milestones";
import { drawShareCard, type ShareStat } from "@/lib/recap/shareCard";
import { buildWeekRecap, type AttemptRow, type ReviewRow, type WeekRecap } from "@/lib/recap/weekly";
import { isoWeek, loadHudFonts, readHudFonts, type HudFonts } from "@/lib/share/hud";
import { useWornOutfit } from "@/lib/shop/wornOutfit";
import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/supabase/sessionUser";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   The weekly recap card (Chi, 2026-11-15: 每週回顧卡, then 加入個人 3D Yumi)

   The last seven days in numbers (lib/recap/weekly.ts), with the reader's
   own Yumi standing on the card in what they have bought her; she can be
   turned, and the card keeps her as she was turned. It goes out through
   ShareStudio as an image or a six-second video of her one turn (lib/recap/shareCard.ts),
   9:16 for a story or 1:1 for a post, with the week's word as a small
   lesson and a QR code that adds the reader as a friend, so that what is
   shared brings people in. The word is the one reviewed most unless the
   reader chooses another from their library (Chi: 回顧卡的單字可自己挑).
   A milestone (?milestone=words-500) heads the card.
   ========================================================= */

/** How many of the library's words the picker lists at once. */
const PICKER_LIMIT = 40;

const textIn = (item: VocabularyItem, language: string) =>
  (item.texts as Record<string, string | undefined>)?.[language] ?? (item.word_language === language ? item.word : "");

export default function WeeklyRecap() {
  const { t, locale } = useTranslation();
  const copy = t.recap;
  const cosmic = useCosmicMode();
  const params = useSearchParams();
  const { items, loading } = useVocabulary();
  const { learningLanguage, supportLanguage } = useDisplayLanguages();
  const outfit = useWornOutfit();
  const origin = usePageOrigin();
  const [activity, setActivity] = useState<{ reviews: ReviewRow[]; attempts: AttemptRow[] } | null>(null);
  const [exchangeId, setExchangeId] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  /* Counts Yumi coming live and each turn of her ending: the card is made again. */
  const [turns, setTurns] = useState(0);
  const camera = useRef<YumiCamera | null>(null);
  const qrBox = useRef<HTMLDivElement | null>(null);
  const fonts = useRef<HudFonts | null>(null);
  const milestone = useMemo(() => parseMilestone(params.get("milestone")), [params]);

  useEffect(() => {
    let alive = true;
    loadActivity()
      .then((loaded) => alive && setActivity(loaded))
      .catch(() => alive && setActivity({ reviews: [], attempts: [] }));
    void (async () => {
      const supabase = createClient();
      const user = await getSessionUser(supabase);
      const profile = user ? await getProfileById(supabase, user.id) : null;
      if (alive && profile?.exchangeId) setExchangeId(profile.exchangeId);
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  /* A milestone opened here has been offered: the review page lets it go. */
  useEffect(() => {
    if (milestone) markMilestoneSeen(milestone.id);
  }, [milestone]);

  const recap: WeekRecap | null = useMemo(
    () => (loading || !activity ? null : buildWeekRecap({ items, reviews: activity.reviews, attempts: activity.attempts, learning: learningLanguage })),
    [activity, items, loading, learningLanguage],
  );

  /* The week's word, as a small lesson: the reader's choice, else the one
     reviewed most, else the newest kept. */
  const inLanguage = useMemo(
    () => items.filter((item) => textIn(item, learningLanguage)).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [items, learningLanguage],
  );
  const lessonItem = useMemo(() => {
    const chosen = chosenId ? items.find((item) => item.id === chosenId) : undefined;
    if (chosen) return chosen;
    if (!recap) return null;
    if (recap.topWord) return inLanguage.find((item) => textIn(item, learningLanguage) === recap.topWord) ?? null;
    return inLanguage[0] ?? null;
  }, [chosenId, inLanguage, items, learningLanguage, recap]);
  const lessonWord = lessonItem ? textIn(lessonItem, learningLanguage) || lessonItem.word : "";
  const lessonMeaning = lessonItem ? ((lessonItem.texts as Record<string, string | undefined>)?.[supportLanguage] ?? lessonItem.translation) : "";
  const phoneticsFor = usePhonetics(lessonWord ? [{ text: lessonWord, language: learningLanguage }] : []);
  const phonetics = lessonWord ? phoneticsFor({ text: lessonWord, language: learningLanguage }) : undefined;
  const lessonReading = [phonetics?.zhuyin, phonetics?.pinyin, phonetics?.ipa ? `/${phonetics.ipa.replace(/^\/|\/$/g, "")}/` : undefined]
    .filter(Boolean)
    .join("  ");

  const choices = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const found = needle
      ? inLanguage.filter((item) =>
          [textIn(item, learningLanguage), textIn(item, supportLanguage), item.translation].some((text) => text?.toLocaleLowerCase().includes(needle)),
        )
      : inLanguage;
    return found.slice(0, PICKER_LIMIT);
  }, [inLanguage, learningLanguage, query, supportLanguage]);

  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const range = recap ? fill(copy.range, { from: date.format(recap.from), to: date.format(recap.to) }) : "";
  const headline = milestone
    ? fill(milestone.kind === "words" ? copy.milestoneWords : copy.milestoneStreak, { n: milestone.value })
    : null;
  const stats: ShareStat[] = recap
    ? [
        { label: copy.newWords, value: String(recap.newWords) },
        { label: copy.reviews, value: String(recap.reviews) },
        { label: copy.accuracy, value: recap.accuracy === null ? "—" : `${recap.accuracy}%` },
        { label: copy.lab, value: String(recap.labPractice) },
        { label: copy.activeDays, value: fill(copy.activeDaysValue, { n: recap.activeDays }), days: recap.days },
        { label: copy.streak, value: String(recap.streak) },
      ]
    : [];
  const quiet = recap ? recap.newWords + recap.reviews + recap.labPractice === 0 : false;
  const inviteUrl = exchangeId && origin ? friendInviteUrl(exchangeId, origin) : null;
  const host = origin ? origin.replace(/^https?:\/\//, "") : "";
  const footer = recap ? fill(copy.footer, { count: recap.totalWords }) : "";
  const lesson = lessonWord
    ? { label: copy.lessonLabel, word: lessonWord, reading: lessonReading || undefined, meaning: lessonMeaning || undefined }
    : null;

  const draw = (ctx: CanvasRenderingContext2D, frame: ShareFrame) =>
    drawShareCard(ctx, {
      ...frame,
      cosmic,
      fonts: fonts.current ?? undefined,
      title: copy.title,
      range,
      code: recap ? `WK ${String(isoWeek(recap.to)).padStart(2, "0")}` : undefined,
      headline,
      stats,
      lesson,
      footer,
      link: host || undefined,
      yumi: camera.current?.canvas ?? null,
      qr: qrBox.current?.querySelector("canvas") ?? null,
      qrLabel: inviteUrl ? copy.qrLabel : undefined,
    });
  const prepare = async () => {
    const read = (fonts.current ??= readHudFonts());
    await loadHudFonts(read, [copy.title, headline, footer, lessonWord, lessonMeaning, copy.lessonLabel, ...stats.map((stat) => stat.label)].join(""));
  };
  const version = JSON.stringify([cosmic, range, headline, stats, lesson, footer, inviteUrl, host, turns]);
  const tag = getLanguage(learningLanguage).speechTag;

  return (
    <Screen>
      <PageTitle back={{ href: "/review", label: t.common.back }} eyebrow={copy.eyebrow} title={copy.title} subtitle={range || undefined} />

      <div className="space-y-4 px-4 pb-10 sm:px-6">
        <section className="hud-panel recap-card rounded-[28px] border border-line bg-white p-6" aria-live="polite">
          {headline ? <p className="recap-headline mb-1 text-lg font-bold">{headline}</p> : null}

          {/* Her own Yumi, in what they have bought her; turned, she is shared
              as she is turned. */}
          <div className="recap-yumi -mx-2 h-[220px]" onPointerUp={() => setTurns((count) => count + 1)}>
            <Yumi3DFigure inspect outfit={outfit} cameraRef={camera} fill={0.36} prepare="idle" onLive={() => setTurns((count) => count + 1)} />
          </div>
          <p className="-mt-1 mb-4 text-center text-[0.6875rem] text-ink-faint">{t.shareStudio.turnHint}</p>

          {!recap ? (
            <p className="py-6 text-center text-sm text-ink-soft">{t.common.loading}</p>
          ) : (
            <>
              {quiet ? <p className="mb-4 text-sm leading-6 text-ink-soft">{copy.quiet}</p> : null}
              <dl className="grid grid-cols-2 gap-x-5 gap-y-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col-reverse">
                    <dt className="mt-1.5 text-[0.75rem] font-semibold text-ink-soft">{stat.label}</dt>
                    <dd className="hud-figure recap-figure text-[2.25rem] font-bold leading-none">{stat.value}</dd>
                    {stat.days ? (
                      <span className="recap-days mb-2 flex gap-1" aria-hidden="true">
                        {stat.days.map((on, index) => (
                          <span key={index} className="h-1.5 flex-1 rounded-sm" data-on={on ? "" : undefined} />
                        ))}
                      </span>
                    ) : null}
                  </div>
                ))}
              </dl>
              {lessonWord ? (
                <div className="recap-lesson mt-6 rounded-2xl bg-surface px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">{copy.lessonLabel}</p>
                      <p className="mt-1 text-[1.375rem] font-bold" lang={tag}>{lessonWord}</p>
                      {lessonReading ? <p className="font-phonetic text-[0.8125rem] text-ink-soft">{lessonReading}</p> : null}
                      {lessonMeaning ? <p className="mt-0.5 text-sm" lang={getLanguage(supportLanguage).speechTag}>{lessonMeaning}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPicking((open) => !open)}
                      aria-expanded={picking}
                      aria-controls="recap-word-picker"
                      className="recap-pick flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[0.8125rem] font-semibold"
                    >
                      <Shuffle size={14} aria-hidden="true" />
                      {copy.pickWord}
                    </button>
                  </div>
                  {picking ? (
                    <div id="recap-word-picker" className="mt-3">
                      <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={copy.pickWordSearch}
                        aria-label={copy.pickWordSearch}
                        className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
                      />
                      <ul className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto py-1">
                        <li>
                          <button
                            type="button"
                            aria-pressed={!chosenId}
                            onClick={() => {
                              setChosenId(null);
                              setPicking(false);
                            }}
                            className="recap-choice rounded-full border border-line px-3 py-1.5 text-[0.8125rem] font-semibold"
                          >
                            {copy.pickWordAuto}
                          </button>
                        </li>
                        {choices.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              lang={tag}
                              aria-pressed={chosenId === item.id}
                              onClick={() => {
                                setChosenId(item.id);
                                setPicking(false);
                              }}
                              className="recap-choice rounded-full border border-line px-3 py-1.5 text-[0.8125rem] font-semibold"
                            >
                              {textIn(item, learningLanguage)}
                            </button>
                          </li>
                        ))}
                      </ul>
                      {query && choices.length === 0 ? <p className="mt-1 text-[0.8125rem] text-ink-soft">{copy.pickWordEmpty}</p> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <p className="mt-3 text-[0.75rem] text-ink-faint">{footer}</p>
            </>
          )}
        </section>

        <ShareStudio
          draw={draw}
          camera={camera}
          version={version}
          disabled={!recap}
          prepare={prepare}
          fileStem="exchange-notes-week"
          shareTitle={copy.title}
        />
        {inviteUrl ? <p className="text-center text-[0.6875rem] text-ink-faint">{copy.qrHint}</p> : null}

        {/* The friend code drawn into the image, kept off screen. */}
        <div ref={qrBox} className="hidden" aria-hidden="true">
          {inviteUrl ? <QRCodeCanvas value={inviteUrl} size={340} marginSize={1} /> : null}
        </div>
      </div>
    </Screen>
  );
}
