import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

type AppHeaderProps = {
  title: string;
  backHref?: string;
  backLabel?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  subtitle?: string;
  sticky?: boolean;
  className?: string;
};

export default function AppHeader({
  title,
  backHref,
  backLabel = "Back",
  leading,
  trailing,
  subtitle,
  sticky = true,
  className = "",
}: AppHeaderProps) {
  const leadingContent =
    leading ??
    (backHref ? (
      <Link
        href={backHref}
        aria-label={backLabel}
        title={backLabel}
        className="flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/[0.045] active:scale-95"
      >
        <ArrowLeft size={18} strokeWidth={1.7} />
      </Link>
    ) : null);

  return (
    <header
      className={[
        sticky ? "sticky top-0 z-30" : "",
        "border-b border-black/[0.07] bg-[#f4f1ea]/92 px-4 py-3 backdrop-blur-2xl",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="grid min-h-9 grid-cols-[40px_minmax(0,1fr)_40px] items-center">
        <div className="justify-self-start">{leadingContent}</div>

        <div className="min-w-0 px-2 text-center">
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.02em] text-black">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-0.5 truncate text-[10px] tracking-[0.06em] text-black/35">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="justify-self-end">{trailing}</div>
      </div>
    </header>
  );
}
