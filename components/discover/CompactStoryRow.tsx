"use client";

import Image from "next/image";

import { DISCOVER_COLORS, categoryAccent, type DailyNewsCard } from "./types";

type CompactStoryRowProps = {
  card: DailyNewsCard;
  categoryText: string;
  formattedTime: string;
  isLast: boolean;
  showThumbnail: boolean;
  onOpen: () => void;
};

export default function CompactStoryRow({
  card,
  categoryText,
  formattedTime,
  isLast,
  showThumbnail,
  onOpen,
}: CompactStoryRowProps) {
  const accent = categoryAccent(card.category);
  const hasThumbnail = showThumbnail && Boolean(card.imageUrl);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full py-[18px] text-left transition active:opacity-70"
      style={
        isLast
          ? undefined
          : { borderBottom: `1px solid ${DISCOVER_COLORS.dividerSoft}` }
      }
    >
      <div className={hasThumbnail ? "flex items-start gap-3" : undefined}>
        {showThumbnail && card.imageUrl ? (
          // ~38/62 split — thumbnail carries some of the context, so these
          // rows skip the summary line entirely (see the text column below).
          // width/height are the rendered size: the row is a fixed 108x84, so
          // the optimizer can serve exactly that instead of a full-size
          // Guardian thumbnail scaled down in the browser.
          <Image
            src={card.imageUrl}
            alt=""
            width={108}
            height={84}
            loading="lazy"
            onLoad={(event) => {
              event.currentTarget.style.opacity = "1";
            }}
            className="h-[84px] w-[108px] shrink-0 rounded-[15px] object-cover opacity-0 transition-opacity duration-500"
            style={{ backgroundColor: DISCOVER_COLORS.dividerSoft }}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-[3px] text-[10px] font-semibold"
              style={{ color: accent, backgroundColor: `${accent}17` }}
            >
              {categoryText}
            </span>

            <span
              className="text-[10.5px]"
              style={{ color: DISCOVER_COLORS.textSecondary }}
            >
              {formattedTime}
            </span>
          </div>

          <h3
            className={`text-[17px] font-semibold leading-[1.35] tracking-[-0.01em] ${
              hasThumbnail ? "mt-1.5 line-clamp-2" : "mt-2"
            }`}
            style={{ color: DISCOVER_COLORS.text }}
          >
            {(card.titles.en ?? "")}
          </h3>

          <p
            className="mt-0.5 line-clamp-1 text-[14px] leading-[1.5]"
            style={{ color: DISCOVER_COLORS.textSecondary }}
          >
            {(card.titles["zh-TW"] ?? "")}
          </p>

          {hasThumbnail ? null : (
            <p
              className="mt-1.5 line-clamp-1 text-[13.5px] leading-[1.5]"
              style={{ color: DISCOVER_COLORS.textSecondary }}
            >
              {(card.summaries.en ?? "")}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
