import type { ReactNode } from "react";

type PageTitleProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export default function PageTitle({
  title,
  subtitle,
  action,
}: PageTitleProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.04em] text-neutral-950">
          {title}
        </h1>

        {subtitle ? (
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            {subtitle}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
