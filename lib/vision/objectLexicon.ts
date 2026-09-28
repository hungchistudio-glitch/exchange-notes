import type { LanguageCode } from "@/lib/languages";
import type { LexiconEntry } from "@/lib/lexicon/types";

/* =========================================================
   The words a phone can name without asking anybody

   The camera's answer came from Gemini alone, and on the free tier Gemini
   is exactly what is missing at a peak: 2026-09-28 12:39–12:41 UTC, four
   photographs, three models, every one a 503 "high demand" or a timeout.
   Paying would not have fixed it either — the same 503 is reported on paid
   tiers. What does not depend on anybody's capacity is the phone itself.

   So the camera now also asks a small image classifier that runs on the
   device (EfficientNet-Lite0 through MediaPipe, see onDeviceClassifier.ts),
   and this file is how its answer becomes a word. The classifier speaks in
   the 1000 ImageNet classes — 118 of them dog breeds, some of them things
   nobody photographs to learn the name of — so the classes are gathered
   here into the everyday word a learner wants: every breed is "dog", a
   coffee mug is "mug", an airliner and a warplane are both "airplane".
   Classes with no everyday word are left out on purpose; a phone that says
   nothing is better than one that says "bassoon" confidently.

   Each word carries all five languages the app teaches, written by hand so
   no request is needed to translate it. Chinese is Traditional, as used in
   Taiwan.

   Also read by the server: lookupOffline answers these words in any of the
   five languages when every model is busy, which is the other half of the
   same peak — the camera names the object, and the lookup of that name must
   not then fail for the same reason.
   ========================================================= */

export type ObjectWord = Record<LanguageCode, string>;

/** `en|zh-TW|es|fr|it: ImageNet class indices` — ranges are inclusive. */
const OBJECT_WORDS_SOURCE: readonly string[] = [
  "fish|魚|pez|poisson|pesce: 0,389,391-392,394-395",
  "goldfish|金魚|pez dorado|poisson rouge|pesce rosso: 1",
  "shark|鯊魚|tiburón|requin|squalo: 2-4",
  "stingray|魟魚|raya|raie|razza: 5-6",
  "rooster|公雞|gallo|coq|gallo: 7",
  "hen|母雞|gallina|poule|gallina: 8",
  "ostrich|鴕鳥|avestruz|autruche|struzzo: 9",
  "bird|鳥|pájaro|oiseau|uccello: 10-20,80-83,85-86,91-93,95,98,127-129,131-143,146",
  "eagle|老鷹|águila|aigle|aquila: 21-23",
  "owl|貓頭鷹|búho|hibou|gufo: 24",
  "frog|青蛙|rana|grenouille|rana: 30-32",
  "turtle|烏龜|tortuga|tortue|tartaruga: 33-37",
  "lizard|蜥蜴|lagarto|lézard|lucertola: 38-48",
  "crocodile|鱷魚|cocodrilo|crocodile|coccodrillo: 49-50",
  "dinosaur|恐龍|dinosaurio|dinosaure|dinosauro: 51",
  "snake|蛇|serpiente|serpent|serpente: 52-68",
  "spider|蜘蛛|araña|araignée|ragno: 70,72-77",
  "scorpion|蠍子|escorpión|scorpion|scorpione: 71",
  "centipede|蜈蚣|ciempiés|mille-pattes|millepiedi: 79",
  "peacock|孔雀|pavo real|paon|pavone: 84",
  "parrot|鸚鵡|loro|perroquet|pappagallo: 87-90",
  "hummingbird|蜂鳥|colibrí|colibri|colibrì: 94",
  "toucan|巨嘴鳥|tucán|toucan|tucano: 96",
  "duck|鴨子|pato|canard|anatra: 97",
  "goose|鵝|ganso|oie|oca: 99",
  "swan|天鵝|cisne|cygne|cigno: 100",
  "elephant|大象|elefante|éléphant|elefante: 101,385-386",
  "kangaroo|袋鼠|canguro|kangourou|canguro: 104",
  "koala|無尾熊|koala|koala|koala: 105",
  "jellyfish|水母|medusa|méduse|medusa: 107",
  "coral|珊瑚|coral|corail|corallo: 109",
  "seashell|貝殼|concha|coquillage|conchiglia: 112,117",
  "snail|蝸牛|caracol|escargot|lumaca: 113",
  "crab|螃蟹|cangrejo|crabe|granchio: 118-121,125",
  "lobster|龍蝦|langosta|homard|aragosta: 122-124",
  "flamingo|紅鶴|flamenco|flamant|fenicottero: 130",
  "pelican|鵜鶘|pelícano|pélican|pellicano: 144",
  "penguin|企鵝|pingüino|manchot|pinguino: 145",
  "whale|鯨魚|ballena|baleine|balena: 147-148",
  "sea lion|海獅|león marino|otarie|leone marino: 150",
  "dog|狗|perro|chien|cane: 151-268",
  "wolf|狼|lobo|loup|lupo: 269-273",
  "fox|狐狸|zorro|renard|volpe: 277-280",
  "cat|貓|gato|chat|gatto: 281-285",
  "leopard|豹|leopardo|léopard|leopardo: 288-290",
  "lion|獅子|león|lion|leone: 291",
  "tiger|老虎|tigre|tigre|tigre: 292",
  "cheetah|獵豹|guepardo|guépard|ghepardo: 293",
  "bear|熊|oso|ours|orso: 294-297",
  "meerkat|狐獴|suricata|suricate|suricato: 299",
  "beetle|甲蟲|escarabajo|scarabée|scarabeo: 300,302-307",
  "ladybug|瓢蟲|mariquita|coccinelle|coccinella: 301",
  "fly|蒼蠅|mosca|mouche|mosca: 308",
  "bee|蜜蜂|abeja|abeille|ape: 309",
  "ant|螞蟻|hormiga|fourmi|formica: 310",
  "grasshopper|蚱蜢|saltamontes|sauterelle|cavalletta: 311-312",
  "cockroach|蟑螂|cucaracha|cafard|scarafaggio: 314",
  "praying mantis|螳螂|mantis|mante religieuse|mantide: 315",
  "cicada|蟬|cigarra|cigale|cicala: 316",
  "dragonfly|蜻蜓|libélula|libellule|libellula: 319-320",
  "butterfly|蝴蝶|mariposa|papillon|farfalla: 321-326",
  "starfish|海星|estrella de mar|étoile de mer|stella marina: 327",
  "sea urchin|海膽|erizo de mar|oursin|riccio di mare: 328",
  "rabbit|兔子|conejo|lapin|coniglio: 330-332",
  "hamster|倉鼠|hámster|hamster|criceto: 333",
  "porcupine|豪豬|puercoespín|porc-épic|porcospino: 334",
  "squirrel|松鼠|ardilla|écureuil|scoiattolo: 335",
  "guinea pig|天竺鼠|cobaya|cochon d'Inde|porcellino d'India: 338",
  "horse|馬|caballo|cheval|cavallo: 339",
  "zebra|斑馬|cebra|zèbre|zebra: 340",
  "pig|豬|cerdo|cochon|maiale: 341-343",
  "hippopotamus|河馬|hipopótamo|hippopotame|ippopotamo: 344",
  "cow|牛|vaca|vache|mucca: 345-347",
  "sheep|綿羊|oveja|mouton|pecora: 348",
  "goat|山羊|cabra|chèvre|capra: 349-350",
  "antelope|羚羊|antílope|antilope|antilope: 351-353",
  "camel|駱駝|camello|chameau|cammello: 354",
  "llama|羊駝|llama|lama|lama: 355",
  "otter|水獺|nutria|loutre|lontra: 360",
  "skunk|臭鼬|mofeta|mouffette|puzzola: 361",
  "sloth|樹懶|perezoso|paresseux|bradipo: 364",
  "orangutan|紅毛猩猩|orangután|orang-outan|orango: 365",
  "gorilla|大猩猩|gorila|gorille|gorilla: 366",
  "chimpanzee|黑猩猩|chimpancé|chimpanzé|scimpanzé: 367",
  "monkey|猴子|mono|singe|scimmia: 368-382",
  "red panda|小熊貓|panda rojo|panda roux|panda rosso: 387",
  "panda|貓熊|panda|panda|panda: 388",
  "eel|鰻魚|anguila|anguille|anguilla: 390",
  "clownfish|小丑魚|pez payaso|poisson-clown|pesce pagliaccio: 393",
  "pufferfish|河豚|pez globo|poisson-globe|pesce palla: 397",
  "abacus|算盤|ábaco|boulier|abaco: 398",
  "accordion|手風琴|acordeón|accordéon|fisarmonica: 401",
  "guitar|吉他|guitarra|guitare|chitarra: 402,546",
  "ship|船|barco|navire|nave: 403,510,554,625,628",
  "airplane|飛機|avión|avion|aereo: 404,895,908",
  "ambulance|救護車|ambulancia|ambulance|ambulanza: 407",
  "clock|時鐘|reloj|horloge|orologio: 409,530,892",
  "apron|圍裙|delantal|tablier|grembiule: 411",
  "trash can|垃圾桶|cubo de basura|poubelle|bidone della spazzatura: 412",
  "backpack|背包|mochila|sac à dos|zaino: 414",
  "bakery|麵包店|panadería|boulangerie|panetteria: 415",
  "balloon|氣球|globo|ballon|palloncino: 417",
  "pen|筆|bolígrafo|stylo|penna: 418,563",
  "bandage|OK繃|tirita|pansement|cerotto: 419",
  "dumbbell|啞鈴|mancuerna|haltère|manubrio: 422,543",
  "barn|穀倉|granero|grange|fienile: 425",
  "barrel|木桶|barril|tonneau|botte: 427",
  "wheelbarrow|手推車|carretilla|brouette|carriola: 428",
  "baseball|棒球|pelota de béisbol|balle de baseball|palla da baseball: 429",
  "basketball|籃球|balón de baloncesto|ballon de basket|pallone da basket: 430",
  "towel|毛巾|toalla|serviette|asciugamano: 434",
  "bathtub|浴缸|bañera|baignoire|vasca da bagno: 435,876",
  "lighthouse|燈塔|faro|phare|faro: 437",
  "bottle|瓶子|botella|bouteille|bottiglia: 440,737,898,907",
  "glass|玻璃杯|vaso|verre|bicchiere: 441",
  "bib|圍兜|babero|bavoir|bavaglino: 443",
  "bikini|比基尼|bikini|bikini|bikini: 445",
  "binder|資料夾|carpeta|classeur|raccoglitore: 446",
  "binoculars|望遠鏡|prismáticos|jumelles|binocolo: 447",
  "birdhouse|鳥屋|casita para pájaros|nichoir|casetta per uccelli: 448",
  "bookcase|書櫃|estantería|bibliothèque|libreria: 453",
  "bookstore|書店|librería|librairie|libreria: 454",
  "bottle cap|瓶蓋|tapón|capsule|tappo: 455",
  "bow tie|領結|pajarita|nœud papillon|papillon: 457",
  "bra|胸罩|sujetador|soutien-gorge|reggiseno: 459",
  "broom|掃把|escoba|balai|scopa: 462",
  "bucket|水桶|cubo|seau|secchio: 463",
  "buckle|扣環|hebilla|boucle|fibbia: 464",
  "train|火車|tren|train|treno: 466,547,565,705,820",
  "butcher shop|肉店|carnicería|boucherie|macelleria: 467",
  "taxi|計程車|taxi|taxi|taxi: 468",
  "pot|鍋子|olla|casserole|pentola: 469,521,544",
  "candle|蠟燭|vela|bougie|candela: 470",
  "canoe|獨木舟|canoa|canoë|canoa: 472",
  "can opener|開罐器|abrelatas|ouvre-boîte|apriscatole: 473",
  "sweater|毛衣|suéter|pull|maglione: 474",
  "carousel|旋轉木馬|carrusel|manège|giostra: 476",
  "toolbox|工具箱|caja de herramientas|boîte à outils|cassetta degli attrezzi: 477",
  "box|箱子|caja|boîte|scatola: 478,519",
  "wheel|輪子|rueda|roue|ruota: 479",
  "ATM|提款機|cajero automático|distributeur de billets|bancomat: 480",
  "cassette|錄音帶|casete|cassette|cassetta: 481",
  "castle|城堡|castillo|château|castello: 483",
  "sailboat|帆船|velero|voilier|barca a vela: 484,780,871,914",
  "cello|大提琴|violonchelo|violoncelle|violoncello: 486",
  "mobile phone|手機|móvil|portable|cellulare: 487",
  "chain|鍊子|cadena|chaîne|catena: 488",
  "fence|圍欄|valla|clôture|recinto: 489,716,912",
  "chainsaw|電鋸|motosierra|tronçonneuse|motosega: 491",
  "dresser|五斗櫃|cómoda|commode|comò: 493",
  "church|教堂|iglesia|église|chiesa: 442,497",
  "movie theater|電影院|cine|cinéma|cinema: 498",
  "knife|刀子|cuchillo|couteau|coltello: 499,623",
  "shoe|鞋子|zapato|chaussure|scarpa: 502,630",
  "mug|馬克杯|taza|mug|tazza: 504",
  "coffeepot|咖啡壺|cafetera|cafetière|caffettiera: 505",
  "lock|鎖|candado|cadenas|lucchetto: 507,695",
  "keyboard|鍵盤|teclado|clavier|tastiera: 508,810,878",
  "car|汽車|coche|voiture|macchina: 436,511,609,627,656,661,751,817",
  "trumpet|小號|trompeta|trompette|tromba: 513",
  "boot|靴子|bota|botte|stivale: 514",
  "hat|帽子|sombrero|chapeau|cappello: 452,515,808",
  "crib|嬰兒床|cuna|lit de bébé|culla: 431,516,520",
  "helmet|安全帽|casco|casque|casco: 518,560",
  "crutch|拐杖|muleta|béquille|stampella: 523",
  "desk|書桌|escritorio|bureau|scrivania: 526",
  "computer|電腦|ordenador|ordinateur|computer: 527",
  "telephone|電話|teléfono|téléphone|telefono: 528,707",
  "diaper|尿布|pañal|couche|pannolino: 529",
  "watch|手錶|reloj de pulsera|montre|orologio da polso: 531",
  "table|桌子|mesa|table|tavolo: 532",
  "dishcloth|抹布|trapo|torchon|strofinaccio: 533",
  "dishwasher|洗碗機|lavavajillas|lave-vaisselle|lavastoviglie: 534",
  "doormat|門墊|felpudo|paillasson|zerbino: 539",
  "drum|鼓|tambor|tambour|tamburo: 541,822",
  "fan|電風扇|ventilador|ventilateur|ventilatore: 545",
  "envelope|信封|sobre|enveloppe|busta: 549",
  "espresso machine|咖啡機|cafetera espresso|machine à expresso|macchina per caffè: 550",
  "fire truck|消防車|camión de bomberos|camion de pompiers|camion dei pompieri: 555",
  "flute|長笛|flauta|flûte|flauto: 558",
  "chair|椅子|silla|chaise|sedia: 423,559,765,857",
  "forklift|堆高機|carretilla elevadora|chariot élévateur|carrello elevatore: 561",
  "fountain|噴泉|fuente|fontaine|fontana: 562",
  "bed|床|cama|lit|letto: 564",
  "French horn|法國號|trompa|cor|corno: 566",
  "frying pan|平底鍋|sartén|poêle|padella: 567",
  "coat|外套|abrigo|manteau|cappotto: 568,869",
  "truck|卡車|camión|camion|camion: 569,675,717,864,867",
  "gas pump|加油機|surtidor|pompe à essence|pompa di benzina: 571",
  "wine glass|酒杯|copa|verre à vin|calice: 572",
  "golf ball|高爾夫球|pelota de golf|balle de golf|pallina da golf: 574",
  "gondola|貢多拉|góndola|gondole|gondola: 576",
  "dress|洋裝|vestido|robe|vestito: 578",
  "piano|鋼琴|piano|piano|pianoforte: 579,881",
  "greenhouse|溫室|invernadero|serre|serra: 580",
  "supermarket|超市|supermercado|supermarché|supermercato: 582",
  "hair clip|髮夾|pasador|barrette|fermaglio: 584",
  "hairspray|髮膠|laca|laque|lacca: 585",
  "hammer|鐵鎚|martillo|marteau|martello: 587",
  "basket|籃子|cesta|panier|cesto: 588,790",
  "hair dryer|吹風機|secador de pelo|sèche-cheveux|asciugacapelli: 589",
  "handkerchief|手帕|pañuelo|mouchoir|fazzoletto: 591",
  "harmonica|口琴|armónica|harmonica|armonica: 593",
  "harp|豎琴|arpa|harpe|arpa: 594",
  "axe|斧頭|hacha|hache|ascia: 596",
  "honeycomb|蜂巢|panal|rayon de miel|favo: 599",
  "hook|掛鉤|gancho|crochet|gancio: 600",
  "hourglass|沙漏|reloj de arena|sablier|clessidra: 604",
  "iron|熨斗|plancha|fer à repasser|ferro da stiro: 606",
  "jack-o'-lantern|南瓜燈|calabaza de Halloween|citrouille d'Halloween|zucca di Halloween: 607",
  "jeans|牛仔褲|vaqueros|jean|jeans: 608",
  "T-shirt|T恤|camiseta|t-shirt|maglietta: 610",
  "jigsaw puzzle|拼圖|rompecabezas|puzzle|puzzle: 611",
  "joystick|搖桿|palanca de mando|manette|joystick: 613",
  "kimono|和服|kimono|kimono|kimono: 614",
  "ladle|湯杓|cucharón|louche|mestolo: 618",
  "lamp|檯燈|lámpara|lampe|lampada: 619,846",
  "laptop|筆記型電腦|portátil|ordinateur portable|portatile: 620,681",
  "lawn mower|割草機|cortacésped|tondeuse|tosaerba: 621",
  "library|圖書館|biblioteca|bibliothèque|biblioteca: 624",
  "lighter|打火機|mechero|briquet|accendino: 626",
  "lipstick|口紅|pintalabios|rouge à lèvres|rossetto: 629",
  "lotion|乳液|loción|lotion|lozione: 631",
  "speaker|喇叭|altavoz|enceinte|altoparlante: 632",
  "magnifying glass|放大鏡|lupa|loupe|lente d'ingrandimento: 633",
  "compass|指南針|brújula|boussole|bussola: 635",
  "mailbox|信箱|buzón|boîte aux lettres|cassetta delle lettere: 637",
  "swimsuit|泳衣|bañador|maillot de bain|costume da bagno: 638-639,842",
  "manhole cover|人孔蓋|tapa de alcantarilla|plaque d'égout|tombino: 640",
  "mask|面具|máscara|masque|maschera: 643",
  "match|火柴|cerilla|allumette|fiammifero: 644",
  "measuring cup|量杯|taza medidora|verre doseur|misurino: 647",
  "microphone|麥克風|micrófono|micro|microfono: 650",
  "microwave|微波爐|microondas|micro-ondes|microonde: 651",
  "skirt|裙子|falda|jupe|gonna: 601,655,689",
  "glove|手套|guante|gant|guanto: 658",
  "bowl|碗|cuenco|bol|ciotola: 659,809",
  "modem|數據機|módem|modem|modem: 662",
  "monitor|螢幕|monitor|écran|monitor: 664,782",
  "scooter|機車|moto|scooter|motorino: 665,670",
  "bicycle|腳踏車|bicicleta|vélo|bicicletta: 444,671",
  "tent|帳篷|tienda de campaña|tente|tenda: 672",
  "mouse|滑鼠|ratón|souris|mouse: 673",
  "necklace|項鍊|collar|collier|collana: 679",
  "baby bottle|奶瓶|biberón|biberon|biberon: 680",
  "paddle|槳|remo|pagaie|pagaia: 693",
  "paintbrush|畫筆|pincel|pinceau|pennello: 696",
  "pajamas|睡衣|pijama|pyjama|pigiama: 697",
  "palace|宮殿|palacio|palais|palazzo: 698",
  "paper towel|紙巾|toalla de papel|essuie-tout|carta assorbente: 700",
  "parachute|降落傘|paracaídas|parachute|paracadute: 701",
  "bench|長椅|banco|banc|panchina: 703",
  "parking meter|停車收費表|parquímetro|parcmètre|parchimetro: 704",
  "pencil case|鉛筆盒|estuche|trousse|astuccio: 709",
  "pencil sharpener|削鉛筆機|sacapuntas|taille-crayon|temperamatite: 710",
  "perfume|香水|perfume|parfum|profumo: 711",
  "piggy bank|撲滿|hucha|tirelire|salvadanaio: 719",
  "pillow|枕頭|almohada|oreiller|cuscino: 721",
  "ping-pong ball|桌球|pelota de ping-pong|balle de ping-pong|pallina da ping pong: 722",
  "pinwheel|風車|molinillo|moulin à vent|girandola: 723",
  "pitcher|水壺|jarra|pichet|brocca: 725,899",
  "plastic bag|塑膠袋|bolsa de plástico|sac plastique|sacchetto di plastica: 728",
  "plunger|馬桶吸盤|desatascador|ventouse|sturalavandini: 731",
  "camera|相機|cámara|appareil photo|fotocamera: 732,759",
  "police car|警車|coche de policía|voiture de police|auto della polizia: 734",
  "flowerpot|花盆|maceta|pot de fleurs|vaso da fiori: 738",
  "pool table|撞球桌|mesa de billar|table de billard|tavolo da biliardo: 736",
  "drill|電鑽|taladro|perceuse|trapano: 740",
  "printer|印表機|impresora|imprimante|stampante: 713,742",
  "projector|投影機|proyector|projecteur|proiettore: 745",
  "punching bag|沙包|saco de boxeo|sac de frappe|sacco da boxe: 747",
  "handbag|手提包|bolso|sac à main|borsa: 748",
  "quilt|被子|edredón|couette|trapunta: 750",
  "racket|球拍|raqueta|raquette|racchetta: 752",
  "radio|收音機|radio|radio|radio: 754",
  "refrigerator|冰箱|nevera|réfrigérateur|frigorifero: 760",
  "remote control|遙控器|mando a distancia|télécommande|telecomando: 761",
  "restaurant|餐廳|restaurante|restaurant|ristorante: 762",
  "eraser|橡皮擦|goma de borrar|gomme|gomma: 767",
  "rugby ball|橄欖球|balón de rugby|ballon de rugby|pallone da rugby: 768",
  "ruler|尺|regla|règle|righello: 769",
  "sneaker|運動鞋|zapatilla|basket|scarpa da ginnastica: 770",
  "safe|保險箱|caja fuerte|coffre-fort|cassaforte: 771",
  "safety pin|安全別針|imperdible|épingle de sûreté|spilla da balia: 772",
  "salt shaker|鹽罐|salero|salière|saliera: 773",
  "sandal|涼鞋|sandalia|sandale|sandalo: 774",
  "saxophone|薩克斯風|saxofón|saxophone|sassofono: 776",
  "scale|秤|báscula|balance|bilancia: 778",
  "bus|公車|autobús|bus|autobus: 654,779,874",
  "screw|螺絲|tornillo|vis|vite: 783",
  "screwdriver|螺絲起子|destornillador|tournevis|cacciavite: 784",
  "seat belt|安全帶|cinturón de seguridad|ceinture de sécurité|cintura di sicurezza: 785",
  "sewing machine|縫紉機|máquina de coser|machine à coudre|macchina da cucire: 786",
  "shopping cart|購物車|carrito de la compra|chariot|carrello: 791",
  "shovel|鏟子|pala|pelle|pala: 792",
  "shower curtain|浴簾|cortina de ducha|rideau de douche|tenda della doccia: 794",
  "ski|滑雪板|esquí|ski|sci: 795",
  "sleeping bag|睡袋|saco de dormir|sac de couchage|sacco a pelo: 797",
  "door|門|puerta|porte|porta: 799",
  "soap dispenser|給皂機|dispensador de jabón|distributeur de savon|dispenser di sapone: 804",
  "soccer ball|足球|balón de fútbol|ballon de foot|pallone da calcio: 805",
  "sock|襪子|calcetín|chaussette|calzino: 806",
  "heater|暖氣機|calefactor|radiateur|stufetta: 811",
  "spatula|鍋鏟|espátula|spatule|spatola: 813",
  "speedboat|快艇|lancha|hors-bord|motoscafo: 814",
  "spider web|蜘蛛網|telaraña|toile d'araignée|ragnatela: 815",
  "stage|舞台|escenario|scène|palcoscenico: 819",
  "bridge|橋|puente|pont|ponte: 821,839,888",
  "stethoscope|聽診器|estetoscopio|stéthoscope|stetoscopio: 823",
  "scarf|圍巾|bufanda|écharpe|sciarpa: 824",
  "stopwatch|碼錶|cronómetro|chronomètre|cronometro: 826",
  "stove|爐子|estufa|cuisinière|fornello: 827",
  "strainer|濾網|colador|passoire|colino: 828",
  "tram|電車|tranvía|tramway|tram: 829",
  "sofa|沙發|sofá|canapé|divano: 831",
  "submarine|潛水艇|submarino|sous-marin|sottomarino: 833",
  "suit|西裝|traje|costume|abito: 834",
  "sunglasses|太陽眼鏡|gafas de sol|lunettes de soleil|occhiali da sole: 836-837",
  "sunscreen|防曬乳|protector solar|crème solaire|crema solare: 838",
  "sweatshirt|大學T|sudadera|sweat-shirt|felpa: 841",
  "swing|鞦韆|columpio|balançoire|altalena: 843",
  "switch|開關|interruptor|interrupteur|interruttore: 844",
  "syringe|針筒|jeringa|seringue|siringa: 845",
  "tank|坦克|tanque|char d'assaut|carro armato: 847",
  "teapot|茶壺|tetera|théière|teiera: 849",
  "teddy bear|泰迪熊|osito de peluche|nounours|orsacchiotto: 850",
  "television|電視|televisión|télévision|televisione: 851",
  "tennis ball|網球|pelota de tenis|balle de tennis|pallina da tennis: 852",
  "toaster|烤麵包機|tostadora|grille-pain|tostapane: 859",
  "toilet|馬桶|inodoro|toilettes|gabinetto: 861",
  "flashlight|手電筒|linterna|lampe torche|torcia: 862",
  "tractor|拖拉機|tractor|tracteur|trattore: 866",
  "tray|托盤|bandeja|plateau|vassoio: 868",
  "tricycle|三輪車|triciclo|tricycle|triciclo: 870",
  "tripod|三腳架|trípode|trépied|treppiede: 872",
  "trombone|長號|trombón|trombone|trombone: 875",
  "umbrella|雨傘|paraguas|parapluie|ombrello: 879",
  "vacuum cleaner|吸塵器|aspiradora|aspirateur|aspirapolvere: 882",
  "vase|花瓶|jarrón|vase|vaso: 883",
  "vending machine|販賣機|máquina expendedora|distributeur automatique|distributore automatico: 886",
  "violin|小提琴|violín|violon|violino: 889",
  "volleyball|排球|balón de voleibol|ballon de volley|pallone da pallavolo: 890",
  "wallet|錢包|cartera|portefeuille|portafoglio: 893",
  "wardrobe|衣櫃|armario|armoire|armadio: 894",
  "sink|洗手台|lavabo|lavabo|lavandino: 896",
  "washing machine|洗衣機|lavadora|lave-linge|lavatrice: 897",
  "whistle|哨子|silbato|sifflet|fischietto: 902",
  "wig|假髮|peluca|perruque|parrucca: 903",
  "window|窗戶|ventana|fenêtre|finestra: 904-905",
  "tie|領帶|corbata|cravate|cravatta: 906",
  "wok|炒鍋|wok|wok|wok: 909",
  "spoon|湯匙|cuchara|cuillère|cucchiaio: 910",
  "yarn|毛線|lana|laine|lana: 911",
  "comic book|漫畫|cómic|bande dessinée|fumetto: 917",
  "street sign|路標|señal de tráfico|panneau|cartello stradale: 919",
  "traffic light|紅綠燈|semáforo|feu de circulation|semaforo: 920",
  "book|書|libro|livre|libro: 921",
  "menu|菜單|menú|menu|menù: 922",
  "plate|盤子|plato|assiette|piatto: 923",
  "guacamole|酪梨醬|guacamole|guacamole|guacamole: 924",
  "soup|湯|sopa|soupe|zuppa: 925",
  "ice cream|冰淇淋|helado|glace|gelato: 928",
  "popsicle|冰棒|paleta|glace à l'eau|ghiacciolo: 929",
  "bread|麵包|pan|pain|pane: 930",
  "bagel|貝果|bagel|bagel|bagel: 931",
  "pretzel|椒鹽脆餅|pretzel|bretzel|pretzel: 932",
  "hamburger|漢堡|hamburguesa|hamburger|hamburger: 933",
  "hot dog|熱狗|perrito caliente|hot-dog|hot dog: 934",
  "mashed potatoes|馬鈴薯泥|puré de patatas|purée|purè di patate: 935",
  "cabbage|高麗菜|repollo|chou|cavolo: 936",
  "broccoli|綠花椰菜|brócoli|brocoli|broccolo: 937",
  "cauliflower|白花椰菜|coliflor|chou-fleur|cavolfiore: 938",
  "zucchini|櫛瓜|calabacín|courgette|zucchina: 939",
  "pumpkin|南瓜|calabaza|courge|zucca: 940-942",
  "cucumber|小黃瓜|pepino|concombre|cetriolo: 943",
  "artichoke|朝鮮薊|alcachofa|artichaut|carciofo: 944",
  "bell pepper|甜椒|pimiento|poivron|peperone: 945",
  "mushroom|蘑菇|champiñón|champignon|fungo: 947,992,997",
  "apple|蘋果|manzana|pomme|mela: 948",
  "strawberry|草莓|fresa|fraise|fragola: 949",
  "orange|柳橙|naranja|orange|arancia: 950",
  "lemon|檸檬|limón|citron|limone: 951",
  "fig|無花果|higo|figue|fico: 952",
  "pineapple|鳳梨|piña|ananas|ananas: 953",
  "banana|香蕉|plátano|banane|banana: 954",
  "jackfruit|菠蘿蜜|yaca|jacquier|giaca: 955",
  "custard apple|釋迦|chirimoya|pomme cannelle|annona: 956",
  "pomegranate|石榴|granada|grenade|melograno: 957",
  "pasta|義大利麵|pasta|pâtes|pasta: 959",
  "dough|麵團|masa|pâte|impasto: 961",
  "pizza|披薩|pizza|pizza|pizza: 963",
  "burrito|墨西哥捲餅|burrito|burrito|burrito: 965",
  "red wine|紅酒|vino tinto|vin rouge|vino rosso: 966",
  "coffee|咖啡|café|café|caffè: 967",
  "cup|杯子|taza|tasse|tazza: 968",
  "mountain|山|montaña|montagne|montagna: 970",
  "bubble|泡泡|burbuja|bulle|bolla: 971",
  "cliff|懸崖|acantilado|falaise|scogliera: 972",
  "coral reef|珊瑚礁|arrecife de coral|récif de corail|barriera corallina: 973",
  "lake|湖|lago|lac|lago: 975",
  "beach|海灘|playa|plage|spiaggia: 977-978",
  "valley|山谷|valle|vallée|valle: 979",
  "volcano|火山|volcán|volcan|vulcano: 980",
  "daisy|雛菊|margarita|marguerite|margherita: 985",
  "corn|玉米|maíz|maïs|mais: 987,998",
  "acorn|橡實|bellota|gland|ghianda: 988",
  "toilet paper|衛生紙|papel higiénico|papier toilette|carta igienica: 999",];

const LANGUAGE_ORDER: readonly LanguageCode[] = ["en", "zh-TW", "es", "fr", "it"];

function parse() {
  const words: ObjectWord[] = [];
  const byClass = new Map<number, ObjectWord>();

  for (const line of OBJECT_WORDS_SOURCE) {
    const separator = line.lastIndexOf(": ");
    const names = line.slice(0, separator).split("|");
    const word = Object.fromEntries(
      LANGUAGE_ORDER.map((language, index) => [language, names[index]]),
    ) as ObjectWord;

    words.push(word);

    for (const token of line.slice(separator + 2).split(",")) {
      const [start, end = start] = token.split("-").map(Number);
      for (let index = start; index <= end; index += 1) byClass.set(index, word);
    }
  }

  return { words, byClass };
}

const { words: OBJECT_WORDS, byClass: WORD_BY_CLASS } = parse();

export { OBJECT_WORDS };

/** The everyday word for one ImageNet class, if it has one. */
export function objectWordForClass(classIndex: number): ObjectWord | null {
  return WORD_BY_CLASS.get(classIndex) ?? null;
}

function normalize(text: string) {
  return text.trim().toLocaleLowerCase();
}

/*
 * Written text back to a word, per language.
 *
 * A spelling that belongs to two words in the same language — Spanish
 * "taza" is both the mug and the cup — is left out of the index rather than
 * resolved by guessing: the server would otherwise answer "cup" for a reader
 * who meant "mug". Recognition does not use this; it goes by class.
 */
const WORD_BY_TEXT = (() => {
  const index = new Map<string, ObjectWord | null>();

  for (const word of OBJECT_WORDS) {
    for (const language of LANGUAGE_ORDER) {
      const key = `${language}:${normalize(word[language])}`;
      index.set(key, index.has(key) && index.get(key) !== word ? null : word);
    }
  }

  return index;
})();

/** The word this text names in `language`, if it is one of these. */
export function findObjectWord(
  text: string,
  language: LanguageCode,
): ObjectWord | null {
  return WORD_BY_TEXT.get(`${language}:${normalize(text)}`) ?? null;
}

/**
 * A dictionary card for one of these words, with no request behind it.
 *
 * No example sentences: there is nothing here to write one from, and an
 * invented sentence is what the offline dictionary learned not to do. The
 * card says what the thing is called in both languages, which is the part a
 * reader pointing a phone at it needs first.
 */
export function objectWordEntry(
  word: ObjectWord,
  termLanguage: LanguageCode,
  translationLanguage: LanguageCode,
  queryLanguage: LanguageCode = termLanguage,
): LexiconEntry {
  return {
    term: word[termLanguage],
    translation: word[translationLanguage],
    partOfSpeech: "noun",
    termExample: "",
    translationExample: "",
    confidence: "medium",
    category: "objects",
    termLanguage,
    translationLanguage,
    queryLanguage,
    kind: "word",
    highlight: null,
  };
}
