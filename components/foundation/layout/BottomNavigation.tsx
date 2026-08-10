"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import styles from "./BottomNavigation.module.css";

type NavigationItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  // Small unread-style badge (currently just Messages). Omitted/0 renders
  // nothing — this is not a generic "always show a dot" affordance.
  badgeCount?: number;
  // Bumped by the caller only when badgeCount goes up, so the pulse ring
  // replays via a key change instead of running on every render.
  pulseToken?: number;
};

type BottomNavigationProps = {
  items: NavigationItem[];
};

// Avoids a React warning about useLayoutEffect during server rendering,
// while still measuring synchronously (no flash) once hydrated.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const INDICATOR_SIZE = 44;

// A quiet, icon-only floating dock rather than a labelled tab bar: no
// visible text, a small circular "energy base" that slides to sit behind
// whichever icon is active instead of a wide pill spanning the column, and
// a translucent glass surface so it reads as hardware sitting just above
// the page rather than a full-width bar pressing down on it.
export default function BottomNavigation({ items }: BottomNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);

  const activeIndex = items.findIndex((item) => item.active);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const activeElement = itemRefs.current[activeIndex];

    if (!container || !activeElement) {
      setOffset(null);
      return;
    }

    // getBoundingClientRect for both, in the same (viewport) coordinate
    // space, so the delta is exact regardless of the container's own
    // border/padding — no dependence on offsetParent semantics, which is
    // what made the previous version's circle land a few pixels off from
    // the icon it was supposed to sit behind.
    const containerRect = container.getBoundingClientRect();
    const linkRect = activeElement.getBoundingClientRect();

    setOffset({
      x:
        linkRect.left +
        linkRect.width / 2 -
        (containerRect.left + containerRect.width / 2),
      y:
        linkRect.top +
        linkRect.height / 2 -
        (containerRect.top + containerRect.height / 2),
    });
  }, [activeIndex, items.length]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-5"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.625rem)",
      }}
      aria-label="Primary navigation"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-xl rounded-[28px] border border-black/[0.07] bg-[#fdfbf6]/75 p-2 shadow-[0_10px_36px_rgba(28,26,22,0.12)] backdrop-blur-xl"
      >
        {offset && (
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 rounded-full bg-[#1c1a16] transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: INDICATOR_SIZE,
              height: INDICATOR_SIZE,
              marginLeft: -INDICATOR_SIZE / 2,
              marginTop: -INDICATOR_SIZE / 2,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              boxShadow: "0 0 0 6px rgba(28, 26, 22, 0.05)",
            }}
          >
            <span aria-hidden="true" className={styles.indicatorOrbit} />
          </div>
        )}

        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item, index) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              prefetch={false}
              title={item.label}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              aria-current={item.active ? "page" : undefined}
              aria-label={item.label}
              className={`z-10 flex h-[52px] items-center justify-center rounded-full transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                item.active
                  ? "scale-[1.05] text-white"
                  : "text-black/40 hover:text-black/70"
              }`}
            >
              <span className="relative inline-flex">
                {item.icon}

                {item.badgeCount ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-[7px] -top-[5px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#c9962e] px-[3px] text-[9px] font-semibold leading-none text-white"
                  >
                    {item.badgeCount > 9 ? "9+" : item.badgeCount}
                    <span
                      key={item.pulseToken}
                      className={styles.pulseRing}
                    />
                  </span>
                ) : null}
              </span>
              <span className="sr-only">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
