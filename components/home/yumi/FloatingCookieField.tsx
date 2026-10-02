"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Pause, Play, Sparkles } from "lucide-react";
import OverlayPortal from "@/components/foundation/overlays/OverlayPortal";
import useTranslation from "@/hooks/i18n/useTranslation";
import { floatingCopy } from "@/lib/home/floatingCopy";
import { avoid, bound, clamp, collide, scatter, type Body, type Rect } from "@/lib/home/floatingPhysics";
import type { Cookie } from "@/lib/pet/types";
import type { VocabularyItem } from "@/lib/types/app";
import FloatingWordCard from "./FloatingWordCard";
import styles from "./FloatingCookies.module.css";

type Particle = Body & { index: number };
type Drag = { id: number; cookie: Cookie; startX: number; startY: number; x: number; y: number; time: number; moved: boolean };
const PLACES = [[.19,.315],[.82,.32],[.16,.53],[.82,.55],[.68,.23],[.14,.83],[.87,.85],[.45,.29],[.9,.66],[.08,.665],[.8,.435],[.33,.92]];
const SIZES = [55,45,53,47,35,34,38,30,33,31,40,28];
// Feeding another word must not recolour or resize the remaining cookies.
const variantFor = (id: string) => Array.from(id).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) % SIZES.length;

export default function FloatingCookieField({ cookies, items, stageRef, onFeed, disabled = false }: {
  cookies: Cookie[]; items: VocabularyItem[]; stageRef: RefObject<HTMLElement | null>;
  onFeed: (cookie: Cookie) => void; disabled?: boolean;
}) {
  const { language } = useTranslation();
  const copy = floatingCopy[language];
  const [paused, setPaused] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState("rest");
  const field = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const bodies = useRef(new Map<string, Particle>());
  const consumed = useRef(new Map<string, number>());
  const drag = useRef<Drag | null>(null);
  const gather = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef<string | null>(null);
  const latest = useRef({ cookies, onFeed, disabled, paused, activeId, mode });
  useEffect(() => { latest.current = { cookies, onFeed, disabled, paused, activeId, mode }; }, [cookies, onFeed, disabled, paused, activeId, mode]);
  useEffect(() => {
    if (mode === "rest" && activeId === null) return;
    gather.current = null;
    drag.current = null;
    field.current?.removeAttribute("data-gathering");
    field.current?.removeAttribute("data-dragging");
    stageRef.current?.dispatchEvent(new CustomEvent("yumi-cookie-gaze", { detail: null }));
  }, [mode, activeId, stageRef]);
  const visible = cookies.slice(0, 12);
  const item = items.find(row => row.id === activeId);
  // A remotely deleted word must not leave an invisible modal locking the field.
  if (activeId !== null && !item) setActiveId(null);

  function feed(cookie: Cookie) {
    if (latest.current.disabled || consumed.current.has(cookie.id) || !latest.current.cookies.some(row => row.id === cookie.id)) return;
    consumed.current.set(cookie.id, performance.now());
    buttons.current.get(cookie.id)?.animate?.([
      { scale: "1", opacity: 1 }, { scale: ".15", opacity: 0 },
    ], { duration: 260, fill: "forwards" });
    latest.current.onFeed(cookie);
    stageRef.current?.dispatchEvent(new CustomEvent("yumi-cookie-bite"));
  }
  const feedRef = useRef(feed);
  useEffect(() => { feedRef.current = feed; });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const read = () => setMode(stage.dataset.yumiMode ?? "rest");
    read();
    const observer = new MutationObserver(read);
    observer.observe(stage, { attributes: true, attributeFilter: ["data-yumi-mode"] });
    return () => observer.disconnect();
  }, [stageRef]);

  /* Coming back from the search, the cookies float home from where they
     were parked instead of reappearing there: the transform transition the
     parked state uses is kept on for the return, then let go so the physics
     owns every frame again. */
  const previousMode = useRef(mode);
  useEffect(() => {
    const was = previousMode.current;
    previousMode.current = mode;
    const node = field.current;
    if (!node || mode !== "rest" || was !== "answering") return;
    node.setAttribute("data-settling", "true");
    const timer = window.setTimeout(() => node.removeAttribute("data-settling"), 520);
    return () => {
      window.clearTimeout(timer);
      node.removeAttribute("data-settling");
    };
  }, [mode]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.dataset.cookiesPaused = paused ? "true" : "false";
    return () => { delete stage.dataset.cookiesPaused; };
  }, [paused, stageRef]);

  useEffect(() => {
    let raf = 0, previous = performance.now(), measureAt = 0;
    let obstacles: Rect[] = [];
    let parked: { cookies: Cookie[]; width: number; height: number } | null = null;
    const painted = new Map<string, string>();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const tick = (now: number) => {
      const dt = Math.min(.032, (now - previous) / 1000);
      previous = now;
      const state = latest.current;
      const width = window.innerWidth, height = window.innerHeight;
      const idle = state.mode === "rest";
      const blocked = document.hidden || state.activeId !== null || state.mode === "open" || !!document.querySelector("[aria-modal='true']");
      if (!blocked) {
        // Search parks the cookies once. Typing must not keep measuring the
        // page and rewriting twelve motion layers on every animation frame.
        if (!idle && parked?.cookies === state.cookies && parked.width === width && parked.height === height) {
          raf = requestAnimationFrame(tick);
          return;
        }
        parked = idle ? null : { cookies: state.cookies, width, height };
        if (idle && now > measureAt) {
          obstacles = Array.from(document.querySelectorAll<HTMLElement>("[data-yumi-protected]"))
            .filter(el => getComputedStyle(el).opacity !== "0")
            .map(el => el.getBoundingClientRect());
          const figure = stageRef.current?.querySelector("[data-yumi-figure]")?.getBoundingClientRect();
          if (figure && idle) obstacles.push(figure);
          measureAt = now + 160;
        }
        const rows = state.cookies.slice(0, 12);
        const ids = new Set(rows.map(row => row.id));
        for (const id of bodies.current.keys()) if (!ids.has(id)) { bodies.current.delete(id); painted.delete(id); }
        for (const [id, at] of consumed.current) {
          if (!ids.has(id) || now - at > 2000) {
            consumed.current.delete(id);
            buttons.current.get(id)?.getAnimations?.().forEach(animation => animation.cancel());
          }
        }
        rows.forEach((cookie, index) => {
          let body = bodies.current.get(cookie.id);
          if (!body) {
            body = { x: PLACES[index][0] * width, y: PLACES[index][1] * height, vx: Math.cos(index * 2.4) * 8, vy: Math.sin(index * 2.4) * 8, radius: Math.max(44, SIZES[variantFor(cookie.id)]) / 2, index };
            bodies.current.set(cookie.id, body);
          }
          const held = drag.current?.cookie.id === cookie.id;
          if (!held && idle && !state.paused && !reduced.matches) {
            if (gather.current) {
              const angle = index * Math.PI * 2 / rows.length;
              const radius = 70 + (index % 2) * 40;
              body.vx += (gather.current.x + Math.cos(angle) * radius - body.x) * dt * 8;
              body.vy += (gather.current.y + Math.sin(angle) * radius - body.y) * dt * 8;
              body.vx *= Math.exp(-dt * 4); body.vy *= Math.exp(-dt * 4);
            } else {
              body.vx += Math.sin(now / 3900 + index) * dt * 4;
              body.vy += Math.cos(now / 4700 + index * 2) * dt * 4;
              body.vx *= Math.exp(-dt * .19); body.vy *= Math.exp(-dt * .19);
            }
            body.x += body.vx * dt; body.y += body.vy * dt;
          }
          if (!held && idle) {
            for (const obstacle of obstacles) avoid(body, obstacle);
            bound(body, width, height);
          }
        });
        const particles = Array.from(bodies.current.entries());
        if (idle && !state.paused && !reduced.matches) {
          for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
            collide(particles[i][1], particles[j][1], drag.current?.cookie.id === particles[i][0], drag.current?.cookie.id === particles[j][0]);
          }
        }
        for (const [id, body] of particles) {
          const button = buttons.current.get(id);
          if (!button) continue;
          const x = idle ? body.x : (body.index % 2 ? width - 18 : 18);
          const y = idle ? body.y : 75 + Math.floor(body.index / 2) * 90;
          const tilt = reduced.matches || state.paused ? 0 : clamp(body.vx * .08, -12, 12);
          const transform = `translate3d(${x - body.radius}px,${y - body.radius}px,0) rotate(${tilt}deg)`;
          if (painted.get(id) !== transform) {
            button.style.transform = transform;
            painted.set(id, transform);
          }
          if (button.dataset.ready !== "true") button.dataset.ready = "true";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stageRef]);

  useEffect(() => {
    let hold: ReturnType<typeof setTimeout> | undefined;
    let press: { id: number; x: number; y: number } | null = null;
    const releaseGather = (scatterOut: boolean) => {
      clearTimeout(hold);
      if (gather.current && scatterOut) bodies.current.forEach(body => scatter(body, gather.current!.x, gather.current!.y, body.index));
      gather.current = null; press = null;
      field.current?.removeAttribute("data-gathering");
    };
    const cancel = () => {
      drag.current = null;
      field.current?.removeAttribute("data-dragging");
      stageRef.current?.dispatchEvent(new CustomEvent("yumi-cookie-gaze", { detail: null }));
      releaseGather(false);
    };
    const down = (event: PointerEvent) => {
      const state = latest.current;
      if (event.isPrimary === false || event.button !== 0 || state.mode !== "rest" || state.activeId || state.paused) return;
      const target = event.target as Element;
      if (target.closest("button, a, input, textarea, [role='dialog']")) return;
      const box = stageRef.current?.querySelector("[data-yumi-figure]")?.getBoundingClientRect();
      if (box && Math.hypot(event.clientX - box.left - box.width / 2, event.clientY - box.top - box.height / 2) < 100) return;
      press = { id: event.pointerId, x: event.clientX, y: event.clientY };
      hold = setTimeout(() => {
        if (!press) return;
        gather.current = { x: press.x, y: press.y };
        field.current?.setAttribute("data-gathering", "true");
      }, 430);
    };
    const move = (event: PointerEvent) => {
      const pointer = drag.current;
      if (pointer?.id === event.pointerId) {
        const body = bodies.current.get(pointer.cookie.id);
        if (!body) return;
        const now = performance.now(), dt = Math.max(.008, (now - pointer.time) / 1000);
        if (event.clientX !== pointer.x || event.clientY !== pointer.y) {
          body.vx = clamp((event.clientX - pointer.x) / dt, -450, 450);
          body.vy = clamp((event.clientY - pointer.y) / dt, -450, 450);
        }
        body.x = event.clientX; body.y = event.clientY;
        pointer.x = event.clientX; pointer.y = event.clientY; pointer.time = now;
        stageRef.current?.dispatchEvent(new CustomEvent("yumi-cookie-gaze", { detail: { x: event.clientX, y: event.clientY } }));
        pointer.moved ||= Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) > 5;
        if (pointer.moved) suppressClick.current = pointer.cookie.id;
      } else if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) releaseGather(false);
    };
    const up = (event: PointerEvent) => {
      const pointer = drag.current;
      if (pointer?.id === event.pointerId) {
        move(event);
        if (pointer.moved) {
          const stage = stageRef.current;
          const figure = stage?.querySelector("[data-yumi-figure]")?.getBoundingClientRect();
          const x = figure?.width ? figure.left + figure.width / 2 : parseFloat(stage?.style.getPropertyValue("--yumi-x") ?? "");
          const y = figure?.height ? figure.top + figure.height / 2 : parseFloat(stage?.style.getPropertyValue("--yumi-y") ?? "");
          if (latest.current.mode === "rest" && Math.hypot(event.clientX - x, event.clientY - y) < 82) feedRef.current(pointer.cookie);
        }
        drag.current = null;
        field.current?.removeAttribute("data-dragging");
        stageRef.current?.dispatchEvent(new CustomEvent("yumi-cookie-gaze", { detail: null }));
      }
      if (press?.id === event.pointerId) releaseGather(true);
    };
    const autoFeed = (event: Event) => {
      const id = (event.target as HTMLElement).dataset.floatingCookie;
      const cookie = latest.current.cookies.find(row => row.id === id);
      if (cookie && !drag.current && !gather.current && !latest.current.paused && !latest.current.activeId && latest.current.mode === "rest") feedRef.current(cookie);
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", cancel, true);
    document.addEventListener("yumi-cookie-feed", autoFeed);
    document.addEventListener("visibilitychange", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      cancel();
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", cancel, true);
      document.removeEventListener("yumi-cookie-feed", autoFeed);
      document.removeEventListener("visibilitychange", cancel);
      window.removeEventListener("blur", cancel);
    };
  }, [stageRef]);

  return <>
    <OverlayPortal>
      <div ref={field} className={styles.field} data-floating-field="" data-mode={mode} data-paused={paused}
        inert={mode !== "rest" || activeId !== null} aria-hidden={mode !== "rest" || undefined}>
        {visible.map(cookie => <button type="button" key={cookie.id}
          ref={node => { if (node) buttons.current.set(cookie.id, node); else buttons.current.delete(cookie.id); }}
          className={styles.cookie} data-yumi-cookie="" data-floating-cookie={cookie.id}
          data-tone={variantFor(cookie.id) % 4} data-depth={variantFor(cookie.id) > 6 ? "back" : "front"}
          style={{ "--size": `${SIZES[variantFor(cookie.id)]}px` } as CSSProperties}
          aria-label={cookie.word} disabled={disabled}
          onPointerDown={event => {
            if (event.isPrimary === false || event.button !== 0 || drag.current) return;
            suppressClick.current = null;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            drag.current = { id: event.pointerId, cookie, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
            field.current?.setAttribute("data-dragging", "true");
          }}
          onLostPointerCapture={event => {
            if (drag.current?.id !== event.pointerId) return;
            drag.current = null;
            field.current?.removeAttribute("data-dragging");
        stageRef.current?.dispatchEvent(new CustomEvent("yumi-cookie-gaze", { detail: null }));
          }}
          onClick={event => {
            if (event.detail !== 0 && suppressClick.current === cookie.id) { suppressClick.current = null; return; }
            setActiveId(cookie.id);
          }}>
          <span aria-hidden="true">{cookie.glyph}</span>
        </button>)}
        {visible.length > 0 && <div className={styles.controls} data-yumi-protected="">
          <button type="button" className={styles.icon} aria-label={paused ? copy.resume : copy.pause} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
          <button type="button" className={styles.icon} aria-label={copy.gather} title={copy.hint} onClick={() => {
            const point = gather.current;
            if (point) {
              bodies.current.forEach(body => scatter(body, point.x, point.y, body.index));
              gather.current = null;
              field.current?.removeAttribute("data-gathering");
            } else {
              setPaused(false);
              gather.current = { x: innerWidth / 2, y: innerHeight * .42 };
              field.current?.setAttribute("data-gathering", "true");
            }
          }}><Sparkles size={18} /></button>
        </div>}
      </div>
    </OverlayPortal>
    {item && <FloatingWordCard key={item.id} item={item} canFeed={!disabled && cookies.some(cookie => cookie.id === item.id)}
      onClose={() => setActiveId(null)} onFeed={() => { const cookie = cookies.find(row => row.id === item.id); if (cookie) feed(cookie); }} />}
  </>;
}
