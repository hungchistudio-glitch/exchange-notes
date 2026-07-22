import type { ReactNode } from "react";

type SettingsChoiceCardProps = {
  selected: boolean;
  badge: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
};

export default function SettingsChoiceCard({
  selected,
  badge,
  title,
  description,
  onClick,
}: SettingsChoiceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "flex min-h-[72px] w-full items-center gap-4",
        "rounded-[18px] border px-4 py-3 text-left",
        "transition-all active:scale-[0.985]",
        selected
          ? "border-black bg-black text-white"
          : "border-black/[0.08] bg-black/[0.025] text-black",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-11 w-11 shrink-0 items-center",
          "justify-center rounded-full font-semibold",
          selected
            ? "bg-white/15 text-white"
            : "bg-white text-black",
        ].join(" ")}
      >
        {badge}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">
          {title}
        </span>

        <span
          className={[
            "mt-0.5 block text-xs leading-5",
            selected
              ? "text-white/65"
              : "text-black/42",
          ].join(" ")}
        >
          {description}
        </span>
      </span>

      {selected ? (
        <span
          aria-hidden="true"
          className="shrink-0 text-[22px] leading-none"
        >
          ✓
        </span>
      ) : null}
    </button>
  );
}
