import { conditionFromCode, type ShopWeather } from "@/lib/shop/atmosphere";

/*
 * The weather where the reader is, for the sky behind Yumi in the shop.
 *
 * The place comes from the request itself: Vercel's edge adds an approximate
 * latitude and longitude for the caller's IP address. No geolocation prompt,
 * nothing stored, nothing about the account read, so it needs no session.
 * The coordinates are rounded to a tenth of a degree (about 10 km) before
 * they leave for the forecast, which is plenty for "is it raining" and says
 * little about anyone.
 *
 * Open-Meteo answers without a key. Every failure — no location (a local
 * machine, a preview without the headers), a slow forecast, an odd answer —
 * is `{ weather: null }`, and the shop falls back to the season and the hour.
 */
export const dynamic = "force-dynamic";

const NO_WEATHER = { weather: null };
const HEADERS = { "Cache-Control": "private, max-age=600" };

function coordinate(value: string | null, limit: number): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null;
  return Math.round(n * 10) / 10;
}

export async function GET(request: Request) {
  const latitude = coordinate(request.headers.get("x-vercel-ip-latitude"), 90);
  const longitude = coordinate(request.headers.get("x-vercel-ip-longitude"), 180);
  if (latitude === null || longitude === null) return Response.json(NO_WEATHER, { headers: HEADERS });

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      "&current=weather_code,is_day,temperature_2m";
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 900 },
    });
    if (!response.ok) return Response.json(NO_WEATHER, { headers: HEADERS });

    const body = (await response.json()) as {
      current?: { weather_code?: unknown; is_day?: unknown; temperature_2m?: unknown };
    };
    const code = Number(body.current?.weather_code);
    if (!Number.isFinite(code)) return Response.json(NO_WEATHER, { headers: HEADERS });

    const temperature = Number(body.current?.temperature_2m);
    const weather: ShopWeather = {
      condition: conditionFromCode(code),
      isDay: Number(body.current?.is_day) !== 0,
      temperature: Number.isFinite(temperature) ? temperature : null,
      latitude,
    };
    return Response.json({ weather }, { headers: HEADERS });
  } catch {
    return Response.json(NO_WEATHER, { headers: HEADERS });
  }
}
