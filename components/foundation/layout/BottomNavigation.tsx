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
  /** Where the key goes. Omitted for action keys — see `onSelect`. */
  href?: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  /**
   * Makes this key an action rather than a destination.
   *
   * The dock's centre key opens the Universal Search everywhere except the
   * home screen, and a search sheet is not a route — rendering it as a link
   * to nowhere would put a URL in the status bar, offer a useless "open in
   * new tab", and hand the wrong role to a screen reader.
   */
  onSelect?: () => void;
  // Small unread-style badge (currently just Messages). Omitted/0 renders
  // nothing — this is not a generic "always show a dot" affordance.
  badgeCount?: number;
  // Bumped by the caller only when badgeCount goes up, so the pulse ring
  // replays via a key change instead of running on every render.
  pulseToken?: number;
  // Cosmic Mode only. Tags the navigation so the route stage knows which
  // arrival to play; Standard Mode leaves it undefined and gets no animation.
  transitionTypes?: string[];
};

type BottomNavigationProps = {
  items: NavigationItem[];
  // Named by the caller rather than read from the DOM, so the dock has no
  // opinion about where the interface mode is stored.
  label: string;
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
//
// One dock serves both interface modes. Everything that differs between them
// is a colour, and every one of those colours is a variable defined once per
// mode in app/globals.css and app/cosmic.css — so Cosmic Mode gets its cyan
// energy base and cool glass without a second copy of the measuring, the
// badges or the indicator to keep in step with this one.
export default function BottomNavigation({
  items,
  label,
}: BottomNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
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
      data-app-bottom-navigation
      className="absolute inset-x-0 bottom-0 z-40 flex w-full justify-center px-5 [transform:translateZ(0)]"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.625rem)",
      }}
      aria-label={label}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-xl rounded-[28px] border border-[var(--dock-line)] bg-[var(--dock-surface)] p-2 shadow-[var(--dock-shadow)] backdrop-blur-xl"
      >
        {offset && (
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 rounded-full border border-[var(--dock-indicator-border)] bg-[var(--dock-indicator)] transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: INDICATOR_SIZE,
              height: INDICATOR_SIZE,
              marginLeft: -INDICATOR_SIZE / 2,
              marginTop: -INDICATOR_SIZE / 2,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              boxShadow: "0 0 0 6px var(--dock-indicator-halo)",
            }}
          />
        )}

        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item, index) => {
            const className = `z-10 flex h-[52px] items-center justify-center rounded-full transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              item.active
                ? "scale-[1.05] text-[var(--dock-active-ink)]"
                : "text-ink-faint hover:text-ink-strong"
            }`;

            const content = (
              <>
                <span className="relative inline-flex">
                  {item.icon}

                  {item.badgeCount ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-[7px] -top-[5px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[var(--accent-amber)] px-[3px] text-[9px] font-semibold leading-none text-white"
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
              </>
            );

            if (item.onSelect || !item.href) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onSelect}
                  title={item.label}
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  aria-label={item.label}
                  className={className}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                transitionTypes={item.transitionTypes}
                title={item.label}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                aria-current={item.active ? "page" : undefined}
                aria-label={item.label}
                className={className}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
