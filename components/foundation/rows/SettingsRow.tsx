import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ReactNode, useId } from "react";

import SettingsSwitch from "@/components/foundation/forms/SettingsSwitch";

/*
 * One row system for the whole of Settings, in the variants the page actually
 * needs: navigation (value + chevron), toggle (a switch, and the whole row is
 * the switch), control (an inline segmented control), summary (a count and a
 * chevron) and destructive (log out).
 *
 * A chevron means one thing here and only one thing: there is another screen
 * behind this row. Anything that can be decided in place is decided in place,
 * which is why a boolean never gets one.
 */

export type SettingsRowTone =
  | "neutral"
  | "blue"
  | "amber"
  | "emerald"
  | "red";

/*
 * Colour is meaning, not decoration. Neutral is the default and covers most
 * of the page; blue belongs to Yumi, emerald says a device is actually
 * connected, red is destructive. Amber survives for the states that are
 * genuinely a warning (a widget that needs re-connecting).
 */
const TONE_CLASSES: Record<SettingsRowTone, string> = {
  neutral: "bg-black/[0.05] text-ink-strong",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
};

const ROW_BASE =
  "flex min-h-[62px] w-full items-center gap-3.5 px-4 py-3 text-left";

// 100ms and a 3.5% darkening: enough that a tap is acknowledged before the
// screen it opens arrives, quiet enough that a list of them never flickers.
const ROW_INTERACTIVE =
  "transition-colors duration-100 ease-out hover:bg-black/[0.02] active:bg-black/[0.035]";

type SharedProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  value?: ReactNode;
  tone?: SettingsRowTone;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
  // Anchors the row for Settings search, which scrolls to a result and
  // pulses it rather than opening it on the user's behalf.
  id?: string;
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

function RowIcon({
  icon,
  tone = "neutral",
  danger = false,
}: Pick<SharedProps, "icon" | "tone" | "danger">) {
  if (!icon) return null;

  return (
    <span
      className={[
        "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full",
        danger ? TONE_CLASSES.red : TONE_CLASSES[tone],
      ].join(" ")}
    >
      {icon}
    </span>
  );
}

function RowText({
  title,
  description,
  danger = false,
  titleId,
  descriptionId,
}: Pick<SharedProps, "title" | "description" | "danger"> & {
  titleId?: string;
  descriptionId?: string;
}) {
  return (
    <span className="min-w-0 flex-1">
      {/*
        Wraps rather than truncates. "Devices & Widgets" beside a value does
        not fit on one line at 375 points, and a row is allowed to be taller —
        a title clipped to "Devices & Widg…" is not the setting's name.
      */}
      <span
        id={titleId}
        className={[
          "block text-[1rem] font-semibold leading-[1.3125rem] tracking-[-0.02em]",
          danger ? "text-red-600" : "text-black",
        ].join(" ")}
      >
        {title}
      </span>

      {description ? (
        // Wraps rather than truncates: a row is allowed to grow for a
        // sentence that is worth reading in full.
        <span
          id={descriptionId}
          className="mt-0.5 block text-[0.8125rem] leading-[1.125rem] text-ink-soft"
        >
          {description}
        </span>
      ) : null}
    </span>
  );
}

function RowValue({ value }: Pick<SharedProps, "value">) {
  if (!value) return null;

  return (
    <span className="max-w-[42%] shrink-0 truncate text-[0.875rem] font-medium text-ink-soft">
      {value}
    </span>
  );
}

export default function SettingsRow(props: SettingsRowProps) {
  const { disabled = false, className = "", id } = props;

  const sharedClassName = [
    ROW_BASE,
    disabled ? "cursor-not-allowed opacity-40" : ROW_INTERACTIVE,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <RowIcon icon={props.icon} tone={props.tone} danger={props.danger} />
      <RowText
        title={props.title}
        description={props.description}
        danger={props.danger}
      />
      <RowValue value={props.value} />

      {/*
        No chevron on a disabled row. The chevron promises another screen, and
        a row that cannot be tapped is not offering one — the installed state
        of "Install Exchange Notes" is the case that proves it.
      */}
      {disabled ? null : (
        <ChevronRight
          aria-hidden="true"
          size={17}
          strokeWidth={1.8}
          className="shrink-0 text-ink-faint"
        />
      )}
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link id={id} href={props.href} className={sharedClassName}>
        {content}
      </Link>
    );
  }

  if ("onClick" in props && props.onClick) {
    return (
      <button
        id={id}
        type="button"
        onClick={props.onClick}
        disabled={disabled}
        className={sharedClassName}
      >
        {content}
      </button>
    );
  }

  return (
    <div id={id} className={sharedClassName}>
      <RowIcon icon={props.icon} tone={props.tone} danger={props.danger} />
      <RowText
        title={props.title}
        description={props.description}
        danger={props.danger}
      />
      <RowValue value={props.value} />
    </div>
  );
}

type SettingsToggleRowProps = Omit<SharedProps, "value"> & {
  checked: boolean;
  onChange: (checked: boolean) => void;
  busy?: boolean;
};

/**
 * A boolean. The entire row is the switch — there is nothing else to hit —
 * so the target is the full width of the surface rather than 51 pixels of it.
 */
export function SettingsToggleRow({
  title,
  description,
  icon,
  tone = "neutral",
  checked,
  onChange,
  busy = false,
  disabled = false,
  className = "",
  id,
}: SettingsToggleRowProps) {
  /*
   * The switch is named by its title and described by its sentence, rather
   * than named by both. "Yumi reminders, switch, on" is the announcement
   * worth having; the sentence follows as description instead of being read
   * out as part of the control's name every time focus lands on it.
   */
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = description ? `${generatedId}-description` : undefined;

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        ROW_BASE,
        disabled ? "cursor-not-allowed opacity-40" : ROW_INTERACTIVE,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <RowIcon icon={icon} tone={tone} />
      <RowText
        title={title}
        description={description}
        titleId={titleId}
        descriptionId={descriptionId}
      />
      <SettingsSwitch checked={checked} busy={busy} />
    </button>
  );
}

type SettingsControlRowProps = Omit<SharedProps, "value" | "danger"> & {
  // The control owns its own interaction, so the row around it is inert.
  control: ReactNode;
  /*
   * Puts the control on its own line under the label. Two segments of real
   * words — "Standard" and "Yumi Cosmic" — plus a sentence of description do
   * not both fit across 375 points, and a title that truncates to "Inte…" is
   * not a trade worth making. Narrow controls (three letters of font size)
   * stay beside their label.
   */
  stacked?: boolean;
};

/**
 * A setting whose control fits on the row: a segmented control, today. The
 * row itself is not clickable — everything it can do, the control does.
 */
export function SettingsControlRow({
  title,
  description,
  icon,
  tone = "neutral",
  control,
  stacked = false,
  className = "",
  id,
}: SettingsControlRowProps) {
  if (stacked) {
    return (
      <div
        id={id}
        className={["w-full px-4 py-3.5", className].filter(Boolean).join(" ")}
      >
        <div className="flex items-center gap-3.5">
          <RowIcon icon={icon} tone={tone} />
          <RowText title={title} description={description} />
        </div>

        {/* Indented to the text column, so the group still reads as rows. */}
        <div className="mt-3 pl-[48px]">{control}</div>
      </div>
    );
  }

  return (
    <div
      id={id}
      className={[ROW_BASE, "gap-3", className].filter(Boolean).join(" ")}
    >
      <RowIcon icon={icon} tone={tone} />
      <RowText title={title} description={description} />
      {control}
    </div>
  );
}
