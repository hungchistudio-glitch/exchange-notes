import type { DailyNewsCard } from "@/lib/types/dailyNews";

/* =========================================================
   Where each story's signal comes from (Chi, 2026-11-28: 訊號來源星圖)

   A story is placed where its newsroom is: the source it was read from
   (lib/news/sources.ts), and failing that the region its category names.
   The reader is placed by their time zone, roughly, never more precisely:
   no location is asked for and none leaves the device.
   ========================================================= */

export type SignalCity = "london" | "newYork" | "amsterdam" | "taipei" | "tokyo" | "seoul";

export const CITIES: Record<SignalCity, { lat: number; lon: number }> = {
  london: { lat: 51.51, lon: -0.13 },
  newYork: { lat: 40.71, lon: -74.01 },
  amsterdam: { lat: 52.37, lon: 4.9 },
  taipei: { lat: 25.03, lon: 121.56 },
  tokyo: { lat: 35.68, lon: 139.69 },
  seoul: { lat: 37.57, lon: 126.98 },
};

const BY_SOURCE: Record<string, SignalCity> = {
  "the guardian": "london",
  hyperallergic: "newYork",
  artnews: "newYork",
  "ars technica": "newYork",
  vogue: "newYork",
  fashionunited: "amsterdam",
  "focus taiwan": "taipei",
  cna: "taipei",
  "the japan times": "tokyo",
  "the korea herald": "seoul",
};

const BY_CATEGORY: Record<string, SignalCity> = { taiwan: "taipei", japan: "tokyo", korea: "seoul" };

export function cityOf(card: Pick<DailyNewsCard, "sourceName" | "category">): SignalCity {
  return BY_SOURCE[card.sourceName.trim().toLowerCase()] ?? BY_CATEGORY[card.category.trim().toLowerCase()] ?? "london";
}

export type Signal = { city: SignalCity; lat: number; lon: number; sources: string[]; cards: DailyNewsCard[] };

/** Today's stories, gathered by the city they came from, busiest first. */
export function signalsOf(cards: readonly DailyNewsCard[]): Signal[] {
  const byCity = new Map<SignalCity, Signal>();
  for (const card of cards) {
    const city = cityOf(card);
    const signal = byCity.get(city) ?? { city, ...CITIES[city], sources: [], cards: [] };
    if (!signal.sources.includes(card.sourceName)) signal.sources.push(card.sourceName);
    signal.cards.push(card);
    byCity.set(city, signal);
  }
  return [...byCity.values()].sort((a, b) => b.cards.length - a.cards.length);
}

const ZONES: Record<string, { lat: number; lon: number }> = {
  "Asia/Taipei": CITIES.taipei,
  "Asia/Tokyo": CITIES.tokyo,
  "Asia/Seoul": CITIES.seoul,
  "Europe/London": CITIES.london,
  "America/New_York": CITIES.newYork,
  "Europe/Amsterdam": CITIES.amsterdam,
};

/** The reader, roughly: their time zone's city, or its longitude. */
export function receiverPlace(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone, offsetMinutes = new Date().getTimezoneOffset()) {
  return ZONES[timeZone] ?? { lat: 25, lon: Math.max(-180, Math.min(180, (-offsetMinutes / 60) * 15)) };
}

/* ---------- the globe's geometry, kept pure for the tests ---------- */

const RAD = Math.PI / 180;

/** Orthographic projection: x, y in −1..1 and whether the point faces us. */
export function project(lat: number, lon: number, centreLat: number, centreLon: number) {
  const phi = lat * RAD;
  const lambda = (lon - centreLon) * RAD;
  const phi0 = centreLat * RAD;
  const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
  return {
    x: Math.cos(phi) * Math.sin(lambda),
    y: -(Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda)),
    front: cosC > 0,
    depth: cosC,
  };
}

/** Points along the great circle between two places, `steps` + 1 of them. */
export function greatCircle(from: { lat: number; lon: number }, to: { lat: number; lon: number }, steps = 32) {
  const vector = ({ lat, lon }: { lat: number; lon: number }) => [
    Math.cos(lat * RAD) * Math.cos(lon * RAD),
    Math.cos(lat * RAD) * Math.sin(lon * RAD),
    Math.sin(lat * RAD),
  ];
  const a = vector(from);
  const b = vector(to);
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  const points: Array<{ lat: number; lon: number }> = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const s = Math.sin(omega) || 1;
    const k0 = omega ? Math.sin((1 - t) * omega) / s : 1 - t;
    const k1 = omega ? Math.sin(t * omega) / s : t;
    const x = k0 * a[0] + k1 * b[0];
    const y = k0 * a[1] + k1 * b[1];
    const z = k0 * a[2] + k1 * b[2];
    points.push({ lat: Math.atan2(z, Math.hypot(x, y)) / RAD, lon: Math.atan2(y, x) / RAD });
  }
  return points;
}
