/**
 * Yumi Wordvault's mark, drawn like Hangyumi's (HangyumiGlyph): one weight
 * of line, a chest with a domed lid, and its keyhole as her eye. Draws in
 * currentColor; the keyhole takes `accentClassName` when given.
 */
export default function WordvaultGlyph({ className, accentClassName }: { className?: string; accentClassName?: string }) {
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
      <path d="M4 11.2h16v8.4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M4 11.2a8 4.6 0 0 1 16 0" />
      <path d="M7.6 7.6v3.6M16.4 7.6v3.6" />
      <circle className={accentClassName} cx="12" cy="14.6" r="1.7" />
      <path d="M12 16.3v1.8" />
    </svg>
  );
}
