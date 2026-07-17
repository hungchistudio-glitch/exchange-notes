import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
      {icon ? (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
          {icon}
        </div>
      ) : null}

      <h2 className="text-xl font-semibold tracking-[-0.025em] text-neutral-950">
        {title}
      </h2>

      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
