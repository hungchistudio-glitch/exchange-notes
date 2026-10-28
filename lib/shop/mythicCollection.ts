import type { ShopItem } from "./catalog";

/* =========================================================
   The Mythic Vault — 33 limited pieces (Chi, 2026-10-26)

   Found only in Yumi Wordvault's premium chest, the seventh word in a row,
   one a chest, never sold, and not among the 333 on the shelves. Each is
   drawn from classical mythology and legend: an attribute or a sacred
   object of the story, never a likeness of a god, and nothing a living
   faith holds sacred (Chi chose "古典神話與傳說"). Each is made in a
   colour and a material no shelf piece has: light running in marble,
   aurora in frost, gold under lapis.

   Ids are permanent. The database knows them as limited and unavailable
   (*_wordvault_chests_and_mythic_pieces.sql): they can be worn once owned
   and can never be bought. Built in lib/yumi3d/mythicOutfit.ts.
   ========================================================= */

export type MythOrigin = "greek" | "norse" | "egyptian" | "chinese" | "celtic" | "mesopotamian";

export type MythicItem = ShopItem & { origin: MythOrigin };

type Row = [id: string, slot: ShopItem["slot"], origin: MythOrigin, tone: string,
  zh: string, en: string, fr: string, it: string, es: string];

const ROWS: Row[] = [
  // Shell finishes
  ["myth-olympus-marble", "material", "greek", "#efe6d2", "奧林帕斯神諭大理石", "Olympian oracle marble", "Marbre de l’oracle d’Olympe", "Marmo dell’oracolo d’Olimpo", "Mármol del oráculo del Olimpo"],
  ["myth-bifrost-frost", "material", "norse", "#9fd7e8", "彩虹橋極光霜晶", "Bifröst aurora frost", "Givre aurore de Bifröst", "Brina aurora di Bifröst", "Escarcha aurora de Bifröst"],
  ["myth-nile-lapis", "material", "egyptian", "#24418f", "尼羅河金砂青金石", "Nile lapis with gold", "Lapis du Nil pailleté d’or", "Lapislazzuli del Nilo con oro", "Lapislázuli del Nilo con oro"],
  // Pupils
  ["myth-sun-disk", "pupil", "egyptian", "#f2b632", "太陽聖盤瞳", "Sun disk pupil", "Pupille disque solaire", "Pupilla disco solare", "Pupila disco solar"],
  ["myth-moon-rabbit", "pupil", "chinese", "#d9dcf2", "月宮玉兔瞳", "Moon rabbit pupil", "Pupille lapin de lune", "Pupilla coniglio lunare", "Pupila conejo de la luna"],
  // Irises
  ["myth-gorgon-jade", "iris", "greek", "#2f9b6c", "蛇髮女妖翡翠虹膜", "Gorgon jade iris", "Iris de jade de la Gorgone", "Iride di giada della Gorgone", "Iris de jade de la Gorgona"],
  ["myth-bifrost-iris", "iris", "norse", "#7cc6d9", "彩虹橋虹膜", "Bifröst bridge iris", "Iris du pont Bifröst", "Iride del ponte Bifröst", "Iris del puente Bifröst"],
  ["myth-ishtar-star", "iris", "mesopotamian", "#2a3f8a", "伊什塔爾八芒星虹膜", "Ishtar eight-point star iris", "Iris étoile d’Ishtar", "Iride stella di Ishtar", "Iris estrella de Ishtar"],
  // Eyewear
  ["myth-raven-monocle", "eyewear", "norse", "#2c2f3a", "奧丁雙鴉單片鏡", "Odin’s raven monocle", "Monocle aux corbeaux d’Odin", "Monocolo dei corvi di Odino", "Monóculo de los cuervos de Odín"],
  ["myth-horus-visor", "eyewear", "egyptian", "#c9a55a", "荷魯斯之眼護目鏡", "Eye of Horus visor", "Visière œil d’Horus", "Visiera occhio di Horus", "Visera ojo de Horus"],
  ["myth-owl-spectacles", "eyewear", "greek", "#b9c3cc", "雅典娜貓頭鷹眼鏡", "Athena’s owl spectacles", "Lunettes chouette d’Athéna", "Occhiali civetta di Atena", "Gafas lechuza de Atenea"],
  // Head
  ["myth-laurel-crown", "head", "greek", "#e6c35a", "阿波羅日光月桂冠", "Apollo’s sunlit laurel", "Laurier solaire d’Apollon", "Alloro solare di Apollo", "Laurel solar de Apolo"],
  ["myth-valkyrie-wings", "head", "norse", "#dfe7ee", "女武神羽翼冠", "Valkyrie wing circlet", "Diadème ailé de Valkyrie", "Diadema alato di Valchiria", "Diadema alado de valquiria"],
  ["myth-phoenix-crown", "head", "chinese", "#d6452f", "鳳凰金冠", "Phoenix crown", "Couronne du phénix", "Corona della fenice", "Corona del fénix"],
  // Neck
  ["myth-golden-fleece", "neck", "greek", "#e2b347", "金羊毛圍巾", "Golden Fleece scarf", "Écharpe de la Toison d’or", "Sciarpa del Vello d’oro", "Bufanda del Vellocino de Oro"],
  ["myth-selkie-shawl", "neck", "celtic", "#8d9aa6", "海豹仙子珍珠披肩", "Selkie pearl shawl", "Châle de selkie aux perles", "Scialle di selkie con perle", "Chal de selkie con perlas"],
  ["myth-nuwa-ribbon", "neck", "chinese", "#e86f8a", "女媧五色石彩帶", "Nüwa five-stone ribbon", "Ruban aux cinq pierres de Nüwa", "Nastro delle cinque pietre di Nüwa", "Cinta de las cinco piedras de Nüwa"],
  // Pins
  ["myth-scarab-pin", "pin", "egyptian", "#2e5bb8", "聖甲蟲金翼胸針", "Winged scarab pin", "Broche scarabée ailé", "Spilla scarabeo alato", "Broche escarabajo alado"],
  ["myth-triskele-pin", "pin", "celtic", "#3f9a6e", "凱爾特三螺旋胸針", "Celtic triskele pin", "Broche triskèle celte", "Spilla triscele celtica", "Broche trisquel celta"],
  ["myth-qilin-pin", "pin", "chinese", "#5fb39a", "麒麟玉胸針", "Qilin jade pin", "Broche qilin de jade", "Spilla qilin di giada", "Broche qilin de jade"],
  // Mouth
  ["myth-ambrosia-cup", "mouth", "greek", "#f0c75e", "眾神仙饌金杯", "Ambrosia cup", "Coupe d’ambroisie", "Coppa d’ambrosia", "Copa de ambrosía"],
  ["myth-immortal-peach", "mouth", "chinese", "#f29aa6", "瑤池蟠桃", "Peach of immortality", "Pêche d’immortalité", "Pesca dell’immortalità", "Melocotón de la inmortalidad"],
  // Charms
  ["myth-mjolnir", "charm", "norse", "#8fa6c2", "雷神之鎚", "Mjölnir charm", "Breloque Mjöllnir", "Ciondolo Mjölnir", "Colgante Mjölnir"],
  ["myth-pandora-jar", "charm", "greek", "#c98a5b", "潘朵拉之甕", "Pandora’s jar", "Jarre de Pandore", "Giara di Pandora", "Jarra de Pandora"],
  ["myth-destiny-tablet", "charm", "mesopotamian", "#b88a5a", "命運石板", "Tablet of Destinies", "Tablette des Destinées", "Tavoletta dei Destini", "Tablilla de los Destinos"],
  // Earrings
  ["myth-pegasus-feather", "earrings", "greek", "#f4f1ea", "天馬羽毛單耳環", "Pegasus feather earring", "Boucle plume de Pégase", "Orecchino piuma di Pegaso", "Pendiente pluma de Pegaso"],
  ["myth-dragon-pearl", "earrings", "chinese", "#ff8a3d", "火焰龍珠單耳環", "Flaming dragon pearl earring", "Boucle perle de dragon", "Orecchino perla del drago", "Pendiente perla de dragón"],
  ["myth-selene-tear", "earrings", "greek", "#c7d6ff", "月神之淚單耳環", "Selene’s moon tear earring", "Boucle larme de Séléné", "Orecchino lacrima di Selene", "Pendiente lágrima de Selene"],
  // Brow
  ["myth-hermes-wing", "brow", "greek", "#e8e2d4", "荷米斯飛翼眉環", "Hermes wing brow cuff", "Manchette ailée d’Hermès", "Polsino alato di Ermes", "Puño alado de Hermes"],
  ["myth-gungnir-cuff", "brow", "norse", "#9fb4c8", "永恆之槍眉環", "Gungnir spear brow cuff", "Manchette lance Gungnir", "Polsino lancia Gungnir", "Puño lanza Gungnir"],
  // Necklaces
  ["myth-brisingamen", "necklace", "norse", "#e39a2d", "芙蕾雅火焰項鍊", "Freyja’s Brísingamen", "Brísingamen de Freyja", "Brísingamen di Freyja", "Brísingamen de Freyja"],
  ["myth-lamassu-pendant", "necklace", "mesopotamian", "#c9a55a", "拉瑪蘇守護神獸墜鍊", "Lamassu guardian pendant", "Pendentif lamassu", "Ciondolo lamassu", "Colgante lamassu"],
  ["myth-ninetail-pendant", "necklace", "chinese", "#b9a3ff", "九尾狐月光墜鍊", "Nine-tailed fox pendant", "Pendentif renard à neuf queues", "Ciondolo volpe a nove code", "Colgante zorro de nueve colas"],
];

export const MYTHIC_ITEMS: readonly MythicItem[] = ROWS.map(([id, slot, origin, tone, zh, en, fr, it, es]) => ({
  id, slot, origin, tone,
  country: "basic",
  /* Never sold; the database will not sell it either. */
  price: 0,
  names: { "traditional-chinese": zh, english: en, french: fr, italian: it, spanish: es },
}));

const MYTHIC_IDS = new Set(MYTHIC_ITEMS.map(item => item.id));

export function isMythic(id: string | null | undefined): boolean {
  return !!id && MYTHIC_IDS.has(id);
}
