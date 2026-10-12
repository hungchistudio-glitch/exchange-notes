import { useId } from "react";

/**
 * The shop's currency: an energy cookie.
 *
 * Chi (2026-10-12) asked for it sharper than a plain biscuit. So it is the
 * cookie Yumi eats, minted: a brass rim, a caramel face, three faceted
 * chips, a charge bolt struck through the middle for the energy, and a bite
 * out of the top right — her bite. It still reads at fifteen pixels beside a
 * price, which is most of where it lives.
 */
export default function EnergyCookie({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const rim = `energy-rim-${id}`;
  const face = `energy-face-${id}`;
  const bolt = `energy-bolt-${id}`;
  const bite = `energy-bite-${id}`;

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={rim} x1="0.15" y1="0.05" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#fff0c2" />
          <stop offset="0.35" stopColor="#e6ae4c" />
          <stop offset="0.75" stopColor="#a8621f" />
          <stop offset="1" stopColor="#6e3a10" />
        </linearGradient>
        <radialGradient id={face} cx="0.38" cy="0.32" r="0.78">
          <stop offset="0" stopColor="#f8d79a" />
          <stop offset="0.55" stopColor="#d99445" />
          <stop offset="1" stopColor="#a5601f" />
        </radialGradient>
        <linearGradient id={bolt} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffe7a8" />
        </linearGradient>
        <mask id={bite}>
          <rect width="24" height="24" fill="#fff" />
          <circle cx="21.2" cy="4.6" r="3.1" fill="#000" />
          <circle cx="18.2" cy="2.1" r="2.2" fill="#000" />
          <circle cx="22.9" cy="8.2" r="2" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${bite})`}>
        <circle cx="12" cy="12" r="11" fill={`url(#${rim})`} />
        <circle cx="12" cy="12" r="8.9" fill={`url(#${face})`} />
        <circle cx="12" cy="12" r="8.9" fill="none" stroke="#6e3a10" strokeOpacity="0.35" strokeWidth="0.6" />
        <path d="M6.2 8.6 7.9 7.4 8.6 9.3 6.9 10.2Z" fill="#4a2410" />
        <path d="M15.6 15.3 17.5 14.6 17.6 16.6 15.9 17.1Z" fill="#4a2410" />
        <path d="M7 15.4 8.7 15 8.9 16.9 7.3 17.2Z" fill="#4a2410" />
        <path
          d="M13.3 4.9 8.7 12.9h3.1l-1.2 6.2 5.2-8.2h-3.2l1.4-6Z"
          fill={`url(#${bolt})`}
          stroke="#7a4515"
          strokeWidth="0.55"
          strokeLinejoin="round"
        />
        <path d="M4.6 9.2a7.7 7.7 0 0 1 4-4.6" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </svg>
  );
}
