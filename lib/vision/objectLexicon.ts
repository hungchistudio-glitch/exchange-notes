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

   Each word carries all seven languages the app teaches, written by hand so
   no request is needed to translate it. Chinese is Traditional, as used in
   Taiwan.

   Also read by the server: lookupOffline answers these words in any of the
   seven languages when every model is busy, which is the other half of the
   same peak — the camera names the object, and the lookup of that name must
   not then fail for the same reason.
   ========================================================= */

export type ObjectWord = Record<LanguageCode, string>;

/** `en|zh-TW|es|fr|it: ImageNet class indices` — ranges are inclusive. */
const OBJECT_WORDS_SOURCE: readonly string[] = [
  "fish|魚|pez|poisson|pesce|魚|물고기: 0,389,391-392,394-395",
  "goldfish|金魚|pez dorado|poisson rouge|pesce rosso|金魚|금붕어: 1",
  "shark|鯊魚|tiburón|requin|squalo|サメ|상어: 2-4",
  "stingray|魟魚|raya|raie|razza|エイ|가오리: 5-6",
  "rooster|公雞|gallo|coq|gallo|おんどり|수탉: 7",
  "hen|母雞|gallina|poule|gallina|めんどり|암탉: 8",
  "ostrich|鴕鳥|avestruz|autruche|struzzo|ダチョウ|타조: 9",
  "bird|鳥|pájaro|oiseau|uccello|鳥|새: 10-20,80-83,85-86,91-93,95,98,127-129,131-143,146",
  "eagle|老鷹|águila|aigle|aquila|ワシ|독수리: 21-23",
  "owl|貓頭鷹|búho|hibou|gufo|フクロウ|부엉이: 24",
  "frog|青蛙|rana|grenouille|rana|カエル|개구리: 30-32",
  "turtle|烏龜|tortuga|tortue|tartaruga|カメ|거북: 33-37",
  "lizard|蜥蜴|lagarto|lézard|lucertola|トカゲ|도마뱀: 38-48",
  "crocodile|鱷魚|cocodrilo|crocodile|coccodrillo|ワニ|악어: 49-50",
  "dinosaur|恐龍|dinosaurio|dinosaure|dinosauro|恐竜|공룡: 51",
  "snake|蛇|serpiente|serpent|serpente|ヘビ|뱀: 52-68",
  "spider|蜘蛛|araña|araignée|ragno|クモ|거미: 70,72-77",
  "scorpion|蠍子|escorpión|scorpion|scorpione|サソリ|전갈: 71",
  "centipede|蜈蚣|ciempiés|mille-pattes|millepiedi|ムカデ|지네: 79",
  "peacock|孔雀|pavo real|paon|pavone|クジャク|공작: 84",
  "parrot|鸚鵡|loro|perroquet|pappagallo|オウム|앵무새: 87-90",
  "hummingbird|蜂鳥|colibrí|colibri|colibrì|ハチドリ|벌새: 94",
  "toucan|巨嘴鳥|tucán|toucan|tucano|オオハシ|큰부리새: 96",
  "duck|鴨子|pato|canard|anatra|アヒル|오리: 97",
  "goose|鵝|ganso|oie|oca|ガチョウ|거위: 99",
  "swan|天鵝|cisne|cygne|cigno|白鳥|백조: 100",
  "elephant|大象|elefante|éléphant|elefante|ゾウ|코끼리: 101,385-386",
  "kangaroo|袋鼠|canguro|kangourou|canguro|カンガルー|캥거루: 104",
  "koala|無尾熊|koala|koala|koala|コアラ|코알라: 105",
  "jellyfish|水母|medusa|méduse|medusa|クラゲ|해파리: 107",
  "coral|珊瑚|coral|corail|corallo|サンゴ|산호: 109",
  "seashell|貝殼|concha|coquillage|conchiglia|貝殻|조개껍데기: 112,117",
  "snail|蝸牛|caracol|escargot|lumaca|カタツムリ|달팽이: 113",
  "crab|螃蟹|cangrejo|crabe|granchio|カニ|게: 118-121,125",
  "lobster|龍蝦|langosta|homard|aragosta|ロブスター|랍스터: 122-124",
  "flamingo|紅鶴|flamenco|flamant|fenicottero|フラミンゴ|플라밍고: 130",
  "pelican|鵜鶘|pelícano|pélican|pellicano|ペリカン|펠리컨: 144",
  "penguin|企鵝|pingüino|manchot|pinguino|ペンギン|펭귄: 145",
  "whale|鯨魚|ballena|baleine|balena|クジラ|고래: 147-148",
  "sea lion|海獅|león marino|otarie|leone marino|アシカ|바다사자: 150",
  "dog|狗|perro|chien|cane|犬|개: 151-268",
  "wolf|狼|lobo|loup|lupo|オオカミ|늑대: 269-273",
  "fox|狐狸|zorro|renard|volpe|キツネ|여우: 277-280",
  "cat|貓|gato|chat|gatto|猫|고양이: 281-285",
  "leopard|豹|leopardo|léopard|leopardo|ヒョウ|표범: 288-290",
  "lion|獅子|león|lion|leone|ライオン|사자: 291",
  "tiger|老虎|tigre|tigre|tigre|トラ|호랑이: 292",
  "cheetah|獵豹|guepardo|guépard|ghepardo|チーター|치타: 293",
  "bear|熊|oso|ours|orso|クマ|곰: 294-297",
  "meerkat|狐獴|suricata|suricate|suricato|ミーアキャット|미어캣: 299",
  "beetle|甲蟲|escarabajo|scarabée|scarabeo|甲虫|딱정벌레: 300,302-307",
  "ladybug|瓢蟲|mariquita|coccinelle|coccinella|テントウムシ|무당벌레: 301",
  "fly|蒼蠅|mosca|mouche|mosca|ハエ|파리: 308",
  "bee|蜜蜂|abeja|abeille|ape|ハチ|벌: 309",
  "ant|螞蟻|hormiga|fourmi|formica|アリ|개미: 310",
  "grasshopper|蚱蜢|saltamontes|sauterelle|cavalletta|バッタ|메뚜기: 311-312",
  "cockroach|蟑螂|cucaracha|cafard|scarafaggio|ゴキブリ|바퀴벌레: 314",
  "praying mantis|螳螂|mantis|mante religieuse|mantide|カマキリ|사마귀: 315",
  "cicada|蟬|cigarra|cigale|cicala|セミ|매미: 316",
  "dragonfly|蜻蜓|libélula|libellule|libellula|トンボ|잠자리: 319-320",
  "butterfly|蝴蝶|mariposa|papillon|farfalla|チョウ|나비: 321-326",
  "starfish|海星|estrella de mar|étoile de mer|stella marina|ヒトデ|불가사리: 327",
  "sea urchin|海膽|erizo de mar|oursin|riccio di mare|ウニ|성게: 328",
  "rabbit|兔子|conejo|lapin|coniglio|ウサギ|토끼: 330-332",
  "hamster|倉鼠|hámster|hamster|criceto|ハムスター|햄스터: 333",
  "porcupine|豪豬|puercoespín|porc-épic|porcospino|ヤマアラシ|호저: 334",
  "squirrel|松鼠|ardilla|écureuil|scoiattolo|リス|다람쥐: 335",
  "guinea pig|天竺鼠|cobaya|cochon d'Inde|porcellino d'India|モルモット|기니피그: 338",
  "horse|馬|caballo|cheval|cavallo|馬|말: 339",
  "zebra|斑馬|cebra|zèbre|zebra|シマウマ|얼룩말: 340",
  "pig|豬|cerdo|cochon|maiale|豚|돼지: 341-343",
  "hippopotamus|河馬|hipopótamo|hippopotame|ippopotamo|カバ|하마: 344",
  "cow|牛|vaca|vache|mucca|牛|소: 345-347",
  "sheep|綿羊|oveja|mouton|pecora|羊|양: 348",
  "goat|山羊|cabra|chèvre|capra|ヤギ|염소: 349-350",
  "antelope|羚羊|antílope|antilope|antilope|レイヨウ|영양: 351-353",
  "camel|駱駝|camello|chameau|cammello|ラクダ|낙타: 354",
  "llama|羊駝|llama|lama|lama|リャマ|라마: 355",
  "otter|水獺|nutria|loutre|lontra|カワウソ|수달: 360",
  "skunk|臭鼬|mofeta|mouffette|puzzola|スカンク|스컹크: 361",
  "sloth|樹懶|perezoso|paresseux|bradipo|ナマケモノ|나무늘보: 364",
  "orangutan|紅毛猩猩|orangután|orang-outan|orango|オランウータン|오랑우탄: 365",
  "gorilla|大猩猩|gorila|gorille|gorilla|ゴリラ|고릴라: 366",
  "chimpanzee|黑猩猩|chimpancé|chimpanzé|scimpanzé|チンパンジー|침팬지: 367",
  "monkey|猴子|mono|singe|scimmia|サル|원숭이: 368-382",
  "red panda|小熊貓|panda rojo|panda roux|panda rosso|レッサーパンダ|레서판다: 387",
  "panda|貓熊|panda|panda|panda|パンダ|판다: 388",
  "eel|鰻魚|anguila|anguille|anguilla|ウナギ|장어: 390",
  "clownfish|小丑魚|pez payaso|poisson-clown|pesce pagliaccio|カクレクマノミ|흰동가리: 393",
  "pufferfish|河豚|pez globo|poisson-globe|pesce palla|フグ|복어: 397",
  "abacus|算盤|ábaco|boulier|abaco|そろばん|주판: 398",
  "accordion|手風琴|acordeón|accordéon|fisarmonica|アコーディオン|아코디언: 401",
  "guitar|吉他|guitarra|guitare|chitarra|ギター|기타: 402,546",
  "ship|船|barco|navire|nave|船|배: 403,510,554,625,628",
  "airplane|飛機|avión|avion|aereo|飛行機|비행기: 404,895,908",
  "ambulance|救護車|ambulancia|ambulance|ambulanza|救急車|구급차: 407",
  "clock|時鐘|reloj|horloge|orologio|時計|시계: 409,530,892",
  "apron|圍裙|delantal|tablier|grembiule|エプロン|앞치마: 411",
  "trash can|垃圾桶|cubo de basura|poubelle|bidone della spazzatura|ゴミ箱|쓰레기통: 412",
  "backpack|背包|mochila|sac à dos|zaino|リュック|배낭: 414",
  "bakery|麵包店|panadería|boulangerie|panetteria|パン屋|빵집: 415",
  "balloon|氣球|globo|ballon|palloncino|風船|풍선: 417",
  "pen|筆|bolígrafo|stylo|penna|ペン|펜: 418,563",
  "bandage|OK繃|tirita|pansement|cerotto|絆創膏|반창고: 419",
  "dumbbell|啞鈴|mancuerna|haltère|manubrio|ダンベル|아령: 422,543",
  "barn|穀倉|granero|grange|fienile|納屋|헛간: 425",
  "barrel|木桶|barril|tonneau|botte|たる|통: 427",
  "baseball|棒球|pelota de béisbol|balle de baseball|palla da baseball|野球ボール|야구공: 429",
  "basketball|籃球|balón de baloncesto|ballon de basket|pallone da basket|バスケットボール|농구공: 430",
  "towel|毛巾|toalla|serviette|asciugamano|タオル|수건: 434",
  "bathtub|浴缸|bañera|baignoire|vasca da bagno|浴槽|욕조: 435,876",
  "lighthouse|燈塔|faro|phare|faro|灯台|등대: 437",
  "bottle|瓶子|botella|bouteille|bottiglia|びん|병: 440,720,737,898,907",
  "glass|玻璃杯|vaso|verre|bicchiere|コップ|유리컵: 441",
  "bib|圍兜|babero|bavoir|bavaglino|よだれかけ|턱받이: 443",
  "bikini|比基尼|bikini|bikini|bikini|ビキニ|비키니: 445",
  "binder|資料夾|carpeta|classeur|raccoglitore|バインダー|바인더: 446",
  "binoculars|望遠鏡|prismáticos|jumelles|binocolo|双眼鏡|쌍안경: 447",
  "birdhouse|鳥屋|casita para pájaros|nichoir|casetta per uccelli|巣箱|새집: 448",
  "library|圖書館|biblioteca|bibliothèque|biblioteca|図書館|도서관: 624",
  "bookstore|書店|librería|librairie|libreria|本屋|서점: 454",
  "bookcase|書櫃|estantería|bibliothèque|libreria|本棚|책장: 453",
  "bottle cap|瓶蓋|tapón|capsule|tappo|びんのふた|병뚜껑: 455",
  "bow tie|領結|pajarita|nœud papillon|papillon|蝶ネクタイ|나비넥타이: 457",
  "bra|胸罩|sujetador|soutien-gorge|reggiseno|ブラジャー|브래지어: 459",
  "broom|掃把|escoba|balai|scopa|ほうき|빗자루: 462",
  "bucket|水桶|cubo|seau|secchio|バケツ|양동이: 463",
  "buckle|扣環|hebilla|boucle|fibbia|バックル|버클: 464",
  "train|火車|tren|train|treno|電車|기차: 466,547,565,705,820",
  "butcher shop|肉店|carnicería|boucherie|macelleria|肉屋|정육점: 467",
  "taxi|計程車|taxi|taxi|taxi|タクシー|택시: 468",
  "pot|鍋子|olla|casserole|pentola|鍋|냄비: 469,521,544",
  "candle|蠟燭|vela|bougie|candela|ろうそく|양초: 470",
  "canoe|獨木舟|canoa|canoë|canoa|カヌー|카누: 472",
  "can opener|開罐器|abrelatas|ouvre-boîte|apriscatole|缶切り|통조림 따개: 473",
  "sweater|毛衣|suéter|pull|maglione|セーター|스웨터: 474",
  "carousel|旋轉木馬|carrusel|manège|giostra|メリーゴーランド|회전목마: 476",
  "toolbox|工具箱|caja de herramientas|boîte à outils|cassetta degli attrezzi|工具箱|공구함: 477",
  "box|箱子|caja|boîte|scatola|箱|상자: 478,519",
  "wheel|輪子|rueda|roue|ruota|車輪|바퀴: 479",
  "ATM|提款機|cajero automático|distributeur de billets|bancomat|ATM|현금인출기: 480",
  "cassette|錄音帶|casete|cassette|cassetta|カセットテープ|카세트테이프: 481",
  "castle|城堡|castillo|château|castello|城|성: 483",
  "sailboat|帆船|velero|voilier|barca a vela|ヨット|요트: 484,780,871,914",
  "cello|大提琴|violonchelo|violoncelle|violoncello|チェロ|첼로: 486",
  "mobile phone|手機|móvil|portable|cellulare|携帯電話|휴대폰: 487",
  "chain|鍊子|cadena|chaîne|catena|鎖|사슬: 488",
  "fence|圍欄|valla|clôture|recinto|柵|울타리: 489,716,912",
  "chainsaw|電鋸|motosierra|tronçonneuse|motosega|チェーンソー|전기톱: 491",
  "dresser|五斗櫃|cómoda|commode|comò|たんす|서랍장: 493",
  "church|教堂|iglesia|église|chiesa|教会|교회: 442,497",
  "movie theater|電影院|cine|cinéma|cinema|映画館|영화관: 498",
  "knife|刀子|cuchillo|couteau|coltello|ナイフ|칼: 499,623",
  "shoe|鞋子|zapato|chaussure|scarpa|靴|신발: 502,630",
  "cup|杯子|taza|tasse|tazza|カップ|컵: 968",
  "mug|馬克杯|taza|mug|tazza|マグカップ|머그잔: 504",
  "coffeepot|咖啡壺|cafetera|cafetière|caffettiera|コーヒーポット|커피포트: 505",
  "lock|鎖|candado|cadenas|lucchetto|錠|자물쇠: 507,695",
  "keyboard|鍵盤|teclado|clavier|tastiera|キーボード|키보드: 508,810,878",
  "car|汽車|coche|voiture|macchina|車|자동차: 436,475,511,581,609,627,656,661,751,817",
  "trumpet|小號|trompeta|trompette|tromba|トランペット|트럼펫: 513",
  "boot|靴子|bota|botte|stivale|ブーツ|부츠: 514",
  "hat|帽子|sombrero|chapeau|cappello|帽子|모자: 452,515,808",
  "crib|嬰兒床|cuna|lit de bébé|culla|ベビーベッド|아기 침대: 431,516,520",
  "helmet|安全帽|casco|casque|casco|ヘルメット|헬멧: 518,560",
  "crutch|拐杖|muleta|béquille|stampella|松葉杖|목발: 523",
  "desk|書桌|escritorio|bureau|scrivania|机|책상: 526",
  "computer|電腦|ordenador|ordinateur|computer|パソコン|컴퓨터: 527",
  "telephone|電話|teléfono|téléphone|telefono|電話|전화기: 528,707",
  "diaper|尿布|pañal|couche|pannolino|おむつ|기저귀: 529",
  "watch|手錶|reloj de pulsera|montre|orologio da polso|腕時計|손목시계: 531",
  "table|桌子|mesa|table|tavolo|テーブル|탁자: 532",
  "dishcloth|抹布|trapo|torchon|strofinaccio|ふきん|행주: 533",
  "dishwasher|洗碗機|lavavajillas|lave-vaisselle|lavastoviglie|食洗機|식기세척기: 534",
  "doormat|門墊|felpudo|paillasson|zerbino|玄関マット|현관 매트: 539",
  "drum|鼓|tambor|tambour|tamburo|太鼓|북: 541,822",
  "fan|電風扇|ventilador|ventilateur|ventilatore|扇風機|선풍기: 545",
  "envelope|信封|sobre|enveloppe|busta|封筒|봉투: 549",
  "espresso machine|咖啡機|cafetera espresso|machine à expresso|macchina per caffè|コーヒーマシン|커피 머신: 550",
  "fire truck|消防車|camión de bomberos|camion de pompiers|camion dei pompieri|消防車|소방차: 555",
  "flute|長笛|flauta|flûte|flauto|フルート|플루트: 558",
  "chair|椅子|silla|chaise|sedia|いす|의자: 423,559,765,857",
  "forklift|堆高機|carretilla elevadora|chariot élévateur|carrello elevatore|フォークリフト|지게차: 561",
  "fountain|噴泉|fuente|fontaine|fontana|噴水|분수: 562",
  "bed|床|cama|lit|letto|ベッド|침대: 564",
  "French horn|法國號|trompa|cor|corno|ホルン|호른: 566",
  "frying pan|平底鍋|sartén|poêle|padella|フライパン|프라이팬: 567",
  "coat|外套|abrigo|manteau|cappotto|コート|코트: 568,869",
  "truck|卡車|camión|camion|camion|トラック|트럭: 569,675,717,864,867",
  "gas pump|加油機|surtidor|pompe à essence|pompa di benzina|給油機|주유기: 571",
  "wine glass|酒杯|copa|verre à vin|calice|ワイングラス|와인잔: 572",
  "golf ball|高爾夫球|pelota de golf|balle de golf|pallina da golf|ゴルフボール|골프공: 574",
  "gondola|貢多拉|góndola|gondole|gondola|ゴンドラ|곤돌라: 576",
  "dress|洋裝|vestido|robe|vestito|ワンピース|원피스: 578",
  "piano|鋼琴|piano|piano|pianoforte|ピアノ|피아노: 579,881",
  "greenhouse|溫室|invernadero|serre|serra|温室|온실: 580",
  "supermarket|超市|supermercado|supermarché|supermercato|スーパー|슈퍼마켓: 582",
  "hair clip|髮夾|pasador|barrette|fermaglio|ヘアクリップ|머리핀: 584",
  "hairspray|髮膠|laca|laque|lacca|ヘアスプレー|헤어스프레이: 585",
  "hammer|鐵鎚|martillo|marteau|martello|金づち|망치: 587",
  "basket|籃子|cesta|panier|cesto|かご|바구니: 588,790",
  "hair dryer|吹風機|secador de pelo|sèche-cheveux|asciugacapelli|ドライヤー|드라이기: 589",
  "handkerchief|手帕|pañuelo|mouchoir|fazzoletto|ハンカチ|손수건: 591",
  "harmonica|口琴|armónica|harmonica|armonica|ハーモニカ|하모니카: 593",
  "harp|豎琴|arpa|harpe|arpa|ハープ|하프: 594",
  "axe|斧頭|hacha|hache|ascia|斧|도끼: 596",
  "honeycomb|蜂巢|panal|rayon de miel|favo|ハチの巣|벌집: 599",
  "hook|掛鉤|gancho|crochet|gancio|フック|고리: 600",
  "hourglass|沙漏|reloj de arena|sablier|clessidra|砂時計|모래시계: 604",
  "iron|熨斗|plancha|fer à repasser|ferro da stiro|アイロン|다리미: 606",
  "jack-o'-lantern|南瓜燈|calabaza de Halloween|citrouille d'Halloween|zucca di Halloween|ジャック・オー・ランタン|호박 등불: 607",
  "jeans|牛仔褲|vaqueros|jean|jeans|ジーンズ|청바지: 608",
  "T-shirt|T恤|camiseta|t-shirt|maglietta|Tシャツ|티셔츠: 610",
  "jigsaw puzzle|拼圖|rompecabezas|puzzle|puzzle|ジグソーパズル|직소 퍼즐: 611",
  "joystick|搖桿|palanca de mando|manette|joystick|ジョイスティック|조이스틱: 613",
  "kimono|和服|kimono|kimono|kimono|着物|기모노: 614",
  "ladle|湯杓|cucharón|louche|mestolo|おたま|국자: 618",
  "lamp|檯燈|lámpara|lampe|lampada|電気スタンド|스탠드: 619,818,846",
  "laptop|筆記型電腦|portátil|ordinateur portable|portatile|ノートパソコン|노트북: 620,681",
  "lawn mower|割草機|cortacésped|tondeuse|tosaerba|芝刈り機|잔디깎이: 621",
  "lighter|打火機|mechero|briquet|accendino|ライター|라이터: 626",
  "lipstick|口紅|pintalabios|rouge à lèvres|rossetto|口紅|립스틱: 629",
  "lotion|乳液|loción|lotion|lozione|ローション|로션: 631",
  "speaker|喇叭|altavoz|enceinte|altoparlante|スピーカー|스피커: 632",
  "magnifying glass|放大鏡|lupa|loupe|lente d'ingrandimento|虫めがね|돋보기: 633",
  "compass|指南針|brújula|boussole|bussola|方位磁石|나침반: 635",
  "mailbox|信箱|buzón|boîte aux lettres|cassetta delle lettere|郵便受け|우편함: 637",
  "swimsuit|泳衣|bañador|maillot de bain|costume da bagno|水着|수영복: 638-639,842",
  "manhole cover|人孔蓋|tapa de alcantarilla|plaque d'égout|tombino|マンホールのふた|맨홀 뚜껑: 640",
  "mask|面具|máscara|masque|maschera|仮面|가면: 643",
  "match|火柴|cerilla|allumette|fiammifero|マッチ|성냥: 644",
  "measuring cup|量杯|taza medidora|verre doseur|misurino|計量カップ|계량컵: 647",
  "microphone|麥克風|micrófono|micro|microfono|マイク|마이크: 650",
  "microwave|微波爐|microondas|micro-ondes|microonde|電子レンジ|전자레인지: 651",
  "skirt|裙子|falda|jupe|gonna|スカート|치마: 601,655,689",
  "glove|手套|guante|gant|guanto|手袋|장갑: 658",
  "bowl|碗|cuenco|bol|ciotola|お椀|그릇: 659,809",
  "modem|數據機|módem|modem|modem|モデム|모뎀: 662",
  "monitor|螢幕|monitor|écran|monitor|モニター|모니터: 664,782,916",
  "scooter|機車|moto|scooter|motorino|スクーター|스쿠터: 665,670",
  "bicycle|腳踏車|bicicleta|vélo|bicicletta|自転車|자전거: 444,671",
  "tent|帳篷|tienda de campaña|tente|tenda|テント|텐트: 672",
  "mouse|滑鼠|ratón|souris|mouse|マウス|마우스: 673",
  "necklace|項鍊|collar|collier|collana|ネックレス|목걸이: 679",
  "baby bottle|奶瓶|biberón|biberon|biberon|哺乳びん|젖병: 680",
  "paddle|槳|remo|pagaie|pagaia|パドル|노: 693",
  "paintbrush|畫筆|pincel|pinceau|pennello|絵筆|붓: 696",
  "pajamas|睡衣|pijama|pyjama|pigiama|パジャマ|잠옷: 697",
  "palace|宮殿|palacio|palais|palazzo|宮殿|궁전: 698",
  "paper towel|紙巾|toalla de papel|essuie-tout|carta assorbente|ペーパータオル|종이 타월: 700",
  "parachute|降落傘|paracaídas|parachute|paracadute|パラシュート|낙하산: 701",
  "bench|長椅|banco|banc|panchina|ベンチ|벤치: 703",
  "parking meter|停車收費表|parquímetro|parcmètre|parchimetro|パーキングメーター|주차 요금기: 704",
  "pencil case|鉛筆盒|estuche|trousse|astuccio|筆箱|필통: 709",
  "pencil sharpener|削鉛筆機|sacapuntas|taille-crayon|temperamatite|鉛筆削り|연필깎이: 710",
  "perfume|香水|perfume|parfum|profumo|香水|향수: 711",
  "piggy bank|撲滿|hucha|tirelire|salvadanaio|貯金箱|돼지 저금통: 719",
  "pillow|枕頭|almohada|oreiller|cuscino|枕|베개: 721",
  "ping-pong ball|桌球|pelota de ping-pong|balle de ping-pong|pallina da ping pong|ピンポン球|탁구공: 722",
  "pinwheel|風車|molinillo|moulin à vent|girandola|風車|바람개비: 723",
  "pitcher|水壺|jarra|pichet|brocca|水差し|물주전자: 725,899",
  "plastic bag|塑膠袋|bolsa de plástico|sac plastique|sacchetto di plastica|ビニール袋|비닐봉지: 728",
  "plunger|馬桶吸盤|desatascador|ventouse|sturalavandini|ラバーカップ|뚫어뻥: 731",
  "camera|相機|cámara|appareil photo|fotocamera|カメラ|카메라: 732,759",
  "police car|警車|coche de policía|voiture de police|auto della polizia|パトカー|경찰차: 734",
  "flowerpot|花盆|maceta|pot de fleurs|vaso da fiori|植木鉢|화분: 738",
  "pool table|撞球桌|mesa de billar|table de billard|tavolo da biliardo|ビリヤード台|당구대: 736",
  "drill|電鑽|taladro|perceuse|trapano|ドリル|드릴: 740",
  "printer|印表機|impresora|imprimante|stampante|プリンター|프린터: 713,742",
  "projector|投影機|proyector|projecteur|proiettore|プロジェクター|프로젝터: 745",
  "punching bag|沙包|saco de boxeo|sac de frappe|sacco da boxe|サンドバッグ|샌드백: 747",
  "handbag|手提包|bolso|sac à main|borsa|ハンドバッグ|핸드백: 748",
  "quilt|被子|edredón|couette|trapunta|掛け布団|이불: 750",
  "racket|球拍|raqueta|raquette|racchetta|ラケット|라켓: 752",
  "radio|收音機|radio|radio|radio|ラジオ|라디오: 754",
  "refrigerator|冰箱|nevera|réfrigérateur|frigorifero|冷蔵庫|냉장고: 760",
  "remote control|遙控器|mando a distancia|télécommande|telecomando|リモコン|리모컨: 761",
  "restaurant|餐廳|restaurante|restaurant|ristorante|レストラン|식당: 762",
  "eraser|橡皮擦|goma de borrar|gomme|gomma|消しゴム|지우개: 767",
  "rugby ball|橄欖球|balón de rugby|ballon de rugby|pallone da rugby|ラグビーボール|럭비공: 768",
  "ruler|尺|regla|règle|righello|定規|자: 769",
  "sneaker|運動鞋|zapatilla|basket|scarpa da ginnastica|スニーカー|운동화: 770",
  "safe|保險箱|caja fuerte|coffre-fort|cassaforte|金庫|금고: 771",
  "safety pin|安全別針|imperdible|épingle de sûreté|spilla da balia|安全ピン|옷핀: 772",
  "salt shaker|鹽罐|salero|salière|saliera|塩入れ|소금통: 773",
  "sandal|涼鞋|sandalia|sandale|sandalo|サンダル|샌들: 774",
  "saxophone|薩克斯風|saxofón|saxophone|sassofono|サックス|색소폰: 776",
  "scale|秤|báscula|balance|bilancia|はかり|저울: 778",
  "bus|公車|autobús|bus|autobus|バス|버스: 654,779,874",
  "screw|螺絲|tornillo|vis|vite|ねじ|나사: 783",
  "screwdriver|螺絲起子|destornillador|tournevis|cacciavite|ドライバー|드라이버: 784",
  "seat belt|安全帶|cinturón de seguridad|ceinture de sécurité|cintura di sicurezza|シートベルト|안전벨트: 785",
  "sewing machine|縫紉機|máquina de coser|machine à coudre|macchina da cucire|ミシン|재봉틀: 786",
  "shopping cart|購物車|carrito de la compra|chariot|carrello|ショッピングカート|쇼핑 카트: 791",
  "shovel|鏟子|pala|pelle|pala|シャベル|삽: 792",
  "shower curtain|浴簾|cortina de ducha|rideau de douche|tenda della doccia|シャワーカーテン|샤워 커튼: 794",
  "ski|滑雪板|esquí|ski|sci|スキー板|스키: 795",
  "sleeping bag|睡袋|saco de dormir|sac de couchage|sacco a pelo|寝袋|침낭: 797",
  "door|門|puerta|porte|porta|ドア|문: 799",
  "soap dispenser|給皂機|dispensador de jabón|distributeur de savon|dispenser di sapone|ソープディスペンサー|비누 디스펜서: 804",
  "soccer ball|足球|balón de fútbol|ballon de foot|pallone da calcio|サッカーボール|축구공: 805",
  "sock|襪子|calcetín|chaussette|calzino|靴下|양말: 806",
  "heater|暖氣機|calefactor|radiateur|stufetta|ヒーター|난로: 753,811",
  "spatula|鍋鏟|espátula|spatule|spatola|フライ返し|뒤집개: 813",
  "speedboat|快艇|lancha|hors-bord|motoscafo|モーターボート|쾌속정: 814",
  "spider web|蜘蛛網|telaraña|toile d'araignée|ragnatela|クモの巣|거미줄: 815",
  "stage|舞台|escenario|scène|palcoscenico|舞台|무대: 819,854",
  "bridge|橋|puente|pont|ponte|橋|다리: 821,839,888",
  "stethoscope|聽診器|estetoscopio|stéthoscope|stetoscopio|聴診器|청진기: 823",
  "scarf|圍巾|bufanda|écharpe|sciarpa|マフラー|목도리: 824",
  "stopwatch|碼錶|cronómetro|chronomètre|cronometro|ストップウォッチ|스톱워치: 826",
  "stove|爐子|estufa|cuisinière|fornello|コンロ|가스레인지: 827",
  "strainer|濾網|colador|passoire|colino|ざる|체: 828",
  "tram|電車|tranvía|tramway|tram|路面電車|전차: 829",
  "sofa|沙發|sofá|canapé|divano|ソファ|소파: 831",
  "submarine|潛水艇|submarino|sous-marin|sottomarino|潜水艦|잠수함: 833",
  "suit|西裝|traje|costume|abito|スーツ|정장: 834",
  "sunglasses|太陽眼鏡|gafas de sol|lunettes de soleil|occhiali da sole|サングラス|선글라스: 836-837",
  "sunscreen|防曬乳|protector solar|crème solaire|crema solare|日焼け止め|선크림: 838",
  "sweatshirt|大學T|sudadera|sweat-shirt|felpa|トレーナー|맨투맨: 841",
  "swing|鞦韆|columpio|balançoire|altalena|ブランコ|그네: 843",
  "switch|開關|interruptor|interrupteur|interruttore|スイッチ|스위치: 844",
  "syringe|針筒|jeringa|seringue|siringa|注射器|주사기: 845",
  "tank|坦克|tanque|char d'assaut|carro armato|戦車|탱크: 847",
  "teapot|茶壺|tetera|théière|teiera|急須|찻주전자: 849",
  "teddy bear|泰迪熊|osito de peluche|nounours|orsacchiotto|テディベア|곰 인형: 850",
  "television|電視|televisión|télévision|televisione|テレビ|텔레비전: 548,598,851",
  "tennis ball|網球|pelota de tenis|balle de tennis|pallina da tennis|テニスボール|테니스공: 852",
  "toaster|烤麵包機|tostadora|grille-pain|tostapane|トースター|토스터: 859",
  "toilet|馬桶|inodoro|toilettes|gabinetto|トイレ|변기: 861",
  "flashlight|手電筒|linterna|lampe torche|torcia|懐中電灯|손전등: 862",
  "tractor|拖拉機|tractor|tracteur|trattore|トラクター|트랙터: 866",
  "tray|托盤|bandeja|plateau|vassoio|お盆|쟁반: 868",
  "tricycle|三輪車|triciclo|tricycle|triciclo|三輪車|세발자전거: 870",
  "tripod|三腳架|trípode|trépied|treppiede|三脚|삼각대: 872",
  "trombone|長號|trombón|trombone|trombone|トロンボーン|트롬본: 875",
  "umbrella|雨傘|paraguas|parapluie|ombrello|傘|우산: 879",
  "vacuum cleaner|吸塵器|aspiradora|aspirateur|aspirapolvere|掃除機|청소기: 882",
  "vase|花瓶|jarrón|vase|vaso|花瓶|꽃병: 883",
  "vending machine|販賣機|máquina expendedora|distributeur automatique|distributore automatico|自動販売機|자판기: 886",
  "violin|小提琴|violín|violon|violino|バイオリン|바이올린: 889",
  "volleyball|排球|balón de voleibol|ballon de volley|pallone da pallavolo|バレーボール|배구공: 890",
  "wallet|錢包|cartera|portefeuille|portafoglio|財布|지갑: 893",
  "wardrobe|衣櫃|armario|armoire|armadio|洋服だんす|옷장: 894",
  "sink|洗手台|lavabo|lavabo|lavandino|洗面台|세면대: 896",
  "washing machine|洗衣機|lavadora|lave-linge|lavatrice|洗濯機|세탁기: 897",
  "whistle|哨子|silbato|sifflet|fischietto|笛|호루라기: 902",
  "wig|假髮|peluca|perruque|parrucca|かつら|가발: 903",
  "window|窗戶|ventana|fenêtre|finestra|窓|창문: 904-905",
  "tie|領帶|corbata|cravate|cravatta|ネクタイ|넥타이: 906",
  "wok|炒鍋|wok|wok|wok|中華鍋|웍: 909",
  "spoon|湯匙|cuchara|cuillère|cucchiaio|スプーン|숟가락: 910",
  "yarn|毛線|lana|laine|lana|毛糸|털실: 911",
  "comic book|漫畫|cómic|bande dessinée|fumetto|漫画|만화책: 917",
  "street sign|路標|señal de tráfico|panneau|cartello stradale|道路標識|도로 표지판: 919",
  "traffic light|紅綠燈|semáforo|feu de circulation|semaforo|信号|신호등: 920",
  "book|書|libro|livre|libro|本|책: 921",
  "menu|菜單|menú|menu|menù|メニュー|메뉴: 922",
  "plate|盤子|plato|assiette|piatto|皿|접시: 923",
  "guacamole|酪梨醬|guacamole|guacamole|guacamole|ワカモレ|과카몰리: 924",
  "soup|湯|sopa|soupe|zuppa|スープ|수프: 925",
  "ice cream|冰淇淋|helado|glace|gelato|アイスクリーム|아이스크림: 928",
  "popsicle|冰棒|paleta|glace à l'eau|ghiacciolo|アイスキャンディー|아이스바: 929",
  "bread|麵包|pan|pain|pane|パン|빵: 930",
  "bagel|貝果|bagel|bagel|bagel|ベーグル|베이글: 931",
  "pretzel|椒鹽脆餅|pretzel|bretzel|pretzel|プレッツェル|프레첼: 932",
  "hamburger|漢堡|hamburguesa|hamburger|hamburger|ハンバーガー|햄버거: 933",
  "hot dog|熱狗|perrito caliente|hot-dog|hot dog|ホットドッグ|핫도그: 934",
  "mashed potatoes|馬鈴薯泥|puré de patatas|purée|purè di patate|マッシュポテト|으깬 감자: 935",
  "cabbage|高麗菜|repollo|chou|cavolo|キャベツ|양배추: 936",
  "broccoli|綠花椰菜|brócoli|brocoli|broccolo|ブロッコリー|브로콜리: 937",
  "cauliflower|白花椰菜|coliflor|chou-fleur|cavolfiore|カリフラワー|콜리플라워: 938",
  "zucchini|櫛瓜|calabacín|courgette|zucchina|ズッキーニ|애호박: 939",
  "pumpkin|南瓜|calabaza|courge|zucca|かぼちゃ|호박: 940-942",
  "cucumber|小黃瓜|pepino|concombre|cetriolo|きゅうり|오이: 943",
  "artichoke|朝鮮薊|alcachofa|artichaut|carciofo|アーティチョーク|아티초크: 944",
  "bell pepper|甜椒|pimiento|poivron|peperone|パプリカ|파프리카: 945",
  "mushroom|蘑菇|champiñón|champignon|fungo|きのこ|버섯: 947,992,997",
  "apple|蘋果|manzana|pomme|mela|りんご|사과: 948",
  "strawberry|草莓|fresa|fraise|fragola|いちご|딸기: 949",
  "orange|柳橙|naranja|orange|arancia|オレンジ|오렌지: 950",
  "lemon|檸檬|limón|citron|limone|レモン|레몬: 951",
  "fig|無花果|higo|figue|fico|いちじく|무화과: 952",
  "pineapple|鳳梨|piña|ananas|ananas|パイナップル|파인애플: 953",
  "banana|香蕉|plátano|banane|banana|バナナ|바나나: 954",
  "jackfruit|菠蘿蜜|yaca|jacquier|giaca|ジャックフルーツ|잭프루트: 955",
  "custard apple|釋迦|chirimoya|pomme cannelle|annona|釈迦頭|슈가애플: 956",
  "pomegranate|石榴|granada|grenade|melograno|ざくろ|석류: 957",
  "pasta|義大利麵|pasta|pâtes|pasta|パスタ|파스타: 959",
  "dough|麵團|masa|pâte|impasto|生地|반죽: 961",
  "pizza|披薩|pizza|pizza|pizza|ピザ|피자: 963",
  "burrito|墨西哥捲餅|burrito|burrito|burrito|ブリトー|부리토: 965",
  "red wine|紅酒|vino tinto|vin rouge|vino rosso|赤ワイン|레드 와인: 966",
  "coffee|咖啡|café|café|caffè|コーヒー|커피: 967",
  "mountain|山|montaña|montagne|montagna|山|산: 970",
  "bubble|泡泡|burbuja|bulle|bolla|泡|거품: 971",
  "cliff|懸崖|acantilado|falaise|scogliera|崖|절벽: 972",
  "coral reef|珊瑚礁|arrecife de coral|récif de corail|barriera corallina|サンゴ礁|산호초: 973",
  "lake|湖|lago|lac|lago|湖|호수: 975",
  "beach|海灘|playa|plage|spiaggia|浜辺|해변: 977-978",
  "valley|山谷|valle|vallée|valle|谷|계곡: 979",
  "volcano|火山|volcán|volcan|vulcano|火山|화산: 980",
  "daisy|雛菊|margarita|marguerite|margherita|デイジー|데이지: 985",
  "corn|玉米|maíz|maïs|mais|とうもろこし|옥수수: 987,998",
  "acorn|橡實|bellota|gland|ghianda|どんぐり|도토리: 988",
  "toilet paper|衛生紙|papel higiénico|papier toilette|carta igienica|トイレットペーパー|화장지: 999",
  /*
   * Classes the phone was confident about and had no word for (2026-10-01,
   * Chi's iPhone: "home theater" at 0.86 said nothing). Each goes to the
   * everyday word a learner pointing at it means; the ranges above carry
   * the rest — a pill bottle is a bottle, a spotlight a lamp, a radiator a
   * heater, a web page on screen a monitor, an entertainment centre a TV.
   */
  "hot pot|火鍋|hot pot|fondue chinoise|hot pot|鍋料理|훠궈: 926",
  /*
   * Everyday places and things the classifier knows and nothing here named
   * (2026-10-02, from the 235 classes still unmapped): shops a learner walks
   * into, a cupboard in three of its ImageNet guises, the theatre's curtain
   * (the stage), a car's mirror and grille (the car).
   */
  "candy store|糖果店|tienda de golosinas|confiserie|negozio di caramelle|お菓子屋|사탕 가게: 509",
  "shoe store|鞋店|zapatería|magasin de chaussures|negozio di scarpe|靴屋|신발 가게: 788",
  "toy store|玩具店|juguetería|magasin de jouets|negozio di giocattoli|おもちゃ屋|장난감 가게: 865",
  "cabinet|櫃子|armario|placard|armadietto|戸棚|수납장: 495,553,648",
  "terrace|露台|terraza|terrasse|terrazza|テラス|테라스: 706",
  "mop|拖把|fregona|serpillière|mocio|モップ|대걸레: 840",
  "mosquito net|蚊帳|mosquitero|moustiquaire|zanzariera|蚊帳|모기장: 669",
  "crossword|填字遊戲|crucigrama|mots croisés|cruciverba|クロスワード|십자말풀이: 918",
  "groom|新郎|novio|marié|sposo|新郎|신랑: 982",
  "baseball player|棒球員|jugador de béisbol|joueur de baseball|giocatore di baseball|野球選手|야구 선수: 981",
  "diver|潛水員|buceador|plongeur|subacqueo|ダイバー|다이버: 983",
  "waffle maker|鬆餅機|gofrera|gaufrier|piastra per waffle|ワッフルメーカー|와플 기계: 891",
  "knot|結|nudo|nœud|nodo|結び目|매듭: 616",
];

const LANGUAGE_ORDER: readonly LanguageCode[] = ["en", "zh-TW", "es", "fr", "it", "ja", "ko"];

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
 * "taza" is both the mug and the cup, French "bibliothèque" both the library
 * and the bookcase — goes to the first of them. It used to be left out of
 * the index altogether, so no dictionary on the server had anything to say
 * about four everyday words (2026-10-01); a card that gives the first sense
 * is a better answer than none. Recognition does not use this; it goes by
 * class.
 */
const WORD_BY_TEXT = (() => {
  const index = new Map<string, ObjectWord>();

  for (const word of OBJECT_WORDS) {
    for (const language of LANGUAGE_ORDER) {
      const key = `${language}:${normalize(word[language])}`;
      if (!index.has(key)) index.set(key, word);
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
