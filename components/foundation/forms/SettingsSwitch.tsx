/**
 * The switch itself, with no behaviour of its own.
 *
 * Every accessible role, label and event belongs to the control that renders
 * this — usually SettingsToggleRow, where the whole row is the switch. Keeping
 * the visual and the semantics apart is what stops a row from ending up with
 * two focusable things that do the same job.
 */
type SettingsSwitchProps = {
  checked: boolean;
  // Drawn instead of the knob's travel while a change is in flight, so an
  // optimistic toggle that has not landed yet still looks like it is working.
  busy?: boolean;
};

export default function SettingsSwitch({
  checked,
  busy = false,
}: SettingsSwitchProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        "relative flex h-[31px] w-[51px] shrink-0 items-center rounded-full",
        "transition-colors duration-200 ease-out motion-reduce:transition-none",
        checked ? "bg-blue-600" : "bg-black/[0.14]",
        busy ? "opacity-60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/*
        A literal white, not `bg-white`: Cosmic Mode repoints --color-white at
        its navy panel colour, and the knob is one of the few things that
        should stay white in both modes — it reads as the physical part.
      */}
      <span
        className={[
          "h-[27px] w-[27px] rounded-full bg-[#ffffff]",
          "shadow-[0_1px_3px_rgba(0,0,0,0.18)]",
          // The colour change alone still says on or off, so reduced
          // motion loses the travel and keeps the answer.
          "transition-transform duration-200 ease-out motion-reduce:transition-none",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        ].join(" ")}
      />
    </span>
  );
}
