/**
 * The games' key on Home (Chi, 2026-10-26, "A · 遊戲手把"): a game pad in
 * one weight of line, a cross on the left, and Yumi's eye for its main
 * button. Draws in currentColor; the eye takes `accentClassName` when given,
 * so on Home it is the shop key's amber, as Hangyumi's was.
 */
export default function GamesGlyph({ className, accentClassName }: { className?: string; accentClassName?: string }) {
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
      <path d="M7.2 7.4h9.6a4.6 4.6 0 0 1 4.5 3.8l.9 5.1a2.7 2.7 0 0 1-4.6 2.3L15.3 16H8.7l-2.3 2.6a2.7 2.7 0 0 1-4.6-2.3l.9-5.1a4.6 4.6 0 0 1 4.5-3.8z" />
      <path d="M7.6 10.2v3.6M5.8 12h3.6" />
      <circle className={accentClassName} cx="16.3" cy="11.2" r="1.25" />
      <circle cx="18.2" cy="13.1" r=".55" fill="currentColor" />
    </svg>
  );
}
