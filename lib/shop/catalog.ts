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

   Station 33 (October 17) adds three to every slot from Chi's design book,
   ids prefixed s33-. Every price is a multiple of three: Yumi counts on
   three fingers a hand.

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
    ["cat-pupil", "pupil", 21, "#9bb53a", "貓眼瞳孔", "Cat’s-eye pupil", "Pupille de chat", "Pupilla di gatto", "Pupila de gato"],
    ["spiral-pupil", "pupil", 21, "#1d1d22", "漩渦瞳孔", "Spiral pupil", "Pupille spirale", "Pupilla a spirale", "Pupila en espiral"],
    ["diamond-pupil", "pupil", 24, "#cfe9f7", "鑽石瞳孔", "Diamond pupil", "Pupille diamant", "Pupilla di diamante", "Pupila de diamante"],
    ["clover-pupil", "pupil", 15, "#2f6b3a", "四葉草瞳孔", "Four-leaf clover pupil", "Pupille trèfle", "Pupilla quadrifoglio", "Pupila de trébol"],
    ["sparkle-pupil", "pupil", 21, "#1b2340", "星光瞳孔", "Sparkle pupil", "Pupille étincelante", "Pupilla scintillante", "Pupila brillante"],
    ["lake-iris", "iris", 21, "#3a8fb7", "湖水藍虹膜", "Lake blue iris", "Iris bleu lac", "Iride blu lago", "Iris azul lago"],
    ["amber-iris", "iris", 21, "#c98a2a", "琥珀虹膜", "Amber iris", "Iris ambré", "Iride ambra", "Iris ámbar"],
    ["violet-iris", "iris", 21, "#8a5cc4", "紫羅蘭虹膜", "Violet iris", "Iris violet", "Iride viola", "Iris violeta"],
    ["round-glasses", "eyewear", 30, "#2a2522", "圓框眼鏡", "Round glasses", "Lunettes rondes", "Occhiali tondi", "Gafas redondas"],
    ["pirate-patch", "eyewear", 24, "#151515", "海盜眼罩", "Pirate eye patch", "Bandeau de pirate", "Benda da pirata", "Parche de pirata"],
    ["long-lashes", "eyewear", 24, "#151515", "長睫毛", "Long lashes", "Longs cils", "Ciglia lunghe", "Pestañas largas"],
  ],
  tw: [
    ["jade", "material", 60, "#6f9a78", "玉石綠", "Jade", "Jade", "Giada", "Jade"],
    ["celadon", "material", 54, "#a9c7bb", "青瓷", "Celadon", "Céladon", "Celadon", "Celadón"],
    ["terrazzo", "material", 51, "#e4d3c3", "磨石子", "Terrazzo", "Terrazzo", "Terrazzo", "Terrazo"],
    ["plum-pupil", "pupil", 15, "#2b1a22", "梅花瞳孔", "Plum blossom pupil", "Pupille fleur de prunier", "Pupilla fiore di pruno", "Pupila flor de ciruelo"],
    ["steamer-hat", "head", 45, "#d9b77c", "竹蒸籠帽", "Bamboo steamer hat", "Chapeau panier vapeur", "Cappello cestello di bambù", "Sombrero de vaporera"],
    ["market-bag", "charm", 36, "#c8473f", "茄芷袋", "Market bag", "Cabas du marché", "Borsa del mercato", "Bolsa de mercado"],
    ["bubble-tea", "mouth", 45, "#c99f74", "珍奶時光", "Bubble tea", "Thé aux perles", "Bubble tea", "Té de burbujas"],
    ["pineapple-cake", "mouth", 24, "#d9a24e", "鳳梨酥", "Pineapple cake", "Gâteau à l’ananas", "Dolcetto all’ananas", "Pastel de piña"],
    ["soup-dumpling", "mouth", 30, "#efe4d0", "小籠包", "Soup dumpling", "Xiaolongbao", "Xiaolongbao", "Xiaolongbao"],
    ["teapot-charm", "charm", 36, "#9fc2b3", "茶壺吊飾", "Teapot charm", "Breloque théière", "Ciondolo teiera", "Colgante tetera"],
    ["sky-lantern", "charm", 39, "#e0583e", "天燈", "Sky lantern", "Lanterne céleste", "Lanterna volante", "Farolillo volador"],
    ["orchid-clip", "pin", 24, "#c99ad6", "蘭花夾", "Orchid clip", "Pince orchidée", "Fermaglio orchidea", "Pinza orquídea"],
    ["jade-iris", "iris", 24, "#3f8f5f", "翡翠虹膜", "Jade iris", "Iris de jade", "Iride di giada", "Iris de jade"],
    /* Station 33, the second collection (2026-10-17). */
    ["s33-basalt-tea", "material", 66, "#374642", "墨岩茶金", "Basalt tea gold", "Basalte or thé", "Basalto oro tè", "Basalto oro té"],
    ["s33-tea-radial", "iris", 24, "#9b763d", "茶湯放射虹膜", "Tea infusion iris", "Iris infusion de thé", "Iride infuso di tè", "Iris infusión de té"],
    ["s33-tea-cone", "head", 45, "#c7aa71", "茶採斗笠", "Tea picker cone", "Chapeau conique de cueilleuse de thé", "Cappello conico da raccolta del tè", "Sombrero cónico de recolectora de té"],
    ["s33-mountain-stamp", "pin", 24, "#609783", "山線紀念郵票", "Mountain route stamp", "Timbre route de montagne", "Francobollo via di montagna", "Sello ruta de montaña"],
    ["s33-haw-skewer", "mouth", 30, "#b43e32", "糖葫蘆補給串", "Candied fruit skewer", "Brochette de fruits confits", "Spiedino di frutta candita", "Brocheta de fruta confitada"],
    ["s33-tea-leaf-drop", "earrings", 36, "#6e9978", "茶葉關節單耳環", "Articulated tea leaf earring", "Boucle feuille de thé articulée", "Orecchino foglia di tè snodato", "Pendiente hoja de té articulada"],
    ["s33-jade-hinge", "brow", 30, "#8aac91", "玉扣眉環", "Jade hinge brow cuff", "Anneau de sourcil charnière de jade", "Anello sopracciglio cerniera di giada", "Aro de ceja bisagra de jade"],
    ["s33-rice-chain", "necklace", 39, "#d5cbb0", "米粒弧鏈項鍊", "Rice grain necklace", "Collier grains de riz", "Collana chicchi di riso", "Collar de granos de arroz"],
  ],
  us: [
    ["denim", "material", 51, "#2f4a72", "丹寧布", "Denim", "Denim", "Denim", "Mezclilla"],
    ["brushed-silver", "material", 60, "#b4babf", "拉絲銀", "Brushed silver", "Argent brossé", "Argento spazzolato", "Plata cepillada"],
    ["cherry-enamel", "material", 54, "#a3192f", "櫻桃紅琺瑯", "Cherry enamel", "Émail cerise", "Smalto ciliegia", "Esmalte cereza"],
    ["baseball-cap", "head", 39, "#26344f", "棒球帽", "Baseball cap", "Casquette", "Cappellino da baseball", "Gorra de béisbol"],
    ["headphones", "head", 51, "#b9bec4", "錄音室耳機", "Studio headphones", "Casque de studio", "Cuffie da studio", "Auriculares de estudio"],
    ["star-pupil", "pupil", 15, "#1d1d22", "星星瞳孔", "Star pupil", "Pupille étoile", "Pupilla a stella", "Pupila de estrella"],
    ["bagel", "mouth", 24, "#c98d4a", "芝麻貝果", "Sesame bagel", "Bagel au sésame", "Bagel al sesamo", "Bagel de sésamo"],
    ["pretzel", "mouth", 24, "#8a4b22", "椒鹽卷餅", "Pretzel", "Bretzel", "Pretzel", "Pretzel"],
    ["pancakes", "mouth", 36, "#d9a25a", "鬆餅疊", "Pancake stack", "Pile de pancakes", "Pila di pancake", "Torre de tortitas"],
    ["jazz-mic", "charm", 36, "#9aa1a8", "爵士麥克風", "Jazz mic", "Micro jazz", "Microfono jazz", "Micrófono de jazz"],
    ["skateboard", "charm", 36, "#c97b3f", "滑板吊飾", "Skateboard charm", "Breloque skateboard", "Ciondolo skateboard", "Colgante monopatín"],
    ["road-sign", "charm", 24, "#f1f0ea", "公路盾牌", "Highway shield", "Écusson d’autoroute", "Scudo autostradale", "Escudo de carretera"],
    ["aviator-shades", "eyewear", 36, "#5d6a5f", "飛行員墨鏡", "Aviator shades", "Lunettes d’aviateur", "Occhiali da aviatore", "Gafas de aviador"],
    /* Station 33, the second collection (2026-10-17). */
    ["s33-compass-arrow", "pupil", 21, "#26343d", "航向箭瞳", "Navigation arrow pupil", "Pupille flèche de navigation", "Pupilla freccia di rotta", "Pupila flecha de rumbo"],
    ["s33-titanium-visor", "eyewear", 36, "#8ca2b1", "鈦框航行護目鏡", "Titanium navigator visor", "Visière de navigation en titane", "Visiera da navigazione in titanio", "Visera de navegación de titanio"],
    ["s33-flight-cap", "head", 45, "#607487", "天線飛行帽", "Antenna flight cap", "Casque d’aviateur à antenne", "Cuffia da volo con antenna", "Gorro de vuelo con antena"],
    ["s33-boarding-tag", "pin", 24, "#667e9d", "軌道登艙牌", "Orbit boarding tag", "Étiquette d’embarquement orbitale", "Targhetta d’imbarco orbitale", "Etiqueta de embarque orbital"],
    ["s33-shuttle-pod", "charm", 39, "#9baab7", "往返艙吊飾", "Shuttle pod charm", "Breloque navette", "Ciondolo navetta", "Colgante cápsula lanzadera"],
    ["s33-machined-lock", "brow", 30, "#8c9baa", "機械鎖扣眉環", "Machined lock brow cuff", "Anneau de sourcil fermoir usiné", "Anello sopracciglio chiusura meccanica", "Aro de ceja cierre mecanizado"],
  ],
  fr: [
    ["porcelain", "material", 54, "#f1ece2", "陶瓷白", "Porcelain", "Porcelaine", "Porcellana", "Porcelana"],
    ["champagne-brass", "material", 66, "#cdb68a", "香檳黃銅", "Champagne brass", "Laiton champagne", "Ottone champagne", "Latón champán"],
    ["burgundy-lacquer", "material", 60, "#5c1a2d", "酒紅漆面", "Burgundy lacquer", "Laque bordeaux", "Lacca bordeaux", "Laca burdeos"],
    ["beret", "head", 39, "#3c3a3b", "貝雷帽", "Beret", "Béret", "Basco", "Boina"],
    ["monocle", "eyewear", 30, "#bf9d55", "黃銅單片鏡", "Brass monocle", "Monocle en laiton", "Monocolo in ottone", "Monóculo de latón"],
    ["silk-scarf", "neck", 36, "#7d1f33", "酒紅絲巾", "Silk scarf", "Foulard en soie", "Foulard di seta", "Pañuelo de seda"],
    ["croissant", "mouth", 30, "#d18a3d", "可頌", "Croissant", "Croissant", "Cornetto", "Cruasán"],
    ["baguette", "mouth", 30, "#d29b55", "長棍麵包", "Baguette", "Baguette", "Baguette", "Baguette"],
    ["macarons", "mouth", 36, "#e9a7b8", "馬卡龍", "Macarons", "Macarons", "Macaron", "Macarons"],
    ["cafe-cup", "mouth", 30, "#f4f0e8", "金邊咖啡杯", "Café cup", "Tasse de café", "Tazza da caffè", "Taza de café"],
    ["lavender-brooch", "pin", 24, "#8f7bc0", "薰衣草胸針", "Lavender brooch", "Broche lavande", "Spilla lavanda", "Broche de lavanda"],
    ["perfume", "charm", 36, "#e9b9c4", "香水瓶", "Perfume bottle", "Flacon de parfum", "Boccetta di profumo", "Frasco de perfume"],
    ["cat-eye-glasses", "eyewear", 36, "#1c1a1b", "復古貓眼鏡框", "Cat-eye frames", "Lunettes œil-de-chat", "Occhiali a gatto", "Gafas de ojo de gato"],
    /* Station 33, the second collection (2026-10-17). */
    ["s33-opal-pearl", "material", 66, "#c7b9ce", "蛋白石珍珠釉", "Opal pearl glaze", "Glaçure perle d’opale", "Smalto perla d’opale", "Esmalte perla de ópalo"],
    ["s33-champagne-sunray", "iris", 24, "#c4af76", "香檳日射虹膜", "Champagne sunray iris", "Iris soleillé champagne", "Iride raggi di sole champagne", "Iris rayos de sol champán"],
    ["s33-deco-lens", "eyewear", 36, "#bc9d62", "階梯單片鏡", "Art Deco lens", "Monocle Art déco", "Monocolo Art Déco", "Monóculo art déco"],
    ["s33-pleated-ribbon", "neck", 36, "#b3a9bd", "工坊百褶領巾", "Atelier pleated ribbon", "Ruban plissé d’atelier", "Nastro plissettato d’atelier", "Cinta plisada de taller"],
    ["s33-rosette-stamp", "pin", 24, "#b492a3", "玫瑰窗紀念郵票", "Rosette souvenir stamp", "Timbre souvenir rosace", "Francobollo ricordo a rosone", "Sello recuerdo de rosetón"],
    ["s33-crescent-pastry", "earrings", 36, "#c79d60", "可頌月弧單耳環", "Croissant crescent earring", "Boucle croissant de lune", "Orecchino mezzaluna di cornetto", "Pendiente media luna de cruasán"],
    ["s33-pearl-arch", "brow", 30, "#d9cbb5", "珍珠拱眉環", "Pearl arch brow cuff", "Anneau de sourcil arche de perles", "Anello sopracciglio arco di perle", "Aro de ceja arco de perlas"],
  ],
  it: [
    ["amber-glass", "material", 75, "#c99442", "琥珀琉璃", "Amber glass", "Verre ambré", "Vetro ambrato", "Vidrio ámbar"],
    ["carrara-marble", "material", 69, "#e3e2de", "卡拉拉大理石", "Carrara marble", "Marbre de Carrare", "Marmo di Carrara", "Mármol de Carrara"],
    ["terracotta", "material", 51, "#b8714f", "赤陶", "Terracotta", "Terre cuite", "Terracotta", "Terracota"],
    ["venetian-mask", "eyewear", 39, "#c7a14f", "威尼斯面具", "Venetian mask", "Masque vénitien", "Maschera veneziana", "Máscara veneciana"],
    ["leather-strap", "neck", 30, "#7a4a2a", "皮革背帶", "Leather strap", "Sangle en cuir", "Cinghia di cuoio", "Correa de cuero"],
    ["silk-knot", "neck", 30, "#5f7046", "絲結", "Silk knot", "Nœud de soie", "Nodo di seta", "Nudo de seda"],
    ["espresso", "mouth", 24, "#5a3522", "濃縮咖啡", "Espresso", "Espresso", "Espresso", "Café expreso"],
    ["gelato", "mouth", 30, "#a9c47f", "開心果冰淇淋", "Pistachio gelato", "Gelato à la pistache", "Gelato al pistacchio", "Helado de pistacho"],
    ["pasta-twirl", "mouth", 36, "#e8c26a", "叉捲義大利麵", "Pasta twirl", "Pâtes enroulées", "Forchettata di pasta", "Pasta enrollada"],
    ["moka-charm", "charm", 30, "#a7acb1", "摩卡壺吊飾", "Moka pot charm", "Breloque cafetière moka", "Ciondolo moka", "Colgante cafetera moka"],
    ["art-book", "charm", 30, "#2f5d7c", "藝術書", "Art book", "Livre d’art", "Libro d’arte", "Libro de arte"],
    ["lemon-brooch", "pin", 24, "#ecd04a", "檸檬胸針", "Lemon brooch", "Broche citron", "Spilla limone", "Broche de limón"],
    ["murano-iris", "iris", 24, "#c2483a", "琉璃花虹膜", "Murano flower iris", "Iris millefiori", "Iride millefiori", "Iris millefiori"],
    /* Station 33, the second collection (2026-10-17). */
    ["s33-six-blade", "pupil", 21, "#303a38", "六葉光圈瞳", "Six-blade aperture pupil", "Pupille diaphragme à six lames", "Pupilla diaframma a sei lamelle", "Pupila diafragma de seis hojas"],
    ["s33-lagoon-rings", "iris", 24, "#478e98", "潟湖年輪虹膜", "Lagoon rings iris", "Iris anneaux de lagune", "Iride anelli di laguna", "Iris anillos de laguna"],
    ["s33-racing-lens", "eyewear", 36, "#a44735", "競速單眼風鏡", "Racing lens", "Lunette de course", "Lente da corsa", "Lente de carreras"],
    ["s33-ribbed-loop", "neck", 36, "#b1ba91", "羅紋環領", "Ribbed loop scarf", "Snood côtelé", "Scaldacollo a coste", "Cuello de canalé"],
    ["s33-cannoli", "mouth", 30, "#c99759", "星港奶油捲", "Spaceport cannoli", "Cannoli du spatioport", "Cannolo dello spazioporto", "Canoli del puerto espacial"],
    ["s33-scooter-token", "charm", 39, "#80a99f", "城市小機車吊飾", "City scooter charm", "Breloque scooter urbain", "Ciondolo scooter di città", "Colgante scooter urbano"],
    ["s33-glass-drop", "earrings", 36, "#5c9aab", "琉璃滴單耳環", "Lagoon glass drop earring", "Boucle goutte de verre de lagune", "Orecchino goccia di vetro di laguna", "Pendiente gota de vidrio de laguna"],
    ["s33-mosaic-medal", "necklace", 39, "#589298", "馬賽克圓章項鍊", "Mosaic medallion necklace", "Collier médaillon mosaïque", "Collana medaglione a mosaico", "Collar medallón de mosaico"],
  ],
  es: [
    ["trencadis", "material", 66, "#3a63a8", "藍白碎瓷", "Trencadís mosaic", "Mosaïque trencadís", "Mosaico trencadís", "Mosaico trencadís"],
    ["azulejo", "material", 60, "#7f9fca", "藍白花磚", "Azulejo tile", "Carreau azulejo", "Piastrella azulejo", "Azulejo"],
    ["sun-brass", "material", 66, "#b8984f", "日光黃銅", "Sun brass", "Laiton solaire", "Ottone solare", "Latón solar"],
    ["flamenco-fan", "mouth", 36, "#c1272d", "佛朗明哥扇", "Flamenco fan", "Éventail flamenco", "Ventaglio flamenco", "Abanico flamenco"],
    ["hair-comb", "head", 36, "#3b2418", "雕花髮梳", "Carved hair comb", "Peigne sculpté", "Pettine intagliato", "Peineta"],
    ["heart-pupil", "pupil", 15, "#1f1a1c", "愛心瞳孔", "Heart pupil", "Pupille cœur", "Pupilla a cuore", "Pupila de corazón"],
    ["churros", "mouth", 30, "#c98a43", "吉拿棒", "Churros", "Churros", "Churros", "Churros"],
    ["olive-tapas", "mouth", 24, "#6b7a34", "橄欖小碟", "Olive tapas", "Tapas d’olives", "Tapas di olive", "Tapa de aceitunas"],
    ["paella-pan", "mouth", 39, "#e2b13c", "迷你海鮮飯", "Mini paella", "Mini paella", "Mini paella", "Paella mini"],
    ["guitar-charm", "charm", 36, "#b5753b", "吉他吊飾", "Guitar charm", "Breloque guitare", "Ciondolo chitarra", "Colgante guitarra"],
    ["espadrille", "charm", 24, "#d9c79f", "草編鞋吊飾", "Espadrille charm", "Breloque espadrille", "Ciondolo espadrillas", "Colgante alpargata"],
    ["sun-brooch", "pin", 24, "#e7b43c", "太陽胸針", "Sun brooch", "Broche soleil", "Spilla sole", "Broche de sol"],
    ["heart-shades", "eyewear", 30, "#c1272d", "愛心墨鏡", "Heart sunglasses", "Lunettes cœur", "Occhiali a cuore", "Gafas de corazón"],
    /* Station 33, the second collection (2026-10-17). */
    ["s33-oxidized-copper", "material", 66, "#407c76", "銅綠考古釉", "Patinated copper", "Cuivre patiné", "Rame patinato", "Cobre patinado"],
    ["s33-eight-petal", "pupil", 21, "#29354b", "八瓣花磚瞳", "Eight-petal tile pupil", "Pupille carreau à huit pétales", "Pupilla piastrella a otto petali", "Pupila azulejo de ocho pétalos"],
    ["s33-fan-crown", "head", 45, "#a3443d", "摺扇雕塑冠", "Sculpted fan crown", "Couronne éventail sculptée", "Corona a ventaglio scolpita", "Corona de abanico esculpida"],
    ["s33-fringed-band", "neck", 36, "#b36b4b", "陶土流蘇領巾", "Terracotta fringe scarf", "Foulard à franges terre cuite", "Foulard con frange color terracotta", "Pañuelo de flecos terracota"],
    ["s33-turron", "mouth", 30, "#e1cda2", "杏仁牛軋補給塊", "Almond turrón bite", "Bouchée de touron aux amandes", "Bocconcino di torrone alle mandorle", "Bocado de turrón de almendra"],
    ["s33-amphora", "charm", 39, "#b47755", "陶瓶訊號吊飾", "Ceramic amphora charm", "Breloque amphore en céramique", "Ciondolo anfora in ceramica", "Colgante ánfora de cerámica"],
    ["s33-fan-pendant", "necklace", 39, "#a64c4c", "夜舞摺扇項鍊", "Night dance fan pendant", "Pendentif éventail de danse nocturne", "Pendente ventaglio di danza notturna", "Colgante abanico de baile nocturno"],
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
  // Station 33 (2026-10-17): one from each corner of the new collection.
  "s33-tea-cone", "s33-glass-drop", "s33-opal-pearl", "s33-compass-arrow", "s33-fan-pendant", "s33-shuttle-pod",
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
