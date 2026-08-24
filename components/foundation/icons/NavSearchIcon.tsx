type NavIconProps = {
  className?: string;
  active?: boolean;
};

/*
 * "Lexicon Lens" — a lens with a small spark inside it rather than the
 * usual bare magnifier.
 *
 * The plain magnifier reads as "filter this list", which is the wrong
 * promise: this key opens something that identifies a language, explains a
 * word and offers to keep it. The spark is what tells the eye that the
 * answer comes back knowing more than the question did, and it is the same
 * mark the search field uses on the home screen.
 *
 * The handle grows a touch when the key is active, which is all the state a
 * 22px glyph can carry without becoming a different icon.
 */
export default function NavSearchIcon({
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
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path
        d={active ? "M15.4 15.4 L21 21" : "M15.4 15.4 L19.6 19.6"}
        style={{ transition: "d 220ms cubic-bezier(0.22,1,0.36,1)" }}
      />
      {/* The spark: a four-pointed star, drawn small enough to sit inside
          the lens without touching it at any stroke weight. */}
      <path
        d="M10.5 7.4 L11.4 9.6 L13.6 10.5 L11.4 11.4 L10.5 13.6 L9.6 11.4 L7.4 10.5 L9.6 9.6 Z"
        fill={active ? "currentColor" : "none"}
        strokeWidth={active ? 0.9 : 1.3}
      />
    </svg>
  );
}
