"use client";

import { useEffect, useMemo, useRef } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useCosmicMode from "@/hooks/useCosmicMode";
import { fill } from "@/lib/i18n/format";
import type { TranslationDictionary } from "@/lib/i18n/types";
import type { LanguageCode } from "@/lib/languages";
import { greatCircle, project, receiverPlace, signalsOf, type Signal } from "@/lib/discover/signalSources";
import type { DailyNewsCard } from "@/lib/types/dailyNews";

import styles from "./SignalStarMap.module.css";

const TILT = 18;

/**
 * Today's signal map (Chi, 2026-11-28: 訊號來源星圖): a holographic globe
 * turning slowly, a light at every city today's stories came from and a
 * packet running along the great circle from it to the reader; below it,
 * the stories by city, each a way into the story.
 */
export default function SignalStarMap({
  open,
  onClose,
  cards,
  language,
  copy,
  onOpenStory,
}: {
  open: boolean;
  onClose: () => void;
  cards: readonly DailyNewsCard[];
  language: LanguageCode;
  copy: TranslationDictionary["discover"]["starMap"];
  onOpenStory: (id: string) => void;
}) {
  const cosmic = useCosmicMode();
  const signals = useMemo(() => signalsOf(cards), [cards]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const view = useRef({ lon: 100, lat: TILT, dragging: false, lastX: 0, lastY: 0, idleSince: 0 });

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const receiver = receiverPlace();
    const arcs = signals.map((signal) => greatCircle(signal, receiver, 40));
    const ink = cosmic
      ? { rim: "rgba(184,232,229,0.75)", grid: "rgba(184,232,229,0.16)", glow: "rgba(126,214,255,", body: ["#16222c", "#0b1218"], label: "#e4ecee", home: "#ffd479" }
      : { rim: "rgba(47,111,98,0.6)", grid: "rgba(47,111,98,0.14)", glow: "rgba(47,143,127,", body: ["#fbf8f1", "#e9e1d2"], label: "#1d1a15", home: "#b07826" };
    let frame = 0;
    let last = 0;
    // The reader in the middle, a little below it: the signals come to them.
    view.current.lon = receiver.lon - 25;
    view.current.lat = Math.max(-40, Math.min(55, receiver.lat + 8));

    const draw = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const state = view.current;
      if (!state.dragging && !reduced && now - state.idleSince > 900) state.lon -= dt * 9;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const size = canvas.clientWidth;
      if (canvas.width !== Math.round(size * ratio)) {
        canvas.width = Math.round(size * ratio);
        canvas.height = Math.round(size * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, size, size);
      const r = size * 0.42;
      const cx = size / 2;
      const cy = size / 2;
      const at = (lat: number, lon: number) => {
        const point = project(lat, lon, state.lat, state.lon);
        return { x: cx + point.x * r, y: cy + point.y * r, front: point.front, depth: point.depth };
      };

      // The body: glass, lit from the upper left, with a fine rim.
      const body = context.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      body.addColorStop(0, ink.body[0]);
      body.addColorStop(1, ink.body[1]);
      context.fillStyle = body;
      context.beginPath();
      context.arc(cx, cy, r, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = ink.rim;
      context.lineWidth = 1.2;
      context.stroke();

      // Meridians and parallels, front half only.
      context.strokeStyle = ink.grid;
      context.lineWidth = 0.8;
      const line = (points: Array<{ lat: number; lon: number }>) => {
        context.beginPath();
        let pen = false;
        for (const point of points) {
          const p = at(point.lat, point.lon);
          if (!p.front) { pen = false; continue; }
          if (pen) context.lineTo(p.x, p.y);
          else context.moveTo(p.x, p.y);
          pen = true;
        }
        context.stroke();
      };
      for (let lon = -180; lon < 180; lon += 30) line(Array.from({ length: 37 }, (_, i) => ({ lat: -90 + i * 5, lon })));
      for (let lat = -60; lat <= 60; lat += 30) line(Array.from({ length: 73 }, (_, i) => ({ lat, lon: -180 + i * 5 })));

      // The arcs, lifted a little off the surface, with a packet running home.
      arcs.forEach((arc, index) => {
        context.strokeStyle = `${ink.glow}0.45)`;
        context.lineWidth = 1.1;
        line(arc);
        if (reduced) return;
        const travel = ((now / 1000) * 0.32 + index * 0.27) % 1;
        const point = arc[Math.floor(travel * (arc.length - 1))];
        const p = at(point.lat, point.lon);
        if (!p.front) return;
        context.fillStyle = `${ink.glow}0.95)`;
        context.beginPath();
        context.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        context.fill();
      });

      // Every city's light, pulsing; its name beside it when it faces us.
      context.font = "600 11px ui-sans-serif, system-ui, sans-serif";
      signals.forEach((signal: Signal, index) => {
        const p = at(signal.lat, signal.lon);
        if (!p.front) return;
        const pulse = reduced ? 0.5 : ((now / 1000) * 0.8 + index * 0.31) % 1;
        context.strokeStyle = `${ink.glow}${(0.7 * (1 - pulse)).toFixed(2)})`;
        context.lineWidth = 1.2;
        context.beginPath();
        context.arc(p.x, p.y, 4 + pulse * 12, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = `${ink.glow}1)`;
        context.beginPath();
        context.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = ink.label;
        context.globalAlpha = Math.min(1, 0.35 + p.depth);
        context.fillText(`${copy.cities[signal.city]} · ${signal.cards.length}`, p.x + 8, p.y - 6);
        context.globalAlpha = 1;
      });

      // The reader: where the signals are coming to.
      const home = at(receiver.lat, receiver.lon);
      if (home.front) {
        context.fillStyle = ink.home;
        context.beginPath();
        context.arc(home.x, home.y, 4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = ink.label;
        context.fillText(copy.receiver, home.x + 8, home.y + 14);
      }

      if (!reduced || state.dragging) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    // Turned by hand: a drag spins it, and it carries on by itself after.
    const down = (event: PointerEvent) => {
      view.current.dragging = true;
      view.current.lastX = event.clientX;
      view.current.lastY = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
      if (reduced) frame = requestAnimationFrame(draw);
    };
    const move = (event: PointerEvent) => {
      if (!view.current.dragging) return;
      view.current.lon -= (event.clientX - view.current.lastX) * 0.45;
      view.current.lat = Math.max(-60, Math.min(70, view.current.lat + (event.clientY - view.current.lastY) * 0.3));
      view.current.lastX = event.clientX;
      view.current.lastY = event.clientY;
    };
    const up = () => {
      view.current.dragging = false;
      view.current.idleSince = performance.now();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, [open, signals, cosmic, copy]);

  return (
    <BottomSheet open={open} onClose={onClose} title={copy.title} description={copy.subtitle}>
      <div className={styles.map}>
        <canvas ref={canvasRef} className={styles.globe} role="img" aria-label={copy.title} />
      </div>
      <ul className={styles.list}>
        {signals.map((signal) => (
          <li key={signal.city} className={styles.city}>
            <p className={styles.cityName}>
              <span className={styles.dot} aria-hidden="true" />
              {copy.cities[signal.city]}
              <span className={styles.meta}>
                {signal.sources.join(" · ")} · {signal.cards.length === 1 ? copy.storyOne : fill(copy.stories, { count: String(signal.cards.length) })}
              </span>
            </p>
            {signal.cards.map((card) => (
              <button
                key={card.id}
                type="button"
                className={styles.story}
                onClick={() => {
                  onClose();
                  onOpenStory(card.id);
                }}
              >
                {card.titles[language] ?? Object.values(card.titles)[0]}
              </button>
            ))}
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
