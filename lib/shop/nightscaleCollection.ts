import type { ShopItem } from "./catalog";

/* =========================================================
   Nightscale｜夜鱗典藏 — 24 limited pieces

   Unlocked by Hangyumi: every third word won finds one the reader does
   not own yet (Chi, 2026-11-11: "猜對3題就可以解開神秘飾品"). Never sold.
   The database keeps them (`yumi_shop_items` rows, limited, unavailable,
   from the 'nightscale' pool, *_hangyumi_nightscale.sql) and decides
   every award itself.

   A tribute (Chi: "致敬 kobe bryant…在不侵犯 rights 的情況下設計出 24 件
   象徵 black mamba 的神秘物品"). Chi drew the line on 2026-11-11: symbols
   and one dedication that names nobody. So the pieces speak only in
   symbols: black-mamba scales, the numbers 8 and 24, four in the morning,
   purple-and-gold accents, five rings, the fadeaway, twenty seasons in one
   place, 81, the empty gym before dawn. Nowhere in the app, in any
   language: his name or likeness, the words "Black Mamba" or "Mamba"
   (registered marks), a quotation of his, or any team's or brand's name,
   logo or uniform. Twenty-four of them, two for every slot.

   Built in lib/yumi3d/nightscaleOutfit.ts.
   ========================================================= */

export type NightscaleItem = ShopItem & {
  /** "01" to "24": the number on its seal while it is not owned. */
  seal: string;
  /** One or two sentences, shown as it is revealed. */
  intro: ShopItem["names"];
};

type Row = [id: string, slot: ShopItem["slot"], tone: string,
  zh: string, en: string, fr: string, it: string, es: string];

const ROWS: Row[] = [
  // Shell finishes
  ["ns-nightscale-lacquer", "material", "#1b1d1a", "夜鱗漆殼", "Nightscale Lacquer", "Laque d’écailles nocturnes", "Lacca di squame notturne", "Laca de escamas nocturnas"],
  ["ns-dusk-court-enamel", "material", "#3b2350", "暮色球場琺瑯", "Dusk Court Enamel", "Émail du terrain au crépuscule", "Smalto del campo al tramonto", "Esmalte de cancha al anochecer"],
  // Pupils
  ["ns-focus-slit", "pupil", "#d4a93c", "專注豎瞳", "Focus Slit", "Pupille de la concentration", "Pupilla della concentrazione", "Pupila de la concentración"],
  ["ns-figure-eight-pupil", "pupil", "#2a2630", "雙環八字瞳", "Figure-Eight Pupil", "Pupille en huit", "Pupilla a otto", "Pupila en ocho"],
  // Irises
  ["ns-venom-gold-iris", "iris", "#c9952c", "毒金虹膜", "Venom Gold Iris", "Iris d’or venimeux", "Iride d’oro velenoso", "Iris de oro venenoso"],
  ["ns-four-am-iris", "iris", "#1e2346", "凌晨四點虹膜", "Four A.M. Iris", "Iris de quatre heures du matin", "Iride delle quattro del mattino", "Iris de las cuatro de la mañana"],
  // Eyewear
  ["ns-night-practice-goggles", "eyewear", "#2a2b2f", "夜練護目鏡", "Night Practice Goggles", "Lunettes de l’entraînement de nuit", "Occhiali dell’allenamento notturno", "Gafas del entrenamiento nocturno"],
  ["ns-fadeaway-monocle", "eyewear", "#d6b062", "後仰單片鏡", "Fadeaway Monocle", "Monocle du fadeaway", "Monocolo del fadeaway", "Monóculo del fadeaway"],
  // Head
  ["ns-four-am-headband", "head", "#18191c", "凌晨四點頭帶", "Four A.M. Headband", "Bandeau de quatre heures", "Fascia delle quattro", "Cinta de las cuatro"],
  ["ns-five-ring-circlet", "head", "#d4ad52", "五環冠", "Circlet of Five Rings", "Diadème aux cinq anneaux", "Diadema dei cinque anelli", "Diadema de los cinco anillos"],
  // Neck
  ["ns-warmup-collar", "neck", "#222326", "熱身立領", "Warm-Up Collar", "Col d’échauffement", "Colletto da riscaldamento", "Cuello de calentamiento"],
  ["ns-coiled-scale-scarf", "neck", "#3a3d33", "盤鱗圍巾", "Coiled Scale Scarf", "Écharpe aux écailles enroulées", "Sciarpa a squame avvolta", "Bufanda de escamas enroscada"],
  // Pins
  ["ns-seam-pin", "pin", "#1d1d1f", "黑金球縫胸針", "Black-and-Gold Seam Pin", "Broche aux coutures d’or", "Spilla dalle cuciture d’oro", "Broche de costuras doradas"],
  ["ns-eighty-one-medal", "pin", "#c99a3e", "八十一分勳章", "Eighty-One Medal", "Médaille des quatre-vingt-un", "Medaglia dell’ottantuno", "Medalla del ochenta y uno"],
  // Mouth
  ["ns-dawn-espresso", "mouth", "#2b1d14", "黎明濃縮咖啡", "Dawn Espresso", "Espresso de l’aube", "Espresso dell’alba", "Espresso del amanecer"],
  ["ns-fourth-quarter-flask", "mouth", "#232427", "第四節水壺", "Fourth-Quarter Flask", "Gourde du quatrième quart-temps", "Borraccia dell’ultimo quarto", "Botella del último cuarto"],
  // Charms
  ["ns-four-oclock-hourglass", "charm", "#2a2440", "四點沙漏", "Four O’Clock Hourglass", "Sablier de quatre heures", "Clessidra delle quattro", "Reloj de arena de las cuatro"],
  ["ns-empty-gym-key", "charm", "#b88c3a", "空場館鑰匙", "Empty Gym Key", "Clé du gymnase vide", "Chiave della palestra vuota", "Llave del gimnasio vacío"],
  // Earrings, single, on her left
  ["ns-fang-drop", "earrings", "#141516", "毒牙耳墜", "Fang Drop", "Goutte en croc", "Goccia a zanna", "Gota de colmillo"],
  ["ns-swish-net", "earrings", "#e8dcc0", "空心入網耳墜", "Swish Net", "Filet propre", "Solo rete", "Red limpia"],
  // Brow
  ["ns-scale-cuff", "brow", "#2f322b", "鱗紋眉環", "Scale Cuff", "Anneau d’écailles", "Anello di squame", "Aro de escamas"],
  ["ns-twenty-notches", "brow", "#1c1c1e", "二十道刻痕眉環", "Twenty Notches", "Vingt encoches", "Venti tacche", "Veinte muescas"],
  // Necklaces: the last, the twenty-fourth, the two banners
  ["ns-coiled-serpent-chain", "necklace", "#202220", "盤蛇項鍊", "Coiled Serpent Chain", "Chaîne du serpent lové", "Catena del serpente avvolto", "Cadena de la serpiente enroscada"],
  ["ns-two-banners", "necklace", "#4a2a6a", "雙旗高懸", "Two Banners", "Deux bannières", "Due stendardi", "Dos estandartes"],
];

/* What the reveal says about each, in the order zh, en, fr, it, es: a
   symbol and what it stands for, never whom. */
type Intro = [zh: string, en: string, fr: string, it: string, es: string];

const INTROS: Record<string, Intro> = {
  "ns-nightscale-lacquer": [
    "黑漆上覆著一層細密的鱗紋，只有在轉身時，邊緣才透出橄欖灰的光。",
    "Black lacquer over a fine relief of scales; only when she turns does an olive-grey sheen show at the edges.",
    "Une laque noire sur un fin relief d’écailles ; ce n’est qu’en se tournant qu’un reflet gris olive apparaît sur les bords.",
    "Lacca nera su un fine rilievo di squame; solo quando si gira, ai bordi affiora un riflesso grigio oliva.",
    "Laca negra sobre un fino relieve de escamas; solo al girarse asoma en los bordes un brillo gris oliva.",
  ],
  "ns-dusk-court-enamel": [
    "深紫琺瑯配一道細金線，像燈還沒全亮時的球場地板。",
    "Deep purple enamel with one fine gold line, like a court floor before all the lights are on.",
    "Un émail violet profond traversé d’un fin filet d’or, comme le parquet d’un terrain avant que toutes les lumières ne s’allument.",
    "Smalto viola profondo con un sottile filo d’oro, come il parquet di un campo prima che si accendano tutte le luci.",
    "Esmalte morado profundo con una fina línea dorada, como el suelo de una cancha antes de que se enciendan todas las luces.",
  ],
  "ns-focus-slit": [
    "一道細長的金邊豎瞳：那一刻，整座球館都安靜下來，只剩下籃框。",
    "A narrow, gold-rimmed slit: the moment the whole arena goes quiet and only the rim is left.",
    "Une fente étroite cerclée d’or : l’instant où toute la salle se tait et où il ne reste que le cercle.",
    "Una fessura stretta bordata d’oro: l’istante in cui tutta l’arena tace e resta solo il ferro.",
    "Una rendija estrecha con borde dorado: el instante en que todo el pabellón calla y solo queda el aro.",
  ],
  "ns-figure-eight-pupil": [
    "兩個相疊的圓寫成一個 8；橫過來看，是一個不會結束的循環。",
    "Two stacked circles that make an 8 — and, turned on its side, a loop that never ends.",
    "Deux cercles superposés qui forment un 8 — et, couché, une boucle qui ne finit jamais.",
    "Due cerchi sovrapposti che formano un 8 — e, girato su un fianco, un anello che non finisce mai.",
    "Dos círculos superpuestos que forman un 8 — y, de lado, un bucle que nunca termina.",
  ],
  "ns-venom-gold-iris": [
    "金色虹膜裡有橄欖黑的放射紋，安靜，卻隨時準備出手。",
    "A gold iris rayed with olive black: still, and ready to strike at any moment.",
    "Un iris d’or strié de noir olive : immobile, et prêt à frapper à tout instant.",
    "Un’iride d’oro striata di nero oliva: immobile, e pronta a colpire in ogni momento.",
    "Un iris dorado con rayos negro oliva: quieto, y listo para atacar en cualquier momento.",
  ],
  "ns-four-am-iris": [
    "深藍轉紫的夜色，邊緣只有一圈極細的金光：天還沒亮，練習已經開始。",
    "Night blue deepening to violet, with the thinnest ring of gold at the edge: before dawn, practice has already begun.",
    "Un bleu nuit qui vire au violet, cerclé d’un très fin anneau d’or : avant l’aube, l’entraînement a déjà commencé.",
    "Blu notte che sfuma nel viola, con un sottilissimo anello d’oro sul bordo: prima dell’alba l’allenamento è già cominciato.",
    "Azul noche que se vuelve violeta, con un finísimo anillo dorado en el borde: antes del amanecer, el entrenamiento ya ha empezado.",
  ],
  "ns-night-practice-goggles": [
    "煙燻鏡片配黑色包覆框，側邊一道紫金細線。給燈還沒全開的球館。",
    "A smoked lens in a wraparound black frame, a fine purple-and-gold line at the side. For a gym with half its lights still off.",
    "Un verre fumé dans une monture noire enveloppante, un fin liseré violet et or sur le côté. Pour un gymnase encore à moitié dans le noir.",
    "Una lente fumé in una montatura nera avvolgente, un sottile filo viola e oro sul lato. Per una palestra ancora mezza al buio.",
    "Una lente ahumada en una montura negra envolvente, con una fina línea morada y dorada al lado. Para un gimnasio aún a media luz.",
  ],
  "ns-fadeaway-monocle": [
    "金色鏡框後方拖著一道向後仰的弧線，像身體往後倒、球卻往前飛的那一刻。",
    "A gold rim trailing an arc that leans back, like the instant the body falls away and the ball goes forward.",
    "Une monture dorée suivie d’un arc penché en arrière, comme l’instant où le corps s’éloigne et où le ballon part en avant.",
    "Una montatura d’oro seguita da un arco inclinato all’indietro, come l’istante in cui il corpo si allontana e la palla va avanti.",
    "Una montura dorada seguida de un arco inclinado hacia atrás, como el instante en que el cuerpo se aleja y el balón sale hacia delante.",
  ],
  "ns-four-am-headband": [
    "黑色毛巾布頭帶，一道紫、一道金。汗水是它唯一的裝飾。",
    "A black terry headband with one purple stripe and one gold. Sweat is its only decoration.",
    "Un bandeau en éponge noire, une rayure violette et une dorée. La sueur est son seul ornement.",
    "Una fascia di spugna nera, una riga viola e una d’oro. Il sudore è il suo unico ornamento.",
    "Una cinta de rizo negra con una franja morada y otra dorada. El sudor es su único adorno.",
  ],
  "ns-five-ring-circlet": [
    "五枚分開的金環排成一列，每一枚都是自己贏回來的。",
    "Five separate gold rings set in a row, each one won on its own.",
    "Cinq anneaux d’or séparés, alignés, chacun gagné à son tour.",
    "Cinque anelli d’oro separati, in fila, ognuno conquistato a sé.",
    "Cinco anillos de oro separados, en fila, cada uno ganado por sí solo.",
  ],
  "ns-warmup-collar": [
    "熱身外套的黑色立領，紫金滾邊。拉鍊拉到最上面，就該上場了。",
    "The black stand collar of a warm-up jacket, piped in purple and gold. Zipped all the way up: time to go on.",
    "Le col montant noir d’une veste d’échauffement, passepoilé violet et or. Fermé jusqu’en haut : c’est l’heure d’entrer.",
    "Il colletto alto nero di una giacca da riscaldamento, profilato viola e oro. Chiuso fino in cima: è ora di entrare.",
    "El cuello alto negro de una chaqueta de calentamiento, con vivos morados y dorados. Cerrado hasta arriba: hora de salir.",
  ],
  "ns-coiled-scale-scarf": [
    "以鱗片針法織成的圍巾，繞頸一圈又一圈，像一條安靜盤起的蛇。",
    "A scarf knitted in a scale stitch, wound round and round like a snake coiled quietly at rest.",
    "Une écharpe tricotée au point d’écailles, enroulée encore et encore comme un serpent lové au repos.",
    "Una sciarpa lavorata a punto squama, avvolta e riavvolta come un serpente acciambellato a riposo.",
    "Una bufanda tejida en punto de escamas, enrollada una y otra vez como una serpiente enroscada en reposo.",
  ],
  "ns-seam-pin": [
    "一顆小小的黑色籃球：八片皮革、金色球縫，被摸過無數次才這麼亮。",
    "A small black basketball: eight panels, gold seams, polished bright by countless hands.",
    "Un petit ballon noir : huit panneaux, des coutures d’or, poli par d’innombrables mains.",
    "Un piccolo pallone nero: otto spicchi, cuciture d’oro, lucidato da innumerevoli mani.",
    "Un pequeño balón negro: ocho gajos, costuras doradas, pulido por incontables manos.",
  ],
  "ns-eighty-one-medal": [
    "一枚刻著 81 的小勳章。有些夜晚，籃框看起來像海一樣大。",
    "A small medal engraved 81. Some nights the rim looks as wide as the sea.",
    "Une petite médaille gravée 81. Certains soirs, le cercle paraît aussi large que la mer.",
    "Una piccola medaglia incisa con 81. Certe sere il ferro sembra largo come il mare.",
    "Una pequeña medalla grabada con 81. Algunas noches el aro parece tan ancho como el mar.",
  ],
  "ns-dawn-espresso": [
    "黑杯金緣的一杯濃縮咖啡，在天亮以前，也在球館開門以前。",
    "An espresso in a black cup with a gold rim, before the sun and before the gym doors open.",
    "Un espresso dans une tasse noire au bord doré, avant le soleil et avant l’ouverture du gymnase.",
    "Un espresso in una tazzina nera dal bordo d’oro, prima del sole e prima che apra la palestra.",
    "Un espresso en una taza negra de borde dorado, antes del sol y antes de que abra el gimnasio.",
  ],
  "ns-fourth-quarter-flask": [
    "霧黑運動水壺，一圈紫、一個金蓋。比賽最後幾分鐘，它總是空的。",
    "A matte black sports bottle with a purple band and a gold cap. In the last minutes of a game it is always empty.",
    "Une gourde noir mat, une bande violette et un bouchon doré. Dans les dernières minutes d’un match, elle est toujours vide.",
    "Una borraccia nero opaco con una fascia viola e un tappo d’oro. Negli ultimi minuti di partita è sempre vuota.",
    "Una botella negro mate con una banda morada y un tapón dorado. En los últimos minutos del partido siempre está vacía.",
  ],
  "ns-four-oclock-hourglass": [
    "一只小沙漏，黑沙落在紫色玻璃裡。翻過來的那一刻，就是凌晨四點。",
    "A small hourglass of black sand in violet glass. The moment it is turned over, it is four in the morning.",
    "Un petit sablier de sable noir dans un verre violet. Au moment où on le retourne, il est quatre heures du matin.",
    "Una piccola clessidra di sabbia nera in vetro viola. Nel momento in cui la si capovolge, sono le quattro del mattino.",
    "Un pequeño reloj de arena negra en vidrio violeta. En el momento en que se le da la vuelta, son las cuatro de la mañana.",
  ],
  "ns-empty-gym-key": [
    "一把舊鑰匙，柄上刻著鱗紋。它打開的，是一座還沒有人到的球館。",
    "An old key with scales engraved on its bow. What it opens is a gym where no one has arrived yet.",
    "Une vieille clé aux écailles gravées sur l’anneau. Elle ouvre un gymnase où personne n’est encore arrivé.",
    "Una vecchia chiave con squame incise sull’impugnatura. Apre una palestra dove non è ancora arrivato nessuno.",
    "Una llave antigua con escamas grabadas en el ojo. Lo que abre es un gimnasio al que todavía no ha llegado nadie.",
  ],
  "ns-fang-drop": [
    "一枚彎曲的黑琺瑯毒牙，尖端一點金。只出手一次，就夠了。",
    "One curved fang in black enamel, tipped with gold. One strike is enough.",
    "Un croc courbe en émail noir, à la pointe dorée. Un seul coup suffit.",
    "Una zanna curva in smalto nero, con la punta d’oro. Basta un colpo solo.",
    "Un colmillo curvo de esmalte negro con la punta dorada. Basta un solo golpe.",
  ],
  "ns-swish-net": [
    "一個小金框，下面垂著編織的網。最好聽的聲音，是球不碰框就落網。",
    "A small gold rim with a woven net hanging from it. The best sound there is: nothing but net.",
    "Un petit cercle doré d’où pend un filet tressé. Le plus beau son qui soit : rien que le filet.",
    "Un piccolo ferro d’oro con una retina intrecciata. Il suono più bello che ci sia: solo rete.",
    "Un pequeño aro dorado con una red trenzada colgando. El mejor sonido que existe: solo red.",
  ],
  "ns-scale-cuff": [
    "一排相疊的鱗片沿著眉骨排開，黑中帶橄欖綠，冷靜而鋒利。",
    "A row of overlapping scales along the brow, black with a hint of olive: calm, and sharp.",
    "Une rangée d’écailles superposées le long du sourcil, noires teintées d’olive : calmes, et tranchantes.",
    "Una fila di squame sovrapposte lungo l’arcata, nere con un accenno d’oliva: calme, e affilate.",
    "Una hilera de escamas superpuestas sobre la ceja, negras con un toque oliva: serenas y afiladas.",
  ],
  "ns-twenty-notches": [
    "黑色眉環上有二十道金色刻痕，一道是一個賽季，全都留在同一個地方。",
    "Twenty gold notches on a black cuff, one for each season, all of them spent in the same place.",
    "Vingt encoches d’or sur un anneau noir, une par saison, toutes passées au même endroit.",
    "Venti tacche d’oro su un anello nero, una per stagione, tutte trascorse nello stesso posto.",
    "Veinte muescas doradas en un aro negro, una por temporada, todas en el mismo lugar.",
  ],
  "ns-coiled-serpent-chain": [
    "黑色蛇鍊在胸前盤一圈，蛇首微微抬起：安靜，卻什麼都看得見。",
    "A black snake chain that coils once at the front, its head slightly raised: quiet, and seeing everything.",
    "Une chaîne serpent noire qui s’enroule une fois sur le devant, la tête un peu relevée : silencieuse, et qui voit tout.",
    "Una catena a serpente nera che si avvolge una volta sul davanti, la testa un po’ sollevata: silenziosa, e vede tutto.",
    "Una cadena de serpiente negra que se enrosca una vez al frente, con la cabeza algo levantada: callada, y que lo ve todo.",
  ],
  "ns-two-banners": [
    "細金桿上掛著兩面小旗，一面是 8，一面是 24。從此一直掛在高處，從沒放下來過。",
    "Two small banners hang from a thin gold bar, one marked 8, one marked 24. They have hung up high ever since.",
    "Deux petites bannières pendent d’une fine barre d’or, l’une marquée 8, l’autre 24. Elles sont restées là-haut depuis.",
    "Due piccoli stendardi pendono da una sottile barra d’oro, uno con l’8 e uno con il 24. Da allora sono rimasti in alto.",
    "Dos pequeños estandartes cuelgan de una fina barra dorada, uno con el 8 y otro con el 24. Desde entonces siguen en lo alto.",
  ],
};

export const NIGHTSCALE_ITEMS: readonly NightscaleItem[] = ROWS.map(([id, slot, tone, zh, en, fr, it, es], index) => {
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

/** Every third word won in Hangyumi unlocks one. */
export const WINS_PER_PIECE = 3;

const NIGHTSCALE_IDS = new Set(NIGHTSCALE_ITEMS.map(item => item.id));

export function isNightscale(id: string | null | undefined): boolean {
  return !!id && NIGHTSCALE_IDS.has(id);
}

export function nightscaleItem(id: string | null | undefined): NightscaleItem | null {
  return id ? NIGHTSCALE_ITEMS.find(item => item.id === id) ?? null : null;
}
