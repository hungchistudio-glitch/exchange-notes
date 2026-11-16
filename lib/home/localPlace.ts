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

/** en / zh-TW / es / fr / it / ja / ko, in that order, for every entry. */
function city(
  en: string,
  zh: string,
  es: string,
  fr: string,
  it: string,
  ja: string,
  ko: string,
): CityNames {
  return { en, "zh-TW": zh, es, fr, it, ja, ko };
}

const CITIES: Record<string, CityNames> = {
  "America/New_York": city("New York", "紐約", "Nueva York", "New York", "New York", "ニューヨーク", "뉴욕"),
  "America/Los_Angeles": city("Los Angeles", "洛杉磯", "Los Ángeles", "Los Angeles", "Los Angeles", "ロサンゼルス", "로스앤젤레스"),
  "America/Chicago": city("Chicago", "芝加哥", "Chicago", "Chicago", "Chicago", "シカゴ", "시카고"),
  "America/Denver": city("Denver", "丹佛", "Denver", "Denver", "Denver", "デンバー", "덴버"),
  "America/Phoenix": city("Phoenix", "鳳凰城", "Phoenix", "Phoenix", "Phoenix", "フェニックス", "피닉스"),
  "America/Anchorage": city("Anchorage", "安克拉治", "Anchorage", "Anchorage", "Anchorage", "アンカレッジ", "앵커리지"),
  "Pacific/Honolulu": city("Honolulu", "檀香山", "Honolulu", "Honolulu", "Honolulu", "ホノルル", "호놀룰루"),
  "America/Toronto": city("Toronto", "多倫多", "Toronto", "Toronto", "Toronto", "トロント", "토론토"),
  "America/Vancouver": city("Vancouver", "溫哥華", "Vancouver", "Vancouver", "Vancouver", "バンクーバー", "밴쿠버"),
  "America/Mexico_City": city("Mexico City", "墨西哥城", "Ciudad de México", "Mexico", "Città del Messico", "メキシコシティ", "멕시코시티"),
  "America/Bogota": city("Bogotá", "波哥大", "Bogotá", "Bogota", "Bogotà", "ボゴタ", "보고타"),
  "America/Lima": city("Lima", "利馬", "Lima", "Lima", "Lima", "リマ", "리마"),
  "America/Santiago": city("Santiago", "聖地牙哥", "Santiago", "Santiago", "Santiago", "サンティアゴ", "산티아고"),
  "America/Sao_Paulo": city("São Paulo", "聖保羅", "São Paulo", "São Paulo", "San Paolo", "サンパウロ", "상파울루"),
  "America/Argentina/Buenos_Aires": city("Buenos Aires", "布宜諾斯艾利斯", "Buenos Aires", "Buenos Aires", "Buenos Aires", "ブエノスアイレス", "부에노스아이레스"),
  "Europe/London": city("London", "倫敦", "Londres", "Londres", "Londra", "ロンドン", "런던"),
  "Europe/Dublin": city("Dublin", "都柏林", "Dublín", "Dublin", "Dublino", "ダブリン", "더블린"),
  "Europe/Lisbon": city("Lisbon", "里斯本", "Lisboa", "Lisbonne", "Lisbona", "リスボン", "리스본"),
  "Europe/Madrid": city("Madrid", "馬德里", "Madrid", "Madrid", "Madrid", "マドリード", "마드리드"),
  "Europe/Paris": city("Paris", "巴黎", "París", "Paris", "Parigi", "パリ", "파리"),
  "Europe/Brussels": city("Brussels", "布魯塞爾", "Bruselas", "Bruxelles", "Bruxelles", "ブリュッセル", "브뤼셀"),
  "Europe/Amsterdam": city("Amsterdam", "阿姆斯特丹", "Ámsterdam", "Amsterdam", "Amsterdam", "アムステルダム", "암스테르담"),
  "Europe/Berlin": city("Berlin", "柏林", "Berlín", "Berlin", "Berlino", "ベルリン", "베를린"),
  "Europe/Zurich": city("Zurich", "蘇黎世", "Zúrich", "Zurich", "Zurigo", "チューリッヒ", "취리히"),
  "Europe/Vienna": city("Vienna", "維也納", "Viena", "Vienne", "Vienna", "ウィーン", "빈"),
  "Europe/Rome": city("Rome", "羅馬", "Roma", "Rome", "Roma", "ローマ", "로마"),
  "Europe/Athens": city("Athens", "雅典", "Atenas", "Athènes", "Atene", "アテネ", "아테네"),
  "Europe/Warsaw": city("Warsaw", "華沙", "Varsovia", "Varsovie", "Varsavia", "ワルシャワ", "바르샤바"),
  "Europe/Stockholm": city("Stockholm", "斯德哥爾摩", "Estocolmo", "Stockholm", "Stoccolma", "ストックホルム", "스톡홀름"),
  "Europe/Copenhagen": city("Copenhagen", "哥本哈根", "Copenhague", "Copenhague", "Copenaghen", "コペンハーゲン", "코펜하겐"),
  "Europe/Oslo": city("Oslo", "奧斯陸", "Oslo", "Oslo", "Oslo", "オスロ", "오슬로"),
  "Europe/Helsinki": city("Helsinki", "赫爾辛基", "Helsinki", "Helsinki", "Helsinki", "ヘルシンキ", "헬싱키"),
  "Europe/Prague": city("Prague", "布拉格", "Praga", "Prague", "Praga", "プラハ", "프라하"),
  "Europe/Budapest": city("Budapest", "布達佩斯", "Budapest", "Budapest", "Budapest", "ブダペスト", "부다페스트"),
  "Europe/Istanbul": city("Istanbul", "伊斯坦堡", "Estambul", "Istanbul", "Istanbul", "イスタンブール", "이스탄불"),
  "Europe/Moscow": city("Moscow", "莫斯科", "Moscú", "Moscou", "Mosca", "モスクワ", "모스크바"),
  "Africa/Cairo": city("Cairo", "開羅", "El Cairo", "Le Caire", "Il Cairo", "カイロ", "카이로"),
  "Africa/Lagos": city("Lagos", "拉哥斯", "Lagos", "Lagos", "Lagos", "ラゴス", "라고스"),
  "Africa/Nairobi": city("Nairobi", "奈洛比", "Nairobi", "Nairobi", "Nairobi", "ナイロビ", "나이로비"),
  "Africa/Johannesburg": city("Johannesburg", "約翰尼斯堡", "Johannesburgo", "Johannesburg", "Johannesburg", "ヨハネスブルグ", "요하네스버그"),
  "Asia/Jerusalem": city("Jerusalem", "耶路撒冷", "Jerusalén", "Jérusalem", "Gerusalemme", "エルサレム", "예루살렘"),
  "Asia/Dubai": city("Dubai", "杜拜", "Dubái", "Dubaï", "Dubai", "ドバイ", "두바이"),
  "Asia/Kolkata": city("Kolkata", "加爾各答", "Calcuta", "Calcutta", "Calcutta", "コルカタ", "콜카타"),
  "Asia/Bangkok": city("Bangkok", "曼谷", "Bangkok", "Bangkok", "Bangkok", "バンコク", "방콕"),
  "Asia/Jakarta": city("Jakarta", "雅加達", "Yakarta", "Jakarta", "Giacarta", "ジャカルタ", "자카르타"),
  "Asia/Ho_Chi_Minh": city("Ho Chi Minh City", "胡志明市", "Ciudad Ho Chi Minh", "Hô Chi Minh-Ville", "Ho Chi Minh", "ホーチミン", "호찌민"),
  "Asia/Singapore": city("Singapore", "新加坡", "Singapur", "Singapour", "Singapore", "シンガポール", "싱가포르"),
  "Asia/Manila": city("Manila", "馬尼拉", "Manila", "Manille", "Manila", "マニラ", "마닐라"),
  "Asia/Hong_Kong": city("Hong Kong", "香港", "Hong Kong", "Hong Kong", "Hong Kong", "香港", "홍콩"),
  "Asia/Taipei": city("Taipei", "台北", "Taipéi", "Taipei", "Taipei", "台北", "타이베이"),
  "Asia/Shanghai": city("Shanghai", "上海", "Shanghái", "Shanghai", "Shanghai", "上海", "상하이"),
  "Asia/Seoul": city("Seoul", "首爾", "Seúl", "Séoul", "Seul", "ソウル", "서울"),
  "Asia/Tokyo": city("Tokyo", "東京", "Tokio", "Tokyo", "Tokyo", "東京", "도쿄"),
  "Australia/Perth": city("Perth", "伯斯", "Perth", "Perth", "Perth", "パース", "퍼스"),
  "Australia/Brisbane": city("Brisbane", "布里斯本", "Brisbane", "Brisbane", "Brisbane", "ブリスベン", "브리즈번"),
  "Australia/Melbourne": city("Melbourne", "墨爾本", "Melbourne", "Melbourne", "Melbourne", "メルボルン", "멜버른"),
  "Australia/Sydney": city("Sydney", "雪梨", "Sídney", "Sydney", "Sydney", "シドニー", "시드니"),
  "Pacific/Auckland": city("Auckland", "奧克蘭", "Auckland", "Auckland", "Auckland", "オークランド", "오클랜드"),
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
