/**
 * Yumi Starweaver's mark, drawn like its sisters' (HangyumiGlyph,
 * WordvaultGlyph): one weight of line, an incomplete ring — the star gate
 * not yet closed — and one point of starlight where it would close. Draws
 * in currentColor; the star takes `accentClassName` when given.
 */
export default function StarweaverGlyph({ className, accentClassName }: { className?: string; accentClassName?: string }) {
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
      {/* The ring, open at its upper right. */}
      <path d="M17.6 6.4A8 8 0 1 0 19.9 13" />
      {/* A second, smaller arc inside it. */}
      <path d="M8.3 15.7A5.2 5.2 0 0 1 12 6.8" />
      {/* The point of starlight, four-armed. */}
      <path className={accentClassName} d="M19.2 4.2v3.6M17.4 6h3.6" />
    </svg>
  );
}
