import type { ShopItem } from "./catalog";

/** Original orbital souvenirs, not reproductions of issued postal stamps. */
export const CULTURAL_ITEMS: readonly (ShopItem & { variant: number })[] = [
  {
    "id": "tea-pearl-earrings",
    "country": "tw",
    "slot": "earrings",
    "price": 30,
    "tone": "#b79565",
    "names": {
      "traditional-chinese": "珍奶珍珠耳環",
      "english": "Bubble tea earring",
      "french": "Boucle thé aux perles",
      "italian": "Orecchino bubble tea",
      "spanish": "Pendiente de té de burbujas"
    },
    "variant": 0
  },
  {
    "id": "jade-disc-earrings",
    "country": "tw",
    "slot": "earrings",
    "price": 36,
    "tone": "#6caa91",
    "names": {
      "traditional-chinese": "玉璧耳環",
      "english": "Jade disc earring",
      "french": "Boucle disque de jade",
      "italian": "Orecchino disco di giada",
      "spanish": "Pendiente de discos de jade"
    },
    "variant": 1
  },
  {
    "id": "tw-signal-brow",
    "country": "tw",
    "slot": "brow",
    "price": 24,
    "tone": "#df534b",
    "names": {
      "traditional-chinese": "赤藍訊號眉環",
      "english": "Red and blue signal brow ring",
      "french": "Anneau de sourcil signal rouge et bleu",
      "italian": "Anello sopracciglio segnale rosso e blu",
      "spanish": "Aro de ceja señal roja y azul"
    },
    "variant": 2
  },
  {
    "id": "plum-orbit-necklace",
    "country": "tw",
    "slot": "necklace",
    "price": 39,
    "tone": "#c694b4",
    "names": {
      "traditional-chinese": "梅花軌道項鍊",
      "english": "Plum orbit necklace",
      "french": "Collier orbite de prunier",
      "italian": "Collana orbita di pruno",
      "spanish": "Collar órbita de ciruelo"
    },
    "variant": 3
  },
  {
    "id": "tea-bucket-hat",
    "country": "tw",
    "slot": "head",
    "price": 39,
    "tone": "#718f77",
    "names": {
      "traditional-chinese": "茶山漁夫帽",
      "english": "Tea mountain bucket hat",
      "french": "Bob des montagnes de thé",
      "italian": "Cappello da pescatore color tè",
      "spanish": "Sombrero de pescador verde té"
    },
    "variant": 4
  },
  {
    "id": "market-weave-scarf",
    "country": "tw",
    "slot": "neck",
    "price": 36,
    "tone": "#447b74",
    "names": {
      "traditional-chinese": "茄芷織紋圍巾",
      "english": "Market weave scarf",
      "french": "Écharpe tissée du marché",
      "italian": "Sciarpa intreccio del mercato",
      "spanish": "Bufanda tejida del mercado"
    },
    "variant": 5
  },
  {
    "id": "oolong-satin",
    "country": "tw",
    "slot": "material",
    "price": 60,
    "tone": "#637e57",
    "names": {
      "traditional-chinese": "烏龍茶緞面",
      "english": "Oolong satin",
      "french": "Satin oolong",
      "italian": "Raso oolong",
      "spanish": "Satén oolong"
    },
    "variant": 6
  },
  {
    "id": "rose-copper",
    "country": "tw",
    "slot": "material",
    "price": 66,
    "tone": "#c78c7b",
    "names": {
      "traditional-chinese": "玫瑰銅",
      "english": "Rose copper",
      "french": "Cuivre rosé",
      "italian": "Rame rosato",
      "spanish": "Cobre rosado"
    },
    "variant": 7
  },
  {
    "id": "tw-orbit-stamp",
    "country": "tw",
    "slot": "pin",
    "price": 24,
    "tone": "#d54c48",
    "names": {
      "traditional-chinese": "雙十紀念郵票・10月10日",
      "english": "Double Tenth stamp · 10 Oct",
      "french": "Timbre Double Dix · 10 oct.",
      "italian": "Francobollo Doppio Dieci · 10 ott.",
      "spanish": "Sello Doble Diez · 10 oct."
    },
    "variant": 8
  },
  {
    "id": "tw-signal-module",
    "country": "tw",
    "slot": "charm",
    "price": 45,
    "tone": "#cf4a48",
    "names": {
      "traditional-chinese": "赤藍通訊模組",
      "english": "Red and blue comms module",
      "french": "Module radio rouge et bleu",
      "italian": "Modulo radio rosso e blu",
      "spanish": "Módulo de radio rojo y azul"
    },
    "variant": 9
  },
  {
    "id": "bagel-orbit-earrings",
    "country": "us",
    "slot": "earrings",
    "price": 30,
    "tone": "#d09b59",
    "names": {
      "traditional-chinese": "貝果軌道耳環",
      "english": "Bagel orbit earring",
      "french": "Boucle orbite bagel",
      "italian": "Orecchino orbita bagel",
      "spanish": "Pendiente órbita bagel"
    },
    "variant": 0
  },
  {
    "id": "silver-star-earrings",
    "country": "us",
    "slot": "earrings",
    "price": 36,
    "tone": "#bbc4d4",
    "names": {
      "traditional-chinese": "銀星耳環",
      "english": "Silver star earring",
      "french": "Boucle étoile argentée",
      "italian": "Orecchino stella d’argento",
      "spanish": "Pendiente de estrellas de plata"
    },
    "variant": 1
  },
  {
    "id": "us-signal-brow",
    "country": "us",
    "slot": "brow",
    "price": 24,
    "tone": "#4969aa",
    "names": {
      "traditional-chinese": "星際訊號眉環",
      "english": "Stellar signal brow ring",
      "french": "Anneau de sourcil signal stellaire",
      "italian": "Anello sopracciglio segnale stellare",
      "spanish": "Aro de ceja señal estelar"
    },
    "variant": 2
  },
  {
    "id": "lunar-dogtag-necklace",
    "country": "us",
    "slot": "necklace",
    "price": 39,
    "tone": "#afb6c0",
    "names": {
      "traditional-chinese": "月面識別牌項鍊",
      "english": "Lunar dog tag necklace",
      "french": "Collier plaque lunaire",
      "italian": "Collana piastrina lunare",
      "spanish": "Collar de placa lunar"
    },
    "variant": 3
  },
  {
    "id": "orbital-beanie",
    "country": "us",
    "slot": "head",
    "price": 39,
    "tone": "#33486d",
    "names": {
      "traditional-chinese": "軌道毛帽",
      "english": "Orbital beanie",
      "french": "Bonnet orbital",
      "italian": "Berretto orbitale",
      "spanish": "Gorro orbital"
    },
    "variant": 4
  },
  {
    "id": "launch-stripe-scarf",
    "country": "us",
    "slot": "neck",
    "price": 36,
    "tone": "#b34443",
    "names": {
      "traditional-chinese": "發射條紋圍巾",
      "english": "Launch stripe scarf",
      "french": "Écharpe rayures de lancement",
      "italian": "Sciarpa a righe di lancio",
      "spanish": "Bufanda a rayas de lanzamiento"
    },
    "variant": 5
  },
  {
    "id": "midnight-titanium",
    "country": "us",
    "slot": "material",
    "price": 66,
    "tone": "#293e63",
    "names": {
      "traditional-chinese": "午夜鈦金屬",
      "english": "Midnight titanium",
      "french": "Titane de minuit",
      "italian": "Titanio di mezzanotte",
      "spanish": "Titanio de medianoche"
    },
    "variant": 6
  },
  {
    "id": "moon-frost",
    "country": "us",
    "slot": "material",
    "price": 60,
    "tone": "#c4d4e2",
    "names": {
      "traditional-chinese": "月霜陶瓷",
      "english": "Moon frost ceramic",
      "french": "Céramique givre lunaire",
      "italian": "Ceramica gelo lunare",
      "spanish": "Cerámica escarcha lunar"
    },
    "variant": 7
  },
  {
    "id": "us-orbit-stamp",
    "country": "us",
    "slot": "pin",
    "price": 24,
    "tone": "#4c6299",
    "names": {
      "traditional-chinese": "獨立日紀念郵票・7月4日",
      "english": "Independence stamp · 4 Jul",
      "french": "Timbre de l’Indépendance · 4 juil.",
      "italian": "Francobollo dell’Indipendenza · 4 lug.",
      "spanish": "Sello de la Independencia · 4 jul."
    },
    "variant": 8
  },
  {
    "id": "us-signal-module",
    "country": "us",
    "slot": "charm",
    "price": 45,
    "tone": "#3b5e9d",
    "names": {
      "traditional-chinese": "星條通訊模組",
      "english": "Stars and stripes comms module",
      "french": "Module radio étoiles et rayures",
      "italian": "Modulo radio stelle e strisce",
      "spanish": "Módulo de radio barras y estrellas"
    },
    "variant": 9
  },
  {
    "id": "macaron-drop-earrings",
    "country": "fr",
    "slot": "earrings",
    "price": 30,
    "tone": "#d6a1b2",
    "names": {
      "traditional-chinese": "馬卡龍垂墜耳環",
      "english": "Macaron drop earring",
      "french": "Boucle pendante macaron",
      "italian": "Orecchino pendente macaron",
      "spanish": "Pendiente colgante de macaron"
    },
    "variant": 0
  },
  {
    "id": "pearl-orbit-earrings",
    "country": "fr",
    "slot": "earrings",
    "price": 36,
    "tone": "#e9dfcd",
    "names": {
      "traditional-chinese": "珍珠軌道耳環",
      "english": "Pearl orbit earring",
      "french": "Boucle orbite de perle",
      "italian": "Orecchino orbita di perle",
      "spanish": "Pendiente órbita de perlas"
    },
    "variant": 1
  },
  {
    "id": "fr-signal-brow",
    "country": "fr",
    "slot": "brow",
    "price": 24,
    "tone": "#405c93",
    "names": {
      "traditional-chinese": "三色光點眉環",
      "english": "Tricolour light brow ring",
      "french": "Anneau de sourcil lumière tricolore",
      "italian": "Anello sopracciglio luce tricolore",
      "spanish": "Aro de ceja luz tricolor"
    },
    "variant": 2
  },
  {
    "id": "pearl-satellite-necklace",
    "country": "fr",
    "slot": "necklace",
    "price": 39,
    "tone": "#e9dac0",
    "names": {
      "traditional-chinese": "珍珠衛星項鍊",
      "english": "Pearl satellite necklace",
      "french": "Collier satellite de perle",
      "italian": "Collana satellite di perla",
      "spanish": "Collar satélite de perla"
    },
    "variant": 3
  },
  {
    "id": "riviera-boater",
    "country": "fr",
    "slot": "head",
    "price": 39,
    "tone": "#d8ba83",
    "names": {
      "traditional-chinese": "蔚藍海岸平頂草帽",
      "english": "Riviera boater",
      "french": "Canotier Riviera",
      "italian": "Paglietta Riviera",
      "spanish": "Canotier Riviera"
    },
    "variant": 4
  },
  {
    "id": "atelier-ribbon-scarf",
    "country": "fr",
    "slot": "neck",
    "price": 36,
    "tone": "#3c4f7b",
    "names": {
      "traditional-chinese": "工坊三色絲巾",
      "english": "Atelier tricolour scarf",
      "french": "Foulard tricolore d’atelier",
      "italian": "Foulard tricolore d’atelier",
      "spanish": "Pañuelo tricolor de taller"
    },
    "variant": 5
  },
  {
    "id": "lavender-enamel",
    "country": "fr",
    "slot": "material",
    "price": 60,
    "tone": "#a19aba",
    "names": {
      "traditional-chinese": "薰衣草琺瑯",
      "english": "Lavender enamel",
      "french": "Émail lavande",
      "italian": "Smalto lavanda",
      "spanish": "Esmalte lavanda"
    },
    "variant": 6
  },
  {
    "id": "pink-pearl",
    "country": "fr",
    "slot": "material",
    "price": 66,
    "tone": "#dbc0c4",
    "names": {
      "traditional-chinese": "玫瑰珍珠瓷",
      "english": "Rose pearl porcelain",
      "french": "Porcelaine perle rosée",
      "italian": "Porcellana perla rosata",
      "spanish": "Porcelana perla rosa"
    },
    "variant": 7
  },
  {
    "id": "fr-orbit-stamp",
    "country": "fr",
    "slot": "pin",
    "price": 24,
    "tone": "#3c5992",
    "names": {
      "traditional-chinese": "國慶紀念郵票・7月14日",
      "english": "National Day stamp · 14 Jul",
      "french": "Timbre du 14 Juillet",
      "italian": "Francobollo festa nazionale · 14 lug.",
      "spanish": "Sello de fiesta nacional · 14 jul."
    },
    "variant": 8
  },
  {
    "id": "fr-signal-module",
    "country": "fr",
    "slot": "charm",
    "price": 45,
    "tone": "#4d6799",
    "names": {
      "traditional-chinese": "三色光學模組",
      "english": "Tricolour optical module",
      "french": "Module optique tricolore",
      "italian": "Modulo ottico tricolore",
      "spanish": "Módulo óptico tricolor"
    },
    "variant": 9
  },
  {
    "id": "gelato-drop-earrings",
    "country": "it",
    "slot": "earrings",
    "price": 30,
    "tone": "#a3bf7d",
    "names": {
      "traditional-chinese": "開心果冰淇淋耳環",
      "english": "Pistachio gelato earring",
      "french": "Boucle gelato pistache",
      "italian": "Orecchino gelato al pistacchio",
      "spanish": "Pendiente de helado de pistacho"
    },
    "variant": 0
  },
  {
    "id": "millefiori-earrings",
    "country": "it",
    "slot": "earrings",
    "price": 36,
    "tone": "#cc7956",
    "names": {
      "traditional-chinese": "琉璃花耳環",
      "english": "Millefiori earring",
      "french": "Boucle millefiori",
      "italian": "Orecchino millefiori",
      "spanish": "Pendiente millefiori"
    },
    "variant": 1
  },
  {
    "id": "it-signal-brow",
    "country": "it",
    "slot": "brow",
    "price": 24,
    "tone": "#439476",
    "names": {
      "traditional-chinese": "翡翠訊號眉環",
      "english": "Emerald signal brow ring",
      "french": "Anneau de sourcil signal émeraude",
      "italian": "Anello sopracciglio segnale smeraldo",
      "spanish": "Aro de ceja señal esmeralda"
    },
    "variant": 2
  },
  {
    "id": "sun-medallion-necklace",
    "country": "it",
    "slot": "necklace",
    "price": 39,
    "tone": "#c8a058",
    "names": {
      "traditional-chinese": "日光圓章項鍊",
      "english": "Sun medallion necklace",
      "french": "Collier médaillon solaire",
      "italian": "Collana medaglione solare",
      "spanish": "Collar medallón solar"
    },
    "variant": 3
  },
  {
    "id": "espresso-fedora",
    "country": "it",
    "slot": "head",
    "price": 39,
    "tone": "#6c4a37",
    "names": {
      "traditional-chinese": "濃縮咖啡紳士帽",
      "english": "Espresso fedora",
      "french": "Fedora espresso",
      "italian": "Fedora espresso",
      "spanish": "Fedora espresso"
    },
    "variant": 4
  },
  {
    "id": "riviera-knit-scarf",
    "country": "it",
    "slot": "neck",
    "price": 36,
    "tone": "#439475",
    "names": {
      "traditional-chinese": "蔚藍海岸針織圍巾",
      "english": "Riviera knit scarf",
      "french": "Écharpe tricotée Riviera",
      "italian": "Sciarpa Riviera lavorata a maglia",
      "spanish": "Bufanda Riviera de punto"
    },
    "variant": 5
  },
  {
    "id": "lagoon-glass",
    "country": "it",
    "slot": "material",
    "price": 69,
    "tone": "#498f91",
    "names": {
      "traditional-chinese": "潟湖琉璃",
      "english": "Lagoon glass",
      "french": "Verre lagune",
      "italian": "Vetro laguna",
      "spanish": "Vidrio laguna"
    },
    "variant": 6
  },
  {
    "id": "pistachio-ceramic",
    "country": "it",
    "slot": "material",
    "price": 60,
    "tone": "#b3c397",
    "names": {
      "traditional-chinese": "開心果陶瓷",
      "english": "Pistachio ceramic",
      "french": "Céramique pistache",
      "italian": "Ceramica pistacchio",
      "spanish": "Cerámica pistacho"
    },
    "variant": 7
  },
  {
    "id": "it-orbit-stamp",
    "country": "it",
    "slot": "pin",
    "price": 24,
    "tone": "#438469",
    "names": {
      "traditional-chinese": "共和國日郵票・6月2日",
      "english": "Republic Day stamp · 2 Jun",
      "french": "Timbre de la République · 2 juin",
      "italian": "Francobollo Festa della Repubblica · 2 giu.",
      "spanish": "Sello de la República · 2 jun."
    },
    "variant": 8
  },
  {
    "id": "it-signal-module",
    "country": "it",
    "slot": "charm",
    "price": 45,
    "tone": "#438469",
    "names": {
      "traditional-chinese": "三色導航模組",
      "english": "Tricolour navigation module",
      "french": "Module de navigation tricolore",
      "italian": "Modulo di navigazione tricolore",
      "spanish": "Módulo de navegación tricolor"
    },
    "variant": 9
  },
  {
    "id": "churro-loop-earrings",
    "country": "es",
    "slot": "earrings",
    "price": 30,
    "tone": "#c48c45",
    "names": {
      "traditional-chinese": "吉拿棒圈耳環",
      "english": "Churro hoop earring",
      "french": "Créole churro",
      "italian": "Orecchino a cerchio churro",
      "spanish": "Pendiente de aro churro"
    },
    "variant": 0
  },
  {
    "id": "solar-fan-earrings",
    "country": "es",
    "slot": "earrings",
    "price": 36,
    "tone": "#d2a651",
    "names": {
      "traditional-chinese": "日光摺扇耳環",
      "english": "Solar fan earring",
      "french": "Boucle éventail solaire",
      "italian": "Orecchino ventaglio solare",
      "spanish": "Pendiente abanico solar"
    },
    "variant": 1
  },
  {
    "id": "es-signal-brow",
    "country": "es",
    "slot": "brow",
    "price": 24,
    "tone": "#ceaa4b",
    "names": {
      "traditional-chinese": "赤金訊號眉環",
      "english": "Red and gold signal brow ring",
      "french": "Anneau de sourcil signal rouge et or",
      "italian": "Anello sopracciglio segnale rosso e oro",
      "spanish": "Aro de ceja señal roja y dorada"
    },
    "variant": 2
  },
  {
    "id": "mosaic-pendant-necklace",
    "country": "es",
    "slot": "necklace",
    "price": 39,
    "tone": "#608cb1",
    "names": {
      "traditional-chinese": "花磚墜飾項鍊",
      "english": "Mosaic pendant necklace",
      "french": "Collier pendentif mosaïque",
      "italian": "Collana pendente mosaico",
      "spanish": "Collar colgante mosaico"
    },
    "variant": 3
  },
  {
    "id": "cordoba-flat-hat",
    "country": "es",
    "slot": "head",
    "price": 39,
    "tone": "#313337",
    "names": {
      "traditional-chinese": "科爾多瓦平頂帽",
      "english": "Córdoba flat hat",
      "french": "Chapeau plat de Cordoue",
      "italian": "Cappello piatto di Cordova",
      "spanish": "Sombrero cordobés"
    },
    "variant": 4
  },
  {
    "id": "fiesta-woven-scarf",
    "country": "es",
    "slot": "neck",
    "price": 36,
    "tone": "#b9443d",
    "names": {
      "traditional-chinese": "慶典織紋圍巾",
      "english": "Fiesta woven scarf",
      "french": "Écharpe tissée de fête",
      "italian": "Sciarpa tessuta da festa",
      "spanish": "Bufanda tejida de fiesta"
    },
    "variant": 5
  },
  {
    "id": "saffron-glaze",
    "country": "es",
    "slot": "material",
    "price": 60,
    "tone": "#d5a347",
    "names": {
      "traditional-chinese": "番紅花釉",
      "english": "Saffron glaze",
      "french": "Glaçure safran",
      "italian": "Smalto zafferano",
      "spanish": "Esmalte azafrán"
    },
    "variant": 6
  },
  {
    "id": "cobalt-metal",
    "country": "es",
    "slot": "material",
    "price": 66,
    "tone": "#325e9e",
    "names": {
      "traditional-chinese": "鈷藍金屬",
      "english": "Cobalt metal",
      "french": "Métal cobalt",
      "italian": "Metallo cobalto",
      "spanish": "Metal cobalto"
    },
    "variant": 7
  },
  {
    "id": "es-orbit-stamp",
    "country": "es",
    "slot": "pin",
    "price": 24,
    "tone": "#c65843",
    "names": {
      "traditional-chinese": "國慶紀念郵票・10月12日",
      "english": "National Day stamp · 12 Oct",
      "french": "Timbre de fête nationale · 12 oct.",
      "italian": "Francobollo festa nazionale · 12 ott.",
      "spanish": "Sello de fiesta nacional · 12 oct."
    },
    "variant": 8
  },
  {
    "id": "es-signal-module",
    "country": "es",
    "slot": "charm",
    "price": 45,
    "tone": "#bf483a",
    "names": {
      "traditional-chinese": "赤金太陽能模組",
      "english": "Red and gold solar module",
      "french": "Module solaire rouge et or",
      "italian": "Modulo solare rosso e oro",
      "spanish": "Módulo solar rojo y dorado"
    },
    "variant": 9
  }
];
