"use client";

import { Volume2 } from "lucide-react";
import { useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
import { hasLowConfidence, type MenuItem } from "@/lib/scanner/menuTypes";
import { speak } from "@/lib/speech";

type MenuItemInsightSheetProps = {
  item: MenuItem | null;
  cuisine: string;
  onClose: () => void;
};

/**
 * What one dish is.
 *
 * Everything here was already read from the menu — no second request is made
 * for opening a dish. What the sheet adds is room: the full translated name
 * that the overlay chip had to clamp, the line as it is printed, and the
 * sentence explaining what the thing actually is.
 */
export default function MenuItemInsightSheet({
  item,
  cuisine,
  onClose,
}: MenuItemInsightSheetProps) {
  const { t, language } = useTranslation();
  const copy = t.scanner.menu;

  const [speaking, setSpeaking] = useState(false);

  if (!item) return null;

  // The translation is in the interface language by definition, so this is
  // the one string on the sheet the device can always pronounce.
  const speechLanguage = language === "traditional-chinese" ? "zh-TW" : "en-US";

  function handleListen() {
    if (!item || speaking) return;

    setSpeaking(true);

    speak(item.translatedName || item.sourceName, speechLanguage, {
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  return (
    <BottomSheet
      open={Boolean(item)}
      onClose={onClose}
      title={item.translatedName || item.sourceName}
      description={item.translatedDescription || undefined}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleListen}
            disabled={speaking}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-black/[0.05] px-4 text-sm font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            <Volume2 size={16} strokeWidth={1.9} />
            {speaking ? copy.listening : copy.listen}
          </button>
        </div>

        <dl className="divide-y divide-black/[0.05] overflow-hidden rounded-[18px] border border-black/[0.06] bg-white">
          {item.sourceName ? (
            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <dt className="shrink-0 text-[13px] text-ink-soft">
                {copy.originalLabel}
              </dt>
              <dd className="min-w-0 text-right">
                <span className="block text-[15px] font-semibold text-black">
                  {item.sourceName}
                </span>

                {/*
                  The line as printed, under the name as printed. It used to
                  sit under "What it is", which is the question the translated
                  description at the top of this sheet already answers.
                */}
                {item.sourceDescription ? (
                  <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-faint">
                    {item.sourceDescription}
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-4 px-4 py-3">
            <dt className="shrink-0 text-[13px] text-ink-soft">
              {copy.priceLabel}
            </dt>
            <dd className="min-w-0 text-right text-[15px] font-semibold text-black">
              {item.price || copy.noPrice}
            </dd>
          </div>

          {cuisine ? (
            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <dt className="shrink-0 text-[13px] text-ink-soft">
                {copy.cuisineLabel}
              </dt>
              <dd className="min-w-0 text-right text-[15px] font-semibold text-black">
                {cuisine}
              </dd>
            </div>
          ) : null}

          {/*
            The translated description is the sheet's own subtitle, so it is
            not repeated here — but a dish with no description at all would
            otherwise leave this sheet saying nothing about what it is.
          */}
          {!item.translatedDescription && item.translatedName ? (
            <div className="px-4 py-3">
              <dt className="text-[13px] text-ink-soft">{copy.aboutLabel}</dt>
              <dd className="mt-1 text-[14px] leading-[21px] text-ink-strong">
                {item.translatedName}
              </dd>
            </div>
          ) : null}
        </dl>

        {hasLowConfidence(item) ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] leading-5 text-amber-800">
            {copy.confidenceNote}
          </p>
        ) : null}

        {/*
          Said on every dish, not only the ones that mention an allergen: the
          ingredients here are read off a name, and the only place that knows
          what is in the pan is the kitchen.
        */}
        <p className="px-1 text-[12px] leading-[18px] text-ink-faint">
          {copy.askRestaurant}
        </p>
      </div>
    </BottomSheet>
  );
}
