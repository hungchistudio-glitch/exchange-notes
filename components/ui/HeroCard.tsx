import type { ReactNode } from "react";

type HeroCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
};

export default function HeroCard({
  title,
  subtitle,
  children,
}: HeroCardProps) {
  return (
    <section
      className="
        overflow-hidden
        rounded-[28px]
        border
        border-[#D2DEC9]
        bg-gradient-to-br
        from-[#F4F7F2]
        via-[#EEF4EA]
        to-[#E7EEE4]
        p-6
        shadow-[var(--en-shadow-card)]
      "
    >
      <div className="space-y-2">
        <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#6E8663]">
          Continue Learning
        </div>

        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#2F312D]">
          {title}
        </h2>

        {subtitle ? (
          <p className="max-w-md text-[15px] leading-6 text-[#5D655D]">
            {subtitle}
          </p>
        ) : null}
      </div>

      {children ? (
        <div className="mt-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}
