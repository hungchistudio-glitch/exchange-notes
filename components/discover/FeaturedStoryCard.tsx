"use client";

import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import type { MouseEvent } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";

import type { TranslationDictionary } from "@/lib/i18n/types";

import AudioRail from "./AudioRail";
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
  const { languagePair } = useLearningLanguageContext();
  const [primaryLanguage, secondaryLanguage] = languagePair;

  const accent = categoryAccent(card.category);
  const caption = [(card.captions[primaryLanguage] ?? ""), (card.captions[secondaryLanguage] ?? "")]
    .filter(Boolean)
    .join(" · ");

  function handleExploreImage(event: MouseEvent) {
    event.stopPropagation();
    onExploreImage();
  }

  return (
    <article
      className="relative overflow-hidden rounded-[26px]"
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
            alt={(card.captions[primaryLanguage] ?? "") ?? (card.titles[primaryLanguage] ?? "")}
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
        <EditorialMark />
      )}

      {card.imageUrl && caption ? (
        <p
          className="px-7 pt-3 text-[11.5px] leading-[1.5]"
          style={{ color: DISCOVER_COLORS.textSecondary }}
        >
          {caption}
        </p>
      ) : null}

      {card.imageUrl && card.vocabulary.length > 0 ? (
        <button
          type="button"
          onClick={handleExploreImage}
          className="mt-2 flex items-center gap-1.5 px-7 text-[12px] font-medium transition-opacity active:opacity-70"
          style={{ color: accent }}
        >
          <ZoomIn size={13} strokeWidth={1.8} />
          {copy.exploreImageLabel.replace(
            "{count}",
            String(card.vocabulary.length)
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
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: accent }}
          >
            {categoryText}
          </span>

          <span
            className="text-[11px]"
            style={{ color: DISCOVER_COLORS.textSecondary }}
          >
            {formattedTime}
          </span>
        </div>

        {/* Bilingual headline block */}
        <h2
          className="mt-4 line-clamp-3 text-[30px] font-bold leading-[1.16] tracking-[-0.02em]"
          style={{ color: DISCOVER_COLORS.text }}
        >
          {(card.titles[primaryLanguage] ?? "")}
        </h2>

        <p
          className="mt-2.5 text-[16px] font-medium leading-[1.55] tracking-[0.005em]"
          style={{ color: DISCOVER_COLORS.textSecondary }}
        >
          {(card.titles[secondaryLanguage] ?? "")}
        </p>

        {/* Short summary */}
        <p
          className="mt-4 line-clamp-2 text-[15px] leading-[1.6]"
          style={{ color: DISCOVER_COLORS.textSecondary }}
        >
          {(card.summaries[primaryLanguage] ?? "")}
        </p>

        <p
          className="mt-1 line-clamp-1 text-[13.5px] leading-[1.6]"
          style={{ color: DISCOVER_COLORS.textSecondary }}
        >
          {(card.summaries[secondaryLanguage] ?? "")}
        </p>
      </div>

      <div className="relative px-7 pb-7">
        <AudioRail
          copy={copy}
          isPlaying={isAudioPlaying}
          progress={audioProgress}
          mode={audioMode}
          onModeChange={onAudioModeChange}
          onTogglePlay={onToggleAudio}
        />
      </div>
    </article>
  );
}
