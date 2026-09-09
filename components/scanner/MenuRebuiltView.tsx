"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { reconstructMenu } from "@/lib/scanner/reconstructMenu";
import { itemNames, type MenuDocument, type MenuItem } from "@/lib/scanner/menuTypes";

const ZOOM_STEPS = [1, 1.6, 2.4, 3.2];

type MenuRebuiltViewProps = {
  image: string;
  document: MenuDocument;
  onSelect: (item: MenuItem) => void;
  onUnavailable: () => void;
};

/**
 * The menu as it would read if it had been printed in your language.
 *
 * The original text is painted out in the colour of the paper around it and
 * the translation is drawn back in the colour the ink was — so the photo, the
 * layout, the prices and the decoration all survive, and only the words
 * change. Everything the reader could not place stays exactly as photographed.
 *
 * The taps are invisible regions over the finished picture rather than chips
 * on top of it: the whole point of this view is that there is nothing on top
 * of it.
 */
export default function MenuRebuiltView({
  image,
  document: menu,
  onSelect,
  onUnavailable,
}: MenuRebuiltViewProps) {
  const { t } = useTranslation();
  const copy = t.scanner.menu;

  const [rebuilt, setRebuilt] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_STEPS[zoomIndex];

  const failedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const source = new Image();

    source.onload = () => {
      if (cancelled) return;

      try {
        const result = reconstructMenu(source, menu, menu.targetLanguage);

        /*
         * A rebuild that replaced almost nothing is a photograph with a few
         * patches on it, which is worse than the photograph. The overlay is
         * the better answer there, and the viewer is told to switch.
         */
        if (!result || result.drawn < Math.max(1, result.total * 0.5)) {
          failedRef.current = true;
          onUnavailable();
          return;
        }

        setRebuilt(result.canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        failedRef.current = true;
        onUnavailable();
      }
    };

    source.onerror = () => {
      if (!cancelled) onUnavailable();
    };

    source.src = image;

    return () => {
      cancelled = true;
    };
  }, [image, menu, onUnavailable]);

  return (
    <div className="relative">
      <div className="max-h-[70vh] overflow-auto overscroll-contain rounded-[18px] border border-black/[0.06] bg-black/[0.02]">
        <div className="relative" style={{ width: `${zoom * 100}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rebuilt ?? image}
            alt=""
            aria-hidden="true"
            className="block w-full select-none"
            draggable={false}
          />

          {menu.sections.flatMap((section) =>
            section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                aria-label={itemNames(item, menu.targetLanguage).primary}
                className="absolute rounded-[2px] focus-visible:outline focus-visible:outline-2"
                style={{
                  left: `${item.region.x * 100}%`,
                  top: `${item.region.y * 100}%`,
                  width: `${item.region.width * 100}%`,
                  height: `${item.region.height * 100}%`,
                }}
              />
            )),
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[0.75rem] text-ink-faint">{copy.overlayHint}</p>

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
            className="min-w-[3.4rem] text-center text-[0.75rem] font-semibold text-ink-soft"
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
