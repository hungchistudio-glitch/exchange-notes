import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/shop/weather/route";
import {
  conditionFromCode,
  dayPartAt,
  formatTemperature,
  sceneFor,
  seasonAt,
  type ShopWeather,
} from "@/lib/shop/atmosphere";

/* =========================================================
   The sky behind the stand follows the reader's weather

   Chi (2026-10-12): rain where it is raining, a fine day when it is fine,
   butterflies and falling leaves. These pin the decisions — which weather
   makes which sky, what the seasons and the hour add, the reader's own
   choice winning — and the weather endpoint's two promises: it asks only
   for a rounded place, and every failure is "no weather", never an error.
   ========================================================= */

const at = (iso: string) => new Date(iso);
const weather = (condition: ShopWeather["condition"], isDay = true, latitude = 25): ShopWeather =>
  ({ condition, isDay, temperature: 18, latitude });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reading the weather", () => {
  it("turns WMO codes into conditions", () => {
    expect(conditionFromCode(0)).toBe("clear");
    expect(conditionFromCode(3)).toBe("cloudy");
    expect(conditionFromCode(45)).toBe("fog");
    expect(conditionFromCode(53)).toBe("drizzle");
    expect(conditionFromCode(63)).toBe("rain");
    expect(conditionFromCode(81)).toBe("rain");
    expect(conditionFromCode(75)).toBe("snow");
    expect(conditionFromCode(95)).toBe("storm");
  });

  it("knows the season on either side of the equator, and the hour", () => {
    expect(seasonAt(at("2026-10-12T12:00:00"))).toBe("autumn");
    expect(seasonAt(at("2026-10-12T12:00:00"), true)).toBe("spring");
    expect(dayPartAt(at("2026-10-12T07:00:00"))).toBe("morning");
    expect(dayPartAt(at("2026-10-12T18:00:00"))).toBe("dusk");
    expect(dayPartAt(at("2026-10-12T23:00:00"))).toBe("night");
  });

  it("writes Fahrenheit for US time zones and Celsius elsewhere", () => {
    expect(formatTemperature(18, "America/New_York")).toBe("64°F");
    expect(formatTemperature(18, "Asia/Taipei")).toBe("18°C");
  });
});

describe("the sky it paints", () => {
  const noon = at("2026-10-12T12:00:00");

  it("rains when it is raining, with lightning in a storm", () => {
    expect(sceneFor("auto", weather("rain"), noon)).toMatchObject({ precipitation: "rain", sky: "overcast" });
    expect(sceneFor("auto", weather("storm"), noon)).toMatchObject({ precipitation: "rain", lightning: true });
    expect(sceneFor("auto", weather("snow"), noon)).toMatchObject({ precipitation: "snow" });
  });

  it("lets the season drift through a fine day, and the night bring stars", () => {
    expect(sceneFor("auto", weather("clear"), noon)).toMatchObject({ sun: true, drifter: "leaves" });
    expect(sceneFor("auto", weather("clear", true, -33), noon)).toMatchObject({ drifter: "petals" });
    expect(sceneFor("auto", weather("clear", false), at("2026-07-12T23:00:00"))).toMatchObject({ moon: true, stars: true, drifter: "fireflies" });
    // No weather: the clock and the calendar alone.
    expect(sceneFor("auto", null, noon)).toMatchObject({ sun: true, drifter: "leaves" });
  });

  it("keeps the reader's own choice whatever the weather", () => {
    expect(sceneFor("butterflies", weather("rain"), noon)).toMatchObject({ precipitation: "none", drifter: "butterflies" });
    expect(sceneFor("stars", weather("clear"), noon)).toMatchObject({ sky: "night", stars: true });
  });
});

describe("the weather endpoint", () => {
  it("answers no weather without a place, and never asks the forecast", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await GET(new Request("http://localhost/api/shop/weather"));
    expect(await response.json()).toEqual({ weather: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("asks for a rounded place and reads the current weather", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({ current: { weather_code: 61, is_day: 1, temperature_2m: 17.6 } }),
    );
    vi.stubGlobal("fetch", fetch);
    const response = await GET(new Request("http://localhost/api/shop/weather", {
      headers: { "x-vercel-ip-latitude": "25.03396", "x-vercel-ip-longitude": "121.56447" },
    }));
    expect(String(fetch.mock.calls[0][0])).toContain("latitude=25&longitude=121.6");
    expect(await response.json()).toEqual({
      weather: { condition: "rain", isDay: true, temperature: 17.6, latitude: 25 },
    });
  });

  it("answers no weather when the forecast fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await GET(new Request("http://localhost/api/shop/weather", {
      headers: { "x-vercel-ip-latitude": "48.85", "x-vercel-ip-longitude": "2.35" },
    }));
    expect(await response.json()).toEqual({ weather: null });
  });
});
