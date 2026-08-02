import type { ReactNode } from "react";

type VocabularySectionProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function VocabularySection({
  title,
  description,
  action,
  children,
  className = "",
}: VocabularySectionProps) {
  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
    >
      {title || description || action ? (
        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-neutral-950">
                {title}
              </h2>
            ) : null}

            {description ? (
              <p className="mt-1 text-sm leading-5 text-neutral-500">
                {description}
              </p>
            ) : null}
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}

      <div className={title || description || action ? "px-5 pb-5" : "p-5"}>
        {children}
      </div>
    </section>
  );
}
