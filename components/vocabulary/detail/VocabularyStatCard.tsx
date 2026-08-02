import type { ReactNode } from "react";

type VocabularyStatCardProps = {
  icon?: ReactNode;
  label: string;
  value: string | number;
  description?: string;
  onClick?: () => void;
};

export default function VocabularyStatCard({
  icon,
  label,
  value,
  description,
  onClick,
}: VocabularyStatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-neutral-600">{label}</span>

        {icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
          {value}
        </p>

        {description ? (
          <p className="mt-1 text-sm leading-5 text-neutral-500">
            {description}
          </p>
        ) : null}
      </div>
    </>
  );

  const className =
    "rounded-[24px] border border-neutral-200 bg-white p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition duration-200";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} w-full active:scale-[0.985] hover:border-neutral-300`}
      >
        {content}
      </button>
    );
  }

  return <section className={className}>{content}</section>;
}
