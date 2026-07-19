import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
};

export default function DashboardCard({
  title,
  value,
  subtitle,
  action,
}: DashboardCardProps) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">
        {title}
      </p>

      <div className="mt-2 text-3xl font-bold tracking-tight">
        {value}
      </div>

      {subtitle && (
        <div className="mt-2 text-sm text-neutral-500">
          {subtitle}
        </div>
      )}

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  );
}
