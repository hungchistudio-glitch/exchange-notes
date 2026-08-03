type NavIconProps = {
  className?: string;
  active?: boolean;
};

// "Control Core" — three concentric broken arcs around a center point,
// reading as a precision dial rather than a generic gear. The outer arc
// nudges around and the center tightens once selected.
export default function NavSettingsIcon({
  className = "h-5 w-5",
  active = false,
}: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.8}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        strokeDasharray="16 40"
        strokeDashoffset={active ? -14 : 0}
        style={{ transition: "stroke-dashoffset 220ms cubic-bezier(0.22,1,0.36,1)" }}
      />
      <circle cx="12" cy="12" r="6" strokeDasharray="12 26" strokeDashoffset="4" />
      <circle
        cx="12"
        cy="12"
        r={active ? 1.9 : 2.3}
        fill={active ? "currentColor" : "none"}
        stroke={active ? "none" : "currentColor"}
        style={{ transition: "r 220ms cubic-bezier(0.22,1,0.36,1)" }}
      />
    </svg>
  );
}
