type MenuScanIconProps = {
  className?: string;
};

/**
 * A page of menu lines inside a scanning frame.
 *
 * Drawn in the same hand as the deck's other room icons — 24px box, 1.8
 * stroke, no fill — so the ring stays one set of glyphs. The four corners are
 * the same corners the camera draws when it locks onto a menu, which is what
 * makes the node and the screen it opens read as the same thing.
 */
export default function MenuScanIcon({
  className = "h-5 w-5",
}: MenuScanIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8.5V5.6A1.6 1.6 0 014.6 4H7.5" />
        <path d="M16.5 4h2.9A1.6 1.6 0 0121 5.6v2.9" />
        <path d="M21 15.5v2.9a1.6 1.6 0 01-1.6 1.6h-2.9" />
        <path d="M7.5 20H4.6A1.6 1.6 0 013 18.4v-2.9" />
        <path d="M7.6 9h8.8" />
        <path d="M7.6 12h6" />
        <path d="M7.6 15h4" />
      </g>
    </svg>
  );
}
