export type EclipseOrigin = { x: number; y: number };
export type EclipseTransition = EclipseOrigin & {
  radius: number;
  duration: number;
};

export const ECLIPSE_FIRST_MS = 900;
export const ECLIPSE_REPEAT_MS = 650;
// The disk covers the viewport at 42%, and stays opaque through 60%.
export const ECLIPSE_COMMIT_FRACTION = 0.5;

export function eclipseRadius(origin: EclipseOrigin, width: number, height: number) {
  return Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)) + 32;
}
