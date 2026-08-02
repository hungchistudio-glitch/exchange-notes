"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ButtonHTMLAttributes } from "react";

type BackButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  fallbackHref?: string;
  label?: string;
};

export default function BackButton({
  fallbackHref = "/home",
  label = "Back",
  className = "",
  onClick,
  ...props
}: BackButtonProps) {
  const router = useRouter();

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (event.defaultPrevented) return;

    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={handleClick}
      className={`
        en-focus-ring
        inline-flex
        size-11
        shrink-0
        items-center
        justify-center
        rounded-2xl
        border
        border-line
        bg-white/90
        text-[#394A35]
        shadow-sm
        transition
        hover:bg-[#F4F7F2]
        active:scale-[0.96]
        ${className}
      `}
      {...props}
    >
      <ArrowLeft size={20} strokeWidth={2} />
    </button>
  );
}
