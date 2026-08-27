"use client";

import { Camera } from "lucide-react";
import {
  useEffect,
  useRef,
  type ChangeEvent,
} from "react";

import useTranslation from "@/hooks/i18n/useTranslation";

type LexiconImageMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFile: (file: File) => void | Promise<void>;
  disabled?: boolean;
  tone?: "warm" | "cosmic";
  buttonClassName?: string;
};

/**
 * One camera key, three explicit system sources.
 *
 * Browsers do not expose a single portable API that can distinguish the
 * photo library, a fresh camera capture, and the Files app. Three inputs are
 * therefore intentional: `capture` asks for a new photo, the library input
 * follows the platform's image chooser, and the extension list keeps the
 * general file chooser scoped to formats the recognition pipeline accepts.
 */
export default function LexiconImageMenu({
  open,
  onOpenChange,
  onFile,
  disabled = false,
  tone = "warm",
  buttonClassName = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft transition-transform active:scale-[0.97]",
}: LexiconImageMenuProps) {
  const { t } = useTranslation();
  const copy = t.lexicon;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const photoLibraryRef = useRef<HTMLInputElement | null>(null);
  const takePhotoRef = useRef<HTMLInputElement | null>(null);
  const chooseFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  function selectInput(input: HTMLInputElement | null) {
    // Keep the picker tied to the user's pointer activation on iOS.
    onOpenChange(false);
    input?.click();
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void onFile(file);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        disabled={disabled}
        aria-label={copy.modeCamera}
        title={copy.modeCamera}
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClassName}
      >
        <Camera size={16} strokeWidth={1.7} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={copy.cameraMenuLabel}
          className={`absolute right-0 top-[calc(100%+10px)] z-30 w-[210px] overflow-hidden rounded-[22px] border p-1.5 text-sm shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl ${
            tone === "cosmic"
              ? "border-[var(--cosmic-cyan-dim)] bg-[var(--color-white)]/95 text-[var(--color-black)]"
              : "border-black/[0.07] bg-white/95 text-black"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => selectInput(photoLibraryRef.current)}
            className="flex h-11 w-full items-center rounded-[16px] px-4 text-left font-medium transition hover:bg-black/[0.045] active:scale-[0.98]"
          >
            {copy.photoLibrary}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => selectInput(takePhotoRef.current)}
            className="flex h-11 w-full items-center rounded-[16px] px-4 text-left font-medium transition hover:bg-black/[0.045] active:scale-[0.98]"
          >
            {copy.takePhoto}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => selectInput(chooseFileRef.current)}
            className="flex h-11 w-full items-center rounded-[16px] px-4 text-left font-medium transition hover:bg-black/[0.045] active:scale-[0.98]"
          >
            {copy.chooseFile}
          </button>
        </div>
      ) : null}

      <input
        ref={photoLibraryRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={takePhotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={chooseFileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
