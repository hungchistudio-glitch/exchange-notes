import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type BackButtonProps = {
  href: string;
  label?: string;
  className?: string;
};

export default function BackButton({
  href,
  label = "Back",
  className = "",
}: BackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={[
        "inline-flex h-11 w-11 shrink-0 items-center justify-center",
        "text-black transition-opacity hover:opacity-55 active:opacity-35",
        className,
      ].join(" ")}
    >
      <ArrowLeft
        aria-hidden="true"
        size={24}
        strokeWidth={1.8}
      />
    </Link>
  );
}
