import { useId } from "react";

/**
 * The shop's currency: an energy cookie, the same biscuit Yumi eats on the
 * home screen, drawn small enough to sit beside a price.
 */
export default function EnergyCookie({ className }: { className?: string }) {
  const face = `energy-cookie-${useId().replace(/:/g, "")}`;
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={face} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#f2cf8f" />
          <stop offset="0.7" stopColor="#d79a4e" />
          <stop offset="1" stopColor="#b0742f" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill={`url(#${face})`} />
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="#8a5523" strokeOpacity="0.45" strokeWidth="1" />
      <circle cx="8.4" cy="9" r="1.5" fill="#5a3218" />
      <circle cx="14.6" cy="7.6" r="1.2" fill="#5a3218" />
      <circle cx="15.4" cy="13.4" r="1.6" fill="#5a3218" />
      <circle cx="9.6" cy="15.2" r="1.3" fill="#5a3218" />
      <circle cx="12.2" cy="11.6" r="0.8" fill="#5a3218" />
      <path d="M6.2 7.4a7.4 7.4 0 0 1 4.4-3" fill="none" stroke="#fff6e2" strokeOpacity="0.7" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
