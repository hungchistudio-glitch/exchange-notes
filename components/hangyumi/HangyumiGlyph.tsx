/**
 * Hangyumi's mark, in one weight of line: a gallows, and on its line her
 * eye inside her C turned up into a U. Draws in currentColor; the eye takes
 * `accentClassName` when given, so on Home it is the shop key's amber.
 */
export default function HangyumiGlyph({ className, accentClassName }: { className?: string; accentClassName?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 20.6h7M5.4 20.6V3.4h9.6" />
      <path d="M15 3.4v4.4" />
      <path d="M10.4 11.2a4.6 4.6 0 0 0 9.2 0" />
      <circle className={accentClassName} cx="15" cy="10.2" r="1.9" />
    </svg>
  );
}
