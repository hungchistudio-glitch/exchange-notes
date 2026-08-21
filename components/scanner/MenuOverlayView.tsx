"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import {
  hasLowConfidence,
  itemNames,
  sectionTitle,
  type MenuDocument,
  type MenuItem,
} from "@/lib/scanner/menuTypes";

/*
 * The translated menu, drawn over the menu that was photographed.
 *
 * This is the overlay stage, not the rebuilt stage: the original page is
 * still underneath, and every dish gets a legible chip pinned to the row it
 * came from. Keeping the photo visible is the point of the whole feature —
 * the user is holding this menu, and the translation has to be matchable back
 * to the thing in their hands.
 */

const ZOOM_STEPS = [1, 1.6, 2.4, 3.2];

/*
 * Every label is sized from the row it sits on.
 *
 * The alternative — one font size for the whole page — is what made the first
 * version overlap: a chip 20px tall pinned to printed rows 12px apart walks
 * over its neighbours, and no amount of clipping fixes that. Measuring the
 * rendered photo and taking 60% of each row's own height means a chip is
 * always about as tall as the line it translates, at any zoom.
 *
 * The floor keeps a dense menu legible at 1×; the ceiling stops a menu with
 * four huge items from turning into billboards.
 */
const MIN_LABEL_PX = 9.5;
const MAX_LABEL_PX = 22;
const LABEL_HEIGHT_RATIO = 0.6;

type MenuOverlayViewProps = {
  image: string;
  document: MenuDocument;
  onSelect: (item: MenuItem) => void;
};

export default function MenuOverlayView({
  image,
  document: menu,
  onSelect,
}: MenuOverlayViewProps) {
  const { t } = useTranslation();
  const copy = t.scanner.menu;

  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_STEPS[zoomIndex];

  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageHeight, setImageHeight] = useState(0);

  /*
   * One observer on the photo, which covers both a zoom step and a device
   * rotation without a resize listener or a layout read per label.
   */
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    const observer = new ResizeObserver(([entry]) => {
      setImageHeight(entry.contentRect.height);
    });

    observer.observe(image);
    return () => observer.disconnect();
  }, []);

  function labelSize(regionHeight: number) {
    if (!imageHeight) return MIN_LABEL_PX;

    return Math.min(
      MAX_LABEL_PX,
      Math.max(MIN_LABEL_PX, imageHeight * regionHeight * LABEL_HEIGHT_RATIO),
    );
  }

  return (
    <div className="relative">
      {/*
        Panning is the scroll container's job rather than a drag handler's:
        native scrolling keeps momentum, rubber-banding and the scrollbars the
        platform already draws, and costs nothing per frame.
      */}
      <div className="max-h-[70vh] overflow-auto overscroll-contain rounded-[18px] border border-black/[0.06] bg-black/[0.02]">
        <div className="relative" style={{ width: `${zoom * 100}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={image}
            alt=""
            aria-hidden="true"
            className="block w-full select-none"
            draggable={false}
          />

          {menu.sections.map((section) => {
            const heading = sectionTitle(section, menu.targetLanguage);

            return (
              <div key={section.id}>
                {heading ? (
                  <span
                    className="absolute flex items-center rounded-[0.3em] bg-neutral-900/90 px-[0.45em] py-[0.12em] font-semibold uppercase tracking-[0.08em] text-white"
                    style={{
                      left: `${section.region.x * 100}%`,
                      // The section's region covers the whole block; its
                      // heading is printed at the top edge of it, not in the
                      // middle of the dishes it groups.
                      top: `${section.region.y * 100}%`,
                      transform: "translateY(-50%)",
                      // Never wider than the block it heads: on a two-column
                      // menu, a heading that spills sideways lands on the
                      // other column's first dish.
                      maxWidth: `${Math.min(section.region.width, Math.max(0.2, 1 - section.region.x)) * 100}%`,
                      fontSize: `${Math.max(MIN_LABEL_PX, labelSize(0.045) * 0.8)}px`,
                    }}
                  >
                    <span className="truncate">{heading}</span>
                  </span>
                ) : null}

                {section.items.map((item) => {
                  const uncertain = hasLowConfidence(item);
                  // The overlay is read against the paper, so it carries the
                  // one name the reader asked for; both are on the row in the
                  // list, and both are in the sheet a tap away.
                  const { primary } = itemNames(item, menu.targetLanguage);

                  /*
                   * Centred on the row it belongs to, and one line tall.
                   *
                   * The first version grew downwards to fit long names and
                   * walked over the next three dishes. A chip that stays
                   * inside its own band can never do that, and the name it
                   * has to clip is one tap — or one zoom step — away.
                   */
                  const available = Math.max(0.2, 1 - item.region.x);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item)}
                      title={primary}
                      aria-label={`${primary}${
                        item.price ? `, ${item.price}` : ""
                      }`}
                      className="absolute flex items-center gap-[0.4em] rounded-[0.3em] bg-white/95 px-[0.4em] py-[0.14em] text-left shadow-[0_1px_5px_rgba(0,0,0,0.2)] transition-transform duration-100 active:scale-[0.98]"
                      style={{
                        left: `${item.region.x * 100}%`,
                        top: `${(item.region.y + item.region.height / 2) * 100}%`,
                        transform: "translateY(-50%)",
                        fontSize: `${labelSize(item.region.height)}px`,
                        minWidth: `${Math.min(item.region.width, available) * 100}%`,
                        /*
                         * A little past the printed row, and no further. At
                         * 1.5x a long name in the left column of a two-column
                         * menu reached across and covered the right column's
                         * dishes; the safe expansion is the width of the row
                         * the model actually measured, plus a hair.
                         */
                        maxWidth: `${Math.min(item.region.width * 1.12, available) * 100}%`,
                      }}
                    >
                      <span
                        className={[
                          "min-w-0 flex-1 truncate font-semibold leading-[1.35] tracking-[-0.01em] text-neutral-900",
                          uncertain
                            ? "underline decoration-dotted decoration-neutral-400 underline-offset-2"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {primary}
                      </span>

                      {item.price ? (
                        <span className="shrink-0 text-[0.9em] font-semibold leading-[1.35] text-neutral-600">
                          {item.price}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[12px] text-ink-faint">{copy.overlayHint}</p>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
            disabled={zoomIndex === 0}
            aria-label={copy.zoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] text-ink-strong transition-colors active:bg-black/[0.05] disabled:opacity-35"
          >
            <Minus size={15} strokeWidth={2} />
          </button>

          <span
            aria-live="polite"
            className="min-w-[3.4rem] text-center text-[12px] font-semibold text-ink-soft"
          >
            {copy.zoomLevel.replace("{level}", String(zoom))}
          </span>

          <button
            type="button"
            onClick={() =>
              setZoomIndex((index) => Math.min(ZOOM_STEPS.length - 1, index + 1))
            }
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            aria-label={copy.zoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] text-ink-strong transition-colors active:bg-black/[0.05] disabled:opacity-35"
          >
            <Plus size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
