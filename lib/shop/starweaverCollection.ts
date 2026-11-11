import type { ShopItem } from "./catalog";

/* =========================================================
   Starwoven Relics｜織星遺物 — 17 limited pieces (Chi, 2026-11-10)

   Brought back by Yumi Starweaver｜織星者: every seventh word won finds one
   the reader does not own yet, each equally likely, until all 17 are held.
   Never sold, not among the 333 on the shelves, and apart from the Mythic
   Vault's 33: Wordvault's chests can never give one, nor this game one of
   theirs. The database knows them as limited, unavailable and from the
   'starweaver' pool (*_starweaver.sql), and decides every award itself.

   The seal numbers are how the shop shows a relic not found yet — a
   silhouette, a lock and a number — so its name is never read out before
   it is owned. They say nothing about the order relics are found in.

   Names from the design book (handoffs/yumi-starweaver/PRIZES.json),
   checked in all five languages. Ids are permanent. Built in
   lib/yumi3d/starweaverOutfit.ts.
   ========================================================= */

export type StarweaverItem = ShopItem & {
  /** "01" to "17": the number on its seal while it is not owned. */
  seal: string;
  /** One or two sentences, shown as it comes out of the gate. */
  intro: ShopItem["names"];
};

type Row = [id: string, slot: ShopItem["slot"], tone: string,
  zh: string, en: string, fr: string, it: string, es: string];

const ROWS: Row[] = [
  // Shell finishes
  ["sw-eventide-ceramic", "material", "#f1ece2", "暮光星瓷", "Eventide Star Ceramic", "Céramique stellaire du crépuscule", "Ceramica stellare del crepuscolo", "Cerámica estelar del crepúsculo"],
  ["sw-eclipse-titanium", "material", "#3a3d44", "蝕影鈦金", "Eclipse Titanium", "Titane d’éclipse", "Titanio d’eclissi", "Titanio de eclipse"],
  ["sw-nebula-opal", "material", "#d9d6e4", "星雲蛋白石", "Nebula Opal", "Opale de nébuleuse", "Opale della nebulosa", "Ópalo de nebulosa"],
  // Earrings, single, on her left
  ["sw-orbit-drop", "earrings", "#bcd9de", "軌道滴墜", "Orbit Drop", "Goutte orbitale", "Goccia orbitale", "Gota orbital"],
  ["sw-comet-thread", "earrings", "#e6dcc4", "彗尾絲線", "Comet Thread", "Fil de comète", "Filo di cometa", "Hilo de cometa"],
  ["sw-binary-moon", "earrings", "#2c2c31", "雙月相扣", "Binary Moons", "Lunes binaires", "Lune binarie", "Lunas binarias"],
  ["sw-star-spindle", "earrings", "#c9ccd2", "星梭單耳環", "Star Spindle", "Fuseau stellaire", "Fuso stellare", "Huso estelar"],
  ["sw-signal-spiral", "earrings", "#4a4e57", "訊號螺旋", "Signal Spiral", "Spirale du signal", "Spirale del segnale", "Espiral de señal"],
  ["sw-portal-seed", "earrings", "#e4d2ad", "星門之種", "Portal Seed", "Graine du portail", "Seme del portale", "Semilla del portal"],
  // Brow
  ["sw-meridian-cuff", "brow", "#dfe3e8", "子午線眉環", "Meridian Cuff", "Anneau méridien", "Anello meridiano", "Aro meridiano"],
  ["sw-phase-notch", "brow", "#30333a", "月相刻痕眉環", "Phase Notch", "Encoche lunaire", "Tacca lunare", "Muesca lunar"],
  ["sw-zenith-pin", "brow", "#c8bfdc", "天頂星針", "Zenith Pin", "Épingle du zénith", "Spilla dello zenit", "Aguja del cenit"],
  // Necklaces
  ["sw-seven-gates", "necklace", "#dcd2bd", "七門星鍊", "Seven Gates", "Sept portails", "Sette portali", "Siete portales"],
  ["sw-stellar-compass", "necklace", "#8e939b", "星航羅盤", "Stellar Compass", "Boussole stellaire", "Bussola stellare", "Brújula estelar"],
  ["sw-weavers-knot", "necklace", "#b7bac0", "織星之結", "Weaver’s Knot", "Nœud du tisserand", "Nodo del tessitore", "Nudo del tejedor"],
  // Head
  ["sw-cartographer-diadem", "head", "#7e858f", "星圖師冠環", "Cartographer’s Diadem", "Diadème du cartographe", "Diadema del cartografo", "Diadema del cartógrafo"],
  ["sw-aurora-visor", "head", "#ece9f2", "極光航帽", "Aurora Flight Cap", "Coiffe de vol aurorale", "Copricapo di volo aurorale", "Gorro de vuelo auroral"],
];

/* What the reveal says about each (Chi, 2026-11-11: "顯示得到的神秘物品，並有
   簡單介紹"), from the design book's concept for each piece, in the order
   zh, en, fr, it, es. */
type Intro = [zh: string, en: string, fr: string, it: string, es: string];

const INTROS: Record<string, Intro> = {
  "sw-eventide-ceramic": [
    "暖白瓷殼上，深藍星點沿著弧線聚集；只有缺口末端，藏著一抹冰青內釉。",
    "Warm white porcelain with deep-blue stars gathered along the curve; only the ends of the gap hide a glaze of ice.",
    "Une porcelaine blanc chaud où des étoiles bleu profond suivent la courbe ; seules les pointes de l’ouverture cachent un émail de glace.",
    "Porcellana bianco caldo con stelle blu profondo raccolte lungo la curva; solo le punte dell’apertura nascondono uno smalto di ghiaccio.",
    "Porcelana blanca y cálida con estrellas azul profundo reunidas a lo largo de la curva; solo las puntas de la abertura esconden un esmalte de hielo.",
  ],
  "sw-eclipse-titanium": [
    "深石墨色的鈦殼，髮絲般的銀紋順著弧線流動，邊緣收著一道冷冽的銀光。",
    "Deep graphite titanium, with hairline silver grain flowing along the curve and a narrow edge of cold silver.",
    "Un titane graphite profond, au grain d’argent fin comme un cheveu qui suit la courbe, bordé d’un mince argent froid.",
    "Titanio grafite profondo, con venature d’argento sottili come capelli che seguono la curva e un filo d’argento freddo sul bordo.",
    "Titanio grafito profundo, con vetas de plata finas como un cabello que siguen la curva y un borde estrecho de plata fría.",
  ],
  "sw-nebula-opal": [
    "乳灰色的寶石光澤；只有光線斜斜掠過時，才透出青紫色的星雲。",
    "A milky grey, gem-like sheen; a cyan-violet nebula shows only when the light glances across it.",
    "Un éclat de gemme gris laiteux ; une nébuleuse cyan et violette n’apparaît que lorsque la lumière l’effleure.",
    "Una lucentezza di gemma grigio latte; una nebulosa ciano e viola appare solo quando la luce la sfiora di traverso.",
    "Un brillo de gema gris lechoso; una nebulosa cian y violeta aparece solo cuando la luz la roza de lado.",
  ],
  "sw-orbit-drop": [
    "一條銀色軌道環抱著小小的水滴晶石，像一顆被捕獲的衛星。",
    "A silver orbit wrapped round a small teardrop crystal, like a captured moon.",
    "Une orbite d’argent enlace un petit cristal en goutte, comme une lune capturée.",
    "Un’orbita d’argento avvolge un piccolo cristallo a goccia, come una luna catturata.",
    "Una órbita de plata abraza un pequeño cristal en forma de gota, como una luna capturada.",
  ],
  "sw-comet-thread": [
    "一長一短兩根細銀線，交會於小小的彗星核心；一只會隨著她輕輕晃動的耳環。",
    "Two fine silver threads, one long and one short, meet at a tiny comet’s heart: a single earring that sways as she moves.",
    "Deux fils d’argent, l’un long, l’autre court, se rejoignent au cœur d’une minuscule comète : une seule boucle qui oscille à chaque mouvement.",
    "Due sottili fili d’argento, uno lungo e uno corto, si incontrano nel cuore di una piccola cometa: un solo orecchino che ondeggia a ogni movimento.",
    "Dos finos hilos de plata, uno largo y otro corto, se unen en el corazón de un pequeño cometa: un solo pendiente que se mece al moverse.",
  ],
  "sw-binary-moon": [
    "兩枚大小不同的月盤，在同一只耳環上交錯相扣，永遠繞著彼此。",
    "Two moons of different sizes interlocked on one earring, forever circling each other.",
    "Deux lunes de tailles différentes s’entrecroisent sur une même boucle, tournant sans fin l’une autour de l’autre.",
    "Due lune di misure diverse intrecciate su un solo orecchino, che girano per sempre l’una intorno all’altra.",
    "Dos lunas de distinto tamaño entrelazadas en un mismo pendiente, girando siempre la una alrededor de la otra.",
  ],
  "sw-star-spindle": [
    "細長的梭形空框裡，懸著一顆小小的星核，像一支還在編織星光的梭子。",
    "A slender open spindle with a tiny star core suspended inside, like a shuttle still weaving starlight.",
    "Un fuseau ajouré et élancé, où flotte un minuscule cœur d’étoile, comme une navette qui tisse encore la lumière.",
    "Un fuso sottile e traforato, con un piccolo nucleo di stella sospeso all’interno, come una spola che tesse ancora la luce.",
    "Un huso esbelto y calado con un diminuto núcleo de estrella suspendido dentro, como una lanzadera que aún teje luz.",
  ],
  "sw-signal-spiral": [
    "一段短短的圓錐螺旋，像一道被收進首飾裡的電波，仍在輕輕傳送訊號。",
    "A short conical spiral, like a radio wave folded into a jewel and still quietly sending.",
    "Une courte spirale conique, comme une onde radio repliée dans un bijou, qui émet encore doucement.",
    "Una breve spirale conica, come un’onda radio ripiegata in un gioiello che trasmette ancora piano.",
    "Una breve espiral cónica, como una onda de radio plegada en una joya que aún transmite en silencio.",
  ],
  "sw-portal-seed": [
    "一枚迷你六邊形門框，中央嵌著乳白色的星種，像一座等待開啟的小星門。",
    "A tiny hexagonal gate with a milky star seed set at its centre: a small star gate waiting to open.",
    "Un minuscule portail hexagonal, une graine d’étoile laiteuse sertie en son centre : un petit portail qui attend de s’ouvrir.",
    "Un minuscolo portale esagonale con un seme di stella latteo incastonato al centro: un piccolo portale in attesa di aprirsi.",
    "Un diminuto portal hexagonal con una semilla de estrella lechosa en su centro: un pequeño portal que espera abrirse.",
  ],
  "sw-meridian-cuff": [
    "兩道細環扣住殼管，像畫在星球上的子午線。",
    "Two fine rings clasp the shell’s tube, like meridians drawn on a planet.",
    "Deux anneaux fins enserrent le tube de la coque, comme des méridiens tracés sur une planète.",
    "Due anelli sottili stringono il tubo del guscio, come meridiani tracciati su un pianeta.",
    "Dos aros finos abrazan el tubo de la concha, como meridianos trazados sobre un planeta.",
  ],
  "sw-phase-notch": [
    "三個由滿到空的小月相，嵌在窄窄的眉扣上，記下每一次盈缺。",
    "Three small moon phases, full to empty, set into a narrow brow clasp, keeping count of each waxing and waning.",
    "Trois petites phases de lune, de la pleine à la nouvelle, serties dans une fine agrafe, qui comptent chaque croissance et décroissance.",
    "Tre piccole fasi lunari, dalla piena alla nuova, incastonate in un sottile fermaglio, che contano ogni crescere e calare.",
    "Tres pequeñas fases lunares, de llena a nueva, engastadas en un broche estrecho, que cuentan cada creciente y menguante.",
  ],
  "sw-zenith-pin": [
    "一根細短的斜針，連著一顆四角星形寶石，永遠指向頭頂的天空。",
    "A short, slanted pin holding a four-pointed star gem, always pointing to the sky overhead.",
    "Une courte épingle inclinée qui porte une gemme en étoile à quatre branches, toujours tournée vers le ciel.",
    "Una corta spilla obliqua con una gemma a stella a quattro punte, sempre rivolta al cielo.",
    "Una aguja corta e inclinada que sostiene una gema de estrella de cuatro puntas, siempre apuntando al cielo.",
  ],
  "sw-seven-gates": [
    "七個小環連成胸前的鏈弧，中央垂著一枚較大的門形墜：每七趟航行，穿過一道門。",
    "Seven small rings form a chain across her front, with a larger gate-shaped pendant at its centre: one gate for every seven voyages.",
    "Sept petits anneaux forment une chaîne sur le devant, avec au centre un pendentif plus grand en forme de portail : un portail tous les sept voyages.",
    "Sette piccoli anelli formano una catena sul davanti, con al centro un pendente più grande a forma di portale: un portale ogni sette viaggi.",
    "Siete pequeños aros forman una cadena al frente, con un colgante mayor en forma de portal en el centro: un portal por cada siete viajes.",
  ],
  "sw-stellar-compass": [
    "小圓盤中鑲著一根立體羅盤指針，背面刻著七道航線。",
    "A small disc set with a raised compass needle, seven routes engraved on its back.",
    "Un petit disque serti d’une aiguille de boussole en relief, sept routes gravées au dos.",
    "Un piccolo disco con un ago di bussola in rilievo e sette rotte incise sul retro.",
    "Un pequeño disco con una aguja de brújula en relieve y siete rutas grabadas en el reverso.",
  ],
  "sw-weavers-knot": [
    "兩條相扣的軌道交織成小小的結，中央藏著一顆微小的星種。",
    "Two interlocking orbits woven into a small knot, a tiny star seed hidden at its centre.",
    "Deux orbites entrelacées nouées en un petit nœud, une minuscule graine d’étoile cachée en son centre.",
    "Due orbite intrecciate in un piccolo nodo, con un minuscolo seme di stella nascosto al centro.",
    "Dos órbitas entrelazadas en un pequeño nudo, con una diminuta semilla de estrella escondida en el centro.",
  ],
  "sw-cartographer-diadem": [
    "貼著殼頂的低冠環，上面分布著三個小小的星圖節點，記下她走過的星路。",
    "A low diadem close to the top of her shell, with three small star-chart nodes that mark the routes she has travelled.",
    "Un diadème bas, au ras du sommet de la coque, orné de trois petits nœuds de carte céleste qui marquent les routes parcourues.",
    "Un diadema basso, aderente alla sommità del guscio, con tre piccoli nodi di mappa stellare che segnano le rotte percorse.",
    "Una diadema baja, pegada a lo alto de la concha, con tres pequeños nodos de carta estelar que marcan las rutas recorridas.",
  ],
  "sw-aurora-visor": [
    "一頂不遮眼的短弧航帽，像一段靜止的極光，輕輕覆在殼頂。",
    "A short, curved flight cap that leaves her eye clear, like a still ribbon of aurora resting on her shell.",
    "Une coiffe de vol courte et arquée qui laisse l’œil libre, comme un ruban d’aurore immobile posé sur la coque.",
    "Un copricapo di volo corto e curvo che lascia libero l’occhio, come un nastro d’aurora immobile posato sul guscio.",
    "Un gorro de vuelo corto y curvo que deja libre el ojo, como una cinta de aurora inmóvil posada sobre la concha.",
  ],
};

export const STARWEAVER_ITEMS: readonly StarweaverItem[] = ROWS.map(([id, slot, tone, zh, en, fr, it, es], index) => {
  const [izh, ien, ifr, iit, ies] = INTROS[id];
  return {
    id, slot, tone,
    seal: String(index + 1).padStart(2, "0"),
    country: "basic",
    /* Never sold; the database will not sell it either. */
    price: 0,
    names: { "traditional-chinese": zh, english: en, french: fr, italian: it, spanish: es },
    intro: { "traditional-chinese": izh, english: ien, french: ifr, italian: iit, spanish: ies },
  };
});

/** Every seventh word won brings one back. */
export const VOYAGES_PER_RELIC = 7;

const STARWEAVER_IDS = new Set(STARWEAVER_ITEMS.map(item => item.id));

export function isStarweaver(id: string | null | undefined): boolean {
  return !!id && STARWEAVER_IDS.has(id);
}

export function starweaverItem(id: string | null | undefined): StarweaverItem | null {
  return id ? STARWEAVER_ITEMS.find(item => item.id === id) ?? null : null;
}
