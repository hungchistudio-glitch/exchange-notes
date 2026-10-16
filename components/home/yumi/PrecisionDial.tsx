"use client";

import { useEffect, useRef, type ReactNode, type PointerEvent } from "react";
import styles from "./PrecisionDial.module.css";

export const dialIndex = (angle: number, count: number) => ((Math.round(-angle / (Math.PI * 2 / count)) % count) + count) % count;
export const dialDelta = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

type Item = { key: string; label: string; icon: ReactNode; badge?: number };
type Props = { enabled: boolean; radius: number; items: Item[]; onChoose: (index: number) => void; onAim: (x: number, y: number) => void };

/** Keep angular motion out of React. Geometry is sampled only when a gesture starts. */
export default function PrecisionDial({ enabled, radius, items, onChoose, onAim }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const angle = useRef(0);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(0);
  const suppressClick = useRef(false);
  const hapticAt = useRef(0);
  const drag = useRef<{ id: number; source: Element; cx: number; cy: number; last: number; x: number; y: number; moved: boolean } | null>(null);
  const callbacks = useRef({ onAim, onChoose });
  useEffect(() => { callbacks.current = { onAim, onChoose }; }, [onAim, onChoose]);

  useEffect(() => {
    const el = root.current;
    if (!enabled || !el) return;
    const step = Math.PI * 2 / items.length;
    const ticks = el.querySelector<HTMLElement>("[data-dial-ticks]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const paint = (value: number, tactile = false) => {
      angle.current = value;
      const index = dialIndex(value, items.length);
      if (index !== active.current && tactile && performance.now() - hapticAt.current > 65) {
        hapticAt.current = performance.now();
        navigator.vibrate?.(5);
      }
      active.current = index;
      buttons.current.forEach((button, i) => {
        if (!button) return;
        const a = -Math.PI / 2 + i * step + value;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        button.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        button.dataset.selected = String(i === index);
        button.setAttribute("aria-current", i === index ? "true" : "false");
      });
      const a = -Math.PI / 2 + index * step + value;
      callbacks.current.onAim(Math.cos(a) * .65, Math.sin(a) * .65);
      if (ticks) ticks.style.transform = `rotate(${value}rad)`;
    };
    const settle = (target = Math.round(angle.current / step) * step) => {
      cancelAnimationFrame(raf.current);
      const from = angle.current, start = performance.now();
      const frame = (now: number) => {
        const t = reduced.matches ? 1 : Math.min(1, (now - start) / 330);
        paint(from + (target - from) * (1 - Math.pow(1 - t, 4)));
        if (t < 1) raf.current = requestAnimationFrame(frame);
      };
      raf.current = requestAnimationFrame(frame);
    };
    const move = (event: globalThis.PointerEvent) => {
      const current = drag.current;
      if (!current || event.pointerId !== current.id) return;
      const a = Math.atan2(event.clientY - current.cy, event.clientX - current.cx);
      current.moved ||= Math.hypot(event.clientX - current.x, event.clientY - current.y) > 7;
      if (current.moved) {
        suppressClick.current = true;
        angle.current += dialDelta(current.last, a);
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(() => paint(angle.current, true));
      }
      current.last = a;
    };
    const releaseCapture = () => {
      const current = drag.current;
      drag.current = null;
      delete el.dataset.dragging;
      if (current?.source.hasPointerCapture?.(current.id)) current.source.releasePointerCapture(current.id);
    };
    const end = (event: globalThis.PointerEvent) => {
      if (drag.current?.id !== event.pointerId) return;
      if (event.type === "pointerup") move(event);
      else suppressClick.current = true;
      releaseCapture();
      settle();
    };
    const cancel = () => {
      suppressClick.current = true;
      if (timer.current) clearTimeout(timer.current);
      releaseCapture();
      settle();
    };
    const hidden = () => { if (document.hidden) cancel(); };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (drag.current) return;
      cancelAnimationFrame(raf.current);
      paint(angle.current + Math.max(-.25, Math.min(.25, (event.deltaY || event.deltaX) * .003)), true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => settle(), 100);
    };
    const key = (event: KeyboardEvent) => {
      const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
      if (!direction && !["Home", "End"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      el.dataset.input = "keyboard";
      const focused = buttons.current.indexOf(document.activeElement as HTMLButtonElement);
      const from = focused < 0 ? active.current : focused;
      const index = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (from + direction + items.length) % items.length;
      buttons.current[index]?.focus({ preventScroll: true });
      settle(angle.current + dialDelta(angle.current, -index * step));
    };
    paint(angle.current);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", end);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    return () => {
      cancelAnimationFrame(raf.current);
      if (timer.current) clearTimeout(timer.current);
      releaseCapture();
      angle.current = Math.round(angle.current / step) * step;
      callbacks.current.onAim(0, 0);
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end); el.removeEventListener("lostpointercapture", end);
      el.removeEventListener("wheel", wheel); el.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("blur", cancel); window.removeEventListener("resize", cancel);
    };
  }, [enabled, radius, items.length]);

  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.button !== 0 || event.isPrimary === false || drag.current) return;
    event.currentTarget.dataset.input = "pointer";
    // The overlay reads this so a second finger on the canvas cannot close a dial mid-turn.
    event.currentTarget.dataset.dragging = "";
    cancelAnimationFrame(raf.current);
    if (timer.current) clearTimeout(timer.current);
    const box = event.currentTarget.getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    suppressClick.current = false;
    const source = (event.target as Element).closest("button") ?? event.currentTarget;
    drag.current = { id: event.pointerId, source, cx, cy, last: Math.atan2(event.clientY - cy, event.clientX - cx), x: event.clientX, y: event.clientY, moved: false };
    // Capture on the original button so an ordinary tap retains its click target.
    source.setPointerCapture?.(event.pointerId);
  };
  return <div ref={root} className={styles.dial} data-dial="" data-enabled={enabled} inert={!enabled} aria-hidden={!enabled}
    style={{ width: radius * 2 + 96, height: radius * 2 + 96 }} onPointerDown={start}
    onClick={event => {
      const button = (event.target as Element).closest<HTMLButtonElement>("[data-dial-item]");
      if (enabled && button && !suppressClick.current) callbacks.current.onChoose(Number(button.dataset.dialItem));
    }}>
    <div className={styles.track} style={{ width: radius * 2 + 78, height: radius * 2 + 78 }}>
      <svg data-dial-ticks viewBox="0 0 400 400" aria-hidden="true">
        <circle cx="200" cy="200" r="192" fill="none" stroke="transparent" strokeWidth="22" style={{ pointerEvents: "stroke", touchAction: "none" }} />
        {Array.from({ length: 120 }, (_, i) => <line key={i} x1="200" y1="4" x2="200" y2={i % 15 === 0 ? 18 : i % 5 === 0 ? 13 : 8} transform={`rotate(${i * 3} 200 200)`} />)}
      </svg>
      <i className={styles.index} />
    </div>
    {items.map((item, i) => <button ref={el => { buttons.current[i] = el; }} key={item.key} type="button" data-dial-item={i} aria-label={item.label}
      onClick={event => { if (enabled && event.detail === 0) { event.stopPropagation(); callbacks.current.onChoose(i); } }}>
      <span className={styles.disc}><small>{String(i + 1).padStart(2, "0")}</small><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{item.icon}</svg>{!!item.badge && <b>{item.badge > 9 ? "9+" : item.badge}</b>}</span>
      <span className={styles.label}>{item.label}</span>
    </button>)}
  </div>;
}
