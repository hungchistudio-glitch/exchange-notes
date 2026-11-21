"use client";

import { ArrowUpRight, Minus, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import OverlayPortal from "@/components/foundation/overlays/OverlayPortal";
import { SpeakKey, SpokenText } from "@/components/speech/Spoken";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import useVocabulary from "@/hooks/useVocabulary";
import { fill, plural } from "@/lib/i18n/format";
import { getLanguage } from "@/lib/languages";
import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/supabase/sessionUser";
import { buildStarMap, MAX_STARS, type Grouping } from "@/lib/vocabulary/starMap";

/* =========================================================
   The star chart of the library (Chi, 2026-11-15: 單字星圖)

   Full screen, over the library. The sky is lib/vocabulary/starMap.ts;
   this draws it, lets the reader zoom and pan it, and opens a word they
   tap: said aloud, lit as it is, and a way into its card in the library.
   Obsidian sky and glowing stars in Cosmic; ink on paper in Standard.
   ========================================================= */

/* How far the sky zooms: from the whole sky on a phone to a close look. */
const MIN_SCALE = 0.35;
const MAX_SCALE = 2;
const ZOOM_STEP = 1.3;

type CollectionRows = {
  collections: Array<{ id: string; name: string; emoji: string | null }>;
  members: Array<{ collection_id: string; vocabulary_item_id: string }>;
};

async function loadCollections(): Promise<CollectionRows> {
  const supabase = createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { collections: [], members: [] };
  const [collections, members] = await Promise.all([
    supabase.from("vocabulary_collections").select("id, name, emoji").eq("user_id", user.id).order("created_at"),
    supabase.from("vocabulary_collection_items").select("collection_id, vocabulary_item_id"),
  ]);
  return {
    collections: (collections.data ?? []) as CollectionRows["collections"],
    members: (members.data ?? []) as CollectionRows["members"],
  };
}

export default function VocabularyStarMap({ onClose }: { onClose: () => void }) {
  const { t, locale } = useTranslation();
  const copy = t.starMap;
  const statuses = t.vocabulary.search.statuses;
  const { items } = useVocabulary();
  const { learningLanguage, supportLanguage } = useDisplayLanguages();
  const [rows, setRows] = useState<CollectionRows | null>(null);
  /* Null until the sky is measured: then the whole of it, fitted. */
  const [scale, setScale] = useState<number | null>(null);
  const sky = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadCollections()
      .then((loaded) => alive && setRows(loaded))
      .catch(() => alive && setRows({ collections: [], members: [] }));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inLanguage = useMemo(
    () => items.filter((item) => item.word_language === learningLanguage || (item.texts as Record<string, string | undefined>)?.[learningLanguage]),
    [items, learningLanguage],
  );

  const map = useMemo(() => {
    const grouping: Grouping = {
      collections: (rows?.collections ?? []).map((collection) => ({
        key: collection.id,
        name: collection.name,
        emoji: collection.emoji ?? undefined,
        itemIds: (rows?.members ?? []).filter((member) => member.collection_id === collection.id).map((member) => member.vocabulary_item_id),
      })),
      categoryNames: copy.kinds as Record<string, string>,
    };
    return buildStarMap(inLanguage, learningLanguage, grouping);
  }, [inLanguage, learningLanguage, rows, copy.kinds]);

  const position = useMemo(() => new Map(map.stars.map((star) => [star.id, star])), [map]);
  const chosen = selected ? items.find((item) => item.id === selected) : undefined;
  const shown = scale ?? 1;

  /* Opened on the whole sky, fitted to the screen and centred. */
  useLayoutEffect(() => {
    const box = sky.current;
    if (!box || map.stars.length === 0) return;
    const fit = Math.min(1, (box.clientWidth - 16) / map.width, (box.clientHeight - 16) / map.height);
    setScale(Math.max(MIN_SCALE, fit));
  }, [map.width, map.height, map.stars.length]);

  /* Kept centred on the middle of what was in view as it zooms. */
  const zoomBy = (factor: number) => {
    const box = sky.current;
    setScale((current) => {
      const before = current ?? 1;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, before * factor));
      if (box) {
        const cx = (box.scrollLeft + box.clientWidth / 2) / before;
        const cy = (box.scrollTop + box.clientHeight / 2) / before;
        requestAnimationFrame(() => {
          box.scrollLeft = cx * next - box.clientWidth / 2;
          box.scrollTop = cy * next - box.clientHeight / 2;
        });
      }
      return next;
    });
  };
  const tag = getLanguage(learningLanguage).speechTag;
  const supportTag = getLanguage(supportLanguage).speechTag;
  const chosenWord = chosen
    ? ((chosen.texts as Record<string, string | undefined>)?.[learningLanguage] ?? chosen.word)
    : "";
  const chosenMeaning = chosen
    ? ((chosen.texts as Record<string, string | undefined>)?.[supportLanguage] ?? chosen.translation)
    : "";

  return (
    <OverlayPortal>
      <div className="star-map fixed inset-0 z-[70] flex flex-col" role="dialog" aria-modal="true" aria-labelledby="star-map-title">
        <header className="star-map-head flex items-start gap-3 px-5 pb-3 pt-[max(env(safe-area-inset-top),16px)]">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] opacity-70">
              <span className="hud-led" aria-hidden="true" />
              {copy.eyebrow}
            </p>
            <h2 id="star-map-title" className="mt-1 text-[1.5rem] font-bold tracking-[-0.02em]">{copy.title}</h2>
            <p className="mt-0.5 text-[0.8125rem] opacity-75">
              {plural(map.stars.length, locale, copy.subtitleOne, copy.subtitle)}
              {inLanguage.length > MAX_STARS ? ` ${fill(copy.newest, { count: MAX_STARS })}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="star-map-key flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          >
            <X size={18} />
          </button>
        </header>

        <div className="star-map-legend flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-2 text-[0.75rem]">
          {(["new", "learning", "mastered"] as const).map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <circle className={`star star-${status}`} cx="6" cy="6" r={status === "mastered" ? 4.5 : status === "learning" ? 3.5 : 2.5} />
              </svg>
              {statuses[status]}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={shown <= MIN_SCALE} aria-label={copy.zoomOut} className="star-map-key flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-35">
              <Minus size={15} />
            </button>
            <button type="button" onClick={() => zoomBy(ZOOM_STEP)} disabled={shown >= MAX_SCALE} aria-label={copy.zoomIn} className="star-map-key flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-35">
              <Plus size={15} />
            </button>
          </span>
        </div>

        <div ref={sky} className="star-map-sky flex min-h-0 flex-1 overflow-auto overscroll-contain" data-star-map="">
          {map.stars.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm opacity-75">{copy.empty}</p>
          ) : (
            <svg
              className="m-auto shrink-0"
              width={map.width * shown}
              height={map.height * shown}
              viewBox={`0 0 ${map.width} ${map.height}`}
              role="img"
              aria-label={plural(map.stars.length, locale, copy.subtitleOne, copy.subtitle)}
              onClick={() => setSelected(null)}
            >
              {map.lines.map((line) => {
                const from = position.get(line.from);
                const to = position.get(line.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={`${line.from}-${line.to}-${line.root ? "r" : "c"}`}
                    className={line.root ? "star-line star-line-root" : "star-line"}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                  />
                );
              })}
              {map.constellations.map((constellation) => (
                <text
                  key={constellation.key}
                  className="star-group-name"
                  x={constellation.x}
                  y={constellation.y - constellation.radius - 14}
                  textAnchor="middle"
                >
                  {constellation.emoji ? `${constellation.emoji} ` : ""}
                  {constellation.name}
                </text>
              ))}
              {map.stars.map((star, index) => (
                <g
                  key={star.id}
                  className="star-point"
                  role="button"
                  tabIndex={0}
                  aria-label={`${star.label} · ${statuses[star.status]}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelected(star.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(star.id);
                    }
                  }}
                >
                  {/* A wide, clear target around a small star. */}
                  <circle cx={star.x} cy={star.y} r={12} className="star-hit" />
                  <circle
                    className={`star star-${star.status}${selected === star.id ? " star-selected" : ""}`}
                    cx={star.x}
                    cy={star.y}
                    r={star.status === "mastered" ? 4.5 : star.status === "learning" ? 3.5 : 2.5}
                    style={{ animationDelay: `${(index % 9) * 0.4}s` }}
                  />
                  <text className="star-label" x={star.x + 7} y={star.y + 3.5}>
                    {star.label}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>

        {chosen ? (
          <div className="star-map-card hud-panel mx-4 mb-[max(env(safe-area-inset-bottom),16px)] mt-2 rounded-[24px] p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[1.375rem] font-bold leading-tight" lang={tag}>
                  <SpokenText text={chosenWord} lang={tag} />
                </p>
                {chosenMeaning ? (
                  <p className="mt-0.5 text-sm opacity-80" lang={supportTag}>
                    <SpokenText text={chosenMeaning} lang={supportTag} />
                  </p>
                ) : null}
                <p className="mt-1 text-[0.75rem] opacity-60">{statuses[chosen.status]}</p>
              </div>
              <SpeakKey text={chosenWord} lang={tag} iconSize={14} className="star-map-key flex h-11 w-11 shrink-0 items-center justify-center rounded-full" />
            </div>
            <Link
              href={`/vocabulary?widgetAction=open-word&widgetWordId=${encodeURIComponent(chosen.id)}`}
              onClick={onClose}
              className="star-map-open mt-3 flex h-11 items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold"
            >
              {copy.openWord}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <p className="star-map-hint px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 text-center text-[0.75rem] opacity-60">{copy.hint}</p>
        )}
      </div>
    </OverlayPortal>
  );
}
