import { useId } from "react";

/**
 * The shop's currency: an energy cookie.
 *
 * Chi (2026-10-13) wanted it simpler and more abstract than the minted
 * biscuit it was, and to belong to a station in orbit, while still reading
 * as the energy cookie. So it is a cookie as a small planet: a warm disc
 * with Yumi's bite out of the top right, three chips for her three fingers
 * (33 is her "one"), and a ring of orbit through it, the far side of the
 * ring behind the disc and the near side in front. It reads at fifteen
 * pixels beside a price, which is most of where it lives.
 */
export default function EnergyCookie({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const face = `energy-face-${id}`;
  const bite = `energy-bite-${id}`;

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={face} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#ffd98a" />
          <stop offset="1" stopColor="#e3862a" />
        </linearGradient>
        <mask id={bite}>
          <rect width="24" height="24" fill="#fff" />
          <circle cx="18.9" cy="4.7" r="3.3" fill="#000" />
        </mask>
      </defs>
      <path d="M2.2 17.2A10.6 3 -16 0 1 21.8 11.6" fill="none" stroke="#6fcde3" strokeWidth="1.15" strokeLinecap="round" opacity="0.55" />
      <circle cx="12" cy="11.6" r="8.3" fill={`url(#${face})`} mask={`url(#${bite})`} />
      <g fill="#5a2f12">
        <circle cx="8.9" cy="9.2" r="1.15" />
        <circle cx="12.3" cy="11.4" r="1.15" />
        <circle cx="8.7" cy="13.4" r="1.15" />
      </g>
      <path d="M21.8 11.6A10.6 3 -16 0 1 2.2 17.2" fill="none" stroke="#6fcde3" strokeWidth="1.15" strokeLinecap="round" />
    </svg>
  );
}
