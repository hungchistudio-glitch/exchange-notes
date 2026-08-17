import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "rounded-3xl bg-white px-6 py-8 text-center shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-black/60">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold tracking-[-0.02em] text-black">
        {title}
      </h3>

      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
