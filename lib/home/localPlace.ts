import type { LanguageCode } from "@/lib/languages";
import { getDeviceTimeZone } from "@/lib/push/deviceTimeZone";

/*
 * Where the reader is, said in their own language.
 *
 * The source is the device's IANA time zone, which the app already reads and
 * already syncs to the profile (lib/push/deviceTimeZone, DeviceTimeZoneSync).
 * Nothing new is asked for: no geolocation prompt, no IP lookup, no network
 * call at all. The cost of that is honesty about what it means — a zone's
 * name is its representative city, not the reader's. Brooklyn reads as New
 * York, and Philadelphia reads as New York too. That is the right trade for
 * a line on a home screen; it would be the wrong one for anything that acts
 * on the answer.
 *
 * Why the names are here rather than in lib/i18n: these are a dictionary,
 * not interface copy. Nothing in the app says them except this one line,
 * they never change, and putting fifty entries into five locale files would
 * bury the strings a translator actually has to think about. The i18n files
 * stay the place where the app's voice lives.
 *
 * A zone that is not in the table falls back to its own last segment with
 * the underscores taken out — "Europe/Kyiv" reads as "Kyiv" — so the line is
 * never empty and never shows a slash.
 */

type CityNames = Record<LanguageCode, string>;

/** en / zh-TW / es / fr / it, in that order, for every entry. */
function city(
  en: string,
  zh: string,
  es: string,
  fr: string,
  it: string,
): CityNames {
  return { en, "zh-TW": zh, es, fr, it };
}

const CITIES: Record<string, CityNames> = {
  "America/New_York": city("New York", "紐約", "Nueva York", "New York", "New York"),
  "America/Los_Angeles": city("Los Angeles", "洛杉磯", "Los Ángeles", "Los Angeles", "Los Angeles"),
  "America/Chicago": city("Chicago", "芝加哥", "Chicago", "Chicago", "Chicago"),
  "America/Denver": city("Denver", "丹佛", "Denver", "Denver", "Denver"),
  "America/Phoenix": city("Phoenix", "鳳凰城", "Phoenix", "Phoenix", "Phoenix"),
  "America/Anchorage": city("Anchorage", "安克拉治", "Anchorage", "Anchorage", "Anchorage"),
  "Pacific/Honolulu": city("Honolulu", "檀香山", "Honolulu", "Honolulu", "Honolulu"),
  "America/Toronto": city("Toronto", "多倫多", "Toronto", "Toronto", "Toronto"),
  "America/Vancouver": city("Vancouver", "溫哥華", "Vancouver", "Vancouver", "Vancouver"),
  "America/Mexico_City": city("Mexico City", "墨西哥城", "Ciudad de México", "Mexico", "Città del Messico"),
  "America/Bogota": city("Bogotá", "波哥大", "Bogotá", "Bogota", "Bogotà"),
  "America/Lima": city("Lima", "利馬", "Lima", "Lima", "Lima"),
  "America/Santiago": city("Santiago", "聖地牙哥", "Santiago", "Santiago", "Santiago"),
  "America/Sao_Paulo": city("São Paulo", "聖保羅", "São Paulo", "São Paulo", "San Paolo"),
  "America/Argentina/Buenos_Aires": city("Buenos Aires", "布宜諾斯艾利斯", "Buenos Aires", "Buenos Aires", "Buenos Aires"),
  "Europe/London": city("London", "倫敦", "Londres", "Londres", "Londra"),
  "Europe/Dublin": city("Dublin", "都柏林", "Dublín", "Dublin", "Dublino"),
  "Europe/Lisbon": city("Lisbon", "里斯本", "Lisboa", "Lisbonne", "Lisbona"),
  "Europe/Madrid": city("Madrid", "馬德里", "Madrid", "Madrid", "Madrid"),
  "Europe/Paris": city("Paris", "巴黎", "París", "Paris", "Parigi"),
  "Europe/Brussels": city("Brussels", "布魯塞爾", "Bruselas", "Bruxelles", "Bruxelles"),
  "Europe/Amsterdam": city("Amsterdam", "阿姆斯特丹", "Ámsterdam", "Amsterdam", "Amsterdam"),
  "Europe/Berlin": city("Berlin", "柏林", "Berlín", "Berlin", "Berlino"),
  "Europe/Zurich": city("Zurich", "蘇黎世", "Zúrich", "Zurich", "Zurigo"),
  "Europe/Vienna": city("Vienna", "維也納", "Viena", "Vienne", "Vienna"),
  "Europe/Rome": city("Rome", "羅馬", "Roma", "Rome", "Roma"),
  "Europe/Athens": city("Athens", "雅典", "Atenas", "Athènes", "Atene"),
  "Europe/Warsaw": city("Warsaw", "華沙", "Varsovia", "Varsovie", "Varsavia"),
  "Europe/Stockholm": city("Stockholm", "斯德哥爾摩", "Estocolmo", "Stockholm", "Stoccolma"),
  "Europe/Copenhagen": city("Copenhagen", "哥本哈根", "Copenhague", "Copenhague", "Copenaghen"),
  "Europe/Oslo": city("Oslo", "奧斯陸", "Oslo", "Oslo", "Oslo"),
  "Europe/Helsinki": city("Helsinki", "赫爾辛基", "Helsinki", "Helsinki", "Helsinki"),
  "Europe/Prague": city("Prague", "布拉格", "Praga", "Prague", "Praga"),
  "Europe/Budapest": city("Budapest", "布達佩斯", "Budapest", "Budapest", "Budapest"),
  "Europe/Istanbul": city("Istanbul", "伊斯坦堡", "Estambul", "Istanbul", "Istanbul"),
  "Europe/Moscow": city("Moscow", "莫斯科", "Moscú", "Moscou", "Mosca"),
  "Africa/Cairo": city("Cairo", "開羅", "El Cairo", "Le Caire", "Il Cairo"),
  "Africa/Lagos": city("Lagos", "拉哥斯", "Lagos", "Lagos", "Lagos"),
  "Africa/Nairobi": city("Nairobi", "奈洛比", "Nairobi", "Nairobi", "Nairobi"),
  "Africa/Johannesburg": city("Johannesburg", "約翰尼斯堡", "Johannesburgo", "Johannesburg", "Johannesburg"),
  "Asia/Jerusalem": city("Jerusalem", "耶路撒冷", "Jerusalén", "Jérusalem", "Gerusalemme"),
  "Asia/Dubai": city("Dubai", "杜拜", "Dubái", "Dubaï", "Dubai"),
  "Asia/Kolkata": city("Kolkata", "加爾各答", "Calcuta", "Calcutta", "Calcutta"),
  "Asia/Bangkok": city("Bangkok", "曼谷", "Bangkok", "Bangkok", "Bangkok"),
  "Asia/Jakarta": city("Jakarta", "雅加達", "Yakarta", "Jakarta", "Giacarta"),
  "Asia/Ho_Chi_Minh": city("Ho Chi Minh City", "胡志明市", "Ciudad Ho Chi Minh", "Hô Chi Minh-Ville", "Ho Chi Minh"),
  "Asia/Singapore": city("Singapore", "新加坡", "Singapur", "Singapour", "Singapore"),
  "Asia/Manila": city("Manila", "馬尼拉", "Manila", "Manille", "Manila"),
  "Asia/Hong_Kong": city("Hong Kong", "香港", "Hong Kong", "Hong Kong", "Hong Kong"),
  "Asia/Taipei": city("Taipei", "台北", "Taipéi", "Taipei", "Taipei"),
  "Asia/Shanghai": city("Shanghai", "上海", "Shanghái", "Shanghai", "Shanghai"),
  "Asia/Seoul": city("Seoul", "首爾", "Seúl", "Séoul", "Seul"),
  "Asia/Tokyo": city("Tokyo", "東京", "Tokio", "Tokyo", "Tokyo"),
  "Australia/Perth": city("Perth", "伯斯", "Perth", "Perth", "Perth"),
  "Australia/Brisbane": city("Brisbane", "布里斯本", "Brisbane", "Brisbane", "Brisbane"),
  "Australia/Melbourne": city("Melbourne", "墨爾本", "Melbourne", "Melbourne", "Melbourne"),
  "Australia/Sydney": city("Sydney", "雪梨", "Sídney", "Sydney", "Sydney"),
  "Pacific/Auckland": city("Auckland", "奧克蘭", "Auckland", "Auckland", "Auckland"),
};

/**
 * The reader's city, in `language`, or null before the browser has answered.
 *
 * Null rather than a guess: the server has no time zone, and a city rendered
 * on the server would be a different string from the one the browser renders
 * a moment later, which is a hydration mismatch over a line of decoration.
 */
export function getLocalCity(language: LanguageCode): string | null {
  if (typeof window === "undefined") return null;

  const zone = getDeviceTimeZone();
  if (!zone) return null;

  const known = CITIES[zone];
  if (known) return known[language];

  const segment = zone.split("/").pop();
  if (!segment) return null;

  return segment.replace(/_/g, " ");
}
