import type { ReactNode } from "react";

type PageHeaderProps = {
  leading?: ReactNode;
  trailing?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
};

export default function PageHeader({
  leading,
  trailing,
  eyebrow,
  title,
  description,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {leading ? (
            <div className="-ml-2 shrink-0">
              {leading}
            </div>
          ) : null}

          <div className="min-w-0 pt-1">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
                {eyebrow}
              </p>
            ) : null}

            <h1
              className={[
                eyebrow ? "mt-1.5" : "",
                "break-words text-[28px] font-semibold leading-[1.08]",
                "tracking-[-0.04em] text-black",
              ].join(" ")}
            >
              {title}
            </h1>

            {description ? (
              <p className="mt-2 max-w-md text-[14px] leading-[1.55] text-black/48">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {trailing ? (
          <div className="shrink-0">
            {trailing}
          </div>
        ) : null}
      </div>
    </header>
  );
}
