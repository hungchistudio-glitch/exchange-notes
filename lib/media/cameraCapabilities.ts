"use client";

/* =========================================================
   What this particular camera can actually do

   Read off the track, never assumed, and never faked.

   The honest position is worth stating plainly because it decides how the
   whole camera screen is built: iOS Safari implements none of this. There
   is no zoom constraint, no focusMode, no pointsOfInterest, and enumerating
   devices returns one back camera rather than the three the phone has. On
   iPhone every function below reports "no", and the controls that depend on
   them are not rendered.

   That is the design rather than a shortfall of it. The alternative — a
   zoom pill that scales the preview layer — moves no lens, changes not one
   pixel of what gets sent to be recognised, and teaches the reader that
   zooming in does not help when in fact zooming in with their feet would.
   A control that lies is worse than a control that is absent.

   Android Chrome implements all of it, and there it is all real.
   ========================================================= */

/*
 * None of these are in lib.dom's MediaTrackCapabilities. They are typed here
 * rather than asserted at each call site — the same approach the menu
 * camera already takes for the torch, widened.
 */
type ZoomRange = { min: number; max: number; step?: number };

type ExtendedCapabilities = MediaTrackCapabilities & {
  zoom?: ZoomRange;
  torch?: boolean;
  focusMode?: string[];
  pointsOfInterest?: unknown;
};

type ExtendedTrack = MediaStreamTrack & {
  getCapabilities?: () => ExtendedCapabilities;
  getSettings?: () => MediaTrackSettings & { zoom?: number };
};

export type CameraCapabilities = {
  zoom: ZoomRange | null;
  torch: boolean;
  /** Whether focus can be pointed somewhere, not merely switched on. */
  tapToFocus: boolean;
  /** Quick stops worth showing, or an empty list. */
  stops: number[];
};

export const NO_CAPABILITIES: CameraCapabilities = {
  zoom: null,
  torch: false,
  tapToFocus: false,
  stops: [],
};

function capabilitiesOf(track: MediaStreamTrack): ExtendedCapabilities {
  const extended = track as ExtendedTrack;

  try {
    return extended.getCapabilities?.() ?? {};
  } catch {
    // Firefox throws rather than returning nothing.
    return {};
  }
}

/**
 * The quick stops to offer, derived from the range the hardware reports.
 *
 * Never a hardcoded 0.5x/1x/2x. The spec is explicit about that and it is
 * also just wrong on most hardware: the constraint's units are a multiple
 * of the sensor's own widest field, so a phone whose main camera reports a
 * minimum of 1 has no 0.5x to offer and a pill claiming otherwise does
 * nothing when tapped.
 *
 * The upper end is deliberately not the maximum. Phones report maxima of
 * 8x and beyond, almost all of it digital upscaling that destroys exactly
 * the fine strokes recognition depends on — so the ladder stops at four
 * times the base, and the reader keeps a zoom that is still worth using.
 */
export function zoomStops(range: ZoomRange | null): number[] {
  if (!range || !(range.max > range.min)) return [];

  const base = Math.max(1, range.min);
  const ceiling = Math.min(range.max, base * 4);

  const candidates = [0.5, 1, 2, 3, 5].map((factor) =>
    factor < 1 ? range.min * (factor / 0.5) : base * factor,
  );

  const stops = [
    // The widest the lens goes, when that is genuinely wider than base.
    ...(range.min < 1 ? [range.min] : []),
    base,
    ...candidates.filter((value) => value > base && value <= ceiling),
  ];

  // Deduplicated to two decimals: several factors can land on one stop.
  const seen = new Set<string>();

  return stops
    .filter((value) => {
      const key = value.toFixed(2);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a - b)
    .slice(0, 4);
}

/** Everything this track will admit to, read once when the stream opens. */
export function readCapabilities(
  stream: MediaStream | null,
): CameraCapabilities {
  const track = stream?.getVideoTracks()[0];

  if (!track) return NO_CAPABILITIES;

  const capabilities = capabilitiesOf(track);

  const zoom =
    capabilities.zoom &&
    typeof capabilities.zoom.min === "number" &&
    typeof capabilities.zoom.max === "number" &&
    capabilities.zoom.max > capabilities.zoom.min
      ? {
          min: capabilities.zoom.min,
          max: capabilities.zoom.max,
          step: capabilities.zoom.step,
        }
      : null;

  /*
   * Pointing focus needs both halves: a mode that can be told where to look,
   * and the property that says where. A camera offering only
   * `focusMode: ["continuous"]` focuses perfectly well and cannot be aimed,
   * so tapping it would do nothing.
   */
  const tapToFocus =
    Array.isArray(capabilities.focusMode) &&
    (capabilities.focusMode.includes("single-shot") ||
      capabilities.focusMode.includes("manual")) &&
    "pointsOfInterest" in capabilities;

  return {
    zoom,
    torch: Boolean(capabilities.torch),
    tapToFocus,
    stops: zoomStops(zoom),
  };
}

/** The zoom the track is at now, or the range's base. */
export function currentZoom(
  stream: MediaStream | null,
  capabilities: CameraCapabilities,
): number {
  const track = stream?.getVideoTracks()[0] as ExtendedTrack | undefined;
  const settings = track?.getSettings?.();

  return (
    settings?.zoom ?? capabilities.zoom?.min ?? 1
  );
}

/**
 * Move the lens. Returns what it actually went to.
 *
 * Clamped to the reported range before asking, because a constraint outside
 * it is rejected outright on some devices and silently ignored on others —
 * and either way the pill would then be showing a number the lens is not at.
 */
export async function applyZoom(
  stream: MediaStream | null,
  capabilities: CameraCapabilities,
  requested: number,
): Promise<number | null> {
  const track = stream?.getVideoTracks()[0];

  if (!track || !capabilities.zoom) return null;

  const zoom = Math.min(
    capabilities.zoom.max,
    Math.max(capabilities.zoom.min, requested),
  );

  try {
    await track.applyConstraints({
      advanced: [{ zoom }],
    } as unknown as MediaTrackConstraints);

    return zoom;
  } catch {
    return null;
  }
}

/**
 * Aim the focus at a point, given in normalised coordinates.
 *
 * Returns whether the camera accepted it, so the screen can decide whether
 * to show the reader a focus confirmation or nothing at all. Showing the
 * animation regardless would be the same lie as a fake zoom, one frame long.
 */
export async function focusAt(
  stream: MediaStream | null,
  capabilities: CameraCapabilities,
  point: { x: number; y: number },
): Promise<boolean> {
  const track = stream?.getVideoTracks()[0];

  if (!track || !capabilities.tapToFocus) return false;

  try {
    await track.applyConstraints({
      advanced: [
        {
          focusMode: "single-shot",
          pointsOfInterest: [{ x: point.x, y: point.y }],
        },
      ],
    } as unknown as MediaTrackConstraints);

    return true;
  } catch {
    return false;
  }
}

/** Turn the lamp on or off. Returns whether it worked. */
export async function setTorch(
  stream: MediaStream | null,
  on: boolean,
): Promise<boolean> {
  const track = stream?.getVideoTracks()[0];

  if (!track) return false;

  try {
    await track.applyConstraints({
      advanced: [{ torch: on }],
    } as unknown as MediaTrackConstraints);

    return true;
  } catch {
    return false;
  }
}
