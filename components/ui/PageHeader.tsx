import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function PageHeader({
  title,
  eyebrow,
  subtitle,
  description,
  leading,
  trailing,
  action,
  className = "",
}: Props) {
  const supportingText = description ?? subtitle;
  const rightContent = trailing ?? action;

  return (
    <header
      className={`flex items-start justify-between gap-4 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        {leading && (
          <div className="shrink-0">
            {leading}
          </div>
        )}

        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              {eyebrow}
            </p>
          )}

          <h1 className="text-3xl font-bold tracking-tight">
            {title}
          </h1>

          {supportingText && (
            <p className="mt-2 max-w-2xl text-neutral-500">
              {supportingText}
            </p>
          )}
        </div>
      </div>

      {rightContent && (
        <div className="shrink-0">
          {rightContent}
        </div>
      )}
    </header>
  );
}
