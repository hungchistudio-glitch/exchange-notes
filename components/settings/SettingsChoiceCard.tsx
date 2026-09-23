import { ReactNode } from "react";
import { Check, LoaderCircle } from "lucide-react";

type SettingsChoiceCardProps = {
  selected: boolean;
  title: string;
  description?: string;
  badge?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /**
   * The choice has been made and the app is still fetching what it needs to
   * honour it — a dictionary, today. The card keeps its place in the list and
   * says so, rather than the list going still while nothing visible happens.
   */
  busy?: boolean;
};

export default function SettingsChoiceCard({
  selected,
  title,
  description,
  badge,
  onClick,
  disabled = false,
  busy = false,
}: SettingsChoiceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={onClick}
      className={[
        "settings-choice flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "bg-black text-white"
          : "border border-black/[0.08] bg-white text-black hover:border-black/[0.16]",
      ].join(" ")}
    >
      {badge ? (
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold",
            selected ? "bg-white/15 text-white" : "bg-black/[0.05] text-ink-strong",
          ].join(" ")}
        >
          {badge}
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold tracking-[-0.02em]">
          {title}
        </span>

        {description ? (
          <span
            className={[
              "mt-0.5 block text-xs leading-5",
              selected ? "text-ink-invert-soft" : "text-ink-soft",
            ].join(" ")}
          >
            {description}
          </span>
        ) : null}
      </span>

      {busy ? (
        <LoaderCircle aria-hidden="true" size={18} className="shrink-0 animate-spin motion-reduce:animate-none" />
      ) : selected ? (
        <Check aria-hidden="true" size={18} strokeWidth={2.2} className="shrink-0" />
      ) : null}
    </button>
  );
}
