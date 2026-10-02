export type Body = { x: number; y: number; vx: number; vy: number; radius: number };
export type Rect = { left: number; top: number; right: number; bottom: number };
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function bound(body: Body, width: number, height: number) {
  const r = body.radius + 8;
  const x = clamp(body.x, r, Math.max(r, width - r));
  const y = clamp(body.y, r + 45, Math.max(r + 45, height - r - 28));
  if (x !== body.x) body.vx *= -0.66;
  if (y !== body.y) body.vy *= -0.66;
  body.x = x; body.y = y;
}
export function collide(a: Body, b: Body, aFixed = false, bFixed = false) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy), min = a.radius + b.radius + 3;
  if (d >= min || (aFixed && bFixed)) return;
  const nx = d ? dx / d : 1, ny = d ? dy / d : 0;
  const shift = min - d;
  const af = aFixed ? 0 : bFixed ? 1 : 0.5;
  const bf = bFixed ? 0 : aFixed ? 1 : 0.5;
  a.x -= nx * shift * af; a.y -= ny * shift * af;
  b.x += nx * shift * bf; b.y += ny * shift * bf;
  const speed = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (speed > 0) {
    a.vx -= nx * speed * 1.35 * af; a.vy -= ny * speed * 1.35 * af;
    b.vx += nx * speed * 1.35 * bf; b.vy += ny * speed * 1.35 * bf;
  }
}
/** Push the disc out through the nearest rectangle edge; text remains readable. */
export function avoid(body: Body, rect: Rect) {
  const r = body.radius + 9;
  if (body.x < rect.left - r || body.x > rect.right + r || body.y < rect.top - r || body.y > rect.bottom + r) return;
  const distances = [body.x - rect.left + r, rect.right + r - body.x, body.y - rect.top + r, rect.bottom + r - body.y];
  const edge = distances.indexOf(Math.min(...distances));
  if (edge === 0) { body.x = rect.left - r; body.vx = -Math.abs(body.vx) * 0.6; }
  if (edge === 1) { body.x = rect.right + r; body.vx = Math.abs(body.vx) * 0.6; }
  if (edge === 2) { body.y = rect.top - r; body.vy = -Math.abs(body.vy) * 0.6; }
  if (edge === 3) { body.y = rect.bottom + r; body.vy = Math.abs(body.vy) * 0.6; }
}
export function scatter(body: Body, x: number, y: number, fallbackAngle: number) {
  const dx = body.x - x, dy = body.y - y, d = Math.hypot(dx, dy);
  const nx = d > 1 ? dx / d : Math.cos(fallbackAngle);
  const ny = d > 1 ? dy / d : Math.sin(fallbackAngle);
  body.vx = nx * 145; body.vy = ny * 145;
}
