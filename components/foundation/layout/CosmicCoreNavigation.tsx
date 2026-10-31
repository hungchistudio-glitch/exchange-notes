"use client";

import Link, { useLinkStatus } from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";

import NavPendingHint from "./NavPendingHint";
import s from "./CosmicCoreNavigation.module.css";
import useCosmicCoreGesture from "./useCosmicCoreGesture";
import useCosmicCoreScrollFade from "./useCosmicCoreScrollFade";
import useRailScrub from "./useRailScrub";

/* =========================================================
   Cosmic mode's navigation: one core, six keys

   A single obsidian core sits at the foot of the screen; a tap opens a rail
   of six keys above it, or the core can be held for 180ms and the finger
   slid to a key and lifted to enter it (useCosmicCoreGesture). Reading
   rests the closed core (useCosmicCoreScrollFade). Standard mode keeps its
   own dock; ProtectedNav picks between the two.

   Three things this component is careful about:

   - **The same DOM across routes.** ProtectedNav lives in the layout, so a
     route change re-renders it with a new routeKey rather than remounting
     it. The rail's closing transition therefore finishes on the new page
     instead of being cut off by a remount.
   - **Navigation starts in the click.** A destination is a real <Link>,
     and search runs its action in the same event: nothing waits for an
     animation, so a cached route is not made to look slow.
   - **A finger can slide along the open rail.** The selection light and
     the name follow it, and lifting enters the key nearest it; lifting off
     the rail enters nothing (useRailScrub, Chi, 2026-10-30: "幫我升級為
     高級可滑式"). A tap on a key is unchanged.
   - **One arc of light that knows where it points.** When the rail opens,
     the arc on the core's rim turns to the key in reach (measured, so it
     points true at any width), and turns back to rest when it closes
     (Chi, 2026-10-30: "冰青光跟著選取方向轉").
   ========================================================= */

export type CosmicCoreItem = {
  href?: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  /** A key that runs an action (search, a sheet) rather than going somewhere. */
  onSelect?: () => void;
  badgeCount?: number;
};

type Props = {
  items: CosmicCoreItem[];
  /** The core's accessible name, and the rail's. */
  label: string;
  /** The current route: a new one closes the rail without remounting. */
  routeKey?: string;
  /** The review page compares the original (PR #221); everywhere else, precision. */
  design?: "original" | "precision";
};

/** How long the chosen key's name stays up after a tap. */
const LABEL_LINGER_MS = 1400;
/** The arc's resting bearing: the bottom of the rim. */
const ARC_REST = 180;

export default function CosmicCoreNavigation({ items, label, routeKey, design = "precision" }: Props) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  /** The key last tapped, the key under the finger or pointer. */
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [showLabel, setShowLabel] = useState(false);
  const [pendingRoutes, setPendingRoutes] = useState<readonly string[]>([]);
  /** A finger sliding along the open rail. */
  const [scrubbing, setScrubbing] = useState(false);

  /* A new route closes everything, in render, so the first frame of the
     new page already has the rail on its way down. */
  const [shownRoute, setShownRoute] = useState(routeKey);
  if (shownRoute !== routeKey) {
    setShownRoute(routeKey);
    setOpen(false);
    setDragging(false);
    setSelected(null);
    setHovered(null);
    setShowLabel(false);
    setScrubbing(false);
  }

  const root = useRef<HTMLDivElement>(null);
  const core = useRef<HTMLButtonElement>(null);
  const rail = useRef<HTMLElement>(null);
  const energy = useRef<HTMLDivElement>(null);
  const nameLabel = useRef<HTMLDivElement>(null);
  /** The dock's width when a slide starts: the label is placed against it. */
  const slideWidth = useRef(0);
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railId = useId();

  const loading = pendingRoutes.length > 0;
  const activeIndex = Math.max(0, items.findIndex(item => item.active));
  const current = hovered ?? selected ?? activeIndex;
  const unread = items.some(item => (item.badgeCount ?? 0) > 0);

  useCosmicCoreScrollFade(root, open || dragging || loading, routeKey, core);

  useEffect(() => () => {
    if (labelTimer.current) clearTimeout(labelTimer.current);
  }, []);

  const reportPending = useCallback((href: string, pending: boolean) => {
    setPendingRoutes(previous => {
      const has = previous.includes(href);
      if (pending === has) return previous;
      return pending ? [...previous, href] : previous.filter(route => route !== href);
    });
  }, []);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) core.current?.focus();
  }, []);

  /* Open, a tap anywhere else or Escape closes it. */
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, close]);

  /*
   * The arc's bearing. Open, it points from the core's centre to the key in
   * reach, measured from the laid-out rail; closed, it rests at the bottom,
   * swung back on the side it came from so it never sweeps the long way
   * round. Written straight to the style: a bearing is not React state.
   */
  const lastBearing = useRef(0);
  useEffect(() => {
    const dock = root.current;
    if (!dock) return;
    if (!(open || dragging)) {
      dock.style.setProperty("--arc-turn", `${lastBearing.current < 0 ? -ARC_REST : ARC_REST}deg`);
      return;
    }
    const key = dock.querySelector<HTMLElement>(`[data-core-item="${current}"]`);
    const centre = core.current?.getBoundingClientRect();
    const target = key?.getBoundingClientRect();
    if (!centre || !target) return;
    const dx = target.left + target.width / 2 - (centre.left + centre.width / 2);
    const dy = centre.top + centre.height / 2 - (target.top + target.height / 2);
    const bearing = Math.round((Math.atan2(dx, dy) * 180) / Math.PI);
    lastBearing.current = bearing;
    dock.style.setProperty("--arc-turn", `${bearing}deg`);
  }, [open, dragging, current]);

  function choose(index: number) {
    const item = items[index];
    setSelected(index);
    setShowLabel(true);
    close(true);
    if (labelTimer.current) clearTimeout(labelTimer.current);
    labelTimer.current = setTimeout(() => setShowLabel(false), LABEL_LINGER_MS);
    item.onSelect?.();
  }

  const { consumeClick, ...pointerHandlers } = useCosmicCoreGesture({
    root,
    core,
    routeKey,
    onOpen: () => {
      if (labelTimer.current) clearTimeout(labelTimer.current);
      setShowLabel(false);
      setHovered(null);
      setOpen(true);
      setDragging(true);
    },
    onHover: index => {
      setHovered(index);
      setShowLabel(index !== null);
    },
    onCancel: () => {
      setOpen(false);
      setDragging(false);
      setHovered(null);
      setShowLabel(false);
    },
    onCommit: index => {
      setDragging(false);
      setHovered(null);
      // A real click, so a Link navigates as a Link and search keeps focus.
      root.current?.querySelector<HTMLElement>(`[data-core-item="${index}"]`)?.click();
    },
  });

  /*
   * A finger sliding along the open rail. Its position (a fractional key
   * index) moves the light and the label directly, their transform and
   * translate written frame by frame on those two layers alone: a variable
   * on the dock restyled all of it on every move. The key in reach is
   * state, for its name and the arc. Let go, the inline values are removed
   * and --slot takes the light and the label back, with their easing.
   */
  const scrub = useRailScrub({
    rail,
    keys: () => Array.from(root.current?.querySelectorAll<HTMLElement>("[data-core-item]") ?? []),
    enabled: open,
    onStart: () => {
      if (labelTimer.current) clearTimeout(labelTimer.current);
      slideWidth.current = root.current?.clientWidth ?? 0;
      setScrubbing(true);
      setShowLabel(true);
    },
    onMove: ({ position, index }) => {
      if (energy.current) energy.current.style.transform = `translateX(${position * 100}%)`;
      const width = slideWidth.current;
      if (nameLabel.current && width && design === "precision") {
        const x = Math.min(width - 72, Math.max(72, 8 + ((width - 16) / 6) * (position + 0.5)));
        nameLabel.current.style.translate = `calc(${x}px - 50%) 0`;
      }
      setHovered(current => (current === index ? current : index));
    },
    onEnd: index => {
      setScrubbing(false);
      energy.current?.style.removeProperty("transform");
      nameLabel.current?.style.removeProperty("translate");
      // Lifted on a key: its click (sent by the hook) chooses it. Off the rail: back to where we are.
      if (index === null) {
        setHovered(null);
        setShowLabel(false);
      }
    },
  });

  /* Pointer and focus show a key's name; the precision design only. */
  const reach = (index: number) =>
    design === "precision"
      ? {
          onPointerEnter: () => { if (!dragging && !scrubbing) setHovered(index); },
          onPointerLeave: () => { if (!dragging && !scrubbing) setHovered(null); },
          onFocus: () => setHovered(index),
          onBlur: () => { if (!dragging) setHovered(null); },
        }
      : {};

  return (
    <div
      ref={root}
      data-app-bottom-navigation
      data-design={design}
      data-open={open}
      data-dragging={dragging}
      data-loading={loading}
      data-scrubbing={scrubbing}
      className={s.dock}
      style={{ "--slot": current } as CSSProperties}
    >
      {/* Decorative: every key carries its own name, and naming each key the
          finger crosses aloud would be noise. */}
      <div ref={nameLabel} className={s.label} aria-hidden="true" data-visible={showLabel || (design === "precision" && open)}>
        {items[current]?.label}
      </div>

      <nav
        ref={rail}
        id={railId}
        className={s.rail}
        aria-label={label}
        inert={!open}
        aria-hidden={!open}
        onPointerDown={scrub.onPointerDown}
        onPointerMove={scrub.onPointerMove}
        onPointerUp={scrub.onPointerUp}
        onPointerCancel={scrub.onPointerCancel}
        onLostPointerCapture={scrub.onLostPointerCapture}
        onClickCapture={scrub.onClickCapture}
      >
        <div className={s.track} />
        {items.map((item, index) => (
          <CoreKey
            key={item.href ?? item.label}
            item={item}
            index={index}
            selected={current === index}
            onChoose={event => {
              // A new tab or window is not a choice here: the rail stays.
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              choose(index);
            }}
            onPending={reportPending}
            {...reach(index)}
          />
        ))}
        {/* Over the keys, not under: a moving layer under them made the
            browser lift the keys into a layer of their own, re-rastered as
            the light passed (every key repainted ~50 times in a slide). The
            light is all but transparent and takes no pointer. */}
        <div ref={energy} className={s.energy} aria-hidden="true" />
      </nav>

      <button
        ref={core}
        type="button"
        className={s.core}
        aria-label={label}
        aria-expanded={open}
        aria-controls={railId}
        aria-busy={loading}
        onClick={event => {
          if (consumeClick(event.detail)) return;
          setSelected(null);
          setHovered(null);
          setOpen(value => !value);
        }}
        onContextMenu={event => event.preventDefault()}
        {...pointerHandlers}
      >
        <span className={s.loadingArc} aria-hidden="true" />
        <span className={s.rim} aria-hidden="true" />
        <span className={s.lens} aria-hidden="true">
          <CoreMark />
        </span>
        <span className={s.arc} aria-hidden="true" />
        {unread && <span className={s.coreUnread} aria-hidden="true" />}
      </button>
    </div>
  );
}

type KeyProps = {
  item: CosmicCoreItem;
  index: number;
  selected: boolean;
  onChoose: (event: MouseEvent<HTMLElement>) => void;
  onPending: (href: string, pending: boolean) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

/** One key: a Link to a place, or a button for an action. */
function CoreKey({ item, index, selected, onChoose, onPending, ...reach }: KeyProps) {
  const shared = {
    ...reach,
    className: s.key,
    title: item.label,
    "aria-label": item.label,
    "data-core-item": index,
    "data-selected": selected,
    onClick: onChoose,
  };
  const face = (
    <>
      {item.icon}
      <span className={s.dot} aria-hidden="true" />
      {Boolean(item.badgeCount) && (
        <span className={s.badge} aria-hidden="true">
          {item.badgeCount! > 9 ? "9+" : item.badgeCount}
        </span>
      )}
    </>
  );

  if (item.href && !item.onSelect) {
    return (
      <Link href={item.href} aria-current={item.active ? "page" : undefined} {...shared}>
        {face}
        <NavPendingHint />
        <PendingSignal href={item.href} onChange={onPending} />
      </Link>
    );
  }
  return (
    <button type="button" {...shared}>
      {face}
    </button>
  );
}

/** Tells the core that this key's navigation is under way, from inside its Link. */
function PendingSignal({ href, onChange }: { href: string; onChange: (href: string, pending: boolean) => void }) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    onChange(href, pending);
    return () => onChange(href, false);
  }, [href, pending, onChange]);
  return null;
}

/** Yumi's C and eye, engraved in the lens. */
function CoreMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M23 8a11 11 0 1 0 0 16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M5 16h8" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="16" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}
