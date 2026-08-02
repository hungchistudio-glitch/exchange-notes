import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
};

export default function DashboardCard({
  title,
  value,
  subtitle,
  action,
  compact = false,
}: DashboardCardProps) {
  return (
    <article
      className={[
        "rounded-[24px] border border-black/[0.07] bg-white shadow-sm",
        compact ? "p-4" : "p-5 sm:p-6",
      ].join(" ")}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/38">
        {title}
      </p>

      <div
        className={[
          "font-semibold leading-none tracking-[-0.045em] text-black",
          compact ? "mt-3 text-[28px]" : "mt-4 text-[34px]",
        ].join(" ")}
      >
        {value}
      </div>

      {subtitle ? (
        <div
          className={[
            "text-black/43",
            compact
              ? "mt-2 text-xs leading-5"
              : "mt-3 text-sm leading-6",
          ].join(" ")}
        >
          {subtitle}
        </div>
      ) : null}

      {action ? (
        <div className={compact ? "mt-4" : "mt-5"}>
          {action}
        </div>
      ) : null}
    </article>
  );
}
