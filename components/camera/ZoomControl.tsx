"use client";

/* =========================================================
   The zoom control, on the hardware that has a zoom

   This component renders nothing at all when the camera reports no zoom
   range, which on iPhone is every camera. That is the deliberate answer to
   the one part of the spec that cannot be met on this platform: Safari
   implements no zoom constraint, so the only zoom available in a browser
   there would be scaling the preview — which moves no lens, changes not one
   pixel of what gets recognised, and would be a control that lies.

   Where there is a real range — Android Chrome — everything here is real.
   The stops come from what the hardware reported, never from a list of
   pretty numbers, and the readout shows the factor the lens is actually at
   after clamping rather than the one that was asked for.
   ========================================================= */

import type { CameraCapabilities } from "@/lib/media/cameraCapabilities";

type ZoomControlProps = {
  capabilities: CameraCapabilities;
  zoom: number;
  onZoom: (value: number) => void;
  /**
   * Whether the live readout is showing.
   *
   * Owned by the parent, which knows when a pinch starts and ends because
   * those are events it handles, and which schedules the fade from the same
   * place. Mirroring a prop into state here would be an effect whose only
   * job is to disagree with the parent for one render.
   */
  readoutVisible: boolean;
  label: string;
  formatLevel: (level: string) => string;
};

/** One decimal, and no trailing ".0" — 1× and 1.4×, never 1.0×. */
function formatFactor(value: number) {
  return value >= 10 || Number.isInteger(value)
    ? String(Math.round(value))
    : value.toFixed(1);
}

export default function ZoomControl({
  capabilities,
  zoom,
  onZoom,
  readoutVisible,
  label,
  formatLevel,
}: ZoomControlProps) {
  /*
   * The whole control is absent on hardware with no zoom range, which on
   * iPhone is every camera. See the note at the top of this file: a zoom
   * that scales the preview would move no lens and change nothing about
   * what gets recognised.
   */
  if (!capabilities.zoom || capabilities.stops.length < 2) return null;

  const { min, max } = capabilities.zoom;

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-3">
      <div
        className="rounded-full bg-black/45 px-3 py-1 text-[13px] font-semibold tabular-nums text-white backdrop-blur-md transition-opacity duration-300"
        style={{ opacity: readoutVisible ? 1 : 0 }}
        aria-hidden={!readoutVisible}
      >
        {formatLevel(formatFactor(zoom))}
      </div>

      <div
        role="group"
        aria-label={label}
        className="flex items-center gap-1 rounded-full bg-black/35 p-1 backdrop-blur-md"
      >
        {capabilities.stops.map((stop) => {
          const current = Math.abs(stop - zoom) < 0.05;

          return (
            <button
              key={stop}
              type="button"
              onClick={() => onZoom(stop)}
              aria-pressed={current}
              aria-label={formatLevel(formatFactor(stop))}
              /*
               * 44px of touch area inside a 34px visual pill: the spec asks
               * for real targets under compact icons, and a zoom stop that
               * needs aiming is worse than no zoom stop.
               */
              className={`relative flex h-[34px] min-w-[34px] items-center justify-center rounded-full px-2 text-[12px] font-semibold tabular-nums transition-colors before:absolute before:inset-x-0 before:-inset-y-[5px] before:content-[''] ${
                current
                  ? "bg-white text-black"
                  : "text-white/85 active:bg-white/15"
              }`}
            >
              {formatFactor(stop)}
              {/*
                The active stop is not distinguished by fill alone: it also
                carries the multiplication sign, so the state survives a
                reader who cannot separate the two backgrounds.
              */}
              {current ? "×" : ""}
            </button>
          );
        })}
      </div>

      <label className="sr-only" htmlFor="camera-zoom-range">
        {label}
      </label>
      <input
        id="camera-zoom-range"
        type="range"
        min={min}
        max={max}
        step={capabilities.zoom.step ?? 0.1}
        value={zoom}
        onChange={(event) => onZoom(Number(event.target.value))}
        /*
         * The keyboard and screen-reader path to zoom. Visually hidden
         * rather than absent: the pills are the pointer affordance and this
         * is the same control for everyone else.
         */
        className="sr-only"
      />
    </div>
  );
}
