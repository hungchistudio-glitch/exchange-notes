"use client";

import { X } from "lucide-react";

import useTranslation from "@/hooks/i18n/useTranslation";

type ClearFieldButtonProps = {
  onClear: () => void;
  /** Overrides the generic label where the field has a name worth saying. */
  label?: string;
  /**
   * Absolute placement, for fields that are a bare full-width input rather
   * than a flex row with room for a sibling. The caller adds the matching
   * right padding so the text never runs under the button.
   */
  floating?: boolean;
  className?: string;
};

/**
 * The one-tap clear affordance for text fields, in the shape the vocabulary
 * search already established: a small round button that exists only while
 * there is something to clear.
 *
 * Colours are the black/white tokens rather than literal colours, which is
 * what makes this correct in both modes — app/cosmic.css redefines
 * --color-black and --color-white, so the same classes invert themselves on
 * the deep-space surface instead of turning invisible.
 *
 * Render it only when the field has a value. Deciding that here would mean
 * passing the value in, and every caller already has it to hand.
 */
export default function ClearFieldButton({
  onClear,
  label,
  floating = false,
  className = "",
}: ClearFieldButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      // Keeps a tap from submitting the form the field usually sits in, and
      // from stealing focus, so the keyboard stays up and typing can continue.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClear}
      aria-label={label ?? t.common.clearField}
      title={label ?? t.common.clearField}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-ink-soft transition-transform active:scale-95 ${
        floating ? "absolute right-3 top-1/2 -translate-y-1/2" : ""
      } ${className}`}
    >
      <X size={13} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
