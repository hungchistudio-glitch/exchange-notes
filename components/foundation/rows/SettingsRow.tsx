import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

export type SettingsRowTone =
  | "neutral"
  | "blue"
  | "amber"
  | "emerald"
  | "red";

const TONE_CLASSES: Record<SettingsRowTone, string> = {
  neutral: "bg-black/[0.05] text-ink-soft",
  blue: "bg-blue-100 text-blue-600",
  amber: "bg-amber-100 text-amber-600",
  emerald: "bg-emerald-100 text-emerald-600",
  red: "bg-red-100 text-red-600",
};

type SharedProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  value?: ReactNode;
  tone?: SettingsRowTone;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
};

type LinkRowProps = SharedProps & {
  href: string;
  onClick?: never;
};

type ButtonRowProps = SharedProps & {
  href?: never;
  onClick: () => void;
};

type StaticRowProps = SharedProps & {
  href?: never;
  onClick?: never;
};

type SettingsRowProps = LinkRowProps | ButtonRowProps | StaticRowProps;

function RowContent({
  title,
  description,
  icon,
  value,
  tone = "neutral",
  danger = false,
  interactive = false,
}: SharedProps & { interactive?: boolean }) {
  return (
    <>
      {icon ? (
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            danger ? "bg-red-100 text-red-600" : TONE_CLASSES[tone],
          ].join(" ")}
        >
          {icon}
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span
          className={[
            "block truncate text-[16px] font-semibold tracking-[-0.02em]",
            danger ? "text-red-600" : "text-black",
          ].join(" ")}
        >
          {title}
        </span>

        {description ? (
          <span className="mt-0.5 block truncate text-[13px] leading-5 text-ink-soft">
            {description}
          </span>
        ) : null}
      </span>

      {value ? (
        <span className="max-w-[42%] truncate text-sm font-medium text-ink-soft">
          {value}
        </span>
      ) : null}

      {interactive ? (
        <ChevronRight
          aria-hidden="true"
          size={17}
          strokeWidth={1.8}
          className="shrink-0 text-ink-faint"
        />
      ) : null}
    </>
  );
}

export default function SettingsRow(props: SettingsRowProps) {
  const { disabled = false, className = "" } = props;

  const sharedClassName = [
    "flex min-h-[60px] w-full items-center gap-3 px-5 py-3 text-left",
    "transition-colors",
    disabled ? "cursor-not-allowed opacity-40" : "hover:bg-black/[0.02]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={sharedClassName}>
        <RowContent {...props} interactive />
      </Link>
    );
  }

  if ("onClick" in props && props.onClick) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        disabled={disabled}
        className={sharedClassName}
      >
        <RowContent {...props} interactive />
      </button>
    );
  }

  return (
    <div className={sharedClassName}>
      <RowContent {...props} />
    </div>
  );
}
