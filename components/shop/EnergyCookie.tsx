import { useId } from "react";

/**
 * The shop's currency: an energy capsule (Chi, 2026-11-21: 能量膠囊; it was
 * an energy cookie, and the code keeps that name).
 *
 * The same family as the letter capsules on the Standard home: a small
 * glass capsule, one half amber (the old cookie's warm gold, so a balance
 * still reads as the same money) and one half clear, with a gleam along
 * it. The ring of orbit from the cookie stays, its far side behind the
 * capsule and its near side in front, so it still belongs to a station in
 * orbit. It reads at fifteen pixels beside a price, which is most of where
 * it lives.
 */
export default function EnergyCookie({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const amber = `energy-amber-${id}`;
  const glass = `energy-glass-${id}`;

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={amber} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffe3a3" />
          <stop offset="0.55" stopColor="#f2a540" />
          <stop offset="1" stopColor="#c96a1c" />
        </linearGradient>
        <linearGradient id={glass} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#b9cfdc" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path d="M2.2 17.2A10.6 3 -16 0 1 21.8 11.6" fill="none" stroke="#6fcde3" strokeWidth="1.15" strokeLinecap="round" opacity="0.55" />
      <g transform="rotate(-38 12 12)">
        <rect x="3.2" y="8" width="17.6" height="8" rx="4" fill={`url(#${glass})`} stroke="#8fa4b5" strokeWidth="0.5" />
        <rect x="3.2" y="8" width="9.4" height="8" rx="4" fill={`url(#${amber})`} />
        <rect x="12.2" y="8" width="0.8" height="8" fill="#fff7e0" opacity="0.9" />
        <rect x="5" y="9.1" width="5.2" height="1.3" rx="0.65" fill="#fff" opacity="0.85" />
      </g>
      <path d="M21.8 11.6A10.6 3 -16 0 1 2.2 17.2" fill="none" stroke="#6fcde3" strokeWidth="1.15" strokeLinecap="round" />
    </svg>
  );
}
