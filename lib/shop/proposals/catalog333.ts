import type { InterfaceLanguage } from "@/lib/appPreferences";
import type { ShopSlot } from "../catalog";
/** Design proposals only. Never added to SHOP_ITEMS, ownership or purchase APIs. */
export type Proposal333 = { id: string; collection: "orbital" | "space"; slot: ShopSlot; names: Record<InterfaceLanguage, string>; brief: string; tone: string; price: number; prototype: boolean };
export const PROPOSALS_333: readonly Proposal333[] = [
  {
    "id": "p333-orbital-zellige",
    "collection": "orbital",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "澤利格拼磚單耳環",
      "english": "Zellige tile earring",
      "french": "Boucle mosaïque zellige",
      "italian": "Orecchino mosaico zellige",
      "spanish": "Pendiente mosaico zellige"
    },
    "brief": "摩洛哥拼磚啟發；八角外框內嵌四塊青綠陶片，背面有黃銅托座。",
    "tone": "#479b91",
    "price": 36,
    "prototype": true
  },
  {
    "id": "p333-orbital-origami",
    "collection": "orbital",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "摺紙鶴翼單耳環",
      "english": "Folded crane-wing earring",
      "french": "Boucle aile de grue pliée",
      "italian": "Orecchino ala di gru piegata",
      "spanish": "Pendiente ala de grulla plegada"
    },
    "brief": "日本摺紙啟發；不對稱折翼以薄實體金屬構成，側面看得到摺脊。",
    "tone": "#e4d4b6",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-baobab",
    "collection": "orbital",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "猴麵包樹果莢單耳環",
      "english": "Baobab pod earring",
      "french": "Boucle gousse de baobab",
      "italian": "Orecchino baccello di baobab",
      "spanish": "Pendiente vaina de baobab"
    },
    "brief": "非洲樹木啟發；長卵形果莢、木紋外殼與琺瑯剖面。",
    "tone": "#ac784c",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-papercut",
    "collection": "orbital",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "剪紙剪影單耳環",
      "english": "Paper-cut silhouette earring",
      "french": "Boucle silhouette découpée",
      "italian": "Orecchino sagoma ritagliata",
      "spanish": "Pendiente silueta recortada"
    },
    "brief": "剪紙工藝啟發；紅色鏤空枝葉嵌入圓框，不使用平面貼圖代替輪廓。",
    "tone": "#bb4248",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-ammonite",
    "collection": "orbital",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "菊石螺旋單耳環",
      "english": "Ammonite spiral earring",
      "french": "Boucle spirale ammonite",
      "italian": "Orecchino spirale ammonite",
      "spanish": "Pendiente espiral de amonita"
    },
    "brief": "化石博物館啟發；分節螺旋殼體與霧面石灰色背殼。",
    "tone": "#c4b293",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-kiln",
    "collection": "orbital",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "窯火陶珠單耳環",
      "english": "Kiln bead earring",
      "french": "Boucle perle de four",
      "italian": "Orecchino perla di fornace",
      "spanish": "Pendiente cuenta de horno"
    },
    "brief": "陶藝啟發；三段不等徑陶珠，釉色從焦橙到乳白漸變。",
    "tone": "#c87652",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-coral",
    "collection": "orbital",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "潮間帶珊瑚單耳環",
      "english": "Tidal coral earring",
      "french": "Boucle corail des marées",
      "italian": "Orecchino corallo di marea",
      "spanish": "Pendiente coral de marea"
    },
    "brief": "海洋觀察啟發；以陶瓷製作抽象分枝，不採用真實珊瑚材質。",
    "tone": "#e79a89",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-calligraphy",
    "collection": "orbital",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "墨線筆勢單耳環",
      "english": "Ink gesture earring",
      "french": "Boucle geste d’encre",
      "italian": "Orecchino gesto d’inchiostro",
      "spanish": "Pendiente gesto de tinta"
    },
    "brief": "書寫啟發；黑色漆面帶由細至粗迴旋，末端留一點金色筆鋒。",
    "tone": "#262b32",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-marimba",
    "collection": "orbital",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "木琴節拍單耳環",
      "english": "Marimba rhythm earring",
      "french": "Boucle rythme de marimba",
      "italian": "Orecchino ritmo di marimba",
      "spanish": "Pendiente ritmo de marimba"
    },
    "brief": "樂器工坊啟發；三支長短木片懸在橫桿上，背面保留連接軸。",
    "tone": "#986344",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-bridge",
    "collection": "orbital",
    "slot": "brow",
    "names": {
      "traditional-chinese": "懸索橋眉環",
      "english": "Suspension bridge brow cuff",
      "french": "Manchette de sourcil pont suspendu",
      "italian": "Anello sopracciglio ponte sospeso",
      "spanish": "Aro de ceja puente colgante"
    },
    "brief": "橋梁工程啟發；兩座微型橋塔、弧形纜索與六根拉桿連接在殼環夾座。",
    "tone": "#bca16c",
    "price": 30,
    "prototype": true
  },
  {
    "id": "p333-orbital-bamboo",
    "collection": "orbital",
    "slot": "brow",
    "names": {
      "traditional-chinese": "竹節鎖眉環",
      "english": "Bamboo joint brow cuff",
      "french": "Manchette de sourcil bambou",
      "italian": "Anello sopracciglio nodo di bambù",
      "spanish": "Aro de ceja nudo de bambú"
    },
    "brief": "竹工藝啟發；短竹節的圓柱與節痕，內圈使用黃銅固定。",
    "tone": "#87a273",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-orbital-aqueduct",
    "collection": "orbital",
    "slot": "brow",
    "names": {
      "traditional-chinese": "水道拱眉環",
      "english": "Aqueduct brow cuff",
      "french": "Manchette de sourcil aqueduc",
      "italian": "Anello sopracciglio acquedotto",
      "spanish": "Aro de ceja acueducto"
    },
    "brief": "公共建築啟發；三座大小遞減的石色拱門，背面金屬梁。",
    "tone": "#d8c7aa",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-orbital-letterpress",
    "collection": "orbital",
    "slot": "brow",
    "names": {
      "traditional-chinese": "活字格眉環",
      "english": "Letterpress brow cuff",
      "french": "Manchette de sourcil caractères",
      "italian": "Anello sopracciglio caratteri mobili",
      "spanish": "Aro de ceja tipos móviles"
    },
    "brief": "印刷工坊啟發；三枚浮雕幾何字模，不綁定介面語言或國旗。",
    "tone": "#777e87",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-orbital-wavecrest",
    "collection": "orbital",
    "slot": "brow",
    "names": {
      "traditional-chinese": "浪峰眉環",
      "english": "Wave crest brow cuff",
      "french": "Manchette de sourcil crête de vague",
      "italian": "Anello sopracciglio cresta d’onda",
      "spanish": "Aro de ceja cresta de ola"
    },
    "brief": "海浪啟發；三條高度不同的銀藍曲線，兩端嵌入固定座。",
    "tone": "#82b4bf",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-orbital-weft",
    "collection": "orbital",
    "slot": "brow",
    "names": {
      "traditional-chinese": "經緯扣眉環",
      "english": "Warp and weft brow cuff",
      "french": "Manchette de sourcil chaîne et trame",
      "italian": "Anello sopracciglio trama e ordito",
      "spanish": "Aro de ceja trama y urdimbre"
    },
    "brief": "紡織工坊啟發；交錯金屬帶形成真正穿插的編織結構。",
    "tone": "#bd907b",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-orbital-atlas",
    "collection": "orbital",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "書脊地圖項鍊",
      "english": "Atlas spine necklace",
      "french": "Collier dos d’atlas",
      "italian": "Collana dorso d’atlante",
      "spanish": "Collar lomo de atlas"
    },
    "brief": "裝幀與旅行啟發；微型開本有分層書頁、藍綠書封與中央黃銅書脊。",
    "tone": "#477f87",
    "price": 39,
    "prototype": true
  },
  {
    "id": "p333-orbital-astrolabe",
    "collection": "orbital",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "航海星盤項鍊",
      "english": "Mariner’s astrolabe necklace",
      "french": "Collier astrolabe marin",
      "italian": "Collana astrolabio nautico",
      "spanish": "Collar astrolabio marino"
    },
    "brief": "航海儀器啟發；可見厚度的同心環與橫向指針，背面刻度。",
    "tone": "#bfa25e",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-orbital-terrace",
    "collection": "orbital",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "梯田等高項鍊",
      "english": "Terraced landscape necklace",
      "french": "Collier paysage en terrasses",
      "italian": "Collana paesaggio terrazzato",
      "spanish": "Collar paisaje en terrazas"
    },
    "brief": "農耕地景啟發；五層高低不同的綠釉等高線包覆圓章。",
    "tone": "#6e9270",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-orbital-cacao",
    "collection": "orbital",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "可可豆匣項鍊",
      "english": "Cacao pod locket",
      "french": "Médaillon cabosse de cacao",
      "italian": "Medaglione baccello di cacao",
      "spanish": "Medallón mazorca de cacao"
    },
    "brief": "食物與植物啟發；橢圓豆莢分瓣外殼，接縫與小鉸鏈清楚可見。",
    "tone": "#8b563f",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-orbital-abacus",
    "collection": "orbital",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "算盤微光項鍊",
      "english": "Abacus necklace",
      "french": "Collier boulier",
      "italian": "Collana abaco",
      "spanish": "Collar ábaco"
    },
    "brief": "計算工具啟發；黃銅小框穿三根軸，每根有可辨識立體珠。",
    "tone": "#b3694e",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-orbital-desertwell",
    "collection": "orbital",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "沙漠水井項鍊",
      "english": "Desert well necklace",
      "french": "Collier puits du désert",
      "italian": "Collana pozzo nel deserto",
      "spanish": "Collar pozo del desierto"
    },
    "brief": "水與聚落啟發；砂岩環形井口內藏一點藍釉水面。",
    "tone": "#d4b785",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-orbital-woven-canopy",
    "collection": "orbital",
    "slot": "head",
    "names": {
      "traditional-chinese": "竹編天幕帽",
      "english": "Woven canopy hat",
      "french": "Chapeau canopée tressée",
      "italian": "Cappello a baldacchino intrecciato",
      "spanish": "Sombrero dosel tejido"
    },
    "brief": "竹編工藝啟發；圓頂由交叉竹肋與環向編帶構成，留出真正透空。",
    "tone": "#c6a56e",
    "price": 45,
    "prototype": true
  },
  {
    "id": "p333-orbital-observatory",
    "collection": "orbital",
    "slot": "head",
    "names": {
      "traditional-chinese": "觀測所穹頂帽",
      "english": "Observatory dome hat",
      "french": "Chapeau dôme d’observatoire",
      "italian": "Cappello cupola d’osservatorio",
      "spanish": "Sombrero cúpula de observatorio"
    },
    "brief": "科學建築啟發；銅色半球留窄觀測槽，槽口有兩片滑動板造型。",
    "tone": "#6f9994",
    "price": 45,
    "prototype": false
  },
  {
    "id": "p333-orbital-tulip",
    "collection": "orbital",
    "slot": "head",
    "names": {
      "traditional-chinese": "鬱金香花苞帽",
      "english": "Tulip bud hat",
      "french": "Chapeau bouton de tulipe",
      "italian": "Cappello bocciolo di tulipano",
      "spanish": "Sombrero capullo de tulipán"
    },
    "brief": "植物園啟發；五片厚薄漸變的花瓣抱合成柔和帽冠。",
    "tone": "#c97e8c",
    "price": 45,
    "prototype": false
  },
  {
    "id": "p333-orbital-market-awning",
    "collection": "orbital",
    "slot": "head",
    "names": {
      "traditional-chinese": "市集波紋簷帽",
      "english": "Market scallop hat",
      "french": "Chapeau auvent festonné",
      "italian": "Cappello tenda smerlata",
      "spanish": "Sombrero toldo festoneado"
    },
    "brief": "街市遮棚啟發；圓形波浪帽簷與細條紋布冠，不重複既有摺棚形。",
    "tone": "#d1af7a",
    "price": 45,
    "prototype": false
  },
  {
    "id": "p333-orbital-felt-ridge",
    "collection": "orbital",
    "slot": "head",
    "names": {
      "traditional-chinese": "山稜毛氈帽",
      "english": "Felt ridge hat",
      "french": "Chapeau feutre des crêtes",
      "italian": "Cappello di feltro a cresta",
      "spanish": "Sombrero de fieltro serrano"
    },
    "brief": "高山旅行啟發；偏斜折線帽頂與雙層軟簷，使用低光澤毛氈。",
    "tone": "#868a75",
    "price": 45,
    "prototype": false
  },
  {
    "id": "p333-orbital-shibori",
    "collection": "orbital",
    "slot": "neck",
    "names": {
      "traditional-chinese": "靛染雲紋圍巾",
      "english": "Indigo resist-dye scarf",
      "french": "Foulard indigo à réserve",
      "italian": "Sciarpa indaco a riserva",
      "spanish": "Pañuelo índigo de reserva"
    },
    "brief": "防染工藝啟發；靛藍環領配乳白圓暈與有厚度的垂尾。",
    "tone": "#506c9b",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-andes",
    "collection": "orbital",
    "slot": "neck",
    "names": {
      "traditional-chinese": "山地色階披肩",
      "english": "Mountain stripe shawl",
      "french": "Châle rayures de montagne",
      "italian": "Scialle a righe di montagna",
      "spanish": "Chal de franjas de montaña"
    },
    "brief": "安地斯山地色彩啟發；使用原創暖色條紋，避免複製特定族群圖騰。",
    "tone": "#bc725d",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-linen",
    "collection": "orbital",
    "slot": "neck",
    "names": {
      "traditional-chinese": "亞麻海風領巾",
      "english": "Linen sea-breeze scarf",
      "french": "Foulard brise marine en lin",
      "italian": "Foulard brezza marina in lino",
      "spanish": "Pañuelo brisa marina de lino"
    },
    "brief": "海岸生活啟發；米白亞麻領帶配細藍縫線與小木扣。",
    "tone": "#d7d0b5",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-pleated-paper",
    "collection": "orbital",
    "slot": "neck",
    "names": {
      "traditional-chinese": "摺頁紙纖披肩",
      "english": "Pleated paper-fibre cape",
      "french": "Cape plissée en fibre de papier",
      "italian": "Mantellina plissettata in fibra di carta",
      "spanish": "Capa plisada de fibra de papel"
    },
    "brief": "紙藝啟發；扇形折面向下展開，內層有連續領圈。",
    "tone": "#d1c3b1",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-seedbank",
    "collection": "orbital",
    "slot": "pin",
    "names": {
      "traditional-chinese": "種子圖書館胸針",
      "english": "Seed library pin",
      "french": "Broche bibliothèque de graines",
      "italian": "Spilla biblioteca dei semi",
      "spanish": "Broche biblioteca de semillas"
    },
    "brief": "種子保存啟發；透明感小匣分三格，各有不同種子幾何。",
    "tone": "#9aa878",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-orbital-tram",
    "collection": "orbital",
    "slot": "pin",
    "names": {
      "traditional-chinese": "城市電車胸針",
      "english": "City tram pin",
      "french": "Broche tramway urbain",
      "italian": "Spilla tram cittadino",
      "spanish": "Broche tranvía urbano"
    },
    "brief": "公共交通啟發；側面窗格、輪軸與車頂集電桿都有厚度。",
    "tone": "#bd9856",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-orbital-tidepool",
    "collection": "orbital",
    "slot": "pin",
    "names": {
      "traditional-chinese": "潮池標本胸針",
      "english": "Tide-pool specimen pin",
      "french": "Broche spécimen de mare côtière",
      "italian": "Spilla campione di pozza marina",
      "spanish": "Broche muestra de poza costera"
    },
    "brief": "自然觀察啟發；不規則淺池框內嵌卵石和小貝殼。",
    "tone": "#76aaa4",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-orbital-postal-globe",
    "collection": "orbital",
    "slot": "pin",
    "names": {
      "traditional-chinese": "世界郵路胸針",
      "english": "World postal route pin",
      "french": "Broche routes postales du monde",
      "italian": "Spilla rotte postali del mondo",
      "spanish": "Broche rutas postales del mundo"
    },
    "brief": "郵政交流啟發；穿孔郵票框包住球面經緯線與跨海弧線。",
    "tone": "#7c94ae",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-orbital-matcha",
    "collection": "orbital",
    "slot": "mouth",
    "names": {
      "traditional-chinese": "抹茶茶筅補給碗",
      "english": "Matcha bowl and whisk",
      "french": "Bol de matcha et fouet",
      "italian": "Ciotola matcha e frustino",
      "spanish": "Cuenco de matcha y batidor"
    },
    "brief": "日本茶具啟發；陶碗、綠色茶面與細竹筅一同懸在嘴邊。",
    "tone": "#86a167",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-orbital-pretzel",
    "collection": "orbital",
    "slot": "mouth",
    "names": {
      "traditional-chinese": "鹽花扭結麵包",
      "english": "Salted pretzel bite",
      "french": "Bretzel aux éclats de sel",
      "italian": "Brezel con fiocchi di sale",
      "spanish": "Bretzel con escamas de sal"
    },
    "brief": "烘焙啟發；連續扭結管體加少量白色鹽粒。",
    "tone": "#b77c41",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-orbital-mango-lassi",
    "collection": "orbital",
    "slot": "mouth",
    "names": {
      "traditional-chinese": "芒果優格補給杯",
      "english": "Mango lassi cup",
      "french": "Gobelet de lassi à la mangue",
      "italian": "Bicchiere di lassi al mango",
      "spanish": "Vaso de lassi de mango"
    },
    "brief": "南亞飲品啟發；金黃色乳飲杯、銀色杯口與細吸管。",
    "tone": "#dfb557",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-orbital-compass-case",
    "collection": "orbital",
    "slot": "charm",
    "names": {
      "traditional-chinese": "遠行羅盤匣吊飾",
      "english": "Travel compass case charm",
      "french": "Breloque étui de boussole",
      "italian": "Ciondolo custodia bussola",
      "spanish": "Colgante estuche de brújula"
    },
    "brief": "旅行工具啟發；圓盒蓋以固定開啟角度呈現，內有立體指針。",
    "tone": "#bda57a",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-orbital-teapot",
    "collection": "orbital",
    "slot": "charm",
    "names": {
      "traditional-chinese": "鑄鐵茶壺吊飾",
      "english": "Cast-iron teapot charm",
      "french": "Breloque théière en fonte",
      "italian": "Ciondolo teiera in ghisa",
      "spanish": "Colgante tetera de hierro"
    },
    "brief": "茶器工藝啟發；圓腹壺、獨立把手與細短壺嘴。",
    "tone": "#555f68",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-orbital-windtower",
    "collection": "orbital",
    "slot": "charm",
    "names": {
      "traditional-chinese": "風塔通風吊飾",
      "english": "Wind-tower charm",
      "french": "Breloque tour à vent",
      "italian": "Ciondolo torre del vento",
      "spanish": "Colgante torre de viento"
    },
    "brief": "沙漠通風建築啟發；四面開槽的小塔與厚實基座。",
    "tone": "#c1ad8d",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-orbital-loupe",
    "collection": "orbital",
    "slot": "eyewear",
    "names": {
      "traditional-chinese": "工匠雙層放大鏡",
      "english": "Artisan double loupe",
      "french": "Loupe double d’artisan",
      "italian": "Doppia lente da artigiano",
      "spanish": "Lupa doble de artesano"
    },
    "brief": "精密修復工坊啟發；兩片偏移的小鏡框與可見鉸接臂。",
    "tone": "#bc9b6a",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-stainedglass",
    "collection": "orbital",
    "slot": "eyewear",
    "names": {
      "traditional-chinese": "彩窗光學鏡",
      "english": "Stained-glass optic",
      "french": "Optique vitrail",
      "italian": "Ottica a vetrata",
      "spanish": "Óptica de vidriera"
    },
    "brief": "彩色玻璃工藝啟發；透明感鏡片分區，鉛灰接縫不遮住瞳孔。",
    "tone": "#7e9da8",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-snowgoggle",
    "collection": "orbital",
    "slot": "eyewear",
    "names": {
      "traditional-chinese": "雪地窄縫護目鏡",
      "english": "Snow-slit visor",
      "french": "Visière à fente de neige",
      "italian": "Visiera a fessura da neve",
      "spanish": "Visera de ranura para nieve"
    },
    "brief": "雪地防眩工具啟發；原創窄縫木色鏡罩與內層金屬固定環。",
    "tone": "#c1ab83",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-orbital-tree-rings",
    "collection": "orbital",
    "slot": "iris",
    "names": {
      "traditional-chinese": "年輪琥珀虹膜",
      "english": "Tree-ring amber iris",
      "french": "Iris ambre cernes du bois",
      "italian": "Iride ambra anelli del legno",
      "spanish": "Iris ámbar anillos de árbol"
    },
    "brief": "木材年輪啟發；偏心的細環紋理保留中央瞳孔清晰。",
    "tone": "#aa7a3d",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-orbital-mineral-cut",
    "collection": "orbital",
    "slot": "iris",
    "names": {
      "traditional-chinese": "礦物切面虹膜",
      "english": "Mineral-cut iris",
      "french": "Iris facettes minérales",
      "italian": "Iride sfaccettatura minerale",
      "spanish": "Iris facetas minerales"
    },
    "brief": "礦物薄片啟發；青綠不規則色塊以細金邊分隔。",
    "tone": "#77a797",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-orbital-quill",
    "collection": "orbital",
    "slot": "pupil",
    "names": {
      "traditional-chinese": "羽筆瞳",
      "english": "Quill pupil",
      "french": "Pupille plume",
      "italian": "Pupilla penna",
      "spanish": "Pupila pluma"
    },
    "brief": "文字傳承啟發；羽筆輪廓保持深色與可辨識眼神。",
    "tone": "#29383e",
    "price": 21,
    "prototype": false
  },
  {
    "id": "p333-orbital-sashiko",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "靛藍刺子織殼",
      "english": "Indigo stitch shell",
      "french": "Corps indigo à points cousus",
      "italian": "Corpo indaco a punti cuciti",
      "spanish": "Cuerpo índigo de puntadas"
    },
    "brief": "日本刺子繡啟發；深靛布底與原創白色短針菱格，低光澤布面。",
    "tone": "#304d73",
    "price": 66,
    "prototype": true
  },
  {
    "id": "p333-orbital-rammed-earth",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "夯土層理",
      "english": "Rammed-earth strata",
      "french": "Strates de terre crue",
      "italian": "Strati di terra battuta",
      "spanish": "Estratos de tierra apisonada"
    },
    "brief": "土建工藝啟發；砂、赭、米色水平層，粗糙但邊緣柔和。",
    "tone": "#bb9472",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-orbital-cork",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "軟木暖褐",
      "english": "Warm cork",
      "french": "Liège chaud",
      "italian": "Sughero caldo",
      "spanish": "Corcho cálido"
    },
    "brief": "軟木工藝啟發；不規則細顆粒，暖褐色低反射殼體。",
    "tone": "#b2946b",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-orbital-raku",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "樂燒煙虹",
      "english": "Raku smoke sheen",
      "french": "Reflets fumés raku",
      "italian": "Riflessi fumé raku",
      "spanish": "Reflejos ahumados raku"
    },
    "brief": "樂燒陶藝啟發；煙黑底帶局部銅虹與細開片。",
    "tone": "#746457",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-orbital-motherpearl",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "螺鈿月白",
      "english": "Inlaid mother-of-pearl",
      "french": "Nacre incrustée",
      "italian": "Madreperla intarsiata",
      "spanish": "Nácar incrustado"
    },
    "brief": "螺鈿工藝啟發；月白碎片分塊嵌在深色細縫之間。",
    "tone": "#cbd9d6",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-orbital-hammered-brass",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "手鎚蜂蜜銅",
      "english": "Hammered honey brass",
      "french": "Laiton miel martelé",
      "italian": "Ottone miele martellato",
      "spanish": "Latón miel martillado"
    },
    "brief": "金工啟發；錯落錘痕以表面紋理呈現，柔金反光。",
    "tone": "#c4a25f",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-orbital-glacier-granite",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "冰河花崗",
      "english": "Glacial granite",
      "french": "Granit glaciaire",
      "italian": "Granito glaciale",
      "spanish": "Granito glaciar"
    },
    "brief": "岩石地景啟發；冰灰底上細白、石墨與微藍礦粒。",
    "tone": "#9faeb3",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-orbital-olivewood",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "橄欖木旋紋",
      "english": "Olivewood grain",
      "french": "Veines de bois d’olivier",
      "italian": "Venature d’ulivo",
      "spanish": "Vetas de olivo"
    },
    "brief": "木作啟發；蜂蜜色曲線木紋沿 C 形連續包覆。",
    "tone": "#b59b6b",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-orbital-salt-crystal",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "鹽田乳晶",
      "english": "Salt-pan crystal",
      "french": "Cristal de saline",
      "italian": "Cristallo di salina",
      "spanish": "Cristal de salina"
    },
    "brief": "鹽田啟發；半霧白礦物感，細方晶紋理與淡粉反光。",
    "tone": "#e5d7d1",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-orbital-moss-felt",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "苔原毛氈",
      "english": "Moss felt",
      "french": "Feutre de mousse",
      "italian": "Feltro di muschio",
      "spanish": "Fieltro de musgo"
    },
    "brief": "植物與纖維啟發；深淺綠色短纖維混合，柔霧表面。",
    "tone": "#78866d",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-orbital-blueprint",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "工程藍曬",
      "english": "Blueprint ceramic",
      "french": "Céramique cyanotype",
      "italian": "Ceramica cianotipia",
      "spanish": "Cerámica cianotipia"
    },
    "brief": "工程圖啟發；深藍瓷面配細白構造線及圓弧標記。",
    "tone": "#385d89",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-orbital-lacquer-leaf",
    "collection": "orbital",
    "slot": "material",
    "names": {
      "traditional-chinese": "漆金落葉",
      "english": "Lacquered gold leaf",
      "french": "Laque aux feuilles d’or",
      "italian": "Lacca a foglie d’oro",
      "spanish": "Laca con hojas de oro"
    },
    "brief": "漆藝啟發；暖黑高光表面散布不規則金箔小片。",
    "tone": "#514331",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-space-saturn",
    "collection": "space",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "土星雙環單耳環",
      "english": "Saturn twin-ring earring",
      "french": "Boucle Saturne à double anneau",
      "italian": "Orecchino Saturno a doppio anello",
      "spanish": "Pendiente Saturno de doble anillo"
    },
    "brief": "土星啟發；蜜色球體穿過兩道傾斜金屬環，背面也有完整環面。",
    "tone": "#c8ac7c",
    "price": 36,
    "prototype": true
  },
  {
    "id": "p333-space-mercury",
    "collection": "space",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "水星日影單耳環",
      "english": "Mercury shadow earring",
      "french": "Boucle ombre de Mercure",
      "italian": "Orecchino ombra di Mercurio",
      "spanish": "Pendiente sombra de Mercurio"
    },
    "brief": "水星啟發；銀灰半球與深黑弧形遮板構成日夜對照。",
    "tone": "#939b9f",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-mars-dust",
    "collection": "space",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "火星塵旋單耳環",
      "english": "Mars dust-whirl earring",
      "french": "Boucle tourbillon martien",
      "italian": "Orecchino vortice marziano",
      "spanish": "Pendiente remolino marciano"
    },
    "brief": "火星啟發；紅褐螺旋帶包住小砂色核心。",
    "tone": "#bc7455",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-uranus",
    "collection": "space",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "天王星橫軸單耳環",
      "english": "Uranus tilted-axis earring",
      "french": "Boucle axe incliné d’Uranus",
      "italian": "Orecchino asse inclinato di Urano",
      "spanish": "Pendiente eje inclinado de Urano"
    },
    "brief": "天王星啟發；冰青球與近直立細環，兩端可見軸承。",
    "tone": "#95cfcb",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-io",
    "collection": "space",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "埃歐熔滴單耳環",
      "english": "Io lava-drop earring",
      "french": "Boucle goutte de lave d’Io",
      "italian": "Orecchino goccia lavica di Io",
      "spanish": "Pendiente gota de lava de Ío"
    },
    "brief": "木衛一啟發；黑殼包住琥珀色滴形內芯，細縫露出暖光色。",
    "tone": "#d8a254",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-luma",
    "collection": "space",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "露瑪光籽單耳環",
      "english": "Luma light-seed earring",
      "french": "Boucle graine lumineuse Luma",
      "italian": "Orecchino seme luminoso Luma",
      "spanish": "Pendiente semilla luminosa Luma"
    },
    "brief": "原創露瑪星；三片花瓣形銀殼包住乳白光籽。",
    "tone": "#d8d6b9",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-vesper",
    "collection": "space",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "維斯珀暮晶單耳環",
      "english": "Vesper dusk-crystal earring",
      "french": "Boucle cristal crépusculaire Vesper",
      "italian": "Orecchino cristallo del crepuscolo Vesper",
      "spanish": "Pendiente cristal crepuscular Vesper"
    },
    "brief": "原創維斯珀星；分岔紫晶長柱與霧黑插座。",
    "tone": "#a28cb7",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-thalassa",
    "collection": "space",
    "slot": "earrings",
    "names": {
      "traditional-chinese": "塔拉薩潮珠單耳環",
      "english": "Thalassa tide-pearl earring",
      "french": "Boucle perle de marée Thalassa",
      "italian": "Orecchino perla di marea Thalassa",
      "spanish": "Pendiente perla de marea Thalassa"
    },
    "brief": "原創海洋世界；三顆不同透明感的藍珠沿弧骨架排列。",
    "tone": "#6caab8",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-binary",
    "collection": "space",
    "slot": "brow",
    "names": {
      "traditional-chinese": "雙日引力眉環",
      "english": "Binary-sun brow cuff",
      "french": "Manchette de sourcil soleils jumeaux",
      "italian": "Anello sopracciglio soli gemelli",
      "spanish": "Aro de ceja soles gemelos"
    },
    "brief": "原創雙日世界；金色與冰藍雙球位於一條相連軌道上，夾座固定在殼環。",
    "tone": "#cbb17b",
    "price": 30,
    "prototype": true
  },
  {
    "id": "p333-space-mars-bridge",
    "collection": "space",
    "slot": "brow",
    "names": {
      "traditional-chinese": "火星峽谷眉環",
      "english": "Mars canyon brow cuff",
      "french": "Manchette de sourcil canyon martien",
      "italian": "Anello sopracciglio canyon marziano",
      "spanish": "Aro de ceja cañón marciano"
    },
    "brief": "火星地貌啟發；兩塊紅色岩壁以細銀梁跨接，中間留縫。",
    "tone": "#b67255",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-space-europa-seam",
    "collection": "space",
    "slot": "brow",
    "names": {
      "traditional-chinese": "歐羅巴冰縫眉環",
      "english": "Europa ice-seam brow cuff",
      "french": "Manchette de sourcil fissure d’Europe",
      "italian": "Anello sopracciglio crepa di Europa",
      "spanish": "Aro de ceja grieta de Europa"
    },
    "brief": "木衛二啟發；白色弧片中刻一道不規則青色接縫。",
    "tone": "#c9e3df",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-space-magnetar",
    "collection": "space",
    "slot": "brow",
    "names": {
      "traditional-chinese": "磁星極點眉環",
      "english": "Magnetar pole brow cuff",
      "french": "Manchette de sourcil pôles de magnétar",
      "italian": "Anello sopracciglio poli di magnetar",
      "spanish": "Aro de ceja polos de magnetar"
    },
    "brief": "天體儀器幻想；黑鈦夾座上兩枚相對小磁極與短弧橋。",
    "tone": "#687f97",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-space-aurelia",
    "collection": "space",
    "slot": "brow",
    "names": {
      "traditional-chinese": "奧蕾莉亞晨環眉環",
      "english": "Aurelia dawn brow cuff",
      "french": "Manchette de sourcil aube d’Aurelia",
      "italian": "Anello sopracciglio alba di Aurelia",
      "spanish": "Aro de ceja amanecer de Aurelia"
    },
    "brief": "原創奧蕾莉亞星；乳金分段圓弧與一枚桃色透光片。",
    "tone": "#d6b795",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-space-europa",
    "collection": "space",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "歐羅巴潮汐項鍊",
      "english": "Europa tide necklace",
      "french": "Collier marées d’Europe",
      "italian": "Collana maree di Europa",
      "spanish": "Collar mareas de Europa"
    },
    "brief": "木衛二與海洋想像；冰白圓殼內露青藍波浪層，外框有細金懸掛圈。",
    "tone": "#a3d5d3",
    "price": 39,
    "prototype": true
  },
  {
    "id": "p333-space-jupiter",
    "collection": "space",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "木星風暴項鍊",
      "english": "Jupiter storm necklace",
      "french": "Collier tempête de Jupiter",
      "italian": "Collana tempesta di Giove",
      "spanish": "Collar tormenta de Júpiter"
    },
    "brief": "木星啟發；橢圓紅銅旋渦嵌在奶油色層帶圓章。",
    "tone": "#c49476",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-space-lunar",
    "collection": "space",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "月背地形項鍊",
      "english": "Lunar far-side necklace",
      "french": "Collier relief de la face cachée",
      "italian": "Collana rilievo del lato nascosto",
      "spanish": "Collar relieve de la cara oculta"
    },
    "brief": "月球啟發；銀灰圓章上有大小不同的淺坑與階梯邊。",
    "tone": "#b7bec3",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-space-titan",
    "collection": "space",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "泰坦琥珀匣項鍊",
      "english": "Titan amber locket",
      "french": "Médaillon ambre de Titan",
      "italian": "Medaglione ambra di Titano",
      "spanish": "Medallón ámbar de Titán"
    },
    "brief": "土衛六啟發；霧橙透光感匣體內置深色波紋薄片。",
    "tone": "#c29756",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-space-nyx",
    "collection": "space",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "倪克斯夜核項鍊",
      "english": "Nyx night-core necklace",
      "french": "Collier noyau nocturne Nyx",
      "italian": "Collana nucleo notturno Nyx",
      "spanish": "Collar núcleo nocturno Nyx"
    },
    "brief": "原創倪克斯星；黑色多面核心懸在三瓣銀色籠架中。",
    "tone": "#606b84",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-space-confluence",
    "collection": "space",
    "slot": "necklace",
    "names": {
      "traditional-chinese": "雙星交匯項鍊",
      "english": "Planetary confluence necklace",
      "french": "Collier confluence planétaire",
      "italian": "Collana confluenza planetaria",
      "spanish": "Collar confluencia planetaria"
    },
    "brief": "火星紅砂與原創露瑪乳晶融合；兩片不同材質合成偏心圓章。",
    "tone": "#c3a1a0",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-space-venus",
    "collection": "space",
    "slot": "head",
    "names": {
      "traditional-chinese": "金星雲冠",
      "english": "Venus cloud crown",
      "french": "Couronne nuageuse de Vénus",
      "italian": "Corona di nubi di Venere",
      "spanish": "Corona de nubes de Venus"
    },
    "brief": "金星雲層啟發；香檳色螺旋扁帶逐層升起，內有深色固定環。",
    "tone": "#d4bc8e",
    "price": 45,
    "prototype": true
  },
  {
    "id": "p333-space-neptune-sail",
    "collection": "space",
    "slot": "head",
    "names": {
      "traditional-chinese": "海王星風帆帽",
      "english": "Neptune wind-sail hat",
      "french": "Chapeau voile de Neptune",
      "italian": "Cappello vela di Nettuno",
      "spanish": "Sombrero vela de Neptuno"
    },
    "brief": "海王星啟發；兩片偏斜深藍帆面以細銀桅骨支撐。",
    "tone": "#668ab9",
    "price": 45,
    "prototype": false
  },
  {
    "id": "p333-space-ceres",
    "collection": "space",
    "slot": "head",
    "names": {
      "traditional-chinese": "穀神星採集帽",
      "english": "Ceres gatherer cap",
      "french": "Casquette de collecte Cérès",
      "italian": "Berretto da raccolta Cerere",
      "spanish": "Gorra recolectora Ceres"
    },
    "brief": "穀神星啟發；礦灰小帽配三個白色取樣盒，非寫實太空裝。",
    "tone": "#a7a7a0",
    "price": 45,
    "prototype": false
  },
  {
    "id": "p333-space-elysian",
    "collection": "space",
    "slot": "head",
    "names": {
      "traditional-chinese": "艾莉森晶芽冠",
      "english": "Elysian crystal-sprout crown",
      "french": "Couronne de pousses cristallines Elysian",
      "italian": "Corona di germogli cristallini Elysian",
      "spanish": "Corona de brotes cristalinos Elysian"
    },
    "brief": "原創艾莉森星；短水晶柱像新芽沿一側生長，保持重心輕巧。",
    "tone": "#b0c9b8",
    "price": 45,
    "prototype": false
  },
  {
    "id": "p333-space-saturn-ribbon",
    "collection": "space",
    "slot": "neck",
    "names": {
      "traditional-chinese": "土星環帶披肩",
      "english": "Saturn ring-ribbon cape",
      "french": "Cape rubans des anneaux de Saturne",
      "italian": "Mantellina a nastri degli anelli di Saturno",
      "spanish": "Capa de cintas de los anillos de Saturno"
    },
    "brief": "土星環啟發；三道有厚度的薄帶繞住左下殼環並逐層展開。",
    "tone": "#c8b89b",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-aurora",
    "collection": "space",
    "slot": "neck",
    "names": {
      "traditional-chinese": "極光波褶領巾",
      "english": "Aurora wave scarf",
      "french": "Foulard ondulations d’aurore",
      "italian": "Foulard onde aurorali",
      "spanish": "Pañuelo ondas aurorales"
    },
    "brief": "極光色彩幻想；青紫褶片沿領圈下垂，使用虹彩材質而非光效濾鏡。",
    "tone": "#85abae",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-comet",
    "collection": "space",
    "slot": "neck",
    "names": {
      "traditional-chinese": "彗尾纖維圍巾",
      "english": "Comet-tail fibre scarf",
      "french": "Écharpe fibres de queue cométaire",
      "italian": "Sciarpa fibre di coda cometaria",
      "spanish": "Bufanda fibras de cola cometaria"
    },
    "brief": "彗星啟發；深藍領圈末端分三束冰銀細帶。",
    "tone": "#9daebe",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-pluto",
    "collection": "space",
    "slot": "pin",
    "names": {
      "traditional-chinese": "冥王星心原胸針",
      "english": "Pluto heartland pin",
      "french": "Broche plaine en cœur de Pluton",
      "italian": "Spilla pianura a cuore di Plutone",
      "spanish": "Broche llanura corazón de Plutón"
    },
    "brief": "冥王星啟發；淡色心形地貌嵌進灰褐球面圓章。",
    "tone": "#c5b2a1",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-space-enceladus",
    "collection": "space",
    "slot": "pin",
    "names": {
      "traditional-chinese": "恩克拉多斯噴泉胸針",
      "english": "Enceladus plume pin",
      "french": "Broche panache d’Encelade",
      "italian": "Spilla pennacchio di Encelado",
      "spanish": "Broche penacho de Encélado"
    },
    "brief": "土衛二啟發；冰白小半球射出三條細弧銀線。",
    "tone": "#bfdce1",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-space-kepler-window",
    "collection": "space",
    "slot": "pin",
    "names": {
      "traditional-chinese": "遠日觀測窗胸針",
      "english": "Distant-sun window pin",
      "french": "Broche fenêtre vers un soleil lointain",
      "italian": "Spilla finestra sul sole lontano",
      "spanish": "Broche ventana al sol lejano"
    },
    "brief": "系外世界幻想；方形儀器框內的偏心金色日輪與暗藍圓片。",
    "tone": "#b49c6c",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-space-umbra",
    "collection": "space",
    "slot": "pin",
    "names": {
      "traditional-chinese": "翁布拉食環胸針",
      "english": "Umbra eclipse pin",
      "french": "Broche éclipse Umbra",
      "italian": "Spilla eclissi Umbra",
      "spanish": "Broche eclipse Umbra"
    },
    "brief": "原創翁布拉星；黑色圓片錯位蓋住一枚暖金環。",
    "tone": "#756858",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-space-mars-ration",
    "collection": "space",
    "slot": "mouth",
    "names": {
      "traditional-chinese": "火星紅莓補給",
      "english": "Mars red-berry ration",
      "french": "Ration de baies rouges de Mars",
      "italian": "Razione di bacche rosse di Marte",
      "spanish": "Ración de bayas rojas de Marte"
    },
    "brief": "星港虛構食品；三枚紅色球果放在鈦色折角托盤。",
    "tone": "#b6645a",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-space-luma-nectar",
    "collection": "space",
    "slot": "mouth",
    "names": {
      "traditional-chinese": "露瑪花蜜瓶",
      "english": "Luma nectar flask",
      "french": "Flacon de nectar Luma",
      "italian": "Fiaschetta nettare Luma",
      "spanish": "Frasco de néctar Luma"
    },
    "brief": "原創露瑪星虛構飲品；乳白小瓶有花瓣狀蓋口與彎吸管。",
    "tone": "#d6d7af",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-space-titan-cocoa",
    "collection": "space",
    "slot": "mouth",
    "names": {
      "traditional-chinese": "泰坦暖可可杯",
      "english": "Titan cocoa cup",
      "french": "Tasse de cacao Titan",
      "italian": "Tazza cacao Titano",
      "spanish": "Taza de cacao Titán"
    },
    "brief": "星港虛構飲品；琥珀色隔熱杯與銀色環把，非天體真實產物。",
    "tone": "#b88458",
    "price": 30,
    "prototype": false
  },
  {
    "id": "p333-space-voyager-seed",
    "collection": "space",
    "slot": "charm",
    "names": {
      "traditional-chinese": "遠航種子艙吊飾",
      "english": "Voyager seed-pod charm",
      "french": "Breloque capsule de graines voyageuse",
      "italian": "Ciondolo capsula di semi viaggiatrice",
      "spanish": "Colgante cápsula viajera de semillas"
    },
    "brief": "星際旅行幻想；橢圓艙體內可見一枚綠芽，外有保護肋。",
    "tone": "#8caa91",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-space-phobos",
    "collection": "space",
    "slot": "charm",
    "names": {
      "traditional-chinese": "福波斯岩匣吊飾",
      "english": "Phobos rock-case charm",
      "french": "Breloque écrin rocheux Phobos",
      "italian": "Ciondolo scrigno roccioso Phobos",
      "spanish": "Colgante estuche rocoso Fobos"
    },
    "brief": "火衛一啟發；不規則岩塊嵌入三爪金屬採集架。",
    "tone": "#8d8275",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-space-triton",
    "collection": "space",
    "slot": "charm",
    "names": {
      "traditional-chinese": "崔頓冰針吊飾",
      "english": "Triton ice-spire charm",
      "french": "Breloque flèche de glace Triton",
      "italian": "Ciondolo guglia di ghiaccio Tritone",
      "spanish": "Colgante aguja de hielo Tritón"
    },
    "brief": "海衛一啟發；淡藍六角長晶與短銀帽蓋。",
    "tone": "#a2c3d2",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-space-aether",
    "collection": "space",
    "slot": "charm",
    "names": {
      "traditional-chinese": "以太風鈴吊飾",
      "english": "Aether wind-chime charm",
      "french": "Breloque carillon Aether",
      "italian": "Ciondolo campana eolica Aether",
      "spanish": "Colgante carillón Aether"
    },
    "brief": "原創以太星；三支不等長空心管與懸掛的中央小錘。",
    "tone": "#b0abc9",
    "price": 39,
    "prototype": false
  },
  {
    "id": "p333-space-mercury-shield",
    "collection": "space",
    "slot": "eyewear",
    "names": {
      "traditional-chinese": "水星遮陽鏡",
      "english": "Mercury sun-shield optic",
      "french": "Optique pare-soleil Mercure",
      "italian": "Ottica parasole Mercurio",
      "spanish": "Óptica parasol Mercurio"
    },
    "brief": "水星啟發；一片煙色鏡片配上方小遮陽板，保留可見眼睛。",
    "tone": "#9f927a",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-neptune-depth",
    "collection": "space",
    "slot": "eyewear",
    "names": {
      "traditional-chinese": "海王星深測鏡",
      "english": "Neptune depth optic",
      "french": "Optique de profondeur Neptune",
      "italian": "Ottica di profondità Nettuno",
      "spanish": "Óptica de profundidad Neptuno"
    },
    "brief": "海王星啟發；深藍雙層鏡框、刻度環與側邊感測器。",
    "tone": "#587b9e",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-prism-world",
    "collection": "space",
    "slot": "eyewear",
    "names": {
      "traditional-chinese": "稜鏡星光學鏡",
      "english": "Prism-world optic",
      "french": "Optique du monde prisme",
      "italian": "Ottica del mondo prisma",
      "spanish": "Óptica del mundo prisma"
    },
    "brief": "原創稜鏡星；六角透明感鏡片配三個彩色折射邊。",
    "tone": "#b5bad4",
    "price": 36,
    "prototype": false
  },
  {
    "id": "p333-space-jovian-bands",
    "collection": "space",
    "slot": "iris",
    "names": {
      "traditional-chinese": "木星流帶虹膜",
      "english": "Jovian band iris",
      "french": "Iris bandes joviennes",
      "italian": "Iride bande gioviane",
      "spanish": "Iris bandas jovianas"
    },
    "brief": "木星雲帶啟發；米白與赤褐弧帶環繞深色瞳孔。",
    "tone": "#be977a",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-space-aurora-ocean",
    "collection": "space",
    "slot": "iris",
    "names": {
      "traditional-chinese": "極光海虹膜",
      "english": "Aurora-ocean iris",
      "french": "Iris océan d’aurore",
      "italian": "Iride oceano aurorale",
      "spanish": "Iris océano auroral"
    },
    "brief": "原創海洋星＋極光融合；青綠與紫色漸變細放射紋。",
    "tone": "#78a9b1",
    "price": 24,
    "prototype": false
  },
  {
    "id": "p333-space-eclipse",
    "collection": "space",
    "slot": "pupil",
    "names": {
      "traditional-chinese": "日食缺口瞳",
      "english": "Eclipse-notch pupil",
      "french": "Pupille éclipse échancrée",
      "italian": "Pupilla eclissi intagliata",
      "spanish": "Pupila eclipse recortada"
    },
    "brief": "日食啟發；深色圓瞳的一側留細月牙缺口。",
    "tone": "#202938",
    "price": 21,
    "prototype": false
  },
  {
    "id": "p333-space-neptune-ice",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "海王星冰藍琉璃",
      "english": "Neptune ice-blue glass",
      "french": "Verre bleu glacé Neptune",
      "italian": "Vetro azzurro glaciale Nettuno",
      "spanish": "Vidrio azul hielo Neptuno"
    },
    "brief": "海王星色彩想像；深淺冰藍曲帶與虹彩塗層，屬幻想材質。",
    "tone": "#6d9fba",
    "price": 66,
    "prototype": true
  },
  {
    "id": "p333-space-mercury-metal",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "水星撞紋鈦",
      "english": "Mercury crater titanium",
      "french": "Titane cratérisé Mercure",
      "italian": "Titanio craterizzato Mercurio",
      "spanish": "Titanio craterizado Mercurio"
    },
    "brief": "水星地貌啟發；銀灰金屬表面有淺圓坑紋與細磨痕。",
    "tone": "#9b9d9d",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-space-venus-opal",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "金星乳金釉",
      "english": "Venus creamy-gold glaze",
      "french": "Glaçure or crémeux Vénus",
      "italian": "Smalto oro cremoso Venere",
      "spanish": "Esmalte oro cremoso Venus"
    },
    "brief": "金星雲色啟發；奶油黃到香檳白的流雲瓷面。",
    "tone": "#d4c499",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-space-mars-ceramic",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "火星赤陶",
      "english": "Mars red ceramic",
      "french": "Céramique rouge Mars",
      "italian": "Ceramica rossa Marte",
      "spanish": "Cerámica roja Marte"
    },
    "brief": "火星啟發；赭紅霧陶底配較深峽谷細脈。",
    "tone": "#b76d54",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-space-jupiter-marble",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "木星風帶石",
      "english": "Jupiter banded stone",
      "french": "Pierre rubanée Jupiter",
      "italian": "Pietra a bande Giove",
      "spanish": "Piedra bandeada Júpiter"
    },
    "brief": "木星啟發；奶油、焦糖、赤褐三色波帶的拋光石材想像。",
    "tone": "#c3a489",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-space-saturn-satin",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "土星香檳緞",
      "english": "Saturn champagne satin",
      "french": "Satin champagne Saturne",
      "italian": "Raso champagne Saturno",
      "spanish": "Satén champán Saturno"
    },
    "brief": "土星啟發；淡金織面帶細環形纖維紋。",
    "tone": "#cbbb99",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-space-uranus-frost",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "天王星青霜",
      "english": "Uranus cyan frost",
      "french": "Givre cyan Uranus",
      "italian": "Brina ciano Urano",
      "spanish": "Escarcha cian Urano"
    },
    "brief": "天王星色彩啟發；青白霧玻璃與細顆粒霜面。",
    "tone": "#afd8d5",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-space-europa-mars",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "冰海赤脈複合殼",
      "english": "Ice-ocean red-vein composite",
      "french": "Composite océan glacé veines rouges",
      "italian": "Composito oceano ghiacciato venature rosse",
      "spanish": "Compuesto océano helado vetas rojas"
    },
    "brief": "木衛二冰白＋火星赤褐融合；白殼裂隙填入暖紅金屬線。",
    "tone": "#d7c9c2",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-space-titan-nyx",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "琥珀夜核複合殼",
      "english": "Amber night-core composite",
      "french": "Composite ambre et noyau nocturne",
      "italian": "Composito ambra e nucleo notturno",
      "spanish": "Compuesto ámbar y núcleo nocturno"
    },
    "brief": "土衛六霧橙＋原創倪克斯黑礦融合；深黑底內散琥珀光斑。",
    "tone": "#8b7156",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-space-luma-porcelain",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "露瑪花光瓷",
      "english": "Luma bloom porcelain",
      "french": "Porcelaine florale Luma",
      "italian": "Porcellana fiorita Luma",
      "spanish": "Porcelana floral Luma"
    },
    "brief": "原創露瑪星；乳白瓷面浮現極淡花瓣色斑與暖光感。",
    "tone": "#dddccb",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-space-vesper-prism",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "維斯珀暮虹晶",
      "english": "Vesper dusk-prism crystal",
      "french": "Cristal prisme crépusculaire Vesper",
      "italian": "Cristallo prisma del crepuscolo Vesper",
      "spanish": "Cristal prisma crepuscular Vesper"
    },
    "brief": "原創維斯珀星；煙紫多層色帶與細微虹彩。",
    "tone": "#9e8da9",
    "price": 66,
    "prototype": false
  },
  {
    "id": "p333-space-thalassa-brass",
    "collection": "space",
    "slot": "material",
    "names": {
      "traditional-chinese": "潮海古銅複合殼",
      "english": "Tidal sea-bronze composite",
      "french": "Composite mer et bronze ancien",
      "italian": "Composito mare e bronzo antico",
      "spanish": "Compuesto mar y bronce antiguo"
    },
    "brief": "原創塔拉薩海色＋地球古銅融合；青藍釉層間露出暖銅細線。",
    "tone": "#68948f",
    "price": 66,
    "prototype": false
  }
];
