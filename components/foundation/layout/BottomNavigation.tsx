"use client";

import Link from "next/link";

import NavPendingHint from "@/components/foundation/layout/NavPendingHint";
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
  /*
   * A key is keyed by its label, so a label that changes — every one of them
   * does when the app language changes — replaces the node. The index and the
   * count would both be unchanged, and without this the effect would keep
   * measuring, and keep observing, an element that is no longer in the page.
   */
  const activeLabel = items[activeIndex]?.label;

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const activeElement = itemRefs.current[activeIndex];

    if (!container || !activeElement) {
      setOffset(null);
      return;
    }

    function measure() {
      // Both rectangles use viewport coordinates, so borders, padding, and
      // the active key's scale do not move the indicator away from its centre.
      const containerRect = container!.getBoundingClientRect();
      const linkRect = activeElement!.getBoundingClientRect();
      const next = {
        x:
          linkRect.left +
          linkRect.width / 2 -
          (containerRect.left + containerRect.width / 2),
        y:
          linkRect.top +
          linkRect.height / 2 -
          (containerRect.top + containerRect.height / 2),
      };

      setOffset((current) =>
        current?.x === next.x && current.y === next.y ? current : next,
      );
    }

    measure();

    /*
     * Rotation, a window drag and a change of text size all resize the dock
     * without changing which key is selected, and the effect above only ran
     * because one of those three deps changed — so on its own it measures the
     * portrait dock once and leaves the circle behind when the phone turns.
     *
     * Both boxes are measured, so what is observed is both: the dock, whose
     * width is what the six columns divide, and the selected key, which also
     * changes size on its own when a row of labels rewraps. The indicator is
     * absolutely positioned and outside the grid, so moving it can never
     * resize either of the boxes that asked for it to move — there is no loop
     * here to guard against.
     */
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(activeElement);

    return () => observer.disconnect();
  }, [activeIndex, activeLabel, items.length]);

  return (
    /*
     * The dock's own padding is hardware, not text.
     *
     * px-5 out here and p-2 on the surface below were both rem, so every step
     * up in the reader's text size took width away from the six 1fr columns
     * the keys divide. Measured at a 320pt viewport, a key was 43.7pt wide at
     * a 16px root, 41.3pt at 20px and 34.3pt at the 32px a reader on 200% gets
     * — the targets shrinking precisely as the reader asked for things to be
     * bigger. Nothing inside the dock wants the extra room: the icons are
     * 19px, the key row is 52px, and the indicator is 44px, all fixed.
     *
     * 16 rather than the 20 px-5 was, because the budget is tight and it was
     * already overspent. Six 44pt keys plus the surface's 1px border need
     * 266 of the 320, which leaves 27 a side for these two paddings — and
     * 20 + 8 was 28, which is why even a 16px root measured 43.7 here.
     *
     * The padding, the key height and the lift below all come from
     * app/globals.css, because the message composer has to clear this dock
     * and was computing its height by hand. Change one of them there and
     * both move; change one of them here and only one does.
     */
    <nav
      data-app-bottom-navigation
      className="absolute inset-x-0 bottom-0 z-40 flex w-full justify-center px-[16px] [transform:translateZ(0)]"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + var(--dock-lift))",
      }}
      aria-label={label}
    >
      <div
        ref={containerRef}
        /* Opaque, and no backdrop-filter — see the note in AppHeader. This
           one is fixed rather than sticky, so it re-blurs on every scroll
           frame of every screen in the app. */
        className="relative w-full max-w-xl rounded-[28px] border border-[var(--dock-line)] bg-[var(--dock-surface)] p-[var(--dock-padding)] shadow-[var(--dock-shadow)]"
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
          {items.map((item, index) => {
            const className = `relative z-10 flex h-[var(--dock-key-size)] items-center justify-center rounded-full transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
                      className="absolute -right-[7px] -top-[5px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[var(--accent-amber)] px-[3px] text-[0.5625rem] font-semibold leading-none text-white"
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
                title={item.label}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                aria-current={item.active ? "page" : undefined}
                aria-label={item.label}
                className={className}
              >
                {content}
                {/*
                  Says the tap was heard, in the beat between the finger
                  lifting and the destination's skeleton arriving. Inside the
                  Link because useLinkStatus reads the Link above it.
                */}
                <NavPendingHint />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
