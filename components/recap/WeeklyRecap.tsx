"use client";

import { Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import PageTitle from "@/components/foundation/layout/PageTitle";
import Screen from "@/components/foundation/layout/Screen";
import useTranslation from "@/hooks/i18n/useTranslation";
import useCosmicMode from "@/hooks/useCosmicMode";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import useVocabulary from "@/hooks/useVocabulary";
import { fill } from "@/lib/i18n/format";
import { buildWeekRecap, type AttemptRow, type ReviewRow, type WeekRecap } from "@/lib/recap/weekly";
import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/supabase/sessionUser";

/* =========================================================
   The weekly recap card (Chi, 2026-11-15: 每週回顧卡)

   The last seven days as one card in the HUD's style (lib/recap/weekly.ts),
   and the same card drawn as an image to keep or share. The image is drawn
   on a canvas from the numbers, not photographed from the page, so it looks
   the same on every phone and carries nothing but what is on the card.
   ========================================================= */

const MONTH_MS = 30 * 86_400_000;

async function loadActivity(): Promise<{ reviews: ReviewRow[]; attempts: AttemptRow[] }> {
  const supabase = createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { reviews: [], attempts: [] };
  const since = new Date(Date.now() - MONTH_MS).toISOString();
  const [reviews, attempts] = await Promise.all([
    supabase.from("review_events").select("vocabulary_item_id, grade, created_at").eq("user_id", user.id).gte("created_at", since),
    supabase.from("pronunciation_attempts").select("score, created_at").eq("user_id", user.id).gte("created_at", since),
  ]);
  return {
    reviews: (reviews.data ?? []) as ReviewRow[],
    attempts: (attempts.data ?? []) as AttemptRow[],
  };
}

type Stat = { label: string; value: string };

/** The card as an image: 1080 × 1350, a phone's story ratio. */
function drawRecap(canvas: HTMLCanvasElement, title: string, range: string, stats: Stat[], footer: string, highlight: string | null, cosmic: boolean) {
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const ink = cosmic ? "#e4ecee" : "#1d1b17";
  const soft = cosmic ? "rgba(228,236,238,0.62)" : "rgba(29,27,23,0.58)";
  const accent = cosmic ? "#86d8d2" : "#1d9e75";

  ctx.fillStyle = cosmic ? "#070b10" : "#f6f1e7";
  ctx.fillRect(0, 0, width, height);
  if (cosmic) {
    for (let star = 0; star < 160; star++) {
      const x = (star * 7919) % width;
      const y = (star * 104729) % height;
      ctx.fillStyle = `rgba(228,236,238,${0.15 + ((star * 37) % 60) / 100})`;
      ctx.beginPath();
      ctx.arc(x, y, (star % 3) * 0.8 + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* The HUD's corner brackets. */
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  const corner = (x: number, y: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 60);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 60, y);
    ctx.stroke();
  };
  corner(60, 60, 1, 1);
  corner(width - 60, 60, -1, 1);
  corner(60, height - 60, 1, -1);
  corner(width - 60, height - 60, -1, -1);

  const font = (size: number, weight = 600) => `${weight} ${size}px system-ui, -apple-system, "PingFang TC", "Noto Sans TC", sans-serif`;
  ctx.fillStyle = soft;
  ctx.font = font(34, 600);
  ctx.fillText(range, 110, 170);
  ctx.fillStyle = ink;
  ctx.font = font(84, 800);
  ctx.fillText(title, 110, 270);

  stats.forEach((stat, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 110 + column * 450;
    const y = 420 + row * 230;
    ctx.fillStyle = accent;
    ctx.font = font(112, 800);
    ctx.fillText(stat.value, x, y);
    ctx.fillStyle = soft;
    ctx.font = font(36, 600);
    ctx.fillText(stat.label, x, y + 56);
  });

  if (highlight) {
    ctx.fillStyle = ink;
    ctx.font = font(48, 700);
    ctx.fillText(highlight, 110, height - 210);
  }
  ctx.fillStyle = soft;
  ctx.font = font(32, 600);
  ctx.fillText(footer, 110, height - 120);
}

export default function WeeklyRecap() {
  const { t, locale } = useTranslation();
  const copy = t.recap;
  const cosmic = useCosmicMode();
  const { items, loading } = useVocabulary();
  const { learningLanguage } = useDisplayLanguages();
  const [activity, setActivity] = useState<{ reviews: ReviewRow[]; attempts: AttemptRow[] } | null>(null);
  const [notice, setNotice] = useState("");
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    loadActivity()
      .then((loaded) => alive && setActivity(loaded))
      .catch(() => alive && setActivity({ reviews: [], attempts: [] }));
    return () => {
      alive = false;
    };
  }, []);

  const recap: WeekRecap | null = useMemo(
    () => (loading || !activity ? null : buildWeekRecap({ items, reviews: activity.reviews, attempts: activity.attempts, learning: learningLanguage })),
    [activity, items, loading, learningLanguage],
  );

  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const range = recap ? fill(copy.range, { from: date.format(recap.from), to: date.format(recap.to) }) : "";
  const stats: Stat[] = recap
    ? [
        { label: copy.newWords, value: String(recap.newWords) },
        { label: copy.reviews, value: String(recap.reviews) },
        { label: copy.accuracy, value: recap.accuracy === null ? "—" : `${recap.accuracy}%` },
        { label: copy.lab, value: String(recap.labPractice) },
        { label: copy.activeDays, value: fill(copy.activeDaysValue, { n: recap.activeDays }) },
        { label: copy.streak, value: String(recap.streak) },
      ]
    : [];
  const quiet = recap ? recap.newWords + recap.reviews + recap.labPractice === 0 : false;

  async function share() {
    if (!recap || !canvas.current) return;
    drawRecap(
      canvas.current,
      copy.title,
      range,
      stats,
      fill(copy.footer, { count: recap.totalWords }),
      recap.topWord ? fill(copy.topWordLine, { word: recap.topWord }) : null,
      cosmic,
    );
    const blob = await new Promise<Blob | null>((resolve) => canvas.current!.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], "exchange-notes-week.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: copy.title });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setNotice(copy.downloaded);
  }

  return (
    <Screen>
      <PageTitle back={{ href: "/review", label: t.common.back }} eyebrow={copy.eyebrow} title={copy.title} subtitle={range || undefined} />

      <div className="space-y-4 px-4 pb-10 sm:px-6">
        <section className="hud-panel recap-card rounded-[28px] border border-line bg-white p-6" aria-live="polite">
          {!recap ? (
            <p className="py-10 text-center text-sm text-ink-soft">{t.common.loading}</p>
          ) : (
            <>
              {quiet ? <p className="mb-4 text-sm leading-6 text-ink-soft">{copy.quiet}</p> : null}
              <dl className="grid grid-cols-2 gap-x-5 gap-y-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col-reverse">
                    <dt className="mt-1.5 text-[0.75rem] font-semibold text-ink-soft">{stat.label}</dt>
                    <dd className="hud-figure recap-figure text-[2.25rem] font-bold leading-none">{stat.value}</dd>
                  </div>
                ))}
              </dl>
              {recap.topWord ? (
                <p className="mt-6 border-t border-line pt-4 text-[0.9375rem] font-semibold" lang={learningLanguage}>
                  {fill(copy.topWordLine, { word: recap.topWord })}
                </p>
              ) : null}
              <p className="mt-2 text-[0.75rem] text-ink-faint">{fill(copy.footer, { count: recap.totalWords })}</p>
            </>
          )}
        </section>

        <button
          type="button"
          onClick={() => void share()}
          disabled={!recap}
          className="ob-key flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
        >
          <Share2 size={16} aria-hidden="true" />
          {copy.share}
        </button>
        {notice ? <p className="text-center text-[0.75rem] text-ink-soft" role="status">{notice}</p> : null}
        <canvas ref={canvas} className="hidden" aria-hidden="true" />
      </div>
    </Screen>
  );
}
