"use client";

import { useState } from "react";

import SegmentedControl from "@/components/foundation/forms/SegmentedControl";
import MenuItemInsightSheet from "@/components/scanner/MenuItemInsightSheet";
import MenuListView from "@/components/scanner/MenuListView";
import MenuOverlayView from "@/components/scanner/MenuOverlayView";
import useTranslation from "@/hooks/i18n/useTranslation";
import { countMenuItems, type MenuDocument, type MenuItem } from "@/lib/scanner/menuTypes";

type ViewMode = "translated" | "original" | "list";

type MenuResultViewerProps = {
  image: string;
  document: MenuDocument;
  partial: boolean;
  onScanAnother: () => void;
};

/**
 * Names a language code in the language the interface is speaking.
 *
 * Falls back to the raw code rather than to "unknown" — "ja" tells a curious
 * user more than a shrug does, and Intl.DisplayNames is missing on few
 * enough browsers that the fallback is rare.
 */
function languageName(code: string, locale: string): string | null {
  if (!code || code === "unknown") return null;

  try {
    return (
      new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code
    );
  } catch {
    return code;
  }
}

export default function MenuResultViewer({
  image,
  document: menu,
  partial,
  onScanAnother,
}: MenuResultViewerProps) {
  const { t, language } = useTranslation();
  const copy = t.scanner.menu;

  const [mode, setMode] = useState<ViewMode>("translated");
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const itemCount = countMenuItems(menu);
  const locale = language === "traditional-chinese" ? "zh-TW" : "en";
  const sourceName = languageName(menu.sourceLanguage, locale);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1.5">
        <p className="text-[15px] font-semibold tracking-[-0.02em] text-black">
          {copy.itemCount.replace("{count}", String(itemCount))}
        </p>

        <p className="text-[13px] text-ink-soft">
          {copy.sourceLanguage.replace(
            "{language}",
            sourceName ?? copy.unknownLanguage,
          )}
        </p>
      </div>

      {/*
        Shown above the menu rather than over it: a warning that covers the
        thing it is warning about is a warning nobody can act on.
      */}
      {partial ? (
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[14px] font-semibold text-amber-900">
            {copy.partialTitle}
          </p>
          <p className="mt-1 text-[13px] leading-5 text-amber-800">
            {copy.partialBody}
          </p>
        </div>
      ) : null}

      <SegmentedControl<ViewMode>
        fill
        groupLabel={copy.viewMode}
        value={mode}
        onChange={setMode}
        options={[
          {
            value: "translated",
            content: copy.modeTranslated,
            label: copy.modeTranslated,
          },
          {
            value: "original",
            content: copy.modeOriginal,
            label: copy.modeOriginal,
          },
          { value: "list", content: copy.modeList, label: copy.modeList },
        ]}
      />

      {mode === "translated" ? (
        <MenuOverlayView image={image} document={menu} onSelect={setSelected} />
      ) : null}

      {mode === "original" ? (
        <div className="max-h-[70vh] overflow-auto overscroll-contain rounded-[18px] border border-black/[0.06] bg-black/[0.02]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={copy.modeOriginal} className="block w-full" />
        </div>
      ) : null}

      {mode === "list" ? (
        <MenuListView document={menu} onSelect={setSelected} />
      ) : null}

      <button
        type="button"
        onClick={onScanAnother}
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition-transform active:scale-[0.985]"
      >
        {copy.scanAnother}
      </button>

      <MenuItemInsightSheet
        item={selected}
        cuisine={menu.detectedCuisine}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
