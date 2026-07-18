import type { ReactNode } from "react";

type SectionHeadingProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export default function SectionHeading({
  title,
  description,
  action,
  className = "",
}: SectionHeadingProps) {
  return (
    <div
      className={`flex items-start justify-between gap-4 ${className}`}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.025em] text-neutral-950">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm leading-5 text-neutral-500">
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className="shrink-0">
          {action}
        </div>
      ) : null}
    </div>
  );
}
