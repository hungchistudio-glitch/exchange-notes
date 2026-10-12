import type { InterfaceLanguage } from "@/lib/appPreferences";

/* =========================================================
   The Yumi shop's catalogue

   Sixty things Yumi can wear, twelve from each of five places (Chi's
   2026-10-12 collection boards): three shell materials and nine pieces per
   country. A country is a way to browse, not a rule — any piece goes with any
   other, and the reader's interface language never hides a collection.

   Every piece is built in code from primitives (lib/yumi3d/outfit.ts), the
   same way Yumi is, so the shop needs no model files and a piece looks the
   same on the shop's stand as it does on the home screen.

   Ids are permanent. Ownership and the worn outfit are stored by id, and the
   price list the database charges from (supabase/migrations/*_yumi_shop.sql)
   is keyed by them too; tests/yumiShopCatalog.test.ts keeps the two equal.
   Names are display text in the five interface languages and are never used
   as keys.
   ========================================================= */

export type ShopCountry = "tw" | "us" | "fr" | "it" | "es";

/**
 * Where on Yumi a piece goes. One piece per slot: a second hat replaces the
 * first, and pieces in different slots are worn together.
 */
export type ShopSlot =
  | "material"
  | "pupil"
  | "eyewear"
  | "head"
  | "neck"
  | "pin"
  | "mouth"
  | "charm";

/** The shop's tabs, which group slots the way the concept boards did. */
export type ShopCategory = "featured" | "eyes" | "materials" | "wear" | "small" | "owned";

export type ShopItem = {
  id: string;
  country: ShopCountry;
  slot: ShopSlot;
  /** In energy cookies. One word Yumi has eaten is one cookie. */
  price: number;
  /** Swatch colour while a rendered thumbnail is not available. */
  tone: string;
  names: Record<InterfaceLanguage, string>;
};

/** What Yumi has on. A missing slot is Yumi as she comes. */
export type YumiOutfit = Partial<Record<ShopSlot, string>>;

export const SHOP_COUNTRIES: readonly ShopCountry[] = ["tw", "us", "fr", "it", "es"];

export const SHOP_SLOTS: readonly ShopSlot[] = [
  "material", "pupil", "eyewear", "head", "neck", "pin", "mouth", "charm",
];

export const CATEGORY_SLOTS: Record<Exclude<ShopCategory, "featured" | "owned">, readonly ShopSlot[]> = {
  eyes: ["pupil", "eyewear"],
  materials: ["material"],
  wear: ["head", "neck", "pin"],
  small: ["mouth", "charm"],
};

type Row = [id: string, slot: ShopSlot, price: number, tone: string,
  zh: string, en: string, fr: string, it: string, es: string];

const ROWS: Record<ShopCountry, Row[]> = {
  tw: [
    ["jade", "material", 120, "#6f9a78", "玉石綠", "Jade", "Jade", "Giada", "Jade"],
    ["celadon", "material", 110, "#a9c7bb", "青瓷", "Celadon", "Céladon", "Celadon", "Celadón"],
    ["terrazzo", "material", 100, "#e4d3c3", "磨石子", "Terrazzo", "Terrazzo", "Terrazzo", "Terrazo"],
    ["plum-pupil", "pupil", 30, "#2b1a22", "梅花瞳孔", "Plum blossom pupil", "Pupille fleur de prunier", "Pupilla fiore di pruno", "Pupila flor de ciruelo"],
    ["steamer-hat", "head", 90, "#d9b77c", "竹蒸籠帽", "Bamboo steamer hat", "Chapeau panier vapeur", "Cappello cestello di bambù", "Sombrero de vaporera"],
    ["market-bag", "charm", 70, "#c8473f", "茄芷袋", "Market bag", "Cabas du marché", "Borsa del mercato", "Bolsa de mercado"],
    ["bubble-tea", "mouth", 90, "#c99f74", "珍奶時光", "Bubble tea", "Thé aux perles", "Bubble tea", "Té de burbujas"],
    ["pineapple-cake", "mouth", 50, "#d9a24e", "鳳梨酥", "Pineapple cake", "Gâteau à l’ananas", "Dolcetto all’ananas", "Pastel de piña"],
    ["soup-dumpling", "mouth", 60, "#efe4d0", "小籠包", "Soup dumpling", "Xiaolongbao", "Xiaolongbao", "Xiaolongbao"],
    ["teapot-charm", "charm", 70, "#9fc2b3", "茶壺吊飾", "Teapot charm", "Breloque théière", "Ciondolo teiera", "Colgante tetera"],
    ["sky-lantern", "charm", 80, "#e0583e", "天燈", "Sky lantern", "Lanterne céleste", "Lanterna volante", "Farolillo volador"],
    ["orchid-clip", "pin", 50, "#c99ad6", "蘭花夾", "Orchid clip", "Pince orchidée", "Fermaglio orchidea", "Pinza orquídea"],
  ],
  us: [
    ["denim", "material", 100, "#2f4a72", "丹寧布", "Denim", "Denim", "Denim", "Mezclilla"],
    ["brushed-silver", "material", 120, "#b4babf", "拉絲銀", "Brushed silver", "Argent brossé", "Argento spazzolato", "Plata cepillada"],
    ["cherry-enamel", "material", 110, "#a3192f", "櫻桃紅琺瑯", "Cherry enamel", "Émail cerise", "Smalto ciliegia", "Esmalte cereza"],
    ["baseball-cap", "head", 80, "#26344f", "棒球帽", "Baseball cap", "Casquette", "Cappellino da baseball", "Gorra de béisbol"],
    ["headphones", "head", 100, "#b9bec4", "錄音室耳機", "Studio headphones", "Casque de studio", "Cuffie da studio", "Auriculares de estudio"],
    ["star-pupil", "pupil", 30, "#1d1d22", "星星瞳孔", "Star pupil", "Pupille étoile", "Pupilla a stella", "Pupila de estrella"],
    ["bagel", "mouth", 50, "#c98d4a", "芝麻貝果", "Sesame bagel", "Bagel au sésame", "Bagel al sesamo", "Bagel de sésamo"],
    ["pretzel", "mouth", 50, "#8a4b22", "椒鹽卷餅", "Pretzel", "Bretzel", "Pretzel", "Pretzel"],
    ["pancakes", "mouth", 70, "#d9a25a", "鬆餅疊", "Pancake stack", "Pile de pancakes", "Pila di pancake", "Torre de tortitas"],
    ["jazz-mic", "charm", 70, "#9aa1a8", "爵士麥克風", "Jazz mic", "Micro jazz", "Microfono jazz", "Micrófono de jazz"],
    ["skateboard", "charm", 70, "#c97b3f", "滑板吊飾", "Skateboard charm", "Breloque skateboard", "Ciondolo skateboard", "Colgante monopatín"],
    ["road-sign", "charm", 50, "#f1f0ea", "公路盾牌", "Highway shield", "Écusson d’autoroute", "Scudo autostradale", "Escudo de carretera"],
  ],
  fr: [
    ["porcelain", "material", 110, "#f1ece2", "陶瓷白", "Porcelain", "Porcelaine", "Porcellana", "Porcelana"],
    ["champagne-brass", "material", 130, "#cdb68a", "香檳黃銅", "Champagne brass", "Laiton champagne", "Ottone champagne", "Latón champán"],
    ["burgundy-lacquer", "material", 120, "#5c1a2d", "酒紅漆面", "Burgundy lacquer", "Laque bordeaux", "Lacca bordeaux", "Laca burdeos"],
    ["beret", "head", 80, "#3c3a3b", "貝雷帽", "Beret", "Béret", "Basco", "Boina"],
    ["monocle", "eyewear", 60, "#bf9d55", "黃銅單片鏡", "Brass monocle", "Monocle en laiton", "Monocolo in ottone", "Monóculo de latón"],
    ["silk-scarf", "neck", 70, "#7d1f33", "酒紅絲巾", "Silk scarf", "Foulard en soie", "Foulard di seta", "Pañuelo de seda"],
    ["croissant", "mouth", 60, "#d18a3d", "可頌", "Croissant", "Croissant", "Cornetto", "Cruasán"],
    ["baguette", "mouth", 60, "#d29b55", "長棍麵包", "Baguette", "Baguette", "Baguette", "Baguette"],
    ["macarons", "mouth", 70, "#e9a7b8", "馬卡龍", "Macarons", "Macarons", "Macaron", "Macarons"],
    ["cafe-cup", "mouth", 60, "#f4f0e8", "金邊咖啡杯", "Café cup", "Tasse de café", "Tazza da caffè", "Taza de café"],
    ["lavender-brooch", "pin", 50, "#8f7bc0", "薰衣草胸針", "Lavender brooch", "Broche lavande", "Spilla lavanda", "Broche de lavanda"],
    ["perfume", "charm", 70, "#e9b9c4", "香水瓶", "Perfume bottle", "Flacon de parfum", "Boccetta di profumo", "Frasco de perfume"],
  ],
  it: [
    ["amber-glass", "material", 150, "#c99442", "琥珀琉璃", "Amber glass", "Verre ambré", "Vetro ambrato", "Vidrio ámbar"],
    ["carrara-marble", "material", 140, "#e3e2de", "卡拉拉大理石", "Carrara marble", "Marbre de Carrare", "Marmo di Carrara", "Mármol de Carrara"],
    ["terracotta", "material", 100, "#b8714f", "赤陶", "Terracotta", "Terre cuite", "Terracotta", "Terracota"],
    ["venetian-mask", "eyewear", 80, "#c7a14f", "威尼斯面具", "Venetian mask", "Masque vénitien", "Maschera veneziana", "Máscara veneciana"],
    ["leather-strap", "neck", 60, "#7a4a2a", "皮革背帶", "Leather strap", "Sangle en cuir", "Cinghia di cuoio", "Correa de cuero"],
    ["silk-knot", "neck", 60, "#5f7046", "絲結", "Silk knot", "Nœud de soie", "Nodo di seta", "Nudo de seda"],
    ["espresso", "mouth", 50, "#5a3522", "濃縮咖啡", "Espresso", "Espresso", "Espresso", "Café expreso"],
    ["gelato", "mouth", 60, "#a9c47f", "開心果冰淇淋", "Pistachio gelato", "Gelato à la pistache", "Gelato al pistacchio", "Helado de pistacho"],
    ["pasta-twirl", "mouth", 70, "#e8c26a", "叉捲義大利麵", "Pasta twirl", "Pâtes enroulées", "Forchettata di pasta", "Pasta enrollada"],
    ["moka-charm", "charm", 60, "#a7acb1", "摩卡壺吊飾", "Moka pot charm", "Breloque cafetière moka", "Ciondolo moka", "Colgante cafetera moka"],
    ["art-book", "charm", 60, "#2f5d7c", "藝術書", "Art book", "Livre d’art", "Libro d’arte", "Libro de arte"],
    ["lemon-brooch", "pin", 45, "#ecd04a", "檸檬胸針", "Lemon brooch", "Broche citron", "Spilla limone", "Broche de limón"],
  ],
  es: [
    ["trencadis", "material", 130, "#3a63a8", "藍白碎瓷", "Trencadís mosaic", "Mosaïque trencadís", "Mosaico trencadís", "Mosaico trencadís"],
    ["azulejo", "material", 120, "#7f9fca", "藍白花磚", "Azulejo tile", "Carreau azulejo", "Piastrella azulejo", "Azulejo"],
    ["sun-brass", "material", 130, "#b8984f", "日光黃銅", "Sun brass", "Laiton solaire", "Ottone solare", "Latón solar"],
    ["flamenco-fan", "mouth", 70, "#c1272d", "佛朗明哥扇", "Flamenco fan", "Éventail flamenco", "Ventaglio flamenco", "Abanico flamenco"],
    ["hair-comb", "head", 70, "#3b2418", "雕花髮梳", "Carved hair comb", "Peigne sculpté", "Pettine intagliato", "Peineta"],
    ["heart-pupil", "pupil", 30, "#1f1a1c", "愛心瞳孔", "Heart pupil", "Pupille cœur", "Pupilla a cuore", "Pupila de corazón"],
    ["churros", "mouth", 60, "#c98a43", "吉拿棒", "Churros", "Churros", "Churros", "Churros"],
    ["olive-tapas", "mouth", 50, "#6b7a34", "橄欖小碟", "Olive tapas", "Tapas d’olives", "Tapas di olive", "Tapa de aceitunas"],
    ["paella-pan", "mouth", 80, "#e2b13c", "迷你海鮮飯", "Mini paella", "Mini paella", "Mini paella", "Paella mini"],
    ["guitar-charm", "charm", 70, "#b5753b", "吉他吊飾", "Guitar charm", "Breloque guitare", "Ciondolo chitarra", "Colgante guitarra"],
    ["espadrille", "charm", 50, "#d9c79f", "草編鞋吊飾", "Espadrille charm", "Breloque espadrille", "Ciondolo espadrillas", "Colgante alpargata"],
    ["sun-brooch", "pin", 50, "#e7b43c", "太陽胸針", "Sun brooch", "Broche soleil", "Spilla sole", "Broche de sol"],
  ],
};

export const SHOP_ITEMS: readonly ShopItem[] = SHOP_COUNTRIES.flatMap(country =>
  ROWS[country].map(([id, slot, price, tone, zh, en, fr, it, es]) => ({
    id, country, slot, price, tone,
    names: { "traditional-chinese": zh, english: en, french: fr, italian: it, spanish: es },
  })),
);

const BY_ID = new Map(SHOP_ITEMS.map(item => [item.id, item]));

export function shopItem(id: string | null | undefined): ShopItem | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** The concept board's front window, in the order it was drawn. */
export const FEATURED_IDS: readonly string[] = [
  "jade", "monocle", "heart-pupil", "bubble-tea", "beret", "croissant",
  "headphones", "star-pupil", "espresso", "flamenco-fan", "amber-glass", "sky-lantern",
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
