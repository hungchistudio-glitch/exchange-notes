"use client";

import ComprehensionGauge from "@/components/discover/ComprehensionGauge";
import { requestLaserScan } from "@/lib/discover/laserScan";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { plural } from "@/lib/i18n/format";
import type { MouseEvent } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";

import type { TranslationDictionary } from "@/lib/i18n/types";

import AudioRail from "./AudioRail";
import { SpokenText } from "@/components/speech/Spoken";
import useKnownWords from "@/hooks/useKnownWords";
import { getLanguage } from "@/lib/languages";
import { DISCOVER_COLORS, categoryAccent, type AudioPlaybackMode, type DailyNewsCard } from "./types";

type FeaturedStoryCardProps = {
  card: DailyNewsCard;
  copy: TranslationDictionary["discover"];
  categoryText: string;
  formattedTime: string;
  onOpen: () => void;
  isAudioPlaying: boolean;
  audioProgress: number;
  audioMode: AudioPlaybackMode;
  onAudioModeChange: (mode: AudioPlaybackMode) => void;
  onToggleAudio: () => void;
  onExploreImage: () => void;
};

// A quiet, abstract mark in the upper-right quadrant — used only as a
// fallback when the article has no photo, so the card still has some
// atmosphere rather than a blank top edge.
function EditorialMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 240"
      className="pointer-events-none absolute -right-6 -top-10 h-[220px] w-[220px] opacity-[0.08]"
    >
      <circle cx="150" cy="90" r="95" fill="none" stroke={DISCOVER_COLORS.accent} strokeWidth="1.2" />
      <circle cx="150" cy="90" r="70" fill="none" stroke={DISCOVER_COLORS.accent} strokeWidth="1" />
      <circle cx="150" cy="90" r="45" fill="none" stroke={DISCOVER_COLORS.accent} strokeWidth="1" />
      <line x1="150" y1="-5" x2="150" y2="185" stroke={DISCOVER_COLORS.accent} strokeWidth="0.75" />
      <line x1="55" y1="90" x2="245" y2="90" stroke={DISCOVER_COLORS.accent} strokeWidth="0.75" />
    </svg>
  );
}

export default function FeaturedStoryCard({
  card,
  copy,
  categoryText,
  formattedTime,
  onOpen,
  isAudioPlaying,
  audioProgress,
  audioMode,
  onAudioModeChange,
  onToggleAudio,
  onExploreImage,
}: FeaturedStoryCardProps) {
  const { locale } = useTranslation();
  const { pair } = useDisplayLanguages();
  const { marksFor, lookUp } = useKnownWords();
  /*
   * The two languages the reader chose, and only those. A card that cannot
   * lead in the language being learned is filtered out upstream rather than
   * shown in a language nobody asked for.
   */
  const [primaryLanguage, secondaryLanguage] = pair;
  /* A held word: Yumi's eye scans it and its meaning comes up beside it
     (lib/discover/laserScan.ts); the full lookup where nothing draws that. */
  const laser = (language: typeof primaryLanguage, meaningLanguage: typeof primaryLanguage) =>
    lookUp
      ? (word: string, rect?: DOMRect) => {
          if (rect && requestLaserScan({ word, rect, language, meaningLanguage, storyWords: card.vocabulary })) return;
          lookUp(word);
        }
      : undefined;

  const accent = categoryAccent(card.category);
  const gaugeText = `${card.titles[primaryLanguage] ?? ""} ${card.summaries[primaryLanguage] ?? ""}`;
  // Stored captions were generated from article text without seeing the photo.
  // Keep them out of both the UI and alt text, including older cached cards.
  // The adjacent headline is the accessible story entry; restore photo
  // descriptions only when the feed carries verified image-specific metadata.

  function handleExploreImage(event: MouseEvent) {
    event.stopPropagation();
    onExploreImage();
  }

  return (
    <article
      className="ob-edge relative overflow-hidden rounded-[26px]"
      style={{
        backgroundColor: DISCOVER_COLORS.card,
        boxShadow: "0 1px 2px rgba(18,18,18,0.04)",
      }}
    >
      {card.imageUrl ? (
        // Image at the top, not behind the text — a background image would
        // read as advertising and hurt bilingual readability. Height is a
        // fixed ~38% share of the card rather than a locked aspect ratio,
        // since summary length varies. Placeholder fill + opacity fade-in
        // on load avoids a layout jump without needing real blurhash data.
        // `fill` needs a positioned box of its own, which is also where the
        // placeholder colour now lives. It used to sit on the image itself,
        // where opacity-0 made it invisible until the moment it was covered by
        // the loaded image — so the fill it describes never actually showed.
        <div
          className="relative h-[165px] w-full"
          style={{ backgroundColor: DISCOVER_COLORS.divider }}
        >
          <Image
            src={card.imageUrl}
            alt=""
            fill
            // Full-bleed inside the card, which is itself capped at the
            // reading column, so one breakpoint is enough.
            sizes="(max-width: 768px) 100vw, 768px"
            // This is the LCP element on Discover. priority preloads it
            // instead of leaving it to be discovered during layout.
            priority
            onClick={onOpen}
            onLoad={(event) => {
              event.currentTarget.style.opacity = "1";
            }}
            className="cursor-pointer object-cover opacity-0 transition-opacity duration-500"
          />
        </div>
      ) : (
        <>
        <EditorialMark />
        {/*
          How much of it the reader can already read (Chi, 2026-11-28:
          理解度掃描儀), at the centre of the scope drawn in the corner, as
          the reading an instrument would give there.
        */}
        <span className="absolute right-[58px] top-[42px] z-[1] -translate-y-1/2 translate-x-1/2">
          <ComprehensionGauge text={gaugeText} language={primaryLanguage} copy={copy.comprehension} size="scope" />
        </span>
        </>
      )}

      {card.imageUrl && card.vocabulary.length > 0 ? (
        <button
          type="button"
          onClick={handleExploreImage}
          className="mt-2 flex items-center gap-1.5 px-7 text-[0.75rem] font-medium transition-opacity active:opacity-70"
          style={{ color: accent }}
        >
          <ZoomIn size={13} strokeWidth={1.8} />
          {plural(
            card.vocabulary.length,
            locale,
            copy.exploreImageLabelOne,
            copy.exploreImageLabel
          )}
        </button>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
        className={`relative block w-full cursor-pointer px-7 text-left ${
          card.imageUrl ? "pt-4" : "pt-8"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em]"
            style={{ color: accent }}
          >
            {categoryText}
          </span>

          <span
            className="text-[0.6875rem]"
            style={{ color: DISCOVER_COLORS.textSecondary }}
          >
            {formattedTime}
          </span>

          {/* With a photo there is no scope to sit in: the small reading. */}
          {card.imageUrl ? (
            <ComprehensionGauge text={gaugeText} language={primaryLanguage} copy={copy.comprehension} size="sm" />
          ) : null}
        </div>

        {/*
          Bilingual headline block. While the full story plays, the words
          light as they are said (Chi, 2026-11-14), and the language being
          read is shown whole, so the light never runs on past a clamp.
        */}
        <h2
          className={`mt-4 ${isAudioPlaying && audioMode === "primary" ? "" : "line-clamp-3"} text-[1.875rem] font-bold leading-[1.16] tracking-[-0.02em]`}
          style={{ color: DISCOVER_COLORS.text }}
        >
          <SpokenText text={card.titles[primaryLanguage] ?? ""} lang={getLanguage(primaryLanguage).speechTag} marks={marksFor(card.titles[primaryLanguage] ?? "", getLanguage(primaryLanguage).speechTag)} onLongPressWord={laser(primaryLanguage, secondaryLanguage)} />
        </h2>

        <p
          className="mt-2.5 text-[1rem] font-medium leading-[1.55] tracking-[0.005em]"
          style={{ color: DISCOVER_COLORS.textSecondary }}
        >
          <SpokenText text={card.titles[secondaryLanguage] ?? ""} lang={getLanguage(secondaryLanguage).speechTag} marks={marksFor(card.titles[secondaryLanguage] ?? "", getLanguage(secondaryLanguage).speechTag)} onLongPressWord={laser(secondaryLanguage, primaryLanguage)} />
        </p>

        {/* Short summary */}
        <p
          className={`mt-4 ${isAudioPlaying && audioMode === "primary" ? "" : "line-clamp-2"} text-[0.9375rem] leading-[1.6]`}
          style={{ color: DISCOVER_COLORS.textSecondary }}
        >
          <SpokenText text={card.summaries[primaryLanguage] ?? ""} lang={getLanguage(primaryLanguage).speechTag} marks={marksFor(card.summaries[primaryLanguage] ?? "", getLanguage(primaryLanguage).speechTag)} onLongPressWord={laser(primaryLanguage, secondaryLanguage)} />
        </p>

        <p
          className={`mt-1 ${isAudioPlaying && audioMode === "secondary" ? "" : "line-clamp-1"} text-[0.84375rem] leading-[1.6]`}
          style={{ color: DISCOVER_COLORS.textSecondary }}
        >
          <SpokenText text={card.summaries[secondaryLanguage] ?? ""} lang={getLanguage(secondaryLanguage).speechTag} marks={marksFor(card.summaries[secondaryLanguage] ?? "", getLanguage(secondaryLanguage).speechTag)} onLongPressWord={laser(secondaryLanguage, primaryLanguage)} />
        </p>
      </div>

      <div className="relative px-7 pb-7">
        <AudioRail
          copy={copy}
          isPlaying={isAudioPlaying}
          progress={audioProgress}
          mode={audioMode}
          pair={pair}
          onModeChange={onAudioModeChange}
          onTogglePlay={onToggleAudio}
        />
      </div>
    </article>
  );
}
