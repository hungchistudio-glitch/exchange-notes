import { CULTURAL_ITEMS } from "./culturalCollection";

import type { InterfaceLanguage } from "@/lib/appPreferences";

/* =========================================================
   The Yumi shop's catalogue

   The original collection, twelve things from each of five places (Chi's
   2026-10-12 collection boards): three shell materials and nine pieces per
   country. Then more eyes, at Chi's asking: one more for each country and
   a set of basics that belong to none. A country is a way to browse, not a rule — any piece goes with any
   other, and the reader's interface language never hides a collection.

   The October 13 expansion adds ten pieces per country, including single
   earrings, structural brow cuffs and necklaces in independent slots.

   Every piece is built in code from primitives (lib/yumi3d/outfit.ts), the
   same way Yumi is, so the shop needs no model files and a piece looks the
   same on the shop's stand as it does on the home screen.

   Ids are permanent. Ownership and the worn outfit are stored by id, and the
   price list the database charges from (supabase/migrations/*_yumi_shop.sql)
   is keyed by them too; tests/yumiShopCatalog.test.ts keeps the two equal.
   Names are display text in the five interface languages and are never used
   as keys.
   ========================================================= */

/** Five countries, and the basics that belong to none of them. */
export type ShopCountry = "basic" | "tw" | "us" | "fr" | "it" | "es";

/**
 * Where on Yumi a piece goes. One piece per slot: a second hat replaces the
 * first, and pieces in different slots are worn together.
 */
export type ShopSlot =
  | "material"
  | "pupil"
  | "iris"
  | "eyewear"
  | "head"
  | "neck"
  | "pin"
  | "mouth"
  | "charm"
  | "earrings"
  | "brow"
  | "necklace";

/** The shop's tabs, which group slots the way the concept boards did. */
export type ShopCategory = "featured" | "eyes" | "materials" | "wear" | "jewelry" | "small" | "owned";

export type ShopItem = {
  id: string;
  country: ShopCountry;
  slot: ShopSlot;
  /** In energy cookies. One saved word is one cookie. */
  price: number;
  /** Swatch colour while a rendered thumbnail is not available. */
  tone: string;
  names: Record<InterfaceLanguage, string>;
};

/** What Yumi has on. A missing slot is Yumi as she comes. */
export type YumiOutfit = Partial<Record<ShopSlot, string>>;

export const SHOP_COUNTRIES: readonly ShopCountry[] = ["basic", "tw", "us", "fr", "it", "es"];

export const SHOP_SLOTS: readonly ShopSlot[] = [
  "material", "pupil", "iris", "eyewear", "head", "neck", "pin", "mouth", "charm", "earrings", "brow", "necklace",
];

export const CATEGORY_SLOTS: Record<Exclude<ShopCategory, "featured" | "owned">, readonly ShopSlot[]> = {
  jewelry: ["earrings", "brow", "necklace"],
  eyes: ["pupil", "iris", "eyewear"],
  materials: ["material"],
  wear: ["head", "neck", "pin"],
  small: ["mouth", "charm"],
};

type Row = [id: string, slot: ShopSlot, price: number, tone: string,
  zh: string, en: string, fr: string, it: string, es: string];

const ROWS: Record<ShopCountry, Row[]> = {
  /* Chi asked for more eyes (2026-10-12). The ones that belong to no
     country live here, and each country gained one of its own. */
  basic: [
    ["moon-pupil", "pupil", 15, "#25262c", "月牙瞳孔", "Crescent moon pupil", "Pupille croissant de lune", "Pupilla a mezzaluna", "Pupila de luna creciente"],
    ["cat-pupil", "pupil", 20, "#9bb53a", "貓眼瞳孔", "Cat’s-eye pupil", "Pupille de chat", "Pupilla di gatto", "Pupila de gato"],
    ["spiral-pupil", "pupil", 20, "#1d1d22", "漩渦瞳孔", "Spiral pupil", "Pupille spirale", "Pupilla a spirale", "Pupila en espiral"],
    ["diamond-pupil", "pupil", 25, "#cfe9f7", "鑽石瞳孔", "Diamond pupil", "Pupille diamant", "Pupilla di diamante", "Pupila de diamante"],
    ["clover-pupil", "pupil", 15, "#2f6b3a", "四葉草瞳孔", "Four-leaf clover pupil", "Pupille trèfle", "Pupilla quadrifoglio", "Pupila de trébol"],
    ["sparkle-pupil", "pupil", 20, "#1b2340", "星光瞳孔", "Sparkle pupil", "Pupille étincelante", "Pupilla scintillante", "Pupila brillante"],
    ["lake-iris", "iris", 20, "#3a8fb7", "湖水藍虹膜", "Lake blue iris", "Iris bleu lac", "Iride blu lago", "Iris azul lago"],
    ["amber-iris", "iris", 20, "#c98a2a", "琥珀虹膜", "Amber iris", "Iris ambré", "Iride ambra", "Iris ámbar"],
    ["violet-iris", "iris", 20, "#8a5cc4", "紫羅蘭虹膜", "Violet iris", "Iris violet", "Iride viola", "Iris violeta"],
    ["round-glasses", "eyewear", 30, "#2a2522", "圓框眼鏡", "Round glasses", "Lunettes rondes", "Occhiali tondi", "Gafas redondas"],
    ["pirate-patch", "eyewear", 25, "#151515", "海盜眼罩", "Pirate eye patch", "Bandeau de pirate", "Benda da pirata", "Parche de pirata"],
    ["long-lashes", "eyewear", 25, "#151515", "長睫毛", "Long lashes", "Longs cils", "Ciglia lunghe", "Pestañas largas"],
  ],
  tw: [
    ["jade", "material", 60, "#6f9a78", "玉石綠", "Jade", "Jade", "Giada", "Jade"],
    ["celadon", "material", 55, "#a9c7bb", "青瓷", "Celadon", "Céladon", "Celadon", "Celadón"],
    ["terrazzo", "material", 50, "#e4d3c3", "磨石子", "Terrazzo", "Terrazzo", "Terrazzo", "Terrazo"],
    ["plum-pupil", "pupil", 15, "#2b1a22", "梅花瞳孔", "Plum blossom pupil", "Pupille fleur de prunier", "Pupilla fiore di pruno", "Pupila flor de ciruelo"],
    ["steamer-hat", "head", 45, "#d9b77c", "竹蒸籠帽", "Bamboo steamer hat", "Chapeau panier vapeur", "Cappello cestello di bambù", "Sombrero de vaporera"],
    ["market-bag", "charm", 35, "#c8473f", "茄芷袋", "Market bag", "Cabas du marché", "Borsa del mercato", "Bolsa de mercado"],
    ["bubble-tea", "mouth", 45, "#c99f74", "珍奶時光", "Bubble tea", "Thé aux perles", "Bubble tea", "Té de burbujas"],
    ["pineapple-cake", "mouth", 25, "#d9a24e", "鳳梨酥", "Pineapple cake", "Gâteau à l’ananas", "Dolcetto all’ananas", "Pastel de piña"],
    ["soup-dumpling", "mouth", 30, "#efe4d0", "小籠包", "Soup dumpling", "Xiaolongbao", "Xiaolongbao", "Xiaolongbao"],
    ["teapot-charm", "charm", 35, "#9fc2b3", "茶壺吊飾", "Teapot charm", "Breloque théière", "Ciondolo teiera", "Colgante tetera"],
    ["sky-lantern", "charm", 40, "#e0583e", "天燈", "Sky lantern", "Lanterne céleste", "Lanterna volante", "Farolillo volador"],
    ["orchid-clip", "pin", 25, "#c99ad6", "蘭花夾", "Orchid clip", "Pince orchidée", "Fermaglio orchidea", "Pinza orquídea"],
    ["jade-iris", "iris", 25, "#3f8f5f", "翡翠虹膜", "Jade iris", "Iris de jade", "Iride di giada", "Iris de jade"],
  ],
  us: [
    ["denim", "material", 50, "#2f4a72", "丹寧布", "Denim", "Denim", "Denim", "Mezclilla"],
    ["brushed-silver", "material", 60, "#b4babf", "拉絲銀", "Brushed silver", "Argent brossé", "Argento spazzolato", "Plata cepillada"],
    ["cherry-enamel", "material", 55, "#a3192f", "櫻桃紅琺瑯", "Cherry enamel", "Émail cerise", "Smalto ciliegia", "Esmalte cereza"],
    ["baseball-cap", "head", 40, "#26344f", "棒球帽", "Baseball cap", "Casquette", "Cappellino da baseball", "Gorra de béisbol"],
    ["headphones", "head", 50, "#b9bec4", "錄音室耳機", "Studio headphones", "Casque de studio", "Cuffie da studio", "Auriculares de estudio"],
    ["star-pupil", "pupil", 15, "#1d1d22", "星星瞳孔", "Star pupil", "Pupille étoile", "Pupilla a stella", "Pupila de estrella"],
    ["bagel", "mouth", 25, "#c98d4a", "芝麻貝果", "Sesame bagel", "Bagel au sésame", "Bagel al sesamo", "Bagel de sésamo"],
    ["pretzel", "mouth", 25, "#8a4b22", "椒鹽卷餅", "Pretzel", "Bretzel", "Pretzel", "Pretzel"],
    ["pancakes", "mouth", 35, "#d9a25a", "鬆餅疊", "Pancake stack", "Pile de pancakes", "Pila di pancake", "Torre de tortitas"],
    ["jazz-mic", "charm", 35, "#9aa1a8", "爵士麥克風", "Jazz mic", "Micro jazz", "Microfono jazz", "Micrófono de jazz"],
    ["skateboard", "charm", 35, "#c97b3f", "滑板吊飾", "Skateboard charm", "Breloque skateboard", "Ciondolo skateboard", "Colgante monopatín"],
    ["road-sign", "charm", 25, "#f1f0ea", "公路盾牌", "Highway shield", "Écusson d’autoroute", "Scudo autostradale", "Escudo de carretera"],
    ["aviator-shades", "eyewear", 35, "#5d6a5f", "飛行員墨鏡", "Aviator shades", "Lunettes d’aviateur", "Occhiali da aviatore", "Gafas de aviador"],
  ],
  fr: [
    ["porcelain", "material", 55, "#f1ece2", "陶瓷白", "Porcelain", "Porcelaine", "Porcellana", "Porcelana"],
    ["champagne-brass", "material", 65, "#cdb68a", "香檳黃銅", "Champagne brass", "Laiton champagne", "Ottone champagne", "Latón champán"],
    ["burgundy-lacquer", "material", 60, "#5c1a2d", "酒紅漆面", "Burgundy lacquer", "Laque bordeaux", "Lacca bordeaux", "Laca burdeos"],
    ["beret", "head", 40, "#3c3a3b", "貝雷帽", "Beret", "Béret", "Basco", "Boina"],
    ["monocle", "eyewear", 30, "#bf9d55", "黃銅單片鏡", "Brass monocle", "Monocle en laiton", "Monocolo in ottone", "Monóculo de latón"],
    ["silk-scarf", "neck", 35, "#7d1f33", "酒紅絲巾", "Silk scarf", "Foulard en soie", "Foulard di seta", "Pañuelo de seda"],
    ["croissant", "mouth", 30, "#d18a3d", "可頌", "Croissant", "Croissant", "Cornetto", "Cruasán"],
    ["baguette", "mouth", 30, "#d29b55", "長棍麵包", "Baguette", "Baguette", "Baguette", "Baguette"],
    ["macarons", "mouth", 35, "#e9a7b8", "馬卡龍", "Macarons", "Macarons", "Macaron", "Macarons"],
    ["cafe-cup", "mouth", 30, "#f4f0e8", "金邊咖啡杯", "Café cup", "Tasse de café", "Tazza da caffè", "Taza de café"],
    ["lavender-brooch", "pin", 25, "#8f7bc0", "薰衣草胸針", "Lavender brooch", "Broche lavande", "Spilla lavanda", "Broche de lavanda"],
    ["perfume", "charm", 35, "#e9b9c4", "香水瓶", "Perfume bottle", "Flacon de parfum", "Boccetta di profumo", "Frasco de perfume"],
    ["cat-eye-glasses", "eyewear", 35, "#1c1a1b", "復古貓眼鏡框", "Cat-eye frames", "Lunettes œil-de-chat", "Occhiali a gatto", "Gafas de ojo de gato"],
  ],
  it: [
    ["amber-glass", "material", 75, "#c99442", "琥珀琉璃", "Amber glass", "Verre ambré", "Vetro ambrato", "Vidrio ámbar"],
    ["carrara-marble", "material", 70, "#e3e2de", "卡拉拉大理石", "Carrara marble", "Marbre de Carrare", "Marmo di Carrara", "Mármol de Carrara"],
    ["terracotta", "material", 50, "#b8714f", "赤陶", "Terracotta", "Terre cuite", "Terracotta", "Terracota"],
    ["venetian-mask", "eyewear", 40, "#c7a14f", "威尼斯面具", "Venetian mask", "Masque vénitien", "Maschera veneziana", "Máscara veneciana"],
    ["leather-strap", "neck", 30, "#7a4a2a", "皮革背帶", "Leather strap", "Sangle en cuir", "Cinghia di cuoio", "Correa de cuero"],
    ["silk-knot", "neck", 30, "#5f7046", "絲結", "Silk knot", "Nœud de soie", "Nodo di seta", "Nudo de seda"],
    ["espresso", "mouth", 25, "#5a3522", "濃縮咖啡", "Espresso", "Espresso", "Espresso", "Café expreso"],
    ["gelato", "mouth", 30, "#a9c47f", "開心果冰淇淋", "Pistachio gelato", "Gelato à la pistache", "Gelato al pistacchio", "Helado de pistacho"],
    ["pasta-twirl", "mouth", 35, "#e8c26a", "叉捲義大利麵", "Pasta twirl", "Pâtes enroulées", "Forchettata di pasta", "Pasta enrollada"],
    ["moka-charm", "charm", 30, "#a7acb1", "摩卡壺吊飾", "Moka pot charm", "Breloque cafetière moka", "Ciondolo moka", "Colgante cafetera moka"],
    ["art-book", "charm", 30, "#2f5d7c", "藝術書", "Art book", "Livre d’art", "Libro d’arte", "Libro de arte"],
    ["lemon-brooch", "pin", 25, "#ecd04a", "檸檬胸針", "Lemon brooch", "Broche citron", "Spilla limone", "Broche de limón"],
    ["murano-iris", "iris", 25, "#c2483a", "琉璃花虹膜", "Murano flower iris", "Iris millefiori", "Iride millefiori", "Iris millefiori"],
  ],
  es: [
    ["trencadis", "material", 65, "#3a63a8", "藍白碎瓷", "Trencadís mosaic", "Mosaïque trencadís", "Mosaico trencadís", "Mosaico trencadís"],
    ["azulejo", "material", 60, "#7f9fca", "藍白花磚", "Azulejo tile", "Carreau azulejo", "Piastrella azulejo", "Azulejo"],
    ["sun-brass", "material", 65, "#b8984f", "日光黃銅", "Sun brass", "Laiton solaire", "Ottone solare", "Latón solar"],
    ["flamenco-fan", "mouth", 35, "#c1272d", "佛朗明哥扇", "Flamenco fan", "Éventail flamenco", "Ventaglio flamenco", "Abanico flamenco"],
    ["hair-comb", "head", 35, "#3b2418", "雕花髮梳", "Carved hair comb", "Peigne sculpté", "Pettine intagliato", "Peineta"],
    ["heart-pupil", "pupil", 15, "#1f1a1c", "愛心瞳孔", "Heart pupil", "Pupille cœur", "Pupilla a cuore", "Pupila de corazón"],
    ["churros", "mouth", 30, "#c98a43", "吉拿棒", "Churros", "Churros", "Churros", "Churros"],
    ["olive-tapas", "mouth", 25, "#6b7a34", "橄欖小碟", "Olive tapas", "Tapas d’olives", "Tapas di olive", "Tapa de aceitunas"],
    ["paella-pan", "mouth", 40, "#e2b13c", "迷你海鮮飯", "Mini paella", "Mini paella", "Mini paella", "Paella mini"],
    ["guitar-charm", "charm", 35, "#b5753b", "吉他吊飾", "Guitar charm", "Breloque guitare", "Ciondolo chitarra", "Colgante guitarra"],
    ["espadrille", "charm", 25, "#d9c79f", "草編鞋吊飾", "Espadrille charm", "Breloque espadrille", "Ciondolo espadrillas", "Colgante alpargata"],
    ["sun-brooch", "pin", 25, "#e7b43c", "太陽胸針", "Sun brooch", "Broche soleil", "Spilla sole", "Broche de sol"],
    ["heart-shades", "eyewear", 30, "#c1272d", "愛心墨鏡", "Heart sunglasses", "Lunettes cœur", "Occhiali a cuore", "Gafas de corazón"],
  ],
};

export const SHOP_ITEMS: readonly ShopItem[] = [...SHOP_COUNTRIES.flatMap(country =>
  ROWS[country].map(([id, slot, price, tone, zh, en, fr, it, es]) => ({
    id, country, slot, price, tone,
    names: { "traditional-chinese": zh, english: en, french: fr, italian: it, spanish: es },
  })),
), ...CULTURAL_ITEMS];

const BY_ID = new Map(SHOP_ITEMS.map(item => [item.id, item]));

export function shopItem(id: string | null | undefined): ShopItem | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** The concept board's front window, in the order it was drawn. */
export const FEATURED_IDS: readonly string[] = [
  "tea-pearl-earrings", "silver-star-earrings", "macaron-drop-earrings", "millefiori-earrings", "solar-fan-earrings",
  "tw-orbit-stamp", "orbital-beanie", "fr-signal-module", "lagoon-glass", "es-signal-brow",
  "jade", "monocle", "heart-pupil", "bubble-tea", "beret", "croissant",
  "headphones", "star-pupil", "espresso", "flamenco-fan", "amber-glass", "sky-lantern",
  "lake-iris", "round-glasses", "cat-pupil", "heart-shades",
];

export function itemsFor(
  category: ShopCategory,
  country: ShopCountry | "all",
  owned: ReadonlySet<string>,
): ShopItem[] {
  const inCountry = (item: ShopItem) => country === "all" || item.country === country;

  if (category === "featured") {
    return FEATURED_IDS.map(id => BY_ID.get(id)!).filter(inCountry);
  }
  if (category === "owned") {
    return SHOP_ITEMS.filter(item => owned.has(item.id) && inCountry(item));
  }
  const slots = CATEGORY_SLOTS[category];
  return SHOP_ITEMS.filter(item => slots.includes(item.slot) && inCountry(item));
}

/**
 * An outfit read from storage, with anything that is not a piece in the
 * right slot dropped — a renamed slot, a withdrawn piece, a hand-edited row.
 */
export function cleanOutfit(value: unknown): YumiOutfit {
  if (!value || typeof value !== "object") return {};
  const outfit: YumiOutfit = {};
  for (const slot of SHOP_SLOTS) {
    const id = (value as Record<string, unknown>)[slot];
    if (typeof id === "string" && BY_ID.get(id)?.slot === slot) outfit[slot] = id;
  }
  return outfit;
}

export function sameOutfit(a: YumiOutfit, b: YumiOutfit): boolean {
  return SHOP_SLOTS.every(slot => (a[slot] ?? null) === (b[slot] ?? null));
}

/** Tapping a piece puts it on; tapping the piece already on takes it off. */
export function toggleInOutfit(outfit: YumiOutfit, item: ShopItem): YumiOutfit {
  const next = { ...outfit };
  if (next[item.slot] === item.id) delete next[item.slot];
  else next[item.slot] = item.id;
  return next;
}

/** The pieces in an outfit that the reader does not own yet. */
export function unownedIn(outfit: YumiOutfit, owned: ReadonlySet<string>): ShopItem[] {
  return SHOP_SLOTS
    .map(slot => shopItem(outfit[slot]))
    .filter((item): item is ShopItem => !!item && !owned.has(item.id));
}

/** The same outfit with only the pieces the reader owns. */
export function ownedOnly(outfit: YumiOutfit, owned: ReadonlySet<string>): YumiOutfit {
  const next: YumiOutfit = {};
  for (const slot of SHOP_SLOTS) {
    const id = outfit[slot];
    if (id && owned.has(id)) next[slot] = id;
  }
  return next;
}
