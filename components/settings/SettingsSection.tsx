import type { ReactNode } from "react";

type SettingsSectionProps = {
  label: string;
  children: ReactNode;
  // Sits below the surface in the quietest type on the page. For the one or
  // two things that are worth saying once and never again.
  footnote?: string;
  className?: string;
};

/**
 * One surface per group, rather than one card per setting.
 *
 * The hierarchy on this page is carried by the label, the spacing and the
 * type — not by shadow. A single hairline border and a 18px radius is the
 * whole of the decoration, which is what lets six groups sit on one screen
 * without any of them shouting.
 */
export default function SettingsSection({
  label,
  children,
  footnote,
  className = "",
}: SettingsSectionProps) {
  return (
    <section className={className}>
      <h2 className="mb-2 px-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </h2>

      <div className="divide-y divide-black/[0.05] overflow-hidden rounded-[18px] border border-black/[0.06] bg-white">
        {children}
      </div>

      {footnote ? (
        <p className="mt-2.5 px-1.5 text-[0.75rem] leading-[1.125rem] text-ink-faint">
          {footnote}
        </p>
      ) : null}
    </section>
  );
}
