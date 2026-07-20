import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

type SharedProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  value?: ReactNode;
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
  danger = false,
  interactive = false,
}: SharedProps & { interactive?: boolean }) {
  return (
    <>
      {icon ? (
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            danger
              ? "bg-red-50 text-red-600"
              : "bg-black/[0.045] text-black/55",
          ].join(" ")}
        >
          {icon}
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span
          className={[
            "block truncate text-[15px] font-semibold tracking-[-0.015em]",
            danger ? "text-red-600" : "text-black",
          ].join(" ")}
        >
          {title}
        </span>

        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-black/42">
            {description}
          </span>
        ) : null}
      </span>

      {value ? (
        <span className="max-w-[42%] truncate text-sm text-black/40">
          {value}
        </span>
      ) : null}

      {interactive ? (
        <ChevronRight
          aria-hidden="true"
          size={17}
          strokeWidth={1.8}
          className="shrink-0 text-black/25"
        />
      ) : null}
    </>
  );
}

export default function SettingsRow(props: SettingsRowProps) {
  const {
    disabled = false,
    className = "",
  } = props;

  const sharedClassName = [
    "flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left",
    "transition-colors",
    disabled ? "cursor-not-allowed opacity-40" : "hover:bg-black/[0.025]",
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
