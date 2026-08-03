type NavIconProps = {
  className?: string;
  active?: boolean;
};

// "Exploration Orbit" — a core with a broken orbital ring and a single
// node riding it, reading as radar / a small orbit / a scanner sweeping
// for new stories. Selecting nudges the node a quarter-turn further
// around the ring, like it just picked something up.
export default function NavDiscoverIcon({
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
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="8" strokeDasharray="42 8" />
      {/* Orbiting node: plain (cx, cy) coordinates for two fixed points on
          the ring (top, then right — an unambiguous quarter turn) rather
          than a composed transform, since transform composition order for
          "rotate around a point that isn't the shape's own center" is easy
          to get backwards without a live browser to check against. */}
      <circle
        cx={active ? 20 : 12}
        cy={active ? 12 : 4}
        r="1.4"
        fill="currentColor"
        stroke="none"
        style={{ transition: "cx 220ms cubic-bezier(0.22,1,0.36,1), cy 220ms cubic-bezier(0.22,1,0.36,1)" }}
      />
    </svg>
  );
}
