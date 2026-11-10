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

export const STARWEAVER_ITEMS: readonly StarweaverItem[] = ROWS.map(([id, slot, tone, zh, en, fr, it, es], index) => ({
  id, slot, tone,
  seal: String(index + 1).padStart(2, "0"),
  country: "basic",
  /* Never sold; the database will not sell it either. */
  price: 0,
  names: { "traditional-chinese": zh, english: en, french: fr, italian: it, spanish: es },
}));

/** Every seventh word won brings one back. */
export const VOYAGES_PER_RELIC = 7;

const STARWEAVER_IDS = new Set(STARWEAVER_ITEMS.map(item => item.id));

export function isStarweaver(id: string | null | undefined): boolean {
  return !!id && STARWEAVER_IDS.has(id);
}

export function starweaverItem(id: string | null | undefined): StarweaverItem | null {
  return id ? STARWEAVER_ITEMS.find(item => item.id === id) ?? null : null;
}
