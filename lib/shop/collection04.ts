import type { ShopItem } from "./catalog";

/* =========================================================
   Station 33 · Collection 04 — the 333 expansion (113 pieces)

   58 for Orbital Atelier — world crafts, nature and everyday tools,
   "inspired by", never claimed as any culture’s own — and 55 for Deep
   Space Treasures: the solar system’s bodies and nine original worlds
   (Luma, Vesper, Thalassa, Aurelia, Nyx, Elysian, Umbra, Aether and the
   Prism world), every food and fusion among them invented.

   Ids are permanent (s33v4-orbital-…, s33v4-space-…); the collection a
   piece belongs to is part of its id, which is how the shop files it
   (collection03Presentation.ts). They belong to no country: country is
   "basic". Prices follow the tiers the same slot already uses — pupil 21,
   iris and pin 24, brow and mouth 30, earrings, eyewear and neck 36,
   necklace and charm 39, head 45, finish 66 — all in threes, and the
   database charges exactly these (*_yumi_shop_collection04.sql).
   Tones are the vivid swatch shown until a thumbnail loads.
   ========================================================= */

export const COLLECTION04_ITEMS: ShopItem[] = [
  {
    "id": "s33v4-orbital-zellige",
    "country": "basic",
    "slot": "earrings",
    "tone": "#20c2af",
    "names": {
      "traditional-chinese": "澤利格拼磚單耳環",
      "english": "Zellige tile earring",
      "french": "Boucle mosaïque zellige",
      "italian": "Orecchino mosaico zellige",
      "spanish": "Pendiente mosaico zellige"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-origami",
    "country": "basic",
    "slot": "earrings",
    "tone": "#e2af50",
    "names": {
      "traditional-chinese": "摺紙鶴翼單耳環",
      "english": "Folded crane-wing earring",
      "french": "Boucle aile de grue pliée",
      "italian": "Orecchino ala di gru piegata",
      "spanish": "Pendiente ala de grulla plegada"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-baobab",
    "country": "basic",
    "slot": "earrings",
    "tone": "#d57523",
    "names": {
      "traditional-chinese": "猴麵包樹果莢單耳環",
      "english": "Baobab pod earring",
      "french": "Boucle gousse de baobab",
      "italian": "Orecchino baccello di baobab",
      "spanish": "Pendiente vaina de baobab"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-papercut",
    "country": "basic",
    "slot": "earrings",
    "tone": "#da232c",
    "names": {
      "traditional-chinese": "剪紙剪影單耳環",
      "english": "Paper-cut silhouette earring",
      "french": "Boucle silhouette découpée",
      "italian": "Orecchino sagoma ritagliata",
      "spanish": "Pendiente silueta recortada"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-ammonite",
    "country": "basic",
    "slot": "earrings",
    "tone": "#e2ac50",
    "names": {
      "traditional-chinese": "菊石螺旋單耳環",
      "english": "Ammonite spiral earring",
      "french": "Boucle spirale ammonite",
      "italian": "Orecchino spirale ammonite",
      "spanish": "Pendiente espiral de amonita"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-kiln",
    "country": "basic",
    "slot": "earrings",
    "tone": "#df6d3b",
    "names": {
      "traditional-chinese": "窯火陶珠單耳環",
      "english": "Kiln bead earring",
      "french": "Boucle perle de four",
      "italian": "Orecchino perla di fornace",
      "spanish": "Pendiente cuenta de horno"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-coral",
    "country": "basic",
    "slot": "earrings",
    "tone": "#e26a50",
    "names": {
      "traditional-chinese": "潮間帶珊瑚單耳環",
      "english": "Tidal coral earring",
      "french": "Boucle corail des marées",
      "italian": "Orecchino corallo di marea",
      "spanish": "Pendiente coral de marea"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-calligraphy",
    "country": "basic",
    "slot": "earrings",
    "tone": "#1e5eb8",
    "names": {
      "traditional-chinese": "墨線筆勢單耳環",
      "english": "Ink gesture earring",
      "french": "Boucle geste d’encre",
      "italian": "Orecchino gesto d’inchiostro",
      "spanish": "Pendiente gesto de tinta"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-marimba",
    "country": "basic",
    "slot": "earrings",
    "tone": "#bd591f",
    "names": {
      "traditional-chinese": "木琴節拍單耳環",
      "english": "Marimba rhythm earring",
      "french": "Boucle rythme de marimba",
      "italian": "Orecchino ritmo di marimba",
      "spanish": "Pendiente ritmo de marimba"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-bridge",
    "country": "basic",
    "slot": "brow",
    "tone": "#e1ad47",
    "names": {
      "traditional-chinese": "懸索橋眉環",
      "english": "Suspension bridge brow cuff",
      "french": "Manchette de sourcil pont suspendu",
      "italian": "Anello sopracciglio ponte sospeso",
      "spanish": "Aro de ceja puente colgante"
    },
    "price": 30
  },
  {
    "id": "s33v4-orbital-bamboo",
    "country": "basic",
    "slot": "brow",
    "tone": "#7ede37",
    "names": {
      "traditional-chinese": "竹節鎖眉環",
      "english": "Bamboo joint brow cuff",
      "french": "Manchette de sourcil bambou",
      "italian": "Anello sopracciglio nodo di bambù",
      "spanish": "Aro de ceja nudo de bambú"
    },
    "price": 30
  },
  {
    "id": "s33v4-orbital-aqueduct",
    "country": "basic",
    "slot": "brow",
    "tone": "#e2ac50",
    "names": {
      "traditional-chinese": "水道拱眉環",
      "english": "Aqueduct brow cuff",
      "french": "Manchette de sourcil aqueduc",
      "italian": "Anello sopracciglio acquedotto",
      "spanish": "Aro de ceja acueducto"
    },
    "price": 30
  },
  {
    "id": "s33v4-orbital-letterpress",
    "country": "basic",
    "slot": "brow",
    "tone": "#2474da",
    "names": {
      "traditional-chinese": "活字格眉環",
      "english": "Letterpress brow cuff",
      "french": "Manchette de sourcil caractères",
      "italian": "Anello sopracciglio caratteri mobili",
      "spanish": "Aro de ceja tipos móviles"
    },
    "price": 30
  },
  {
    "id": "s33v4-orbital-wavecrest",
    "country": "basic",
    "slot": "brow",
    "tone": "#50c8e2",
    "names": {
      "traditional-chinese": "浪峰眉環",
      "english": "Wave crest brow cuff",
      "french": "Manchette de sourcil crête de vague",
      "italian": "Anello sopracciglio cresta d’onda",
      "spanish": "Aro de ceja cresta de ola"
    },
    "price": 30
  },
  {
    "id": "s33v4-orbital-weft",
    "country": "basic",
    "slot": "brow",
    "tone": "#e27e50",
    "names": {
      "traditional-chinese": "經緯扣眉環",
      "english": "Warp and weft brow cuff",
      "french": "Manchette de sourcil chaîne et trame",
      "italian": "Anello sopracciglio trama e ordito",
      "spanish": "Aro de ceja trama y urdimbre"
    },
    "price": 30
  },
  {
    "id": "s33v4-orbital-atlas",
    "country": "basic",
    "slot": "necklace",
    "tone": "#1ea5b8",
    "names": {
      "traditional-chinese": "書脊地圖項鍊",
      "english": "Atlas spine necklace",
      "french": "Collier dos d’atlas",
      "italian": "Collana dorso d’atlante",
      "spanish": "Collar lomo de atlas"
    },
    "price": 39
  },
  {
    "id": "s33v4-orbital-astrolabe",
    "country": "basic",
    "slot": "necklace",
    "tone": "#e0af3e",
    "names": {
      "traditional-chinese": "航海星盤項鍊",
      "english": "Mariner’s astrolabe necklace",
      "french": "Collier astrolabe marin",
      "italian": "Collana astrolabio nautico",
      "spanish": "Collar astrolabio marino"
    },
    "price": 39
  },
  {
    "id": "s33v4-orbital-terrace",
    "country": "basic",
    "slot": "necklace",
    "tone": "#25db2f",
    "names": {
      "traditional-chinese": "梯田等高項鍊",
      "english": "Terraced landscape necklace",
      "french": "Collier paysage en terrasses",
      "italian": "Collana paesaggio terrazzato",
      "spanish": "Collar paisaje en terrazas"
    },
    "price": 39
  },
  {
    "id": "s33v4-orbital-cacao",
    "country": "basic",
    "slot": "necklace",
    "tone": "#b84d1e",
    "names": {
      "traditional-chinese": "可可豆匣項鍊",
      "english": "Cacao pod locket",
      "french": "Médaillon cabosse de cacao",
      "italian": "Medaglione baccello di cacao",
      "spanish": "Medallón mazorca de cacao"
    },
    "price": 39
  },
  {
    "id": "s33v4-orbital-abacus",
    "country": "basic",
    "slot": "necklace",
    "tone": "#dc5625",
    "names": {
      "traditional-chinese": "算盤微光項鍊",
      "english": "Abacus necklace",
      "french": "Collier boulier",
      "italian": "Collana abaco",
      "spanish": "Collar ábaco"
    },
    "price": 39
  },
  {
    "id": "s33v4-orbital-desertwell",
    "country": "basic",
    "slot": "necklace",
    "tone": "#e2ad50",
    "names": {
      "traditional-chinese": "沙漠水井項鍊",
      "english": "Desert well necklace",
      "french": "Collier puits du désert",
      "italian": "Collana pozzo nel deserto",
      "spanish": "Collar pozo del desierto"
    },
    "price": 39
  },
  {
    "id": "s33v4-orbital-woven-canopy",
    "country": "basic",
    "slot": "head",
    "tone": "#e2ab50",
    "names": {
      "traditional-chinese": "竹編天幕帽",
      "english": "Woven canopy hat",
      "french": "Chapeau canopée tressée",
      "italian": "Cappello a baldacchino intrecciato",
      "spanish": "Sombrero dosel tejido"
    },
    "price": 45
  },
  {
    "id": "s33v4-orbital-observatory",
    "country": "basic",
    "slot": "head",
    "tone": "#2bddc7",
    "names": {
      "traditional-chinese": "觀測所穹頂帽",
      "english": "Observatory dome hat",
      "french": "Chapeau dôme d’observatoire",
      "italian": "Cappello cupola d’osservatorio",
      "spanish": "Sombrero cúpula de observatorio"
    },
    "price": 45
  },
  {
    "id": "s33v4-orbital-tulip",
    "country": "basic",
    "slot": "head",
    "tone": "#e2506b",
    "names": {
      "traditional-chinese": "鬱金香花苞帽",
      "english": "Tulip bud hat",
      "french": "Chapeau bouton de tulipe",
      "italian": "Cappello bocciolo di tulipano",
      "spanish": "Sombrero capullo de tulipán"
    },
    "price": 45
  },
  {
    "id": "s33v4-orbital-market-awning",
    "country": "basic",
    "slot": "head",
    "tone": "#e2a950",
    "names": {
      "traditional-chinese": "市集波紋簷帽",
      "english": "Market scallop hat",
      "french": "Chapeau auvent festonné",
      "italian": "Cappello tenda smerlata",
      "spanish": "Sombrero toldo festoneado"
    },
    "price": 45
  },
  {
    "id": "s33v4-orbital-felt-ridge",
    "country": "basic",
    "slot": "head",
    "tone": "#b8db24",
    "names": {
      "traditional-chinese": "山稜毛氈帽",
      "english": "Felt ridge hat",
      "french": "Chapeau feutre des crêtes",
      "italian": "Cappello di feltro a cresta",
      "spanish": "Sombrero de fieltro serrano"
    },
    "price": 45
  },
  {
    "id": "s33v4-orbital-shibori",
    "country": "basic",
    "slot": "neck",
    "tone": "#2160ca",
    "names": {
      "traditional-chinese": "靛染雲紋圍巾",
      "english": "Indigo resist-dye scarf",
      "french": "Foulard indigo à réserve",
      "italian": "Sciarpa indaco a riserva",
      "spanish": "Pañuelo índigo de reserva"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-andes",
    "country": "basic",
    "slot": "neck",
    "tone": "#df5f3a",
    "names": {
      "traditional-chinese": "山地色階披肩",
      "english": "Mountain stripe shawl",
      "french": "Châle rayures de montagne",
      "italian": "Scialle a righe di montagna",
      "spanish": "Chal de franjas de montaña"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-linen",
    "country": "basic",
    "slot": "neck",
    "tone": "#e2c450",
    "names": {
      "traditional-chinese": "亞麻海風領巾",
      "english": "Linen sea-breeze scarf",
      "french": "Foulard brise marine en lin",
      "italian": "Foulard brezza marina in lino",
      "spanish": "Pañuelo brisa marina de lino"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-pleated-paper",
    "country": "basic",
    "slot": "neck",
    "tone": "#e2a250",
    "names": {
      "traditional-chinese": "摺頁紙纖披肩",
      "english": "Pleated paper-fibre cape",
      "french": "Cape plissée en fibre de papier",
      "italian": "Mantellina plissettata in fibra di carta",
      "spanish": "Capa plisada de fibra de papel"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-seedbank",
    "country": "basic",
    "slot": "pin",
    "tone": "#b1e040",
    "names": {
      "traditional-chinese": "種子圖書館胸針",
      "english": "Seed library pin",
      "french": "Broche bibliothèque de graines",
      "italian": "Spilla biblioteca dei semi",
      "spanish": "Broche biblioteca de semillas"
    },
    "price": 24
  },
  {
    "id": "s33v4-orbital-tram",
    "country": "basic",
    "slot": "pin",
    "tone": "#dea135",
    "names": {
      "traditional-chinese": "城市電車胸針",
      "english": "City tram pin",
      "french": "Broche tramway urbain",
      "italian": "Spilla tram cittadino",
      "spanish": "Broche tranvía urbano"
    },
    "price": 24
  },
  {
    "id": "s33v4-orbital-tidepool",
    "country": "basic",
    "slot": "pin",
    "tone": "#40e0cd",
    "names": {
      "traditional-chinese": "潮池標本胸針",
      "english": "Tide-pool specimen pin",
      "french": "Broche spécimen de mare côtière",
      "italian": "Spilla campione di pozza marina",
      "spanish": "Broche muestra de poza costera"
    },
    "price": 24
  },
  {
    "id": "s33v4-orbital-postal-globe",
    "country": "basic",
    "slot": "pin",
    "tone": "#4992e1",
    "names": {
      "traditional-chinese": "世界郵路胸針",
      "english": "World postal route pin",
      "french": "Broche routes postales du monde",
      "italian": "Spilla rotte postali del mondo",
      "spanish": "Broche rutas postales del mundo"
    },
    "price": 24
  },
  {
    "id": "s33v4-orbital-matcha",
    "country": "basic",
    "slot": "mouth",
    "tone": "#8add2b",
    "names": {
      "traditional-chinese": "抹茶茶筅補給碗",
      "english": "Matcha bowl and whisk",
      "french": "Bol de matcha et fouet",
      "italian": "Ciotola matcha e frustino",
      "spanish": "Cuenco de matcha y batidor"
    },
    "price": 30
  },
  {
    "id": "s33v4-orbital-pretzel",
    "country": "basic",
    "slot": "mouth",
    "tone": "#d57c23",
    "names": {
      "traditional-chinese": "鹽花扭結麵包",
      "english": "Salted pretzel bite",
      "french": "Bretzel aux éclats de sel",
      "italian": "Brezel con fiocchi di sale",
      "spanish": "Bretzel con escamas de sal"
    },
    "price": 30
  },
  {
    "id": "s33v4-orbital-mango-lassi",
    "country": "basic",
    "slot": "mouth",
    "tone": "#e2b550",
    "names": {
      "traditional-chinese": "芒果優格補給杯",
      "english": "Mango lassi cup",
      "french": "Gobelet de lassi à la mangue",
      "italian": "Bicchiere di lassi al mango",
      "spanish": "Vaso de lassi de mango"
    },
    "price": 30
  },
  {
    "id": "s33v4-orbital-compass-case",
    "country": "basic",
    "slot": "charm",
    "tone": "#e2ae50",
    "names": {
      "traditional-chinese": "遠行羅盤匣吊飾",
      "english": "Travel compass case charm",
      "french": "Breloque étui de boussole",
      "italian": "Ciondolo custodia bussola",
      "spanish": "Colgante estuche de brújula"
    },
    "price": 39
  },
  {
    "id": "s33v4-orbital-teapot",
    "country": "basic",
    "slot": "charm",
    "tone": "#1e6fb8",
    "names": {
      "traditional-chinese": "鑄鐵茶壺吊飾",
      "english": "Cast-iron teapot charm",
      "french": "Breloque théière en fonte",
      "italian": "Ciondolo teiera in ghisa",
      "spanish": "Colgante tetera de hierro"
    },
    "price": 39
  },
  {
    "id": "s33v4-orbital-windtower",
    "country": "basic",
    "slot": "charm",
    "tone": "#e2aa50",
    "names": {
      "traditional-chinese": "風塔通風吊飾",
      "english": "Wind-tower charm",
      "french": "Breloque tour à vent",
      "italian": "Ciondolo torre del vento",
      "spanish": "Colgante torre de viento"
    },
    "price": 39
  },
  {
    "id": "s33v4-orbital-loupe",
    "country": "basic",
    "slot": "eyewear",
    "tone": "#e1a245",
    "names": {
      "traditional-chinese": "工匠雙層放大鏡",
      "english": "Artisan double loupe",
      "french": "Loupe double d’artisan",
      "italian": "Doppia lente da artigiano",
      "spanish": "Lupa doble de artesano"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-stainedglass",
    "country": "basic",
    "slot": "eyewear",
    "tone": "#45b8e1",
    "names": {
      "traditional-chinese": "彩窗光學鏡",
      "english": "Stained-glass optic",
      "french": "Optique vitrail",
      "italian": "Ottica a vetrata",
      "spanish": "Óptica de vidriera"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-snowgoggle",
    "country": "basic",
    "slot": "eyewear",
    "tone": "#e2ae50",
    "names": {
      "traditional-chinese": "雪地窄縫護目鏡",
      "english": "Snow-slit visor",
      "french": "Visière à fente de neige",
      "italian": "Visiera a fessura da neve",
      "spanish": "Visera de ranura para nieve"
    },
    "price": 36
  },
  {
    "id": "s33v4-orbital-tree-rings",
    "country": "basic",
    "slot": "iris",
    "tone": "#c77d20",
    "names": {
      "traditional-chinese": "年輪琥珀虹膜",
      "english": "Tree-ring amber iris",
      "french": "Iris ambre cernes du bois",
      "italian": "Iride ambra anelli del legno",
      "spanish": "Iris ámbar anillos de árbol"
    },
    "price": 24
  },
  {
    "id": "s33v4-orbital-mineral-cut",
    "country": "basic",
    "slot": "iris",
    "tone": "#3ee0aa",
    "names": {
      "traditional-chinese": "礦物切面虹膜",
      "english": "Mineral-cut iris",
      "french": "Iris facettes minérales",
      "italian": "Iride sfaccettatura minerale",
      "spanish": "Iris facetas minerales"
    },
    "price": 24
  },
  {
    "id": "s33v4-orbital-quill",
    "country": "basic",
    "slot": "pupil",
    "tone": "#1e8cb8",
    "names": {
      "traditional-chinese": "羽筆瞳",
      "english": "Quill pupil",
      "french": "Pupille plume",
      "italian": "Pupilla penna",
      "spanish": "Pupila pluma"
    },
    "price": 21
  },
  {
    "id": "s33v4-orbital-sashiko",
    "country": "basic",
    "slot": "material",
    "tone": "#1e61b8",
    "names": {
      "traditional-chinese": "靛藍刺子織殼",
      "english": "Indigo stitch shell",
      "french": "Corps indigo à points cousus",
      "italian": "Corpo indaco a punti cuciti",
      "spanish": "Cuerpo índigo de puntadas"
    },
    "price": 66
  },
  {
    "id": "s33v4-orbital-rammed-earth",
    "country": "basic",
    "slot": "material",
    "tone": "#e2914b",
    "names": {
      "traditional-chinese": "夯土層理",
      "english": "Rammed-earth strata",
      "french": "Strates de terre crue",
      "italian": "Strati di terra battuta",
      "spanish": "Estratos de tierra apisonada"
    },
    "price": 66
  },
  {
    "id": "s33v4-orbital-cork",
    "country": "basic",
    "slot": "material",
    "tone": "#e09b3e",
    "names": {
      "traditional-chinese": "軟木暖褐",
      "english": "Warm cork",
      "french": "Liège chaud",
      "italian": "Sughero caldo",
      "spanish": "Corcho cálido"
    },
    "price": 66
  },
  {
    "id": "s33v4-orbital-raku",
    "country": "basic",
    "slot": "material",
    "tone": "#b8631e",
    "names": {
      "traditional-chinese": "樂燒煙虹",
      "english": "Raku smoke sheen",
      "french": "Reflets fumés raku",
      "italian": "Riflessi fumé raku",
      "spanish": "Reflejos ahumados raku"
    },
    "price": 66
  },
  {
    "id": "s33v4-orbital-motherpearl",
    "country": "basic",
    "slot": "material",
    "tone": "#50e2c3",
    "names": {
      "traditional-chinese": "螺鈿月白",
      "english": "Inlaid mother-of-pearl",
      "french": "Nacre incrustée",
      "italian": "Madreperla intarsiata",
      "spanish": "Nácar incrustado"
    },
    "price": 66
  },
  {
    "id": "s33v4-orbital-hammered-brass",
    "country": "basic",
    "slot": "material",
    "tone": "#e0ab43",
    "names": {
      "traditional-chinese": "手鎚蜂蜜銅",
      "english": "Hammered honey brass",
      "french": "Laiton miel martelé",
      "italian": "Ottone miele martellato",
      "spanish": "Latón miel martillado"
    },
    "price": 66
  },
  {
    "id": "s33v4-orbital-glacier-granite",
    "country": "basic",
    "slot": "material",
    "tone": "#50bee2",
    "names": {
      "traditional-chinese": "冰河花崗",
      "english": "Glacial granite",
      "french": "Granit glaciaire",
      "italian": "Granito glaciale",
      "spanish": "Granito glaciar"
    },
    "price": 66
  },
  {
    "id": "s33v4-orbital-olivewood",
    "country": "basic",
    "slot": "material",
    "tone": "#e0a840",
    "names": {
      "traditional-chinese": "橄欖木旋紋",
      "english": "Olivewood grain",
      "french": "Veines de bois d’olivier",
      "italian": "Venature d’ulivo",
      "spanish": "Vetas de olivo"
    },
    "price": 66
  },
  {
    "id": "s33v4-orbital-salt-crystal",
    "country": "basic",
    "slot": "material",
    "tone": "#e27c50",
    "names": {
      "traditional-chinese": "鹽田乳晶",
      "english": "Salt-pan crystal",
      "french": "Cristal de saline",
      "italian": "Cristallo di salina",
      "spanish": "Cristal de salina"
    },
    "price": 66
  },
  {
    "id": "s33v4-orbital-moss-felt",
    "country": "basic",
    "slot": "material",
    "tone": "#6fd122",
    "names": {
      "traditional-chinese": "苔原毛氈",
      "english": "Moss felt",
      "french": "Feutre de mousse",
      "italian": "Feltro di muschio",
      "spanish": "Fieltro de musgo"
    },
    "price": 66
  },
  {
    "id": "s33v4-orbital-blueprint",
    "country": "basic",
    "slot": "material",
    "tone": "#1e64b8",
    "names": {
      "traditional-chinese": "工程藍曬",
      "english": "Blueprint ceramic",
      "french": "Céramique cyanotype",
      "italian": "Ceramica cianotipia",
      "spanish": "Cerámica cianotipia"
    },
    "price": 66
  },
  {
    "id": "s33v4-orbital-lacquer-leaf",
    "country": "basic",
    "slot": "material",
    "tone": "#b8751e",
    "names": {
      "traditional-chinese": "漆金落葉",
      "english": "Lacquered gold leaf",
      "french": "Laque aux feuilles d’or",
      "italian": "Lacca a foglie d’oro",
      "spanish": "Laca con hojas de oro"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-saturn",
    "country": "basic",
    "slot": "earrings",
    "tone": "#e2ac50",
    "names": {
      "traditional-chinese": "土星雙環單耳環",
      "english": "Saturn twin-ring earring",
      "french": "Boucle Saturne à double anneau",
      "italian": "Orecchino Saturno a doppio anello",
      "spanish": "Pendiente Saturno de doble anillo"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-mercury",
    "country": "basic",
    "slot": "earrings",
    "tone": "#50b1e2",
    "names": {
      "traditional-chinese": "水星日影單耳環",
      "english": "Mercury shadow earring",
      "french": "Boucle ombre de Mercure",
      "italian": "Orecchino ombra di Mercurio",
      "spanish": "Pendiente sombra de Mercurio"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-mars-dust",
    "country": "basic",
    "slot": "earrings",
    "tone": "#de6733",
    "names": {
      "traditional-chinese": "火星塵旋單耳環",
      "english": "Mars dust-whirl earring",
      "french": "Boucle tourbillon martien",
      "italian": "Orecchino vortice marziano",
      "spanish": "Pendiente remolino marciano"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-uranus",
    "country": "basic",
    "slot": "earrings",
    "tone": "#50e2d8",
    "names": {
      "traditional-chinese": "天王星橫軸單耳環",
      "english": "Uranus tilted-axis earring",
      "french": "Boucle axe incliné d’Uranus",
      "italian": "Orecchino asse inclinato di Urano",
      "spanish": "Pendiente eje inclinado de Urano"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-io",
    "country": "basic",
    "slot": "earrings",
    "tone": "#e2a44a",
    "names": {
      "traditional-chinese": "埃歐熔滴單耳環",
      "english": "Io lava-drop earring",
      "french": "Boucle goutte de lave d’Io",
      "italian": "Orecchino goccia lavica di Io",
      "spanish": "Pendiente gota de lava de Ío"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-luma",
    "country": "basic",
    "slot": "earrings",
    "tone": "#e2d950",
    "names": {
      "traditional-chinese": "露瑪光籽單耳環",
      "english": "Luma light-seed earring",
      "french": "Boucle graine lumineuse Luma",
      "italian": "Orecchino seme luminoso Luma",
      "spanish": "Pendiente semilla luminosa Luma"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-vesper",
    "country": "basic",
    "slot": "earrings",
    "tone": "#9b50e2",
    "names": {
      "traditional-chinese": "維斯珀暮晶單耳環",
      "english": "Vesper dusk-crystal earring",
      "french": "Boucle cristal crépusculaire Vesper",
      "italian": "Orecchino cristallo del crepuscolo Vesper",
      "spanish": "Pendiente cristal crepuscular Vesper"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-thalassa",
    "country": "basic",
    "slot": "earrings",
    "tone": "#44c4e0",
    "names": {
      "traditional-chinese": "塔拉薩潮珠單耳環",
      "english": "Thalassa tide-pearl earring",
      "french": "Boucle perle de marée Thalassa",
      "italian": "Orecchino perla di marea Thalassa",
      "spanish": "Pendiente perla de marea Thalassa"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-binary",
    "country": "basic",
    "slot": "brow",
    "tone": "#e2b350",
    "names": {
      "traditional-chinese": "雙日引力眉環",
      "english": "Binary-sun brow cuff",
      "french": "Manchette de sourcil soleils jumeaux",
      "italian": "Anello sopracciglio soli gemelli",
      "spanish": "Aro de ceja soles gemelos"
    },
    "price": 30
  },
  {
    "id": "s33v4-space-mars-bridge",
    "country": "basic",
    "slot": "brow",
    "tone": "#dd622e",
    "names": {
      "traditional-chinese": "火星峽谷眉環",
      "english": "Mars canyon brow cuff",
      "french": "Manchette de sourcil canyon martien",
      "italian": "Anello sopracciglio canyon marziano",
      "spanish": "Aro de ceja cañón marciano"
    },
    "price": 30
  },
  {
    "id": "s33v4-space-europa-seam",
    "country": "basic",
    "slot": "brow",
    "tone": "#50e2cc",
    "names": {
      "traditional-chinese": "歐羅巴冰縫眉環",
      "english": "Europa ice-seam brow cuff",
      "french": "Manchette de sourcil fissure d’Europe",
      "italian": "Anello sopracciglio crepa di Europa",
      "spanish": "Aro de ceja grieta de Europa"
    },
    "price": 30
  },
  {
    "id": "s33v4-space-magnetar",
    "country": "basic",
    "slot": "brow",
    "tone": "#247edb",
    "names": {
      "traditional-chinese": "磁星極點眉環",
      "english": "Magnetar pole brow cuff",
      "french": "Manchette de sourcil pôles de magnétar",
      "italian": "Anello sopracciglio poli di magnetar",
      "spanish": "Aro de ceja polos de magnetar"
    },
    "price": 30
  },
  {
    "id": "s33v4-space-aurelia",
    "country": "basic",
    "slot": "brow",
    "tone": "#e29c50",
    "names": {
      "traditional-chinese": "奧蕾莉亞晨環眉環",
      "english": "Aurelia dawn brow cuff",
      "french": "Manchette de sourcil aube d’Aurelia",
      "italian": "Anello sopracciglio alba di Aurelia",
      "spanish": "Aro de ceja amanecer de Aurelia"
    },
    "price": 30
  },
  {
    "id": "s33v4-space-europa",
    "country": "basic",
    "slot": "necklace",
    "tone": "#50e2dd",
    "names": {
      "traditional-chinese": "歐羅巴潮汐項鍊",
      "english": "Europa tide necklace",
      "french": "Collier marées d’Europe",
      "italian": "Collana maree di Europa",
      "spanish": "Collar mareas de Europa"
    },
    "price": 39
  },
  {
    "id": "s33v4-space-jupiter",
    "country": "basic",
    "slot": "necklace",
    "tone": "#e28850",
    "names": {
      "traditional-chinese": "木星風暴項鍊",
      "english": "Jupiter storm necklace",
      "french": "Collier tempête de Jupiter",
      "italian": "Collana tempesta di Giove",
      "spanish": "Collar tormenta de Júpiter"
    },
    "price": 39
  },
  {
    "id": "s33v4-space-lunar",
    "country": "basic",
    "slot": "necklace",
    "tone": "#50a5e2",
    "names": {
      "traditional-chinese": "月背地形項鍊",
      "english": "Lunar far-side necklace",
      "french": "Collier relief de la face cachée",
      "italian": "Collana rilievo del lato nascosto",
      "spanish": "Collar relieve de la cara oculta"
    },
    "price": 39
  },
  {
    "id": "s33v4-space-titan",
    "country": "basic",
    "slot": "necklace",
    "tone": "#df9d39",
    "names": {
      "traditional-chinese": "泰坦琥珀匣項鍊",
      "english": "Titan amber locket",
      "french": "Médaillon ambre de Titan",
      "italian": "Medaglione ambra di Titano",
      "spanish": "Medallón ámbar de Titán"
    },
    "price": 39
  },
  {
    "id": "s33v4-space-nyx",
    "country": "basic",
    "slot": "necklace",
    "tone": "#2052c4",
    "names": {
      "traditional-chinese": "倪克斯夜核項鍊",
      "english": "Nyx night-core necklace",
      "french": "Collier noyau nocturne Nyx",
      "italian": "Collana nucleo notturno Nyx",
      "spanish": "Collar núcleo nocturno Nyx"
    },
    "price": 39
  },
  {
    "id": "s33v4-space-confluence",
    "country": "basic",
    "slot": "necklace",
    "tone": "#e25450",
    "names": {
      "traditional-chinese": "雙星交匯項鍊",
      "english": "Planetary confluence necklace",
      "french": "Collier confluence planétaire",
      "italian": "Collana confluenza planetaria",
      "spanish": "Collar confluencia planetaria"
    },
    "price": 39
  },
  {
    "id": "s33v4-space-venus",
    "country": "basic",
    "slot": "head",
    "tone": "#e2b050",
    "names": {
      "traditional-chinese": "金星雲冠",
      "english": "Venus cloud crown",
      "french": "Couronne nuageuse de Vénus",
      "italian": "Corona di nubi di Venere",
      "spanish": "Corona de nubes de Venus"
    },
    "price": 45
  },
  {
    "id": "s33v4-space-neptune-sail",
    "country": "basic",
    "slot": "head",
    "tone": "#3f85e0",
    "names": {
      "traditional-chinese": "海王星風帆帽",
      "english": "Neptune wind-sail hat",
      "french": "Chapeau voile de Neptune",
      "italian": "Cappello vela di Nettuno",
      "spanish": "Sombrero vela de Neptuno"
    },
    "price": 45
  },
  {
    "id": "s33v4-space-ceres",
    "country": "basic",
    "slot": "head",
    "tone": "#e2e250",
    "names": {
      "traditional-chinese": "穀神星採集帽",
      "english": "Ceres gatherer cap",
      "french": "Casquette de collecte Cérès",
      "italian": "Berretto da raccolta Cerere",
      "spanish": "Gorra recolectora Ceres"
    },
    "price": 45
  },
  {
    "id": "s33v4-space-elysian",
    "country": "basic",
    "slot": "head",
    "tone": "#50e27f",
    "names": {
      "traditional-chinese": "艾莉森晶芽冠",
      "english": "Elysian crystal-sprout crown",
      "french": "Couronne de pousses cristallines Elysian",
      "italian": "Corona di germogli cristallini Elysian",
      "spanish": "Corona de brotes cristalinos Elysian"
    },
    "price": 45
  },
  {
    "id": "s33v4-space-saturn-ribbon",
    "country": "basic",
    "slot": "neck",
    "tone": "#e2ae50",
    "names": {
      "traditional-chinese": "土星環帶披肩",
      "english": "Saturn ring-ribbon cape",
      "french": "Cape rubans des anneaux de Saturne",
      "italian": "Mantellina a nastri degli anelli di Saturno",
      "spanish": "Capa de cintas de los anillos de Saturno"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-aurora",
    "country": "basic",
    "slot": "neck",
    "tone": "#50d8e2",
    "names": {
      "traditional-chinese": "極光波褶領巾",
      "english": "Aurora wave scarf",
      "french": "Foulard ondulations d’aurore",
      "italian": "Foulard onde aurorali",
      "spanish": "Pañuelo ondas aurorales"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-comet",
    "country": "basic",
    "slot": "neck",
    "tone": "#509be2",
    "names": {
      "traditional-chinese": "彗尾纖維圍巾",
      "english": "Comet-tail fibre scarf",
      "french": "Écharpe fibres de queue cométaire",
      "italian": "Sciarpa fibre di coda cometaria",
      "spanish": "Bufanda fibras de cola cometaria"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-pluto",
    "country": "basic",
    "slot": "pin",
    "tone": "#e29550",
    "names": {
      "traditional-chinese": "冥王星心原胸針",
      "english": "Pluto heartland pin",
      "french": "Broche plaine en cœur de Pluton",
      "italian": "Spilla pianura a cuore di Plutone",
      "spanish": "Broche llanura corazón de Plutón"
    },
    "price": 24
  },
  {
    "id": "s33v4-space-enceladus",
    "country": "basic",
    "slot": "pin",
    "tone": "#50cde2",
    "names": {
      "traditional-chinese": "恩克拉多斯噴泉胸針",
      "english": "Enceladus plume pin",
      "french": "Broche panache d’Encelade",
      "italian": "Spilla pennacchio di Encelado",
      "spanish": "Broche penacho de Encélado"
    },
    "price": 24
  },
  {
    "id": "s33v4-space-kepler-window",
    "country": "basic",
    "slot": "pin",
    "tone": "#e0ab40",
    "names": {
      "traditional-chinese": "遠日觀測窗胸針",
      "english": "Distant-sun window pin",
      "french": "Broche fenêtre vers un soleil lointain",
      "italian": "Spilla finestra sul sole lontano",
      "spanish": "Broche ventana al sol lejano"
    },
    "price": 24
  },
  {
    "id": "s33v4-space-umbra",
    "country": "basic",
    "slot": "pin",
    "tone": "#b8731e",
    "names": {
      "traditional-chinese": "翁布拉食環胸針",
      "english": "Umbra eclipse pin",
      "french": "Broche éclipse Umbra",
      "italian": "Spilla eclissi Umbra",
      "spanish": "Broche eclipse Umbra"
    },
    "price": 24
  },
  {
    "id": "s33v4-space-mars-ration",
    "country": "basic",
    "slot": "mouth",
    "tone": "#de4532",
    "names": {
      "traditional-chinese": "火星紅莓補給",
      "english": "Mars red-berry ration",
      "french": "Ration de baies rouges de Mars",
      "italian": "Razione di bacche rosse di Marte",
      "spanish": "Ración de bayas rojas de Marte"
    },
    "price": 30
  },
  {
    "id": "s33v4-space-luma-nectar",
    "country": "basic",
    "slot": "mouth",
    "tone": "#dfe250",
    "names": {
      "traditional-chinese": "露瑪花蜜瓶",
      "english": "Luma nectar flask",
      "french": "Flacon de nectar Luma",
      "italian": "Fiaschetta nettare Luma",
      "spanish": "Frasco de néctar Luma"
    },
    "price": 30
  },
  {
    "id": "s33v4-space-titan-cocoa",
    "country": "basic",
    "slot": "mouth",
    "tone": "#de8132",
    "names": {
      "traditional-chinese": "泰坦暖可可杯",
      "english": "Titan cocoa cup",
      "french": "Tasse de cacao Titan",
      "italian": "Tazza cacao Titano",
      "spanish": "Taza de cacao Titán"
    },
    "price": 30
  },
  {
    "id": "s33v4-space-voyager-seed",
    "country": "basic",
    "slot": "charm",
    "tone": "#50e268",
    "names": {
      "traditional-chinese": "遠航種子艙吊飾",
      "english": "Voyager seed-pod charm",
      "french": "Breloque capsule de graines voyageuse",
      "italian": "Ciondolo capsula di semi viaggiatrice",
      "spanish": "Colgante cápsula viajera de semillas"
    },
    "price": 39
  },
  {
    "id": "s33v4-space-phobos",
    "country": "basic",
    "slot": "charm",
    "tone": "#dc8926",
    "names": {
      "traditional-chinese": "福波斯岩匣吊飾",
      "english": "Phobos rock-case charm",
      "french": "Breloque écrin rocheux Phobos",
      "italian": "Ciondolo scrigno roccioso Phobos",
      "spanish": "Colgante estuche rocoso Fobos"
    },
    "price": 39
  },
  {
    "id": "s33v4-space-triton",
    "country": "basic",
    "slot": "charm",
    "tone": "#50b5e2",
    "names": {
      "traditional-chinese": "崔頓冰針吊飾",
      "english": "Triton ice-spire charm",
      "french": "Breloque flèche de glace Triton",
      "italian": "Ciondolo guglia di ghiaccio Tritone",
      "spanish": "Colgante aguja de hielo Tritón"
    },
    "price": 39
  },
  {
    "id": "s33v4-space-aether",
    "country": "basic",
    "slot": "charm",
    "tone": "#6850e2",
    "names": {
      "traditional-chinese": "以太風鈴吊飾",
      "english": "Aether wind-chime charm",
      "french": "Breloque carillon Aether",
      "italian": "Ciondolo campana eolica Aether",
      "spanish": "Colgante carillón Aether"
    },
    "price": 39
  },
  {
    "id": "s33v4-space-mercury-shield",
    "country": "basic",
    "slot": "eyewear",
    "tone": "#dfa53a",
    "names": {
      "traditional-chinese": "水星遮陽鏡",
      "english": "Mercury sun-shield optic",
      "french": "Optique pare-soleil Mercure",
      "italian": "Ottica parasole Mercurio",
      "spanish": "Óptica parasol Mercurio"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-neptune-depth",
    "country": "basic",
    "slot": "eyewear",
    "tone": "#227bd4",
    "names": {
      "traditional-chinese": "海王星深測鏡",
      "english": "Neptune depth optic",
      "french": "Optique de profondeur Neptune",
      "italian": "Ottica di profondità Nettuno",
      "spanish": "Óptica de profundidad Neptuno"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-prism-world",
    "country": "basic",
    "slot": "eyewear",
    "tone": "#5067e2",
    "names": {
      "traditional-chinese": "稜鏡星光學鏡",
      "english": "Prism-world optic",
      "french": "Optique du monde prisme",
      "italian": "Ottica del mondo prisma",
      "spanish": "Óptica del mundo prisma"
    },
    "price": 36
  },
  {
    "id": "s33v4-space-jovian-bands",
    "country": "basic",
    "slot": "iris",
    "tone": "#e28e50",
    "names": {
      "traditional-chinese": "木星流帶虹膜",
      "english": "Jovian band iris",
      "french": "Iris bandes joviennes",
      "italian": "Iride bande gioviane",
      "spanish": "Iris bandas jovianas"
    },
    "price": 24
  },
  {
    "id": "s33v4-space-aurora-ocean",
    "country": "basic",
    "slot": "iris",
    "tone": "#48cce1",
    "names": {
      "traditional-chinese": "極光海虹膜",
      "english": "Aurora-ocean iris",
      "french": "Iris océan d’aurore",
      "italian": "Iride oceano aurorale",
      "spanish": "Iris océano auroral"
    },
    "price": 24
  },
  {
    "id": "s33v4-space-eclipse",
    "country": "basic",
    "slot": "pupil",
    "tone": "#1e58b8",
    "names": {
      "traditional-chinese": "日食缺口瞳",
      "english": "Eclipse-notch pupil",
      "french": "Pupille éclipse échancrée",
      "italian": "Pupilla eclissi intagliata",
      "spanish": "Pupila eclipse recortada"
    },
    "price": 21
  },
  {
    "id": "s33v4-space-neptune-ice",
    "country": "basic",
    "slot": "material",
    "tone": "#46abe1",
    "names": {
      "traditional-chinese": "海王星冰藍琉璃",
      "english": "Neptune ice-blue glass",
      "french": "Verre bleu glacé Neptune",
      "italian": "Vetro azzurro glaciale Nettuno",
      "spanish": "Vidrio azul hielo Neptuno"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-mercury-metal",
    "country": "basic",
    "slot": "material",
    "tone": "#50e2e2",
    "names": {
      "traditional-chinese": "水星撞紋鈦",
      "english": "Mercury crater titanium",
      "french": "Titane cratérisé Mercure",
      "italian": "Titanio craterizzato Mercurio",
      "spanish": "Titanio craterizado Mercurio"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-venus-opal",
    "country": "basic",
    "slot": "material",
    "tone": "#e2bb50",
    "names": {
      "traditional-chinese": "金星乳金釉",
      "english": "Venus creamy-gold glaze",
      "french": "Glaçure or crémeux Vénus",
      "italian": "Smalto oro cremoso Venere",
      "spanish": "Esmalte oro cremoso Venus"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-mars-ceramic",
    "country": "basic",
    "slot": "material",
    "tone": "#dd5a2e",
    "names": {
      "traditional-chinese": "火星赤陶",
      "english": "Mars red ceramic",
      "french": "Céramique rouge Mars",
      "italian": "Ceramica rossa Marte",
      "spanish": "Cerámica roja Marte"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-jupiter-marble",
    "country": "basic",
    "slot": "material",
    "tone": "#e29450",
    "names": {
      "traditional-chinese": "木星風帶石",
      "english": "Jupiter banded stone",
      "french": "Pierre rubanée Jupiter",
      "italian": "Pietra a bande Giove",
      "spanish": "Piedra bandeada Júpiter"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-saturn-satin",
    "country": "basic",
    "slot": "material",
    "tone": "#e2b350",
    "names": {
      "traditional-chinese": "土星香檳緞",
      "english": "Saturn champagne satin",
      "french": "Satin champagne Saturne",
      "italian": "Raso champagne Saturno",
      "spanish": "Satén champán Saturno"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-uranus-frost",
    "country": "basic",
    "slot": "material",
    "tone": "#50e2d8",
    "names": {
      "traditional-chinese": "天王星青霜",
      "english": "Uranus cyan frost",
      "french": "Givre cyan Uranus",
      "italian": "Brina ciano Urano",
      "spanish": "Escarcha cian Urano"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-europa-mars",
    "country": "basic",
    "slot": "material",
    "tone": "#e28150",
    "names": {
      "traditional-chinese": "冰海赤脈複合殼",
      "english": "Ice-ocean red-vein composite",
      "french": "Composite océan glacé veines rouges",
      "italian": "Composito oceano ghiacciato venature rosse",
      "spanish": "Compuesto océano helado vetas rojas"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-titan-nyx",
    "country": "basic",
    "slot": "material",
    "tone": "#c27220",
    "names": {
      "traditional-chinese": "琥珀夜核複合殼",
      "english": "Amber night-core composite",
      "french": "Composite ambre et noyau nocturne",
      "italian": "Composito ambra e nucleo notturno",
      "spanish": "Compuesto ámbar y núcleo nocturno"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-luma-porcelain",
    "country": "basic",
    "slot": "material",
    "tone": "#e2da50",
    "names": {
      "traditional-chinese": "露瑪花光瓷",
      "english": "Luma bloom porcelain",
      "french": "Porcelaine florale Luma",
      "italian": "Porcellana fiorita Luma",
      "spanish": "Porcelana floral Luma"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-vesper-prism",
    "country": "basic",
    "slot": "material",
    "tone": "#a950e2",
    "names": {
      "traditional-chinese": "維斯珀暮虹晶",
      "english": "Vesper dusk-prism crystal",
      "french": "Cristal prisme crépusculaire Vesper",
      "italian": "Cristallo prisma del crepuscolo Vesper",
      "spanish": "Cristal prisma crepuscular Vesper"
    },
    "price": 66
  },
  {
    "id": "s33v4-space-thalassa-brass",
    "country": "basic",
    "slot": "material",
    "tone": "#23d9c4",
    "names": {
      "traditional-chinese": "潮海古銅複合殼",
      "english": "Tidal sea-bronze composite",
      "french": "Composite mer et bronze ancien",
      "italian": "Composito mare e bronzo antico",
      "spanish": "Compuesto mar y bronce antiguo"
    },
    "price": 66
  }
];

export const isCollection04Orbital = (id: string) => id.startsWith("s33v4-orbital-");
export const isCollection04Space = (id: string) => id.startsWith("s33v4-space-");
