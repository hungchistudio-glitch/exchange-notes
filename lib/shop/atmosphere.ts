/* =========================================================
   The weather in Yumi's shop

   Chi (2026-10-12): the shop's backdrop should be alive — butterflies, falling
   leaves, the rain that is falling where the reader is, or a fine day. So the
   stand has a sky, and what is in it is decided here, as plain data:

     - by the weather where the reader is, when the server could find it
       (app/api/shop/weather, from the request's approximate location);
     - otherwise by the season and the time of day on this device;
     - or by the reader, who can pick a scene and keep it.

   Nothing here draws. components/shop/ShopAtmosphere.tsx paints a Scene, in
   either mode's palette.
   ========================================================= */

export type WeatherCondition =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

export type ShopWeather = {
  condition: WeatherCondition;
  isDay: boolean;
  /** Celsius, as reported. */
  temperature: number | null;
  /** Rounded; only used to tell the hemisphere's seasons apart. */
  latitude: number | null;
};

/** What the reader can choose. "auto" follows the weather and the clock. */
export type SceneChoice = "auto" | "clear" | "rain" | "snow" | "leaves" | "butterflies" | "stars";

export const SCENE_CHOICES: readonly SceneChoice[] = [
  "auto", "clear", "rain", "snow", "leaves", "butterflies", "stars",
];

export type Season = "spring" | "summer" | "autumn" | "winter";
export type DayPart = "morning" | "day" | "dusk" | "night";

export type Sky = "morning" | "day" | "dusk" | "night" | "overcast" | "storm";
export type Precipitation = "none" | "drizzle" | "rain" | "snow";
export type Drifter = "none" | "leaves" | "petals" | "butterflies" | "fireflies" | "motes";

export type Scene = {
  sky: Sky;
  precipitation: Precipitation;
  drifter: Drifter;
  /** How many clouds drift across, 0–3. */
  clouds: number;
  sun: boolean;
  moon: boolean;
  stars: boolean;
  rays: boolean;
  fog: boolean;
  lightning: boolean;
};

/** WMO weather interpretation codes, as Open-Meteo reports them. */
export function conditionFromCode(code: number): WeatherCondition {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "partly";
}

export function seasonAt(date: Date, southern = false): Season {
  const month = date.getMonth(); // 0 = January
  const north: Season = month <= 1 || month === 11 ? "winter"
    : month <= 4 ? "spring"
      : month <= 7 ? "summer"
        : "autumn";
  if (!southern) return north;
  return ({ winter: "summer", spring: "autumn", summer: "winter", autumn: "spring" } as const)[north];
}

export function dayPartAt(date: Date): DayPart {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 5.5 && hour < 9) return "morning";
  if (hour >= 9 && hour < 17) return "day";
  if (hour >= 17 && hour < 19.5) return "dusk";
  return "night";
}

const CALM: Scene = {
  sky: "day", precipitation: "none", drifter: "none", clouds: 1,
  sun: false, moon: false, stars: false, rays: false, fog: false, lightning: false,
};

/** Before the reader's clock is known: a quiet day sky. */
export const QUIET_SCENE: Scene = { ...CALM, sun: true };

/** What drifts through a fine sky in each season, by day and by night. */
function seasonalDrifter(season: Season, night: boolean): Drifter {
  if (night) return season === "summer" ? "fireflies" : "none";
  return { spring: "petals", summer: "butterflies", autumn: "leaves", winter: "motes" }[season] as Drifter;
}

export function sceneFor(choice: SceneChoice, weather: ShopWeather | null, now: Date): Scene {
  const part = dayPartAt(now);
  const night = weather ? !weather.isDay : part === "night";
  const season = seasonAt(now, (weather?.latitude ?? 1) < 0);
  const openSky: Sky = night ? "night" : part === "morning" ? "morning" : part === "dusk" ? "dusk" : "day";

  switch (choice) {
    case "clear":
      return { ...CALM, sky: "day", sun: true, rays: true, clouds: 1, drifter: "motes" };
    case "rain":
      return { ...CALM, sky: "overcast", precipitation: "rain", clouds: 3 };
    case "snow":
      return { ...CALM, sky: "overcast", precipitation: "snow", clouds: 2 };
    case "leaves":
      return { ...CALM, sky: "dusk", sun: true, clouds: 1, drifter: "leaves" };
    case "butterflies":
      return { ...CALM, sky: "day", sun: true, rays: true, clouds: 1, drifter: "butterflies" };
    case "stars":
      return { ...CALM, sky: "night", moon: true, stars: true, clouds: 0, drifter: "fireflies" };
    default:
      break;
  }

  const fine: Scene = {
    ...CALM,
    sky: openSky,
    sun: !night,
    moon: night,
    stars: night,
    rays: !night && part !== "dusk",
    drifter: seasonalDrifter(season, night),
  };
  if (!weather) return fine;

  switch (weather.condition) {
    case "storm":
      return { ...CALM, sky: "storm", precipitation: "rain", clouds: 3, lightning: true };
    case "rain":
      return { ...CALM, sky: night ? "night" : "overcast", precipitation: "rain", clouds: 3 };
    case "drizzle":
      return { ...CALM, sky: night ? "night" : "overcast", precipitation: "drizzle", clouds: 2 };
    case "snow":
      return { ...CALM, sky: night ? "night" : "overcast", precipitation: "snow", clouds: 2 };
    case "fog":
      return { ...CALM, sky: night ? "night" : "overcast", fog: true, clouds: 1 };
    case "cloudy":
      return { ...fine, sky: night ? "night" : "overcast", sun: false, rays: false, stars: false, clouds: 3 };
    case "partly":
      return { ...fine, rays: false, clouds: 2 };
    default:
      return fine;
  }
}

/* US time zones read Fahrenheit; everywhere else the app is used reads Celsius. */
const FAHRENHEIT_ZONES = /^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Juneau|Indiana\/.+|Kentucky\/.+)|Pacific\/Honolulu)$/;

export function formatTemperature(celsius: number, timeZone: string | null | undefined): string {
  if (timeZone && FAHRENHEIT_ZONES.test(timeZone)) return `${Math.round(celsius * 9 / 5 + 32)}°F`;
  return `${Math.round(celsius)}°C`;
}
