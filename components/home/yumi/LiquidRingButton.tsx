"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode, type PointerEvent } from "react";
import styles from "./YumiRingOverlay.module.css";

type Target = { button: HTMLButtonElement; x: number; y: number; angle: number };
type Gesture = {
  id: number;
  source: HTMLButtonElement;
  targets: Target[];
  cx: number;
  cy: number;
  radius: number;
  startX: number;
  startY: number;
  moved: boolean;
  active: number;
  valid: boolean;
  reduced: boolean;
};

const RingContext = createContext<{
  enabled: boolean;
  start: (event: PointerEvent<HTMLButtonElement>, index: number) => void;
  activate: (index: number) => void;
} | null>(null);

const angleDifference = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
const MOTION_PROPERTIES = ["--liquid-x", "--liquid-y", "--liquid-angle", "--liquid-stretch", "--liquid-squash", "--glass-light-x", "--glass-light-y", "--glass-tilt-x", "--glass-tilt-y"];

function clearSurface(button: HTMLButtonElement) {
  delete button.dataset.dragging;
  delete button.dataset.active;
  delete button.dataset.releasing;
  for (const name of MOTION_PROPERTIES) button.style.removeProperty(name);
}

/** One captured pointer can scrub through every destination on the orbit. */
export function LiquidRingSurface({ enabled, onChoose, children }: {
  enabled: boolean;
  onChoose: (index: number) => void;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef<number | null>(null);
  const sample = useRef<{ pointerId: number; clientX: number; clientY: number } | null>(null);

  const reset = useCallback(() => {
    const current = gesture.current;
    gesture.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    sample.current = null;
    if (pending.current !== null) clearTimeout(pending.current);
    pending.current = null;
    root.current?.querySelectorAll<HTMLButtonElement>("[data-liquid-option]").forEach(clearSurface);
    if (status.current) status.current.textContent = "";
    if (current?.source.hasPointerCapture?.(current.id)) current.source.releasePointerCapture(current.id);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const hide = () => { if (document.hidden) reset(); };
    window.addEventListener("blur", reset);
    window.addEventListener("resize", reset);
    document.addEventListener("visibilitychange", hide);
    return () => {
      reset();
      window.removeEventListener("blur", reset);
      window.removeEventListener("resize", reset);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [enabled, reset]);

  function announce(target: Target) {
    const label = target.button.getAttribute("aria-label") ?? "";
    if (status.current && status.current.textContent !== label) status.current.textContent = label;
  }

  function start(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (!enabled || gesture.current || pending.current !== null || event.button !== 0 || event.isPrimary === false) return;
    const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>("[data-liquid-option]") ?? []);
    buttons.forEach(clearSurface);
    const points = buttons.map(button => {
      // Read the stationary hit area, even if its glass is still rebounding
      // from a cancelled gesture. Labels sit below the fixed-size disc.
      const box = button.getBoundingClientRect();
      const disc = button.querySelector<HTMLElement>("[data-liquid-disc]");
      return { button, x: box.left + box.width / 2, y: box.top + (disc?.offsetHeight || box.height) / 2 };
    });
    if (!points[index]) return;
    const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const targets = points.map(point => ({ ...point, angle: Math.atan2(point.y - cy, point.x - cx) }));
    gesture.current = {
      id: event.pointerId, source: event.currentTarget, targets, cx, cy,
      radius: points.reduce((sum, point) => sum + Math.hypot(point.x - cx, point.y - cy), 0) / points.length,
      startX: event.clientX, startY: event.clientY,
      moved: false, active: index, valid: true,
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
    event.currentTarget.dataset.active = "true";
    event.currentTarget.dataset.dragging = "true";
    event.currentTarget.setPointerCapture?.(event.pointerId);
    announce(targets[index]);
  }

  function paint(event: { pointerId: number; clientX: number; clientY: number }) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    current.moved ||= Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 8;
    if (!current.moved) return;
    const dx = event.clientX - current.cx;
    const dy = event.clientY - current.cy;
    const distance = Math.hypot(dx, dy);
    // Pulling into Yumi or away from the orbit cancels selection on release.
    current.valid = Math.abs(distance - current.radius) <= 64;
    const angle = Math.atan2(dy, dx);
    let nearest = current.active;
    current.targets.forEach((target, index) => {
      if (Math.abs(angleDifference(angle, target.angle)) < Math.abs(angleDifference(angle, current.targets[nearest].angle))) nearest = index;
    });
    // A small hysteresis avoids flicker when the finger rests between keys.
    if (nearest !== current.active && Math.abs(angleDifference(angle, current.targets[current.active].angle)) > Math.abs(angleDifference(angle, current.targets[nearest].angle)) + 0.065) {
      clearSurface(current.targets[current.active].button);
      current.active = nearest;
      if (current.valid) announce(current.targets[nearest]);
    }
    const target = current.targets[current.active];
    if (!current.valid) {
      clearSurface(target.button);
      if (status.current) status.current.textContent = "";
      return;
    }
    target.button.dataset.active = "true";
    target.button.dataset.dragging = "true";
    announce(target);
    if (current.reduced) return;

    const offset = angleDifference(angle, target.angle);
    // Near a destination the glass pulls into its centre; between keys it
    // follows the finger, constrained to the circular track.
    const attraction = Math.pow(Math.max(0, 1 - Math.abs(offset) / 0.34), 2) * 0.82;
    const projectedAngle = angle - offset * attraction;
    const radius = current.radius + clamp(distance - current.radius, 35) * 0.16;
    const x = Math.cos(projectedAngle) * radius + current.cx - target.x;
    const y = Math.sin(projectedAngle) * radius + current.cy - target.y;
    const stretch = Math.min(0.48, Math.hypot(x, y) / 96);
    const style = target.button.style;
    style.setProperty("--liquid-x", `${x}px`);
    style.setProperty("--liquid-y", `${y}px`);
    style.setProperty("--liquid-angle", `${Math.atan2(y, x)}rad`);
    style.setProperty("--liquid-stretch", String(1.06 + stretch));
    style.setProperty("--liquid-squash", String(1.04 - stretch * 0.46));
    style.setProperty("--glass-light-x", `${50 + clamp(event.clientX - target.x, 50) * 0.65}%`);
    style.setProperty("--glass-light-y", `${30 + clamp(event.clientY - target.y, 50) * 0.5}%`);
    style.setProperty("--glass-tilt-x", `${clamp(-y * 0.32, 15)}deg`);
    style.setProperty("--glass-tilt-y", `${clamp(x * 0.32, 15)}deg`);
  }

  function move(event: PointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    // Latch travel on every sample, but paint only the latest sample per frame.
    current.moved ||= Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 8;
    sample.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (sample.current) paint(sample.current);
    });
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    paint(event); // Flush the final coordinate even if its frame has not painted.
    const target = current.targets[current.active];
    const box = current.source.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    const choose = enabled && (current.moved ? current.valid : inside);
    reset(); // Release capture before scheduling, so lostcapture cannot cancel a valid choice.
    if (!choose) return;
    if (current.reduced) { onChoose(current.active); return; }
    target.button.dataset.active = "true";
    target.button.dataset.releasing = "true";
    pending.current = setTimeout(() => {
      pending.current = null;
      clearSurface(target.button);
      onChoose(current.active);
    }, current.moved ? 260 : 150);
  }

  function cancel(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id === event.pointerId) reset();
  }

  return <RingContext.Provider value={{ enabled, start, activate: index => {
    if (!enabled || gesture.current || pending.current !== null) return;
    onChoose(index);
  } }}>
    <div ref={root} className={styles.liquidSurface} onPointerMove={move} onPointerUp={release}
      onPointerCancel={cancel} onLostPointerCapture={cancel}
      onKeyDown={event => { if (event.key === "Escape") reset(); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) reset(); }}>
      {children}
      <span ref={status} className={styles.gestureStatus} role="status" aria-live="polite" aria-atomic="true" />
    </div>
  </RingContext.Provider>;
}

export default function LiquidRingButton({ label, index, children }: { label: string; index: number; children: ReactNode }) {
  const ring = useContext(RingContext);
  return <button type="button" aria-label={label} data-liquid-option={index} tabIndex={ring?.enabled ? 0 : -1}
    onClick={event => { if (event.detail === 0) ring?.activate(index); }}
    onPointerDown={event => ring?.start(event, index)}>
    {children}
  </button>;
}
