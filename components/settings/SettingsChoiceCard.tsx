import { ReactNode } from "react";
import { Check } from "lucide-react";

type SettingsChoiceCardProps = {
  selected: boolean;
  title: string;
  description?: string;
  badge?: ReactNode;
  onClick: () => void;
};

export default function SettingsChoiceCard({
  selected,
  title,
  description,
  badge,
  onClick,
}: SettingsChoiceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.99]",
        selected
          ? "bg-black text-white"
          : "border border-black/[0.08] bg-white text-black hover:border-black/[0.16]",
      ].join(" ")}
    >
      {badge ? (
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold",
            selected ? "bg-white/15 text-white" : "bg-black/[0.05] text-black/70",
          ].join(" ")}
        >
          {badge}
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold tracking-[-0.02em]">
          {title}
        </span>

        {description ? (
          <span
            className={[
              "mt-0.5 block text-xs leading-5",
              selected ? "text-white/70" : "text-ink-soft",
            ].join(" ")}
          >
            {description}
          </span>
        ) : null}
      </span>

      {selected ? (
        <Check size={18} strokeWidth={2.2} className="shrink-0" />
      ) : null}
    </button>
  );
}
