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

export type MythicItem = ShopItem & {
  origin: MythOrigin;
  /** One sentence, shown as it is revealed out of the chest (2026-11-11). */
  intro: ShopItem["names"];
};

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


/* What the reveal says about each (Chi, 2026-11-11: every game shows the
   piece it unlocks whole, with a line about it), in the order zh, en, fr,
   it, es: the story's object, never a god's likeness. */
type Intro = [zh: string, en: string, fr: string, it: string, es: string];

const INTROS: Record<string, Intro> = {
  "myth-olympus-marble": [
    "神諭山丘上的白色大理石，紋理裡流著眾神的金光。",
    "White marble from the oracle’s hill, its veins running with the gods’ gold.",
    "Un marbre blanc de la colline de l’oracle, veiné de l’or des dieux.",
    "Marmo bianco dal colle dell’oracolo, venato dell’oro degli dèi.",
    "Mármol blanco de la colina del oráculo, con vetas del oro de los dioses.",
  ],
  "myth-bifrost-frost": [
    "連接眾世界的彩虹橋上結的霜，珍珠白上覆著一層極光。",
    "Frost from the rainbow bridge between the worlds, pearl-white under an aurora.",
    "Du givre du pont arc-en-ciel entre les mondes, blanc nacré sous une aurore.",
    "Brina del ponte arcobaleno tra i mondi, bianco perla sotto un’aurora.",
    "Escarcha del puente arcoíris entre los mundos, blanco perla bajo una aurora.",
  ],
  "myth-nile-lapis": [
    "尼羅河的深藍青金石，灑著金砂，像河上的夜空。",
    "Deep blue lapis of the Nile, flecked with gold like a night sky over the river.",
    "Un lapis bleu profond du Nil, pailleté d’or comme un ciel de nuit sur le fleuve.",
    "Lapislazzuli blu profondo del Nilo, punteggiato d’oro come un cielo notturno sul fiume.",
    "Lapislázuli azul profundo del Nilo, salpicado de oro como un cielo nocturno sobre el río.",
  ],
  "myth-sun-disk": [
    "一枚放出十二道光芒的太陽金盤，自己會發光。",
    "A disk of sun-gold with twelve rays, giving its own light.",
    "Un disque d’or solaire à douze rayons, qui brille de sa propre lumière.",
    "Un disco d’oro solare a dodici raggi, che brilla di luce propria.",
    "Un disco de oro solar con doce rayos, que brilla con luz propia.",
  ],
  "myth-moon-rabbit": [
    "一彎新月，月宮裡的玉兔還在搗著仙藥。",
    "A crescent moon with the rabbit who lives there, still pounding the elixir.",
    "Un croissant de lune et le lapin qui y vit, pilant toujours l’élixir.",
    "Una falce di luna con il coniglio che ci vive, ancora intento a pestare l’elisir.",
    "Una luna creciente con el conejo que vive en ella, machacando aún el elixir.",
  ],
  "myth-gorgon-jade": [
    "翡翠綠的虹膜裡盤著蛇髮女妖的蛇。可以看，但別看太久。",
    "Emerald jade with the Gorgon’s serpents coiling through it. Look, but not for long.",
    "Un jade émeraude où s’enroulent les serpents de la Gorgone. Regardez, mais pas trop longtemps.",
    "Giada smeraldo in cui si attorcigliano i serpenti della Gorgone. Guardala, ma non troppo a lungo.",
    "Jade esmeralda con las serpientes de la Gorgona enroscadas. Mírala, pero no demasiado tiempo.",
  ],
  "myth-bifrost-iris": [
    "彩虹橋化成一圈圈的顏色，色帶之間結著霜。",
    "The rainbow bridge in rings, with frost between the colours.",
    "Le pont arc-en-ciel en anneaux, avec du givre entre les couleurs.",
    "Il ponte arcobaleno ad anelli, con la brina tra i colori.",
    "El puente arcoíris en anillos, con escarcha entre los colores.",
  ],
  "myth-ishtar-star": [
    "伊什塔爾的八芒星，以金色畫在青金石般的夜空上。",
    "Ishtar’s star of eight points, gold on a night of lapis.",
    "L’étoile à huit branches d’Ishtar, en or sur une nuit de lapis.",
    "La stella a otto punte di Ishtar, d’oro su una notte di lapislazzuli.",
    "La estrella de ocho puntas de Ishtar, dorada sobre una noche de lapislázuli.",
  ],
  "myth-raven-monocle": [
    "鏡框上揚起兩隻烏鴉的翅膀：一隻是思想，一隻是記憶。",
    "Two ravens’ wings sweep up from the rim: one for thought, one for memory.",
    "Deux ailes de corbeau s’élèvent de la monture : l’une pour la pensée, l’autre pour la mémoire.",
    "Due ali di corvo si alzano dalla montatura: una per il pensiero, una per la memoria.",
    "Dos alas de cuervo se alzan desde la montura: una para el pensamiento y otra para la memoria.",
  ],
  "myth-horus-visor": [
    "鷹的紋樣以金色描在深藍鏡片四周，替你守望。",
    "The falcon’s markings drawn in gold round a deep blue lens that watches over you.",
    "Les marques du faucon dessinées en or autour d’un verre bleu profond qui veille sur vous.",
    "I segni del falco tracciati in oro attorno a una lente blu profonda che veglia su di te.",
    "Las marcas del halcón trazadas en oro alrededor de una lente azul profundo que vela por ti.",
  ],
  "myth-owl-spectacles": [
    "有貓頭鷹眉形的圓眼鏡，讓你在黑暗中也看得清楚。",
    "Round spectacles with an owl’s brow, for seeing clearly in the dark.",
    "Des lunettes rondes au sourcil de chouette, pour voir clair dans le noir.",
    "Occhiali tondi con le sopracciglia della civetta, per vedere chiaro nel buio.",
    "Gafas redondas con cejas de búho, para ver con claridad en la oscuridad.",
  ],
  "myth-laurel-crown": [
    "兩枝沐著陽光的月桂枝交成 V 字，金色葉片自己發著光。",
    "Two sunlit branches of laurel rising into a V, their gold leaves giving light.",
    "Deux branches de laurier ensoleillées qui montent en V, leurs feuilles d’or donnant la lumière.",
    "Due rami di alloro al sole che salgono a V, con foglie d’oro che fanno luce.",
    "Dos ramas de laurel bañadas de sol que suben en V, con hojas de oro que dan luz.",
  ],
  "myth-valkyrie-wings": [
    "頭兩側各有一片月光下的鋼藍羽翼，向後掠起，像正在飛翔。",
    "Moonlit steel-blue wings either side of the head, swept back as if in flight.",
    "Des ailes bleu acier au clair de lune de chaque côté de la tête, rabattues comme en plein vol.",
    "Ali blu acciaio al chiaro di luna ai lati della testa, tese all’indietro come in volo.",
    "Alas azul acero a la luz de la luna a cada lado de la cabeza, echadas hacia atrás como en pleno vuelo.",
  ],
  "myth-phoenix-crown": [
    "低低的金冠立著羽冠，三根長長的尾羽像拖著火光。",
    "A low gold crown with a crest, and three long tail plumes trailing fire.",
    "Une couronne d’or basse à crête, et trois longues plumes de queue qui traînent du feu.",
    "Una bassa corona d’oro con la cresta e tre lunghe piume di coda che lasciano una scia di fuoco.",
    "Una corona de oro baja con cresta y tres largas plumas de cola que dejan una estela de fuego.",
  ],
  "myth-golden-fleece": [
    "英雄們航行到世界盡頭去找的金羊毛做成的圍巾，以公羊頭扣起。",
    "A scarf of the fleece heroes sailed to the edge of the world for, clasped with a ram’s head.",
    "Une écharpe de la toison que des héros allèrent chercher au bout du monde, fermée d’une tête de bélier.",
    "Una sciarpa del vello che gli eroi andarono a cercare ai confini del mondo, chiusa da una testa di montone.",
    "Una bufanda del vellocino que los héroes fueron a buscar al fin del mundo, cerrada con una cabeza de carnero.",
  ],
  "myth-selkie-shawl": [
    "帶著珍珠光澤的海豹灰披肩，就是海豹仙子留在岸上的那一件。",
    "A shawl of sealskin grey with a pearl sheen, the one a selkie leaves on the shore.",
    "Un châle gris phoque aux reflets de perle, celui qu’une selkie laisse sur le rivage.",
    "Uno scialle grigio foca con riflessi di perla, quello che una selkie lascia sulla riva.",
    "Un chal gris foca con brillo de perla, el que una selkie deja en la orilla.",
  ],
  "myth-nuwa-ribbon": [
    "五彩絲帶，顏色來自女媧補天的五色石。",
    "A silk ribbon in the five colours of the stones that mended the sky.",
    "Un ruban de soie aux cinq couleurs des pierres qui réparèrent le ciel.",
    "Un nastro di seta nei cinque colori delle pietre che ripararono il cielo.",
    "Una cinta de seda con los cinco colores de las piedras que repararon el cielo.",
  ],
  "myth-scarab-pin": [
    "張開金翼的青金石聖甲蟲，把太陽高高托起。",
    "A lapis beetle with gold wings opened wide, holding up the sun.",
    "Un scarabée de lapis aux ailes d’or grandes ouvertes, qui porte le soleil.",
    "Uno scarabeo di lapislazzuli con ali d’oro spalancate, che regge il sole.",
    "Un escarabajo de lapislázuli con alas de oro abiertas, que sostiene el sol.",
  ],
  "myth-triskele-pin": [
    "三道螺旋從同一個中心向外旋開，金色浮雕在綠色琺瑯上。",
    "Three spirals turning out from one centre, in raised gold on green enamel.",
    "Trois spirales qui tournent à partir d’un même centre, en or relevé sur émail vert.",
    "Tre spirali che girano da un unico centro, in oro a rilievo su smalto verde.",
    "Tres espirales que giran desde un mismo centro, en oro en relieve sobre esmalte verde.",
  ],
  "myth-qilin-pin": [
    "環繞著雲紋的玉璧，上方是麒麟的一支角。",
    "A jade disc ringed with cloud scrolls, and the qilin’s single horn above it.",
    "Un disque de jade cerné de volutes de nuages, et au-dessus la corne unique du qilin.",
    "Un disco di giada cinto di volute di nuvole, con sopra il corno unico del qilin.",
    "Un disco de jade rodeado de volutas de nubes, y sobre él el cuerno único del qilin.",
  ],
  "myth-ambrosia-cup": [
    "盛著眾神仙饌的寬口金杯，杯裡的仙饌自己發著光。",
    "A wide gold cup of the gods’ own food, the ambrosia inside giving its own light.",
    "Une large coupe d’or de la nourriture des dieux, l’ambroisie à l’intérieur brillant d’elle-même.",
    "Un’ampia coppa d’oro del cibo degli dèi, con l’ambrosia che brilla di luce propria.",
    "Una amplia copa de oro con el alimento de los dioses, cuya ambrosía brilla con luz propia.",
  ],
  "myth-immortal-peach": [
    "王母瑤池裡的蟠桃，千年才熟一次。",
    "A peach from the Queen Mother’s garden, which ripens once every thousand years.",
    "Une pêche du jardin de la Reine Mère, qui ne mûrit qu’une fois tous les mille ans.",
    "Una pesca del giardino della Regina Madre, che matura una volta ogni mille anni.",
    "Un melocotón del jardín de la Reina Madre, que madura una vez cada mil años.",
  ],
  "myth-mjolnir": [
    "雷神的短柄鎚，上面的符文閃著暴風雨般的藍光。",
    "The thunder god’s short-handled hammer, its runes glowing storm blue.",
    "Le marteau à manche court du dieu du tonnerre, ses runes luisant d’un bleu d’orage.",
    "Il martello dal manico corto del dio del tuono, con le rune che brillano di un blu tempesta.",
    "El martillo de mango corto del dios del trueno, con sus runas brillando en azul tormenta.",
  ],
  "myth-pandora-jar": [
    "所有東西都從這只甕裡逃了出來，只有一點明亮的希望留在裡面。",
    "The jar everything escaped from, and the one bright hope that stayed inside.",
    "La jarre d’où tout s’est échappé, et le seul espoir lumineux resté à l’intérieur.",
    "Il vaso da cui tutto è fuggito, e l’unica speranza luminosa rimasta dentro.",
    "La tinaja de la que todo escapó, y la única esperanza luminosa que se quedó dentro.",
  ],
  "myth-destiny-tablet": [
    "記載命運的泥板，楔形文字閃著金光。",
    "A clay tablet of fates, its wedge-shaped script glowing gold.",
    "Une tablette d’argile des destins, son écriture en coins luisant d’or.",
    "Una tavoletta d’argilla dei destini, con la scrittura a cuneo che brilla d’oro.",
    "Una tablilla de arcilla de los destinos, con su escritura cuneiforme brillando en oro.",
  ],
  "myth-pegasus-feather": [
    "一根來自天馬的白羽，配著金色羽軸。",
    "A white feather from the winged horse, on a gold shaft.",
    "Une plume blanche du cheval ailé, sur une tige d’or.",
    "Una piuma bianca del cavallo alato, su uno stelo d’oro.",
    "Una pluma blanca del caballo alado, sobre un cálamo de oro.",
  ],
  "myth-dragon-pearl": [
    "龍在雲間追逐的那顆寶珠，周圍環著自己的火焰。",
    "The pearl dragons chase through the clouds, ringed with its own flames.",
    "La perle que les dragons poursuivent à travers les nuages, cerclée de ses propres flammes.",
    "La perla che i draghi inseguono tra le nuvole, cinta dalle sue stesse fiamme.",
    "La perla que los dragones persiguen entre las nubes, rodeada de sus propias llamas.",
  ],
  "myth-selene-tear": [
    "一彎月光，落下一滴藍色的淚。",
    "A crescent of moonlight and one blue tear falling from it.",
    "Un croissant de clair de lune et une larme bleue qui en tombe.",
    "Una falce di luna e una lacrima azzurra che ne cade.",
    "Una luna creciente y una lágrima azul que cae de ella.",
  ],
  "myth-hermes-wing": [
    "眉上一片小小的翅膀，羽毛向後收起，像已經在路上。",
    "A small wing on the brow, its feathers laid back as if already on its way.",
    "Une petite aile sur le sourcil, ses plumes couchées comme si elle était déjà en route.",
    "Una piccola ala sul sopracciglio, con le piume all’indietro come se fosse già in viaggio.",
    "Un ala pequeña en la ceja, con las plumas hacia atrás como si ya estuviera en camino.",
  ],
  "myth-gungnir-cuff": [
    "永不落空的長槍橫在眉上，符文環發著光。",
    "The spear that never misses, laid along the brow, its rune bands glowing.",
    "La lance qui ne manque jamais sa cible, posée le long du sourcil, ses bagues de runes luisantes.",
    "La lancia che non manca mai il bersaglio, posata lungo il sopracciglio, con gli anelli di rune che brillano.",
    "La lanza que nunca falla, tendida sobre la ceja, con sus anillos de runas brillando.",
  ],
  "myth-brisingamen": [
    "愛之女神願意付出一切換來的琥珀火焰項鍊。",
    "The necklace of amber flames the goddess of love would give anything for.",
    "Le collier de flammes d’ambre pour lequel la déesse de l’amour aurait tout donné.",
    "La collana di fiamme d’ambra per cui la dea dell’amore avrebbe dato qualsiasi cosa.",
    "El collar de llamas de ámbar por el que la diosa del amor lo habría dado todo.",
  ],
  "myth-lamassu-pendant": [
    "金色牌飾上，守護神獸的大翅膀在青金石上展開。",
    "A gold plaque with the guardian’s great wing raised over lapis.",
    "Une plaque d’or où la grande aile du gardien se déploie sur le lapis.",
    "Una placca d’oro con la grande ala del guardiano spiegata sul lapislazzuli.",
    "Una placa de oro con la gran ala del guardián desplegada sobre el lapislázuli.",
  ],
  "myth-ninetail-pendant": [
    "月白色的新月，展開九條紫色火焰般的尾巴。",
    "A moon-white crescent with nine tails of violet fire fanning out.",
    "Un croissant blanc de lune d’où s’ouvrent neuf queues de feu violet.",
    "Una falce bianca di luna da cui si aprono nove code di fuoco viola.",
    "Una luna creciente blanca de la que se abren nueve colas de fuego violeta.",
  ],
};

export const MYTHIC_ITEMS: readonly MythicItem[] = ROWS.map(([id, slot, origin, tone, zh, en, fr, it, es]) => ({
  id, slot, origin, tone,
  intro: (([izh, ien, ifr, iit, ies]) => ({ "traditional-chinese": izh, english: ien, french: ifr, italian: iit, spanish: ies }))(INTROS[id]),
  country: "basic",
  /* Never sold; the database will not sell it either. */
  price: 0,
  names: { "traditional-chinese": zh, english: en, french: fr, italian: it, spanish: es },
}));

const MYTHIC_IDS = new Set(MYTHIC_ITEMS.map(item => item.id));

export function isMythic(id: string | null | undefined): boolean {
  return !!id && MYTHIC_IDS.has(id);
}

export function mythicItem(id: string | null | undefined): MythicItem | null {
  return id ? MYTHIC_ITEMS.find(item => item.id === id) ?? null : null;
}
