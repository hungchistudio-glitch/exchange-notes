"use client";

import { Camera } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";

type LexiconImageMenuProps = {
  onFile: (file: File) => void | Promise<void>;
  disabled?: boolean;
  buttonClassName?: string;
};

/**
 * One camera key, one platform source chooser.
 *
 * On iOS, an ordinary image file input already presents Photo Library,
 * Take Photo and Choose File. Drawing those same three choices ourselves and
 * then clicking another input created two consecutive source menus. It also
 * anchored a wide popover to a button near the left edge, so half of it fell
 * outside a phone viewport.
 *
 * Letting the platform own the chooser removes both problems and keeps the
 * picker tied directly to the user's tap, which iOS requires.
 */
export default function LexiconImageMenu({
  onFile,
  disabled = false,
  buttonClassName = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft transition-transform active:scale-[0.97]",
}: LexiconImageMenuProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void onFile(file);
  }

  return (
    <span className="shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label={t.lexicon.modeCamera}
        title={t.lexicon.modeCamera}
        className={buttonClassName}
      >
        <Camera size={16} strokeWidth={1.7} aria-hidden="true" />
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </span>
  );
}
