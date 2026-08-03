type NavIconProps = {
  className?: string;
  active?: boolean;
};

// "Yumi Portal" — a small core wrapped by a half-open orbital ring,
// echoing Yumi's own eye. This is the app's most brand-forward icon:
// Home doubles as "back to Yumi". The core fills solid and the ring
// nudges open a touch further once selected, like an eye catching light.
export default function NavHomeIcon({
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
        r="8.2"
        strokeDasharray="45 6"
        strokeDashoffset={active ? -3 : 0}
        style={{ transition: "stroke-dashoffset 220ms cubic-bezier(0.22,1,0.36,1)" }}
      />
      <circle
        cx="12"
        cy="12"
        r={active ? 3.1 : 2.6}
        fill={active ? "currentColor" : "none"}
        stroke={active ? "none" : "currentColor"}
        style={{ transition: "r 220ms cubic-bezier(0.22,1,0.36,1)" }}
      />
    </svg>
  );
}
