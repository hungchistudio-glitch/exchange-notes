import "server-only";

/* =========================================================
   The built-in seven-language dictionary — the data

   Chi's choice (2026-09-28): when every model is busy and the basic
   translation service is out too, a typed word should still get an answer
   in any of the app's languages (five then, seven since 2026-11-16). CC-CEDICT, the other dictionary on
   this server, only speaks English and Chinese.

   4,126 everyday words and phrases, written for this app — not taken from
   any published dictionary — in English, Traditional Chinese as used in
   Taiwan, Spanish, French and Italian, then reviewed line by line by a
   second pass for wrong senses, spelling, gender and Mainland-only Chinese.

   Two rounds. The first 1,855 lines (2026-09-28) are the everyday core. The
   2,271 after them (2026-10-03, Chi's choice: "擴充字典到約 4,000 字") reach
   A2–B2: work and money, news and society, science, technology and school,
   health and feelings, home, travel and nature, food and free time, and the
   general verbs, adjectives and connectors a reader meets in all of them.
   That round started from the ~1,800 words real readers looked up or saved
   that the dictionary did not have, and was reviewed the same way (50
   corrections: false friends such as es "compromiso" for compromise, fr
   "d'autre part" for on the other hand, zh 檸檬汁 for lemonade). The
   second round comes after the first, so on a shared spelling the everyday
   word of the first still wins.

   One entry per line:

     pos|category|en|zh-TW|es|fr|it|ja|ko

   Japanese and Korean (2026-11-16, Chi: 七種語言補齊) were added to every
   line in one pass after the five were written: the word as a Japanese or
   Korean reader writes it (kanji and kana, or Hangul; verbs and adjectives
   in their dictionary form), for the same sense the line already means.

   - pos: noun | verb | adjective | phrase | other (adverbs, pronouns,
     prepositions, numbers, question words…)
   - category: people | objects | actions | other
   - Within a language, forms are separated by ";" — the first is the one a
     card shows; the rest are also recognised when typed (a feminine form,
     a common spelling, a second normal Taiwanese word).
   - Where a spelling belongs to two entries, the earlier line wins. The
     order is deliberate: for "cold", the adjective comes before the illness.

   Read by lib/vocabulary/coreLexicon.ts. Server-only: it is ~300 kB of
   text no screen needs to download.
   ========================================================= */

export const CORE_LEXICON_SOURCE = `
adjective|other|good|好|bueno;buena|bon;bonne|buono;buona|良い;いい|좋다
adjective|other|bad|壞|malo;mala|mauvais;mauvaise|cattivo;cattiva|悪い|나쁘다
adjective|other|better|更好|mejor|meilleur;meilleure|migliore|より良い|더 좋다
adjective|other|worse|更糟|peor|pire|peggiore|より悪い|더 나쁘다
adjective|other|big|大|grande|grand;grande|grande|大きい|크다
adjective|other|small|小|pequeño;pequeña|petit;petite|piccolo;piccola|小さい|작다
adjective|other|huge|巨大|enorme|énorme|enorme|巨大な|거대하다
adjective|other|long|長|largo;larga|long;longue|lungo;lunga|長い|길다
adjective|other|short|短|corto;corta|court;courte|corto;corta|短い|짧다
adjective|other|tall|高|alto;alta|grand;grande|alto;alta|背が高い|키가 크다
adjective|other|high|高|alto;alta|haut;haute|alto;alta|高い|높다
adjective|other|low|低|bajo;baja|bas;basse|basso;bassa|低い|낮다
adjective|other|new|新|nuevo;nueva|nouveau;nouvelle|nuovo;nuova|新しい|새롭다;새
adjective|other|old|舊|viejo;vieja|vieux;vieille|vecchio;vecchia|古い|낡다;오래되다
adjective|other|young|年輕|joven|jeune|giovane|若い|젊다
adjective|other|hot|熱|caliente|chaud;chaude|caldo;calda|暑い;熱い|덥다;뜨겁다
adjective|other|cold|冷|frío;fría|froid;froide|freddo;fredda|寒い;冷たい|춥다;차갑다
noun|other|cold|感冒|resfriado|rhume|raffreddore|風邪|감기
adjective|other|warm|溫暖;暖和|cálido;cálida|chaud;chaude|caldo;calda|暖かい|따뜻하다
adjective|other|cool|涼快;涼爽|fresco;fresca|frais;fraîche|fresco;fresca|涼しい|시원하다
adjective|other|fast|快|rápido;rápida|rapide|veloce|速い;早い|빠르다
adjective|other|slow|慢|lento;lenta|lent;lente|lento;lenta|遅い|느리다
adjective|other|quick|快速|rápido;rápida|rapide|rapido;rapida|素早い|재빠르다
adjective|other|easy|容易|fácil|facile|facile|簡単な;易しい|쉽다
adjective|other|difficult|難|difícil|difficile|difficile|難しい|어렵다
adjective|other|simple|簡單|sencillo;sencilla|simple|semplice|単純な|간단하다
adjective|other|complicated|複雜|complicado;complicada|compliqué;compliquée|complicato;complicata|複雑な|복잡하다
adjective|other|cheap|便宜|barato;barata|bon marché|economico;economica|安い|싸다
adjective|other|expensive|貴|caro;cara|cher;chère|caro;cara|高い|비싸다
adjective|other|rich|有錢|rico;rica|riche|ricco;ricca|金持ちの|부유하다
adjective|other|poor|窮|pobre|pauvre|povero;povera|貧しい|가난하다
adjective|other|happy|快樂;開心|feliz|heureux;heureuse|felice|幸せな;嬉しい|행복하다
adjective|other|unhappy|不快樂;不開心|infeliz|malheureux;malheureuse|infelice|不幸な|불행하다
adjective|other|sad|難過|triste|triste|triste|悲しい|슬프다
adjective|other|angry|生氣|enojado;enojada;enfadado;enfadada|en colère|arrabbiato;arrabbiata|怒った|화나다
adjective|other|tired|累|cansado;cansada|fatigué;fatiguée|stanco;stanca|疲れた|피곤하다
adjective|other|hungry|餓|hambriento;hambrienta|affamé;affamée|affamato;affamata|お腹が空いた|배고프다
adjective|other|thirsty|渴;口渴|sediento;sedienta|assoiffé;assoiffée|assetato;assetata|喉が渇いた|목마르다
adjective|other|sick|生病|enfermo;enferma|malade|malato;malata|病気の|아프다
adjective|other|healthy|健康|sano;sana|en bonne santé|sano;sana|健康な|건강하다
adjective|other|busy|忙|ocupado;ocupada|occupé;occupée|occupato;occupata|忙しい|바쁘다
adjective|other|free|有空|libre|libre|libero;libera|暇な|한가하다
adjective|other|beautiful|美麗|hermoso;hermosa|beau;belle|bello;bella|美しい|아름답다
adjective|other|cute|可愛|lindo;linda|mignon;mignonne|carino;carina|かわいい|귀엽다
adjective|other|pretty|漂亮|bonito;bonita|joli;jolie|carino;carina|きれいな|예쁘다
adjective|other|ugly|醜|feo;fea|laid;laide|brutto;brutta|醜い|못생기다
adjective|other|handsome|帥|guapo;guapa|beau;belle|bello;bella|かっこいい|잘생기다
adjective|other|clean|乾淨|limpio;limpia|propre|pulito;pulita|清潔な;きれいな|깨끗하다
verb|actions|clean|打掃|limpiar|nettoyer|pulire|掃除する|청소하다
adjective|other|dirty|髒|sucio;sucia|sale|sporco;sporca|汚い|더럽다
adjective|other|full|滿|lleno;llena|plein;pleine|pieno;piena|いっぱいの|가득하다
adjective|other|empty|空|vacío;vacía|vide|vuoto;vuota|空の|비다
verb|actions|open|打開;開|abrir|ouvrir|aprire|開ける|열다
adjective|other|open|開著|abierto;abierta|ouvert;ouverte|aperto;aperta|開いている|열려 있다
adjective|other|closed|關著|cerrado;cerrada|fermé;fermée|chiuso;chiusa|閉まっている|닫혀 있다
adjective|other|heavy|重|pesado;pesada|lourd;lourde|pesante|重い|무겁다
noun|objects|light|燈|luz|lumière|luce|電気;明かり|불;전등
adjective|other|light|輕|ligero;ligera;liviano;liviana|léger;légère|leggero;leggera|軽い|가볍다
adjective|other|bright|亮;明亮|luminoso;luminosa|lumineux;lumineuse|luminoso;luminosa|明るい|밝다
adjective|other|dark|暗|oscuro;oscura|sombre|buio;buia|暗い|어둡다
adjective|other|strong|強壯|fuerte|fort;forte|forte|強い|강하다;힘이 세다
adjective|other|loud|大聲|fuerte|fort;forte|forte|大きな声の|큰 소리의
adjective|other|noisy|吵|ruidoso;ruidosa|bruyant;bruyante|rumoroso;rumorosa|うるさい|시끄럽다
adjective|other|quiet|安靜|silencioso;silenciosa|silencieux;silencieuse|silenzioso;silenziosa|静かな|조용하다
adjective|other|weak|虛弱|débil|faible|debole|弱い|약하다
adjective|other|fat|胖|gordo;gorda|gros;grosse|grasso;grassa|太った|뚱뚱하다
adjective|other|thin|瘦|delgado;delgada|mince|magro;magra|痩せた|마르다
adjective|other|thick|厚|grueso;gruesa|épais;épaisse|spesso;spessa|厚い|두껍다
adjective|other|wide|寬|ancho;ancha|large|largo;larga|広い|넓다
adjective|other|narrow|窄|estrecho;estrecha|étroit;étroite|stretto;stretta|狭い|좁다
adjective|other|deep|深|profundo;profunda|profond;profonde|profondo;profonda|深い|깊다
adjective|other|shallow|淺|poco profundo;poco profunda|peu profond;peu profonde|poco profondo;poco profonda|浅い|얕다
adjective|other|near|近|cercano;cercana|proche|vicino;vicina|近い|가깝다
other|other|near|在…附近|cerca de|près de|vicino a|～の近くに|근처에
adjective|other|far|遠|lejano;lejana|lointain;lointaine|lontano;lontana|遠い|멀다
other|other|early|早|temprano|tôt|presto|早い|이르다
other|other|late|晚|tarde|tard|tardi|遅い|늦다
adjective|other|right|對|correcto;correcta|juste|giusto;giusta|正しい|맞다
noun|other|right|右邊|derecha|droite|destra|右|오른쪽
adjective|other|wrong|錯|equivocado;equivocada|faux;fausse|sbagliato;sbagliata|間違った|틀리다
adjective|other|correct|正確|correcto;correcta|correct;correcte|corretto;corretta|正確な|정확하다
verb|actions|correct|改正|corregir|corriger|correggere|訂正する|고치다
adjective|other|true|真的|verdadero;verdadera|vrai;vraie|vero;vera|本当の|사실이다;진짜
adjective|other|false|假的|falso;falsa|faux;fausse|falso;falsa|偽の|거짓이다;가짜
adjective|other|real|真實|real|réel;réelle|reale|本物の|진짜의
adjective|other|same|一樣|mismo;misma|même|stesso;stessa|同じ|같다
adjective|other|different|不一樣;不同|diferente|différent;différente|diverso;diversa|違う|다르다
adjective|other|similar|類似|similar|similaire|simile|似ている|비슷하다
adjective|other|important|重要|importante|important;importante|importante|重要な|중요하다
adjective|other|interesting|有趣|interesante|intéressant;intéressante|interessante|面白い|재미있다
adjective|other|boring|無聊|aburrido;aburrida|ennuyeux;ennuyeuse|noioso;noiosa|退屈な;つまらない|지루하다
adjective|other|fun|好玩|divertido;divertida|amusant;amusante|divertente|楽しい|즐겁다
adjective|other|funny|好笑|gracioso;graciosa|drôle|divertente|おかしい|웃기다
adjective|other|exciting|刺激|emocionante|passionnant;passionnante|emozionante|わくわくする|신나다
adjective|other|serious|嚴肅|serio;seria|sérieux;sérieuse|serio;seria|真剣な|진지하다
adjective|other|dangerous|危險|peligroso;peligrosa|dangereux;dangereuse|pericoloso;pericolosa|危険な|위험하다
adjective|other|sure|確定|seguro;segura|sûr;sûre|sicuro;sicura|確かな|확실하다
adjective|other|safe|安全|seguro;segura|sûr;sûre|sicuro;sicura|安全な|안전하다
adjective|other|famous|有名|famoso;famosa|célèbre|famoso;famosa|有名な|유명하다
adjective|other|popular|受歡迎|popular|populaire|popolare|人気のある|인기 있다
adjective|other|common|常見|común|courant;courante|comune|よくある|흔하다
adjective|other|rare|罕見|raro;rara|rare|raro;rara|珍しい|드물다
adjective|other|possible|可能|posible|possible|possibile|可能な|가능하다
adjective|other|impossible|不可能|imposible|impossible|impossibile|不可能な|불가능하다
adjective|other|necessary|必要|necesario;necesaria|nécessaire|necessario;necessaria|必要な|필요하다
adjective|other|useful|有用|útil|utile|utile|役に立つ|유용하다
adjective|other|useless|沒用|inútil|inutile|inutile|役に立たない|쓸모없다
adjective|other|special|特別|especial|spécial;spéciale|speciale|特別な|특별하다
adjective|other|normal|正常|normal|normal;normale|normale|普通の|보통이다;평범하다
adjective|other|strange|奇怪|extraño;extraña|bizarre|strano;strana|変な|이상하다
adjective|other|typical|典型|típico;típica|typique|tipico;tipica|典型的な|전형적이다
adjective|other|public|公共|público;pública|public;publique|pubblico;pubblica|公共の|공공의
adjective|other|private|私人|privado;privada|privé;privée|privato;privata|私的な|사적인
adjective|other|personal|個人|personal|personnel;personnelle|personale|個人的な|개인적인
adjective|other|hard|硬|duro;dura|dur;dure|duro;dura|硬い|딱딱하다
adjective|other|soft|軟|blando;blanda|mou;molle|morbido;morbida|柔らかい|부드럽다
adjective|other|wet|濕|mojado;mojada|mouillé;mouillée|bagnato;bagnata|濡れた|젖다
adjective|other|dry|乾|seco;seca|sec;sèche|secco;secca|乾いた|마르다
adjective|other|sweet|甜|dulce|sucré;sucrée|dolce|甘い|달다
adjective|other|sour|酸|ácido;ácida|acide|aspro;aspra|酸っぱい|시다
adjective|other|bitter|苦|amargo;amarga|amer;amère|amaro;amara|苦い|쓰다
adjective|other|spicy|辣|picante|piquant;piquante|piccante|辛い|맵다
adjective|other|salty|鹹|salado;salada|salé;salée|salato;salata|しょっぱい|짜다
adjective|other|delicious|好吃|delicioso;deliciosa|délicieux;délicieuse|delizioso;deliziosa|おいしい|맛있다
adjective|other|fresh|新鮮|fresco;fresca|frais;fraîche|fresco;fresca|新鮮な|신선하다
adjective|other|raw|生|crudo;cruda|cru;crue|crudo;cruda|生の|날것의
adjective|other|cooked|熟|cocido;cocida|cuit;cuite|cotto;cotta|火の通った|익다
adjective|other|ready|準備好|listo;lista|prêt;prête|pronto;pronta|準備ができた|준비되다
adjective|other|clear|清楚|claro;clara|clair;claire|chiaro;chiara|はっきりした|분명하다
adjective|other|kind|善良|amable|gentil;gentille|gentile|親切な|착하다
adjective|other|nice|親切|simpático;simpática|sympathique;sympa|simpatico;simpatica|感じのいい|친절하다
adjective|other|friendly|友善|amigable|amical;amicale|amichevole|友好的な|다정하다
adjective|other|polite|有禮貌|educado;educada|poli;polie|educato;educata|礼儀正しい|예의 바르다
adjective|other|rude|沒禮貌|grosero;grosera|impoli;impolie|maleducato;maleducata|失礼な|무례하다
adjective|other|shy|害羞|tímido;tímida|timide|timido;timida|恥ずかしがりの|수줍다
adjective|other|brave|勇敢|valiente|courageux;courageuse|coraggioso;coraggiosa|勇敢な|용감하다
adjective|other|smart|聰明|inteligente|intelligent;intelligente|intelligente|頭がいい|똑똑하다
adjective|other|stupid|笨|tonto;tonta|bête|stupido;stupida|ばかな|어리석다
adjective|other|lazy|懶惰;懶|perezoso;perezosa|paresseux;paresseuse|pigro;pigra|怠惰な|게으르다
adjective|other|hardworking|努力|trabajador;trabajadora|travailleur;travailleuse|diligente|勤勉な|부지런하다
adjective|other|honest|誠實|honesto;honesta|honnête|onesto;onesta|正直な|정직하다
noun|people|patient|病人;病患|paciente|patient;patiente|paziente|患者|환자
adjective|other|patient|有耐心|paciente|patient;patiente|paziente|我慢強い|참을성 있다
adjective|other|impatient|沒耐心|impaciente|impatient;impatiente|impaziente|せっかちな|참을성 없다
adjective|other|calm|冷靜|tranquilo;tranquila|calme|calmo;calma|落ち着いた|침착하다
adjective|other|nervous|緊張|nervioso;nerviosa|nerveux;nerveuse|nervoso;nervosa|緊張した|긴장하다
adjective|other|afraid|害怕|asustado;asustada|effrayé;effrayée|spaventato;spaventata|怖がった|무섭다
adjective|other|surprised|驚訝|sorprendido;sorprendida|surpris;surprise|sorpreso;sorpresa|驚いた|놀라다
adjective|other|excited|興奮|emocionado;emocionada|enthousiaste|emozionato;emozionata|興奮した|흥분하다
adjective|other|worried|擔心|preocupado;preocupada|inquiet;inquiète|preoccupato;preoccupata|心配した|걱정하다
adjective|other|lonely|寂寞;孤單|solo;sola|seul;seule|solo;sola|寂しい|외롭다
adjective|other|proud|驕傲|orgulloso;orgullosa|fier;fière|orgoglioso;orgogliosa|誇らしい|자랑스럽다
adjective|other|jealous|嫉妒;忌妒|celoso;celosa|jaloux;jalouse|geloso;gelosa|嫉妬した|질투하다
adjective|other|lucky|幸運|afortunado;afortunada|chanceux;chanceuse|fortunato;fortunata|幸運な|운이 좋다
adjective|other|embarrassed|尷尬|avergonzado;avergonzada|gêné;gênée|imbarazzato;imbarazzata|恥ずかしい|창피하다
adjective|other|confused|困惑|confundido;confundida|perplexe|confuso;confusa|混乱した|혼란스럽다
adjective|other|disappointed|失望|decepcionado;decepcionada|déçu;déçue|deluso;delusa|がっかりした|실망하다
adjective|other|satisfied|滿意|satisfecho;satisfecha|satisfait;satisfaite|soddisfatto;soddisfatta|満足した|만족하다
adjective|other|relaxed|放鬆|relajado;relajada|détendu;détendue|rilassato;rilassata|くつろいだ|편안하다
adjective|other|grateful|感激|agradecido;agradecida|reconnaissant;reconnaissante|grato;grata|感謝している|감사하다
adjective|other|interested|有興趣|interesado;interesada|intéressé;intéressée|interessato;interessata|興味がある|관심 있다
adjective|other|comfortable|舒服|cómodo;cómoda|confortable|comodo;comoda|快適な|편하다
adjective|other|uncomfortable|不舒服|incómodo;incómoda|inconfortable|scomodo;scomoda|不快な|불편하다
adjective|other|convenient|方便|práctico;práctica|pratique|comodo;comoda|便利な|편리하다
adjective|other|pleasant|愉快|agradable|agréable|piacevole|楽しい;愉快な|즐겁다;유쾌하다
adjective|other|whole|整個|entero;entera|entier;entière|intero;intera|全体の|전체의
adjective|other|complete|完整|completo;completa|complet;complète|completo;completa|完全な|완전하다
adjective|other|alive|活著|vivo;viva|vivant;vivante|vivo;viva|生きている|살아 있다
adjective|other|dead|死了|muerto;muerta|mort;morte|morto;morta|死んだ|죽다
adjective|other|married|已婚|casado;casada|marié;mariée|sposato;sposata|既婚の|결혼하다;기혼
adjective|other|single|單身|soltero;soltera|célibataire|single|独身の|미혼;독신
adjective|other|foreign|外國|extranjero;extranjera|étranger;étrangère|straniero;straniera|外国の|외국의
adjective|other|local|當地|local|local;locale|locale|地元の|현지의
adjective|other|international|國際|internacional|international;internationale|internazionale|国際的な|국제적인
adjective|other|modern|現代|moderno;moderna|moderne|moderno;moderna|現代的な|현대적이다
adjective|other|traditional|傳統|tradicional|traditionnel;traditionnelle|tradizionale|伝統的な|전통적이다
adjective|other|natural|自然|natural|naturel;naturelle|naturale|自然な|자연스럽다
adjective|other|perfect|完美|perfecto;perfecta|parfait;parfaite|perfetto;perfetta|完璧な|완벽하다
adjective|other|excellent|優秀|excelente|excellent;excellente|ottimo;ottima|優秀な|뛰어나다
adjective|other|great|棒|genial|génial;géniale|fantastico;fantastica|すごい|대단하다
adjective|other|wonderful|美好|maravilloso;maravillosa|merveilleux;merveilleuse|meraviglioso;meravigliosa|素晴らしい|훌륭하다
adjective|other|amazing|驚人|increíble|incroyable|incredibile|驚くべき|놀랍다
adjective|other|terrible|糟糕|terrible|terrible|terribile|ひどい|끔찍하다
adjective|other|horrible|可怕|horrible|horrible|orribile|恐ろしい|무시무시하다
adjective|other|favorite;favourite|最喜歡|favorito;favorita|préféré;préférée|preferito;preferita|大好きな|가장 좋아하는
adjective|other|main|主要|principal|principal;principale|principale|主な|주요하다
adjective|other|final|最終|final|final;finale|finale|最終の|마지막의
adjective|other|next|下一個|próximo;próxima|prochain;prochaine|prossimo;prossima|次の|다음
adjective|other|previous|上一個|anterior|précédent;précédente|precedente|前の|이전
adjective|other|last|最後|último;última|dernier;dernière|ultimo;ultima|最後の|마지막
adjective|other|first|第一|primero;primera|premier;première|primo;prima|最初の|첫째;처음
adjective|other|recent|最近|reciente|récent;récente|recente|最近の|최근의
adjective|other|current|目前|actual|actuel;actuelle|attuale|現在の|현재의
adjective|other|usual|平常|habitual|habituel;habituelle|solito;solita|いつもの|평소의
adjective|other|daily|日常|diario;diaria|quotidien;quotidienne|quotidiano;quotidiana|毎日の|일상의;매일
adjective|other|fair|公平|justo;justa|juste|giusto;giusta|公平な|공평하다
adjective|other|unfair|不公平|injusto;injusta|injuste|ingiusto;ingiusta|不公平な|불공평하다
adjective|other|generous|大方|generoso;generosa|généreux;généreuse|generoso;generosa|気前のいい|너그럽다
adjective|other|selfish|自私|egoísta|égoïste|egoista|わがままな|이기적이다
adjective|other|careful|小心|cuidadoso;cuidadosa|prudent;prudente|attento;attenta|注意深い|조심스럽다
adjective|other|careless|粗心|descuidado;descuidada|étourdi;étourdie|sbadato;sbadata|不注意な|부주의하다
adjective|other|crazy|瘋|loco;loca|fou;folle|pazzo;pazza|狂った|미치다
adjective|other|gentle|溫柔|dulce|doux;douce|dolce|優しい|다정하다;온화하다
adjective|other|strict|嚴格|estricto;estricta|strict;stricte|severo;severa|厳しい|엄격하다
adjective|other|optimistic|樂觀|optimista|optimiste|ottimista|楽観的な|낙관적이다
adjective|other|pessimistic|悲觀|pesimista|pessimiste|pessimista|悲観的な|비관적이다
adjective|other|independent|獨立|independiente|indépendant;indépendante|indipendente|独立した|독립적이다
adjective|other|responsible|負責|responsable|responsable|responsabile|責任感のある|책임감 있다
adjective|other|romantic|浪漫|romántico;romántica|romantique|romantico;romantica|ロマンチックな|낭만적이다
adjective|other|elegant|優雅|elegante|élégant;élégante|elegante|上品な|우아하다
adjective|other|formal|正式|formal|formel;formelle|formale|正式な|공식적이다
adjective|other|lost|迷路|perdido;perdida|perdu;perdue|perso;persa|道に迷った|길을 잃다
adjective|other|drunk|喝醉|borracho;borracha|ivre|ubriaco;ubriaca|酔った|취하다
adjective|other|injured|受傷|herido;herida|blessé;blessée|ferito;ferita|けがをした|다치다
adjective|other|pregnant|懷孕|embarazada|enceinte|incinta|妊娠した|임신하다
adjective|other|awake|醒著|despierto;despierta|réveillé;réveillée|sveglio;sveglia|起きている|깨어 있다
adjective|other|asleep|睡著|dormido;dormida|endormi;endormie|addormentato;addormentata|眠っている|잠들다
adjective|other|broken|壞掉|roto;rota|cassé;cassée|rotto;rotta|壊れた|고장 나다
adjective|other|round|圓|redondo;redonda|rond;ronde|rotondo;rotonda|丸い|둥글다
adjective|other|flat|平|plano;plana|plat;plate|piatto;piatta|平らな|평평하다
adjective|other|straight|直|recto;recta|droit;droite|dritto;dritta|まっすぐな|곧다
adjective|other|sharp|鋒利|afilado;afilada|tranchant;tranchante|affilato;affilata|鋭い|날카롭다
adjective|other|tight|緊|apretado;apretada|serré;serrée|stretto;stretta|きつい|꽉 끼다
adjective|other|crowded|擁擠;擠|abarrotado;abarrotada|bondé;bondée|affollato;affollata|混んでいる|붐비다
adjective|other|tidy|整齊|ordenado;ordenada|rangé;rangée|ordinato;ordinata|片付いた|깔끔하다
adjective|other|messy|亂|desordenado;desordenada|en désordre|disordinato;disordinata|散らかった|지저분하다
verb|actions|be|是|ser|être|essere|である;いる|이다
verb|actions|have|有|tener|avoir|avere|持っている;ある|있다;가지다
verb|actions|do|做|hacer|faire|fare|する|하다
verb|actions|make|做|hacer|faire|fare|作る|만들다
verb|actions|go|去|ir|aller|andare|行く|가다
verb|actions|come|來|venir|venir|venire|来る|오다
verb|actions|leave|離開|irse|partir|partire|去る;出る|떠나다
verb|actions|arrive|到;到達|llegar|arriver|arrivare|着く|도착하다
verb|actions|return|回來|volver;regresar|revenir|tornare|戻る|돌아오다
verb|actions|go back|回去|volver|retourner|tornare|帰る|돌아가다
verb|actions|stay|留下|quedarse|rester|restare;rimanere|滞在する|머물다
verb|actions|live|住|vivir|habiter|abitare|住む|살다
verb|actions|work|工作|trabajar|travailler|lavorare|働く|일하다
verb|actions|study|讀書;念書|estudiar|étudier|studiare|勉強する|공부하다
verb|actions|learn|學習;學|aprender|apprendre|imparare|学ぶ|배우다
verb|actions|teach|教|enseñar|enseigner|insegnare|教える|가르치다
verb|actions|read|讀;閱讀|leer|lire|leggere|読む|읽다
verb|actions|write|寫|escribir|écrire|scrivere|書く|쓰다
verb|actions|speak|說;講|hablar|parler|parlare|話す|말하다
verb|actions|talk|說話;講話|hablar|parler|parlare|しゃべる|이야기하다
verb|actions|say|說|decir|dire|dire|言う|말하다
verb|actions|tell|告訴|decir|dire|dire|伝える|알려 주다
verb|actions|ask|問|preguntar|demander|chiedere|尋ねる;聞く|묻다
verb|actions|answer|回答|responder;contestar|répondre|rispondere|答える|대답하다
verb|actions|call|打電話|llamar|appeler|chiamare|電話する|전화하다
verb|actions|listen|聽|escuchar|écouter|ascoltare|聴く|듣다
verb|actions|hear|聽到|oír|entendre|sentire|聞こえる|들리다
verb|actions|see|看到;看見|ver|voir|vedere|見える;見る|보다
verb|actions|look|看|mirar|regarder|guardare|見る|보다
verb|actions|watch|看|ver|regarder|guardare|観る|보다;시청하다
verb|actions|show|展示|mostrar|montrer|mostrare|見せる|보여 주다
verb|actions|know|知道|saber|savoir|sapere|知っている|알다
verb|actions|get to know|認識|conocer|connaître|conoscere|知り合う|알게 되다
verb|actions|understand|懂;了解|entender;comprender|comprendre|capire|わかる|이해하다
verb|actions|think|想|pensar|penser|pensare|考える|생각하다
verb|actions|believe|相信|creer|croire|credere|信じる|믿다
verb|actions|remember|記得|recordar;acordarse|se souvenir;se rappeler|ricordare;ricordarsi|覚えている|기억하다
verb|actions|forget|忘記|olvidar|oublier|dimenticare|忘れる|잊다
verb|actions|want|想要;要|querer|vouloir|volere|欲しい|원하다
verb|actions|need|需要|necesitar|avoir besoin de|avere bisogno di|必要とする|필요하다
verb|actions|like|喜歡|gustar|aimer|piacere|好きだ|좋아하다
verb|actions|love|愛|amar|aimer|amare|愛する|사랑하다
verb|actions|hate|討厭|odiar|détester|odiare|嫌う|싫어하다
verb|actions|prefer|比較喜歡|preferir|préférer|preferire|～の方が好きだ|더 좋아하다
verb|actions|hope|希望|esperar|espérer|sperare|望む|바라다
verb|actions|wait|等|esperar|attendre|aspettare|待つ|기다리다
verb|actions|try|嘗試;試|intentar|essayer|provare|試す|시도하다
verb|actions|can|可以;能|poder|pouvoir|potere|できる|할 수 있다
verb|actions|must|必須|deber|devoir|dovere|～しなければならない|해야 하다
verb|actions|should|應該|deber|devoir|dovere|～すべきだ|해야 하다
verb|actions|use|用;使用|usar|utiliser|usare|使う|사용하다;쓰다
verb|actions|take|拿|tomar|prendre|prendere|取る|가져가다;잡다
verb|actions|bring|帶|traer|apporter|portare|持ってくる|가져오다
verb|actions|give|給|dar|donner|dare|あげる|주다
verb|actions|send|寄|enviar;mandar|envoyer|mandare;inviare|送る|보내다
verb|actions|receive|收到|recibir|recevoir|ricevere|受け取る|받다
verb|actions|get|得到|conseguir|obtenir|ottenere|得る|얻다
verb|actions|find|找到|encontrar|trouver|trovare|見つける|찾다
verb|actions|lose|弄丟|perder|perdre|perdere|なくす|잃어버리다
verb|actions|look for|找|buscar|chercher|cercare|探す|찾다
verb|actions|search|搜尋|buscar|rechercher|cercare|検索する|검색하다
verb|actions|close|關上;關|cerrar|fermer|chiudere|閉める|닫다
verb|actions|start;begin|開始|empezar;comenzar|commencer|cominciare;iniziare|始める|시작하다
verb|actions|finish|完成|terminar|finir|finire|終える|끝내다
verb|actions|end|結束|terminar|finir|finire|終わる|끝나다
verb|actions|stop|停止;停|parar|arrêter|fermare|止める|멈추다
verb|actions|continue|繼續|continuar|continuer|continuare|続ける|계속하다
verb|actions|change|改變|cambiar|changer|cambiare|変える|바꾸다
verb|actions|help|幫忙;幫助|ayudar|aider|aiutare|手伝う|돕다
phrase|other|help|救命|socorro|au secours|aiuto|助けて|살려 주세요
verb|actions|meet|見面|encontrarse|se retrouver|incontrarsi|会う|만나다
verb|actions|visit|參觀|visitar|visiter|visitare|訪れる|방문하다
verb|actions|travel|旅行;旅遊|viajar|voyager|viaggiare|旅行する|여행하다
verb|actions|walk|走路|caminar|marcher|camminare|歩く|걷다
verb|actions|run|跑;跑步|correr|courir|correre|走る|뛰다;달리다
verb|actions|drive|開車|conducir;manejar|conduire|guidare|運転する|운전하다
verb|actions|ride a bike|騎腳踏車|andar en bicicleta;montar en bicicleta|faire du vélo|andare in bicicletta|自転車に乗る|자전거를 타다
verb|actions|ride a horse|騎馬|montar a caballo|monter à cheval|andare a cavallo;cavalcare|馬に乗る|말을 타다
verb|actions|fly|飛|volar|voler|volare|飛ぶ|날다
verb|actions|swim|游泳|nadar|nager|nuotare|泳ぐ|수영하다
verb|actions|dance|跳舞|bailar|danser|ballare|踊る|춤추다
verb|actions|sing|唱歌|cantar|chanter|cantare|歌う|노래하다
verb|actions|play|玩|jugar|jouer|giocare|遊ぶ|놀다
verb|actions|play an instrument|演奏樂器|tocar un instrumento|jouer d'un instrument|suonare uno strumento|楽器を演奏する|악기를 연주하다
verb|actions|play the piano|彈鋼琴|tocar el piano|jouer du piano|suonare il pianoforte;suonare il piano|ピアノを弾く|피아노를 치다
verb|actions|play the guitar|彈吉他|tocar la guitarra|jouer de la guitare|suonare la chitarra|ギターを弾く|기타를 치다
verb|actions|cook|做菜;煮飯|cocinar|cuisiner|cucinare|料理する|요리하다
noun|people|cook|廚師|cocinero;cocinera|cuisinier;cuisinière|cuoco;cuoca|料理人|요리사
verb|actions|eat|吃|comer|manger|mangiare|食べる|먹다
verb|actions|drink|喝|beber|boire|bere|飲む|마시다
verb|actions|sleep|睡覺|dormir|dormir|dormire|寝る|자다
verb|actions|wake up|醒來|despertarse|se réveiller|svegliarsi|目が覚める|깨다
verb|actions|get up|起床|levantarse|se lever|alzarsi|起きる|일어나다
verb|actions|sit|坐|sentarse|s'asseoir|sedersi|座っている|앉다
verb|actions|sit down|坐下|sentarse|s'asseoir|sedersi|座る|앉다
verb|actions|stand|站|estar de pie|être debout|stare in piedi|立っている|서다
verb|actions|stand up|站起來|ponerse de pie|se lever|alzarsi|立ち上がる|일어서다
verb|actions|lie down|躺下|acostarse|s'allonger|sdraiarsi|横になる|눕다
verb|actions|go to bed|上床睡覺|acostarse|se coucher|andare a letto|寝床に就く|잠자리에 들다
verb|actions|fall asleep|睡著|dormirse|s'endormir|addormentarsi|眠りにつく|잠들다
verb|actions|wash|洗|lavar|laver|lavare|洗う|씻다
verb|actions|wear|穿|llevar|porter|indossare;portare|着ている|입다
verb|actions|put on|穿上|ponerse|mettre|mettersi|着る|입다
verb|actions|take off|脫掉;脫|quitarse|enlever|togliersi|脱ぐ|벗다
verb|actions|buy|買|comprar|acheter|comprare|買う|사다
verb|actions|sell|賣|vender|vendre|vendere|売る|팔다
verb|actions|pay|付錢|pagar|payer|pagare|払う|지불하다
verb|actions|spend|花錢;花|gastar|dépenser|spendere|費やす|쓰다
verb|actions|borrow|借|pedir prestado|emprunter|prendere in prestito|借りる|빌리다
verb|actions|lend|借給|prestar|prêter|prestare|貸す|빌려주다
verb|actions|rent|租|alquilar|louer|affittare|賃借りする|임대하다
noun|other|rent|房租|alquiler;renta|loyer|affitto|家賃|집세;월세
verb|actions|win|贏|ganar|gagner|vincere|勝つ|이기다
verb|actions|fall down|跌倒;摔倒|caerse|tomber|cadere|転ぶ|넘어지다
verb|actions|hold|拿著|sostener|tenir|tenere|持つ|들다
verb|actions|push|推|empujar|pousser|spingere|押す|밀다
verb|actions|pull|拉|tirar;jalar|tirer|tirare|引く|당기다
verb|actions|throw|丟|lanzar|lancer|lanciare|投げる|던지다
verb|actions|throw away|丟掉|tirar|jeter|buttare via|捨てる|버리다
verb|actions|catch|抓住|atrapar|attraper|prendere|捕まえる|잡다
verb|actions|cut|切|cortar|couper|tagliare|切る|자르다
verb|actions|break|打破|romper|casser|rompere|壊す|깨다
verb|actions|fix;repair|修理;修|arreglar;reparar|réparer|riparare;aggiustare|直す|고치다
verb|actions|build|建造;蓋|construir|construire|costruire|建てる|짓다
verb|actions|draw|畫|dibujar|dessiner|disegnare|描く|그리다
verb|actions|paint|畫|pintar|peindre|dipingere|塗る|칠하다
verb|actions|choose|選擇;選|elegir;escoger|choisir|scegliere|選ぶ|고르다
verb|actions|decide|決定|decidir|décider|decidere|決める|결정하다
verb|actions|plan|計畫|planear|planifier|pianificare|計画する|계획하다
verb|actions|prepare|準備|preparar|préparer|preparare|準備する|준비하다
verb|actions|explain|解釋|explicar|expliquer|spiegare|説明する|설명하다
verb|actions|describe|描述|describir|décrire|descrivere|描写する|묘사하다
verb|actions|repeat|重複|repetir|répéter|ripetere|繰り返す|반복하다
verb|actions|translate|翻譯|traducir|traduire|tradurre|翻訳する|번역하다
verb|actions|spell|拼|deletrear|épeler|fare lo spelling|つづる|철자를 말하다
verb|actions|pronounce|發音|pronunciar|prononcer|pronunciare|発音する|발음하다
verb|actions|practice;practise|練習|practicar|s'entraîner|esercitarsi|練習する|연습하다
verb|actions|improve|改善|mejorar|améliorer|migliorare|上達する|향상하다
verb|actions|feel|覺得;感覺|sentirse|se sentir|sentirsi|感じる|느끼다
verb|actions|laugh|笑|reír;reírse|rire|ridere|笑う|웃다
verb|actions|smile|微笑|sonreír|sourire|sorridere|ほほえむ|미소 짓다
verb|actions|cry|哭|llorar|pleurer|piangere|泣く|울다
verb|actions|worry|擔心|preocuparse|s'inquiéter|preoccuparsi|心配する|걱정하다
verb|actions|rest|休息|descansar|se reposer|riposare;riposarsi|休む|쉬다
verb|actions|relax|放鬆|relajarse|se détendre|rilassarsi|くつろぐ|긴장을 풀다
verb|actions|enjoy|享受|disfrutar|profiter|godersi|楽しむ|즐기다
verb|actions|get married;marry|結婚|casarse|se marier|sposarsi|結婚する|결혼하다
verb|actions|die|死|morir|mourir|morire|死ぬ|죽다
verb|actions|be born|出生|nacer|naître|nascere|生まれる|태어나다
verb|actions|grow up|長大|crecer|grandir|crescere|育つ|자라다
noun|objects|plant|植物|planta|plante|pianta|植物|식물
verb|actions|plant|種|plantar|planter|piantare|植える|심다
verb|actions|move house|搬家|mudarse|déménager|traslocare|引っ越す|이사하다
verb|actions|move|動|moverse|bouger|muoversi|動く|움직이다
verb|actions|agree|同意|estar de acuerdo|être d'accord|essere d'accordo|賛成する|동의하다
verb|actions|disagree|不同意|no estar de acuerdo|ne pas être d'accord|non essere d'accordo|反対する|반대하다
verb|actions|allow|允許|permitir|permettre|permettere|許す|허락하다
verb|actions|forbid|禁止|prohibir|interdire|vietare|禁じる|금지하다
verb|actions|invite|邀請|invitar|inviter|invitare|招待する|초대하다
verb|actions|thank|感謝|agradecer|remercier|ringraziare|感謝する|감사하다
verb|actions|apologize;apologise|道歉|disculparse;pedir perdón|s'excuser|scusarsi|謝る|사과하다
verb|actions|promise|答應|prometer|promettre|promettere|約束する|약속하다
verb|actions|share|分享|compartir|partager|condividere|共有する|공유하다
verb|actions|follow|跟著;跟隨|seguir|suivre|seguire|ついて行く|따라가다
verb|actions|join|加入|unirse|rejoindre|unirsi|加わる|가입하다
verb|actions|take part|參加|participar|participer|partecipare|参加する|참가하다
verb|actions|hide|藏|esconder|cacher|nascondere|隠す;隠れる|숨기다;숨다
verb|actions|check|檢查|revisar|vérifier|controllare|確認する|확인하다
verb|actions|count|數|contar|compter|contare|数える|세다
verb|actions|measure|量;測量|medir|mesurer|misurare|測る|재다
verb|actions|compare|比較|comparar|comparer|confrontare|比べる|비교하다
verb|actions|happen|發生|pasar;ocurrir|se passer|succedere|起こる|일어나다
verb|actions|seem|好像;似乎|parecer|sembler|sembrare|～のようだ|~인 것 같다
verb|actions|become|成為|convertirse en|devenir|diventare|～になる|되다
verb|actions|keep|保留|guardar|garder|tenere|保つ|보관하다
verb|actions|let|讓|dejar|laisser|lasciare|～させる|~하게 하다
verb|actions|put|放|poner|mettre|mettere|置く|놓다;두다
verb|actions|turn on|打開;開|encender;prender|allumer|accendere|つける|켜다
verb|actions|turn off|關掉;關|apagar|éteindre|spegnere|消す|끄다
verb|actions|knock on the door|敲門|llamar a la puerta;tocar la puerta|frapper à la porte|bussare alla porta|ノックする|문을 두드리다
verb|actions|kiss|親吻;親|besar|embrasser|baciare|キスする|키스하다
verb|actions|hug|擁抱;抱|abrazar|serrer dans ses bras|abbracciare|抱きしめる|안다;포옹하다
verb|actions|climb|爬|escalar|grimper|arrampicarsi|登る|오르다
verb|actions|go up|上去|subir|monter|salire|上がる|올라가다
verb|actions|go down|下去|bajar|descendre|scendere|下りる|내려가다
verb|actions|jump|跳|saltar|sauter|saltare|跳ぶ|뛰다;점프하다
verb|actions|shout|大叫;大喊|gritar|crier|gridare;urlare|叫ぶ|외치다
verb|actions|whisper|小聲說|susurrar|chuchoter|sussurrare|ささやく|속삭이다
verb|actions|smell|聞|oler|sentir|annusare|においをかぐ|냄새를 맡다
verb|actions|taste|嚐;嘗|probar|goûter|assaggiare|味見する|맛보다
verb|actions|touch|摸|tocar|toucher|toccare|触る|만지다
verb|actions|order|點餐;點|pedir|commander|ordinare|注文する|주문하다
verb|actions|book;reserve|預訂;訂|reservar|réserver|prenotare|予約する|예약하다
verb|actions|cancel|取消|cancelar|annuler|annullare|取り消す|취소하다
verb|actions|be late|遲到|llegar tarde|être en retard|essere in ritardo|遅刻する|지각하다
verb|actions|go out|出去|salir|sortir|uscire|出かける|나가다
verb|actions|enter|進入|entrar|entrer|entrare|入る|들어가다
verb|actions|come in|進來|entrar|entrer|entrare|入ってくる|들어오다
verb|actions|get on|上車|subir;subirse|monter|salire|乗る|타다
verb|actions|get off|下車|bajar;bajarse|descendre|scendere|降りる|내리다
verb|actions|take the bus|搭公車;坐公車|tomar el autobús|prendre le bus|prendere l'autobus|バスに乗る|버스를 타다
verb|actions|cross the street|過馬路|cruzar la calle|traverser la rue|attraversare la strada|道を渡る|길을 건너다
verb|actions|turn|轉|girar;doblar|tourner|girare|曲がる|돌다
noun|objects|park|公園|parque|parc|parco|公園|공원
verb|actions|park|停車|estacionar;aparcar|se garer|parcheggiare|駐車する|주차하다
verb|actions|lock|鎖|cerrar con llave|fermer à clé|chiudere a chiave|鍵をかける|잠그다
verb|actions|be called|叫|llamarse|s'appeler|chiamarsi|～と呼ばれる|불리다
verb|actions|go home|回家|volver a casa|rentrer à la maison|tornare a casa|家に帰る|집에 가다
verb|actions|give back|還|devolver|rendre|restituire|返す|돌려주다
verb|actions|give a gift|送禮物|hacer un regalo|faire un cadeau|fare un regalo|プレゼントを贈る|선물하다
verb|actions|take care of|照顧|cuidar|s'occuper de|prendersi cura di|世話をする|돌보다
verb|actions|dream|做夢|soñar|rêver|sognare|夢を見る|꿈꾸다
verb|actions|guess|猜|adivinar|deviner|indovinare|推測する|추측하다
verb|actions|imagine|想像|imaginar|imaginer|immaginare|想像する|상상하다
verb|actions|remind|提醒|recordar|rappeler|ricordare|思い出させる|상기시키다
verb|actions|recognize;recognise|認出|reconocer|reconnaître|riconoscere|見分ける|알아보다
verb|actions|discover|發現|descubrir|découvrir|scoprire|発見する|발견하다
verb|actions|notice|注意到|notar|remarquer|notare|気づく|알아차리다
verb|actions|realize;realise|意識到|darse cuenta|se rendre compte|rendersi conto|悟る|깨닫다
verb|actions|pay attention|注意|prestar atención|faire attention|fare attenzione|注意する|주의하다
verb|actions|make a mistake|犯錯|equivocarse|se tromper|sbagliare;sbagliarsi|間違える|실수하다
verb|actions|write down|寫下來;記下來|anotar;apuntar|noter|annotare|書き留める|적다
verb|actions|review|複習|repasar|réviser|ripassare|復習する|복습하다
verb|actions|memorize;memorise|背|memorizar|mémoriser|memorizzare|暗記する|외우다
verb|actions|do homework|寫功課;寫作業|hacer los deberes;hacer la tarea|faire ses devoirs|fare i compiti|宿題をする|숙제하다
verb|actions|take an exam|考試|hacer un examen|passer un examen|fare un esame;sostenere un esame|試験を受ける|시험을 보다
verb|actions|pass an exam|通過考試|aprobar un examen|réussir un examen|superare un esame;passare un esame|試験に合格する|시험에 합격하다
verb|actions|take a photo|拍照|sacar una foto;tomar una foto|prendre une photo|fare una foto;scattare una foto|写真を撮る|사진을 찍다
verb|actions|take a shower|洗澡;沖澡|ducharse|se doucher;prendre une douche|farsi la doccia|シャワーを浴びる|샤워하다
verb|actions|take a bath|泡澡|bañarse|prendre un bain|fare il bagno|お風呂に入る|목욕하다
verb|actions|brush your teeth|刷牙|cepillarse los dientes;lavarse los dientes|se brosser les dents|lavarsi i denti|歯を磨く|이를 닦다
verb|actions|wash your hands|洗手|lavarse las manos|se laver les mains|lavarsi le mani|手を洗う|손을 씻다
verb|actions|shave|刮鬍子|afeitarse|se raser|radersi;farsi la barba|ひげを剃る|면도하다
verb|actions|get dressed|穿衣服|vestirse|s'habiller|vestirsi|服を着る|옷을 입다
verb|actions|change clothes|換衣服|cambiarse de ropa;cambiarse|se changer|cambiarsi|着替える|옷을 갈아입다
verb|actions|try on|試穿|probarse|essayer|provare|試着する|입어 보다
verb|actions|have breakfast|吃早餐|desayunar|prendre le petit déjeuner|fare colazione|朝ごはんを食べる|아침을 먹다
verb|actions|have lunch|吃午餐;吃午飯|almorzar|déjeuner|pranzare|昼ごはんを食べる|점심을 먹다
verb|actions|have dinner|吃晚餐;吃晚飯|cenar|dîner|cenare|晩ごはんを食べる|저녁을 먹다
verb|actions|go shopping|逛街|ir de compras|faire du shopping|fare shopping|買い物に行く|쇼핑하다
verb|actions|do the dishes;wash the dishes|洗碗|lavar los platos;fregar los platos|faire la vaisselle|lavare i piatti|皿を洗う|설거지하다
verb|actions|do the laundry|洗衣服|lavar la ropa|faire la lessive|fare il bucato|洗濯する|빨래하다
verb|actions|tidy up|整理;收拾|ordenar|ranger|riordinare;mettere in ordine|片付ける|정리하다
verb|actions|iron|燙衣服|planchar|repasser|stirare|アイロンをかける|다림질하다
verb|actions|sew|縫|coser|coudre|cucire|縫う|바느질하다
verb|actions|exercise|運動|hacer ejercicio|faire du sport|fare sport|運動する|운동하다
verb|actions|go for a walk|散步|dar un paseo;pasear|se promener|fare una passeggiata;passeggiare|散歩する|산책하다
verb|actions|hike|爬山;健行|hacer senderismo|faire de la randonnée|fare escursioni;fare trekking|ハイキングする|등산하다
verb|actions|ski|滑雪|esquiar|skier|sciare|スキーをする|스키를 타다
verb|actions|fish|釣魚|pescar|pêcher|pescare|釣りをする|낚시하다
verb|actions|take a nap|睡午覺|dormir la siesta;echarse la siesta|faire la sieste|fare un pisolino|昼寝する|낮잠을 자다
verb|actions|get lost|迷路|perderse|se perdre|perdersi|道に迷う|길을 잃다
verb|actions|pack|打包行李;收拾行李|hacer la maleta|faire sa valise;faire ses bagages|fare la valigia|荷造りする|짐을 싸다
verb|actions|breathe|呼吸|respirar|respirer|respirare|呼吸する|숨 쉬다
noun|other|cough|咳嗽|tos|toux|tosse|せきをする|기침하다
verb|actions|cough|咳嗽|toser|tousser|tossire|せき|기침
verb|actions|sneeze|打噴嚏|estornudar|éternuer|starnutire|くしゃみをする|재채기하다
verb|actions|get sick|生病|enfermarse;ponerse enfermo|tomber malade|ammalarsi|病気になる|병에 걸리다
verb|actions|hurt|痛|doler|faire mal|fare male|痛む|아프다
verb|actions|get hurt|受傷|lastimarse;hacerse daño|se blesser|farsi male|けがをする|다치다
verb|actions|see a doctor|看醫生|ir al médico|aller chez le médecin|andare dal medico|医者に診てもらう|진찰을 받다
verb|actions|smoke|抽菸|fumar|fumer|fumare|たばこを吸う|담배를 피우다
verb|actions|earn|賺;賺錢|ganar|gagner|guadagnare|稼ぐ|벌다
verb|actions|spend time|花時間|pasar tiempo|passer du temps|passare del tempo|時間を過ごす|시간을 보내다
verb|actions|save money|存錢|ahorrar|économiser|risparmiare|貯金する|저축하다
verb|actions|calculate|計算;算|calcular|calculer|calcolare|計算する|계산하다
verb|actions|solve|解決|resolver|résoudre|risolvere|解決する|해결하다
verb|actions|succeed|成功|tener éxito|réussir|avere successo|成功する|성공하다
verb|actions|fail|失敗|fracasar|échouer|fallire|失敗する|실패하다
verb|actions|create|創造|crear|créer|creare|創造する|창조하다
verb|actions|exchange|交換|intercambiar|échanger|scambiare|交換する|교환하다
verb|actions|look like|看起來像;像|parecerse a|ressembler à|assomigliare a|～に似ている|닮다
verb|actions|shake hands|握手|dar la mano;estrechar la mano|serrer la main|stringere la mano|握手する|악수하다
verb|actions|clap|拍手;鼓掌|aplaudir|applaudir|applaudire|拍手する|박수 치다
noun|other|rain|雨|lluvia|pluie|pioggia|雨|비
verb|actions|rain|下雨|llover|pleuvoir|piovere|雨が降る|비가 오다
noun|other|snow|雪|nieve|neige|neve|雪|눈
verb|actions|snow|下雪|nevar|neiger|nevicare|雪が降る|눈이 오다
verb|actions|forgive|原諒|perdonar|pardonner|perdonare|許す|용서하다
verb|actions|trust|信任|confiar|faire confiance|fidarsi|信頼する|신뢰하다
verb|actions|be afraid|害怕;怕|tener miedo|avoir peur|avere paura|怖がる|무서워하다
verb|actions|get angry|生氣|enojarse;enfadarse|se fâcher;se mettre en colère|arrabbiarsi|怒る|화내다
verb|actions|calm down|冷靜下來;冷靜|calmarse|se calmer|calmarsi|落ち着く|진정하다
verb|actions|get bored|覺得無聊|aburrirse|s'ennuyer|annoiarsi|退屈する|지루해하다
verb|actions|have fun|玩得開心|divertirse|s'amuser|divertirsi|楽しく過ごす|즐겁게 보내다
verb|actions|fall in love|愛上|enamorarse|tomber amoureux;tomber amoureuse|innamorarsi|恋に落ちる|사랑에 빠지다
verb|actions|break up|分手|romper|rompre|lasciarsi|別れる|헤어지다
verb|actions|get divorced|離婚|divorciarse|divorcer|divorziare|離婚する|이혼하다
phrase|other|welcome|歡迎|bienvenido;bienvenida|bienvenue|benvenuto;benvenuta|ようこそ|환영합니다
verb|actions|welcome|歡迎|dar la bienvenida|accueillir|accogliere|歓迎する|환영하다
verb|actions|celebrate|慶祝|celebrar;festejar|fêter;célébrer|festeggiare|祝う|축하하다
verb|actions|greet|打招呼|saludar|saluer|salutare|あいさつする|인사하다
verb|actions|say goodbye|說再見;道別|despedirse|dire au revoir|salutare|さよならを言う|작별 인사를 하다
verb|actions|introduce|介紹|presentar|présenter|presentare|紹介する|소개하다
verb|actions|discuss|討論|discutir|discuter|discutere|話し合う|토론하다
verb|actions|argue|吵架|discutir|se disputer|litigare|口論する|말다툼하다
verb|actions|complain|抱怨|quejarse|se plaindre|lamentarsi|文句を言う|불평하다
verb|actions|joke|開玩笑|bromear|plaisanter|scherzare|冗談を言う|농담하다
verb|actions|lie|說謊|mentir|mentir|mentire|うそをつく|거짓말하다
verb|actions|suggest|建議|sugerir|suggérer|suggerire|提案する|제안하다
verb|actions|recommend|推薦|recomendar|recommander|consigliare|勧める|추천하다
verb|actions|accept|接受|aceptar|accepter|accettare|受け入れる|받아들이다
verb|actions|refuse|拒絕|rechazar|refuser|rifiutare|断る|거절하다
verb|actions|offer|提供|ofrecer|offrir|offrire|提供する|제공하다
verb|actions|support|支持|apoyar|soutenir|sostenere|支える|지지하다
verb|actions|protect|保護|proteger|protéger|proteggere|守る|보호하다
verb|actions|contact|聯絡|contactar|contacter|contattare|連絡する|연락하다
verb|actions|avoid|避免|evitar|éviter|evitare|避ける|피하다
verb|actions|mention|提到|mencionar|mentionner|menzionare|言及する|언급하다
verb|actions|steal|偷|robar|voler|rubare|盗む|훔치다
verb|actions|kill|殺|matar|tuer|uccidere|殺す|죽이다
verb|actions|hit|打|golpear;pegar|frapper|colpire|打つ|때리다
verb|actions|kick|踢|dar una patada;patear|donner un coup de pied|dare un calcio;calciare|蹴る|차다
verb|actions|bite|咬|morder|mordre|mordere|かむ|물다
verb|actions|appear|出現|aparecer|apparaître|apparire|現れる|나타나다
verb|actions|disappear|消失|desaparecer|disparaître|sparire;scomparire|消える|사라지다
verb|actions|exist|存在|existir|exister|esistere|存在する|존재하다
verb|actions|include|包括|incluir|inclure|includere|含む|포함하다
verb|actions|add|加|añadir;agregar|ajouter|aggiungere|加える|더하다
verb|actions|mix|混合|mezclar|mélanger|mescolare|混ぜる|섞다
verb|actions|fill|裝滿|llenar|remplir|riempire|満たす|채우다
verb|actions|fold|摺|doblar|plier|piegare|折る|접다
verb|actions|hang|掛|colgar|accrocher|appendere|掛ける|걸다
verb|actions|raise|舉起|levantar|lever|alzare|上げる|들어 올리다
verb|actions|burn|燒|quemar|brûler|bruciare|燃える;燃やす|타다;태우다
verb|actions|feed|餵|dar de comer|nourrir|dare da mangiare|食べさせる|먹이를 주다
verb|actions|collect|收集|coleccionar|collectionner|collezionare|集める|모으다
verb|actions|retire|退休|jubilarse|prendre sa retraite|andare in pensione|引退する|은퇴하다
verb|actions|download|下載|descargar|télécharger|scaricare|ダウンロードする|다운로드하다
verb|actions|delete|刪除|borrar;eliminar|supprimer;effacer|cancellare;eliminare|削除する|삭제하다
verb|actions|log in|登入|iniciar sesión|se connecter|accedere|ログインする|로그인하다
verb|actions|click|點擊;點選|hacer clic|cliquer|cliccare|クリックする|클릭하다
verb|actions|print|列印;印|imprimir|imprimer|stampare|印刷する|인쇄하다
verb|actions|send a message|傳訊息|enviar un mensaje;mandar un mensaje|envoyer un message|mandare un messaggio;inviare un messaggio|メッセージを送る|메시지를 보내다
verb|actions|chat|聊天|charlar;platicar|bavarder|chiacchierare|チャットする|채팅하다
verb|actions|sign|簽名;簽|firmar|signer|firmare|署名する|서명하다
phrase|other|hello|你好|hola|bonjour|ciao|こんにちは|안녕하세요
phrase|other|hi|嗨|hola|salut|ciao|やあ|안녕
phrase|other|goodbye|再見|adiós|au revoir|arrivederci|さようなら|안녕히 가세요;안녕히 계세요
phrase|other|please|請|por favor|s'il vous plaît|per favore|お願いします|부탁합니다
phrase|other|thank you|謝謝|gracias|merci|grazie|ありがとう|고마워요;감사합니다
phrase|other|thank you very much|非常感謝|muchas gracias|merci beaucoup|grazie mille|どうもありがとうございます|정말 감사합니다
phrase|other|you're welcome|不客氣|de nada|de rien|prego|どういたしまして|천만에요
phrase|other|sorry|對不起|lo siento|désolé;désolée|scusa|ごめんなさい|미안해요;죄송합니다
phrase|other|excuse me|不好意思|disculpe|excusez-moi|mi scusi|すみません|실례합니다
phrase|other|good morning|早安|buenos días|bonjour|buongiorno|おはようございます|좋은 아침이에요
phrase|other|good afternoon|午安|buenas tardes|bonjour|buon pomeriggio|こんにちは（午後）|안녕하세요(오후)
phrase|other|good evening|晚安|buenas noches|bonsoir|buonasera|こんばんは|안녕하세요(저녁)
phrase|other|good night|晚安|buenas noches|bonne nuit|buonanotte|おやすみなさい|안녕히 주무세요;잘 자요
phrase|other|see you later|待會見|hasta luego|à plus tard|a dopo|またあとで|이따 봐요
phrase|other|see you tomorrow|明天見|hasta mañana|à demain|a domani|また明日|내일 봐요
phrase|other|see you next time|下次見|hasta la próxima|à la prochaine|alla prossima|またね|다음에 봐요
phrase|other|nice to meet you|很高興認識你|mucho gusto|enchanté;enchantée|piacere|はじめまして|만나서 반가워요
phrase|other|how are you|你好嗎|cómo estás|comment ça va|come stai|お元気ですか|잘 지내세요
phrase|other|I'm fine|我很好|estoy bien|je vais bien|sto bene|元気です|잘 지내요
phrase|other|and you|你呢|y tú|et toi|e tu|あなたは？|당신은요
other|other|yes|是|sí|oui|sì|はい|네
other|other|no|不|no|non|no|いいえ|아니요
other|other|okay;ok|好;好的|está bien|d'accord|va bene|オーケー|좋아요
phrase|other|of course|當然|por supuesto|bien sûr|certo|もちろん|물론이죠
phrase|other|no problem|沒問題|no hay problema|pas de problème|nessun problema|問題ありません|문제없어요
phrase|other|cheers|乾杯|salud|santé|cin cin|乾杯|건배
phrase|other|enjoy your meal|請慢用|buen provecho|bon appétit|buon appetito|召し上がれ|맛있게 드세요
phrase|other|happy birthday|生日快樂|feliz cumpleaños|joyeux anniversaire|buon compleanno|誕生日おめでとう|생일 축하해요
phrase|other|congratulations|恭喜|felicidades|félicitations|congratulazioni|おめでとう|축하해요
phrase|other|I don't understand|我不懂|no entiendo|je ne comprends pas|non capisco|わかりません|이해가 안 돼요
phrase|other|I don't know|我不知道|no sé|je ne sais pas|non lo so|知りません|모르겠어요
phrase|other|how much is it|多少錢|cuánto cuesta|combien ça coûte|quanto costa|いくらですか|얼마예요
phrase|other|where is the bathroom|廁所在哪裡|dónde está el baño|où sont les toilettes|dov'è il bagno|トイレはどこですか|화장실이 어디예요
phrase|other|the bill, please;the check, please|麻煩結帳|la cuenta, por favor|l'addition, s'il vous plaît|il conto, per favore|お会計お願いします|계산해 주세요
phrase|other|do you speak English|你會說英文嗎|habla inglés|parlez-vous anglais|parla inglese|英語を話せますか|영어 할 줄 아세요
phrase|other|can you help me|你可以幫我嗎|puede ayudarme|pouvez-vous m'aider|può aiutarmi|手伝ってもらえますか|도와주실 수 있어요
phrase|other|I'm lost|我迷路了|estoy perdido;estoy perdida|je suis perdu;je suis perdue|mi sono perso;mi sono persa|道に迷いました|길을 잃었어요
phrase|other|what's your name|你叫什麼名字|cómo te llamas|comment tu t'appelles|come ti chiami|お名前は？|이름이 뭐예요
phrase|other|my name is|我叫|me llamo|je m'appelle|mi chiamo|私の名前は|제 이름은
phrase|other|where are you from|你是哪裡人|de dónde eres|d'où viens-tu|di dove sei|どちらの出身ですか|어디에서 왔어요
phrase|other|I'm from|我來自|soy de|je viens de|vengo da|～から来ました|~에서 왔어요
phrase|other|just a moment|等一下|un momento|un instant|un momento|少々お待ちください|잠깐만요
phrase|other|no, thank you|不用，謝謝|no, gracias|non merci|no, grazie|いいえ、けっこうです|아니요, 괜찮아요
phrase|other|good luck|祝你好運|buena suerte|bonne chance|buona fortuna|がんばって|행운을 빌어요
phrase|other|happy new year|新年快樂|feliz año nuevo|bonne année|buon anno|あけましておめでとう|새해 복 많이 받으세요
phrase|other|merry Christmas|聖誕快樂|feliz Navidad|joyeux Noël|buon Natale|メリークリスマス|메리 크리스마스
phrase|other|have a good weekend|週末愉快|buen fin de semana|bon week-end|buon fine settimana|よい週末を|주말 잘 보내세요
phrase|other|have a good trip|旅途愉快;一路順風|buen viaje|bon voyage|buon viaggio|よい旅を|즐거운 여행 되세요
phrase|other|get well soon|早日康復|que te mejores|bon rétablissement|buona guarigione|お大事に|빨리 나으세요
phrase|other|long time no see|好久不見|cuánto tiempo sin verte|ça fait longtemps|da quanto tempo|久しぶり|오랜만이에요
phrase|other|take care|保重|cuídate|prends soin de toi|abbi cura di te|気をつけて|몸조심하세요
phrase|other|don't worry|別擔心|no te preocupes|ne t'inquiète pas|non preoccuparti|心配しないで|걱정하지 마세요
phrase|other|it doesn't matter|沒關係|no importa|ce n'est pas grave|non importa|かまいません|괜찮아요
phrase|other|me too|我也是|yo también|moi aussi|anch'io|私も|저도요
phrase|other|let's go|走吧|vamos|allons-y|andiamo|行こう|가자
phrase|other|be careful|小心|ten cuidado|fais attention|stai attento;stai attenta|気をつけて|조심해요
phrase|other|well done|做得好|bien hecho|bien joué|ben fatto|よくできました|잘했어요
phrase|other|what time is it|現在幾點|qué hora es|quelle heure est-il|che ore sono|今何時ですか|지금 몇 시예요
phrase|other|how old are you|你幾歲|cuántos años tienes|quel âge as-tu|quanti anni hai|何歳ですか|몇 살이에요
phrase|other|where do you live|你住在哪裡|dónde vives|où habites-tu|dove abiti|どこに住んでいますか|어디에 살아요
phrase|other|where are you|你在哪裡|dónde estás|où es-tu|dove sei|どこにいますか|어디에 있어요
phrase|other|what is this|這是什麼|qué es esto|qu'est-ce que c'est|cos'è questo|これは何ですか|이게 뭐예요
phrase|other|do you understand|你懂嗎|entiendes|tu comprends|capisci|わかりますか|이해했어요
phrase|other|I understand|我懂了|entiendo|je comprends|capisco|わかりました|알겠어요
phrase|other|how do you say|怎麼說|cómo se dice|comment dit-on|come si dice|何と言いますか|어떻게 말해요
phrase|other|what does it mean|這是什麼意思|qué significa|qu'est-ce que ça veut dire|cosa vuol dire|どういう意味ですか|무슨 뜻이에요
phrase|other|can you repeat that|可以再說一次嗎|puede repetir|pouvez-vous répéter|può ripetere|もう一度言ってもらえますか|다시 말해 줄 수 있어요
phrase|other|more slowly, please|請慢一點|más despacio, por favor|plus lentement, s'il vous plaît|più piano, per favore|もっとゆっくりお願いします|좀 더 천천히 말해 주세요
phrase|other|can you write it down|可以寫下來嗎|puede escribirlo|pouvez-vous l'écrire|può scriverlo|書いてもらえますか|적어 줄 수 있어요
phrase|other|I have a question|我有一個問題|tengo una pregunta|j'ai une question|ho una domanda|質問があります|질문이 있어요
phrase|other|I speak a little|我會說一點|hablo un poco|je parle un peu|parlo un po'|少し話せます|조금 할 줄 알아요
phrase|other|I would like|我想要|quisiera|je voudrais|vorrei|～が欲しいです|~을 원해요
phrase|other|where is|在哪裡|dónde está|où est|dov'è|～はどこですか|~이 어디예요
phrase|other|it's delicious|很好吃|está delicioso|c'est délicieux|è delizioso|おいしいです|맛있어요
phrase|other|it's too expensive|太貴了|es demasiado caro|c'est trop cher|è troppo caro|高すぎます|너무 비싸요
phrase|other|can I pay by card|可以刷卡嗎|puedo pagar con tarjeta|je peux payer par carte|posso pagare con la carta|カードで払えますか|카드로 계산할 수 있어요
phrase|other|I'm hungry|我餓了|tengo hambre|j'ai faim|ho fame|お腹が空きました|배고파요
phrase|other|I'm thirsty|我口渴了|tengo sed|j'ai soif|ho sete|喉が渇きました|목말라요
phrase|other|I'm tired|我累了|estoy cansado;estoy cansada|je suis fatigué;je suis fatiguée|sono stanco;sono stanca|疲れました|피곤해요
phrase|other|I'm vegetarian|我吃素|soy vegetariano;soy vegetariana|je suis végétarien;je suis végétarienne|sono vegetariano;sono vegetariana|ベジタリアンです|채식주의자예요
phrase|other|I need a doctor|我需要看醫生|necesito un médico|j'ai besoin d'un médecin|ho bisogno di un medico|医者が必要です|의사가 필요해요
phrase|other|call the police|快報警|llame a la policía|appelez la police|chiami la polizia|警察を呼んで|경찰을 불러 주세요
phrase|other|on the left|在左邊|a la izquierda|à gauche|a sinistra|左に|왼쪽에
phrase|other|on the right|在右邊|a la derecha|à droite|a destra|右に|오른쪽에
other|other|what|什麼|qué|quoi|cosa;che cosa|何|무엇;뭐
other|other|who|誰|quién|qui|chi|誰|누구
other|other|where|哪裡|dónde|où|dove|どこ|어디
other|other|when|什麼時候|cuándo|quand|quando|いつ|언제
other|other|why|為什麼|por qué|pourquoi|perché|なぜ|왜
other|other|how|怎麼|cómo|comment|come|どうやって|어떻게
other|other|which|哪個|cuál|quel;quelle|quale|どれ|어느 것
phrase|other|how much|多少|cuánto;cuánta|combien|quanto;quanta|いくら|얼마
phrase|other|how many|多少|cuántos;cuántas|combien|quanti;quante|いくつ|몇 개
phrase|other|how long|多久|cuánto tiempo|combien de temps|quanto tempo|どのくらい|얼마나 오래
other|other|I|我|yo|je|io|私|나;저
other|other|you|你;妳|tú|tu|tu|あなた|너;당신
other|other|he|他|él|il|lui|彼|그
other|other|she|她|ella|elle|lei|彼女|그녀
other|other|we|我們|nosotros;nosotras|nous|noi|私たち|우리
other|other|they|他們;她們|ellos;ellas|ils;elles|loro|彼ら|그들
other|other|my|我的|mi|mon;ma|mio;mia|私の|나의;내
other|other|your|你的;妳的|tu|ton;ta|tuo;tua|あなたの|너의;당신의
other|other|his|他的|su|son;sa|suo;sua|彼の|그의
other|other|her|她的|su|son;sa|suo;sua|彼女の|그녀의
other|other|our|我們的|nuestro;nuestra|notre|nostro;nostra|私たちの|우리의
other|other|their|他們的;她們的|su|leur|loro|彼らの|그들의
other|other|this|這個|este;esta|ce;cette|questo;questa|これ|이것
other|other|that|那個|ese;esa|ce;cette|quello;quella|それ;あれ|그것;저것
other|other|these|這些|estos;estas|ces|questi;queste|これら|이것들
other|other|those|那些|esos;esas|ces|quelli;quelle|それら|그것들
other|other|all|所有;全部|todo;toda|tout;toute|tutto;tutta|すべての|모든
other|other|some|一些|algunos;algunas|quelques|alcuni;alcune|いくつかの|몇몇
other|other|many|很多;許多|muchos;muchas|beaucoup de|molti;molte|たくさんの|많은
other|other|much|很多|mucho;mucha|beaucoup de|molto;molta|多くの|많은
other|other|few|很少|pocos;pocas|peu de|pochi;poche|少しの|적은
other|other|several|好幾個|varios;varias|plusieurs|diversi;diverse|いくつもの|여러
other|other|every|每個;每|cada|chaque|ogni|毎～|매
other|other|each|每個|cada|chaque|ciascuno;ciascuna|それぞれの|각각의
other|other|nothing|什麼都沒有|nada|rien|niente|何も|아무것도
other|other|something|某樣東西|algo|quelque chose|qualcosa|何か|무언가
other|other|everything|一切|todo|tout|tutto|すべて|모든 것
other|other|someone|某人|alguien|quelqu'un|qualcuno|誰か|누군가
other|other|nobody|沒有人|nadie|personne|nessuno|誰も～ない|아무도
other|other|everyone|每個人;大家|todos|tout le monde|tutti|みんな|모두
other|other|somewhere|某個地方|en algún lugar|quelque part|da qualche parte|どこか|어딘가
other|other|other|其他;別的|otro;otra|autre|altro;altra|ほかの|다른
other|other|another|另一個|otro;otra|un autre;une autre|un altro;un'altra|もう一つの|또 하나의
other|other|more|更多|más|plus|più|もっと|더
other|other|less|更少|menos|moins|meno|より少なく|덜
other|other|enough|足夠;夠|suficiente|assez|abbastanza|十分な|충분한
other|other|too|太|demasiado|trop|troppo|～すぎる|너무
other|other|very|很|muy|très|molto|とても|매우;아주
other|other|in|在…裡面|en|dans|in|～の中に|~ 안에
other|other|on|在…上面|sobre|sur|su|～の上に|~ 위에
other|other|under|在…下面|debajo de|sous|sotto|～の下に|~ 아래에
other|other|with|跟;和|con|avec|con|～と一緒に|~와 함께
other|other|without|沒有|sin|sans|senza|～なしで|~ 없이
other|other|for|給|para|pour|per|～のために|~을 위해
other|other|from|從|de|de|da|～から|~에서;~부터
other|other|to|到|a|à|a|～へ|~로;~까지
other|other|at|在|en|à|a|～で|~에서
other|other|between|在…之間|entre|entre|tra;fra|～の間に|~ 사이에
other|other|behind|在…後面|detrás de|derrière|dietro|～の後ろに|~ 뒤에
phrase|other|in front of|在…前面|delante de|devant|davanti a|～の前に|~ 앞에
phrase|other|next to|在…旁邊|al lado de|à côté de|accanto a|～の隣に|~ 옆에
phrase|other|far from|離…很遠|lejos de|loin de|lontano da|～から遠く|~에서 멀리
other|other|before|在…之前|antes de|avant|prima di|～の前に（時間）|~ 전에
other|other|after|在…之後|después de|après|dopo|～の後で|~ 후에
other|other|during|在…期間|durante|pendant|durante|～の間（期間）|~ 동안
other|other|until|直到|hasta|jusqu'à|fino a|～まで|~까지
other|other|since|自從|desde|depuis|da|～以来|~ 이후로
other|other|about|關於|sobre|sur|su|～について|~에 대해
other|other|against|反對|contra|contre|contro|～に反対して|~에 반대해
other|other|through|穿過|a través de|à travers|attraverso|～を通って|~을 통해
other|other|inside|裡面|dentro;adentro|à l'intérieur|dentro|中|안
other|other|outside|外面|fuera;afuera|dehors|fuori|外|밖
other|other|above|在…上方|encima de|au-dessus de|sopra|～の上方に|~ 위쪽에
other|other|below|在…下方|debajo de|en dessous de|sotto|～の下方に|~ 아래쪽에
other|other|around|在…周圍|alrededor de|autour de|intorno a|～の周りに|~ 주위에
other|other|among|在…之中|entre|parmi|tra;fra|～の中で|~ 가운데
other|other|toward;towards|往|hacia|vers|verso|～の方へ|~ 쪽으로
other|other|except|除了|excepto|sauf|tranne|～を除いて|~을 제외하고
other|other|despite|儘管|a pesar de|malgré|nonostante|～にもかかわらず|~에도 불구하고
other|other|and|和|y|et|e|と|그리고;와
other|other|or|或是;或者;或|o|ou|o|または|또는
other|other|but|但是;可是|pero|mais|ma|しかし|하지만
other|other|because|因為|porque|parce que|perché|なぜなら|왜냐하면
other|other|so|所以|así que|donc|quindi|だから|그래서
other|other|if|如果|si|si|se|もし|만약
other|other|although|雖然|aunque|bien que|anche se|～けれども|비록
other|other|while|當…的時候|mientras|pendant que|mentre|～の間に（同時）|~하는 동안
other|other|then|然後|luego|puis|poi|それから|그다음에
other|other|also|也|también|aussi|anche|も|도;또한
other|other|only|只;只有|solo|seulement|solo|だけ|만;오직
other|other|even|甚至|incluso|même|perfino|さえ|조차
other|other|however|不過|sin embargo|cependant|però|しかしながら|그러나
phrase|other|as soon as|一…就|en cuanto|dès que|appena|～するとすぐ|~하자마자
other|other|otherwise|不然;否則|si no|sinon|altrimenti|さもないと|그렇지 않으면
other|other|anyway|反正|de todos modos|de toute façon|comunque|とにかく|어쨌든
other|other|actually|其實|en realidad|en fait|in realtà|実は|사실은
other|other|especially|尤其|especialmente|surtout|soprattutto|特に|특히
other|other|now|現在|ahora|maintenant|adesso|今|지금
other|other|today|今天|hoy|aujourd'hui|oggi|今日|오늘
other|other|tomorrow|明天|mañana|demain|domani|明日|내일
other|other|yesterday|昨天|ayer|hier|ieri|昨日|어제
other|other|tonight|今晚;今天晚上|esta noche|ce soir|stasera|今夜|오늘 밤
phrase|other|this morning|今天早上|esta mañana|ce matin|stamattina|今朝|오늘 아침
phrase|other|this afternoon|今天下午|esta tarde|cet après-midi|oggi pomeriggio|今日の午後|오늘 오후
phrase|other|last night|昨晚;昨天晚上|anoche|hier soir|ieri sera|昨夜|어젯밤
phrase|other|the day after tomorrow|後天|pasado mañana|après-demain|dopodomani|あさって|모레
phrase|other|the day before yesterday|前天|anteayer|avant-hier|l'altro ieri|おととい|그저께
other|other|already|已經|ya|déjà|già|もう|이미;벌써
other|other|still|還|todavía|encore|ancora|まだ|아직
other|other|soon|很快|pronto|bientôt|presto|まもなく|곧
other|other|later|待會;等一下|más tarde|plus tard|più tardi|あとで|나중에
other|other|often|常常;經常|a menudo|souvent|spesso|よく|자주
other|other|sometimes|有時候;有時|a veces|parfois|a volte|ときどき|가끔
other|other|never|從來不|nunca|jamais|mai|決して～ない|절대
other|other|always|總是|siempre|toujours|sempre|いつも|항상
other|other|usually|通常|normalmente|d'habitude|di solito|ふつう|보통
other|other|again|再|otra vez|encore|di nuovo|また|다시
other|other|here|這裡;這邊|aquí;acá|ici|qui;qua|ここ|여기
other|other|there|那裡;那邊|allí|là|lì;là|そこ;あそこ|거기;저기
other|other|everywhere|到處|en todas partes|partout|dappertutto|どこでも|어디에나
other|other|quickly|快速地|rápidamente|vite|velocemente|速く|빨리
other|other|slowly|慢慢地;慢慢|despacio|lentement|lentamente|ゆっくり|천천히
other|other|well|好|bien|bien|bene|よく（上手に）|잘
other|other|badly|不好|mal|mal|male|下手に|서투르게
other|other|together|一起|juntos;juntas|ensemble|insieme|一緒に|함께;같이
other|other|maybe|也許;或許|quizás;quizá|peut-être|forse|たぶん|아마
other|other|really|真的|de verdad|vraiment|davvero|本当に|정말
other|other|almost|幾乎|casi|presque|quasi|ほとんど|거의
phrase|other|a lot|很多|mucho|beaucoup|molto|たくさん|많이
phrase|other|a little|一點;一點點|un poco|un peu|un po'|少し|조금
other|other|probably|大概|probablemente|probablement|probabilmente|おそらく|아마도
phrase|other|right away|馬上;立刻|enseguida|tout de suite|subito|すぐに|당장
other|other|recently|最近|recientemente|récemment|recentemente|最近|최근에
other|other|once|一次|una vez|une fois|una volta|一度|한 번
phrase|other|not yet|還沒;還沒有|todavía no|pas encore|non ancora|まだ～ない|아직 안
phrase|other|every day|每天|todos los días|tous les jours|ogni giorno;tutti i giorni|毎日|매일
other|other|upstairs|樓上|arriba|en haut|di sopra|上の階|위층
other|other|downstairs|樓下|abajo|en bas|di sotto|下の階|아래층
noun|people|person|人|persona|personne|persona|人|사람
noun|people|people|人們|gente|gens|gente|人々|사람들
noun|people|man|男人|hombre|homme|uomo|男性|남자
noun|people|woman|女人|mujer|femme|donna|女性|여자
noun|people|boy|男孩;男孩子|chico|garçon|ragazzo|男の子|남자아이;소년
noun|people|girl|女孩;女孩子|chica|fille|ragazza|女の子|여자아이;소녀
noun|people|child|孩子;小孩|niño;niña|enfant|bambino;bambina|子ども|아이
noun|people|baby|嬰兒|bebé|bébé|bebè|赤ちゃん|아기
noun|people|adult|大人;成人|adulto;adulta|adulte|adulto;adulta|大人|어른
noun|people|teenager|青少年|adolescente|adolescent;adolescente|adolescente|十代の若者|십대
noun|people|elderly person|老人|persona mayor|personne âgée|anziano;anziana|お年寄り|노인
noun|people|friend|朋友|amigo;amiga|ami;amie|amico;amica|友だち|친구
noun|people|best friend|最好的朋友|mejor amigo;mejor amiga|meilleur ami;meilleure amie|migliore amico;migliore amica|親友|가장 친한 친구;절친
noun|people|neighbor;neighbour|鄰居|vecino;vecina|voisin;voisine|vicino di casa;vicina di casa|隣人|이웃
noun|people|guest|客人|invitado;invitada|invité;invitée|ospite|客|손님
noun|people|visitor|訪客|visitante|visiteur;visiteuse|visitatore;visitatrice|訪問者|방문객
noun|people|stranger|陌生人|desconocido;desconocida|inconnu;inconnue|sconosciuto;sconosciuta|見知らぬ人|낯선 사람
noun|people|foreigner|外國人|extranjero;extranjera|étranger;étrangère|straniero;straniera|外国人|외국인
noun|people|boss|老闆|jefe;jefa|patron;patronne|capo|上司|상사;사장
noun|people|colleague|同事|compañero de trabajo;compañera de trabajo|collègue|collega|同僚|동료
noun|people|employee|員工|empleado;empleada|employé;employée|dipendente|従業員|직원
noun|people|classmate|同學|compañero de clase;compañera de clase|camarade de classe|compagno di classe;compagna di classe|同級生|반 친구
noun|people|roommate|室友|compañero de cuarto;compañera de cuarto;compañero de piso;compañera de piso|colocataire|coinquilino;coinquilina|ルームメイト|룸메이트
noun|people|boyfriend|男朋友;男友|novio|petit ami|ragazzo|彼氏|남자 친구
noun|people|girlfriend|女朋友;女友|novia|petite amie|ragazza|彼女（恋人）|여자 친구
noun|people|husband|丈夫;老公|esposo|mari|marito|夫|남편
noun|people|wife|妻子;老婆|esposa|femme|moglie|妻|아내
noun|people|partner|伴侶|pareja|compagnon;compagne|compagno;compagna|パートナー|파트너;배우자
noun|people|couple|情侶|pareja|couple|coppia|カップル|커플
noun|people|customer|顧客;客人|cliente|client;cliente|cliente|客（店の）|고객
noun|people|tourist|觀光客;遊客|turista|touriste|turista|観光客|관광객
noun|people|passenger|乘客|pasajero;pasajera|passager;passagère|passeggero;passeggera|乗客|승객
noun|people|owner|主人|dueño;dueña|propriétaire|proprietario;proprietaria|持ち主|주인
noun|people|volunteer|志工|voluntario;voluntaria|bénévole|volontario;volontaria|ボランティア|자원봉사자
noun|people|member|成員|miembro|membre|membro|メンバー|회원
noun|people|enemy|敵人|enemigo;enemiga|ennemi;ennemie|nemico;nemica|敵|적
noun|people|crowd|人群|multitud|foule|folla|群衆|군중
noun|people|twins|雙胞胎|gemelos|jumeaux|gemelli|双子|쌍둥이
noun|people|family|家人|familia|famille|famiglia|家族|가족
noun|people|mother|媽媽;母親|madre|mère|madre|母|어머니
noun|people|father|爸爸;父親|padre|père|padre|父|아버지
noun|people|mom;mum|媽媽|mamá|maman|mamma|お母さん|엄마
noun|people|dad|爸爸|papá|papa|papà|お父さん|아빠
noun|people|parents|父母;爸媽|padres|parents|genitori|両親|부모
noun|people|son|兒子|hijo|fils|figlio|息子|아들
noun|people|daughter|女兒|hija|fille|figlia|娘|딸
noun|people|brother|兄弟|hermano|frère|fratello|兄弟|형제
noun|people|sister|姊妹;姐妹|hermana|sœur|sorella|姉妹|자매
noun|people|older brother|哥哥|hermano mayor|grand frère|fratello maggiore|兄|형;오빠
noun|people|older sister|姊姊;姐姐|hermana mayor|grande sœur|sorella maggiore|姉|누나;언니
noun|people|younger brother|弟弟|hermano menor|petit frère|fratello minore|弟|남동생
noun|people|younger sister|妹妹|hermana menor|petite sœur|sorella minore|妹|여동생
noun|people|siblings|兄弟姊妹;兄弟姐妹|hermanos|frères et sœurs|fratelli|きょうだい|형제자매
noun|people|grandfather|爺爺;外公;阿公|abuelo|grand-père|nonno|祖父|할아버지
noun|people|grandmother|奶奶;外婆;阿嬤|abuela|grand-mère|nonna|祖母|할머니
noun|people|grandparents|祖父母|abuelos|grands-parents|nonni|祖父母|조부모
noun|people|grandson|孫子;外孫|nieto|petit-fils|nipote|孫息子|손자
noun|people|granddaughter|孫女;外孫女|nieta|petite-fille|nipote|孫娘|손녀
noun|people|uncle|叔叔;伯伯;舅舅;姑丈;姨丈|tío|oncle|zio|おじ|삼촌
noun|people|aunt|阿姨;姑姑;嬸嬸;伯母;舅媽|tía|tante|zia|おば|이모;고모
noun|people|cousin|表兄弟姊妹;堂兄弟姊妹|primo;prima|cousin;cousine|cugino;cugina|いとこ|사촌
noun|people|nephew|姪子;外甥|sobrino|neveu|nipote|甥|조카
noun|people|niece|姪女;外甥女|sobrina|nièce|nipote|姪|조카딸
noun|people|relative|親戚|pariente|parent;parente|parente|親戚|친척
noun|people|teacher|老師|profesor;profesora|professeur;professeure|insegnante|先生|선생님
noun|people|student|學生|estudiante|étudiant;étudiante|studente;studentessa|学生|학생
noun|people|doctor|醫生;醫師|médico;médica|médecin|medico|医者|의사
noun|people|nurse|護理師;護士|enfermero;enfermera|infirmier;infirmière|infermiere;infermiera|看護師|간호사
noun|people|engineer|工程師|ingeniero;ingeniera|ingénieur;ingénieure|ingegnere|エンジニア|엔지니어
noun|people|lawyer|律師|abogado;abogada|avocat;avocate|avvocato;avvocata|弁護士|변호사
noun|people|chef|主廚|chef|chef|chef|シェフ|셰프
noun|people|waiter|服務生|camarero;camarera|serveur;serveuse|cameriere;cameriera|ウェイター|웨이터;종업원
noun|people|driver|司機|conductor;conductora|chauffeur|autista|運転手|운전기사
noun|people|taxi driver|計程車司機|taxista|chauffeur de taxi|tassista|タクシー運転手|택시 기사
noun|people|police officer|警察|policía|policier;policière|poliziotto;poliziotta|警察官|경찰관
noun|people|firefighter|消防員|bombero;bombera|pompier|pompiere|消防士|소방관
noun|people|farmer|農夫|agricultor;agricultora|agriculteur;agricultrice|agricoltore;agricoltrice|農家|농부
noun|people|artist|藝術家|artista|artiste|artista|芸術家|예술가
noun|people|singer|歌手|cantante|chanteur;chanteuse|cantante|歌手|가수
noun|people|writer|作家|escritor;escritora|écrivain;écrivaine|scrittore;scrittrice|作家|작가
noun|people|journalist|記者|periodista|journaliste|giornalista|記者|기자
noun|people|designer|設計師|diseñador;diseñadora|designer|designer|デザイナー|디자이너
noun|people|fashion designer|服裝設計師|diseñador de moda;diseñadora de moda|styliste|stilista|ファッションデザイナー|패션 디자이너
noun|people|programmer|程式設計師|programador;programadora|programmeur;programmeuse|programmatore;programmatrice|プログラマー|프로그래머
noun|people|salesperson|銷售員|vendedor;vendedora|vendeur;vendeuse|venditore;venditrice|販売員|판매원
noun|people|shop assistant|店員|dependiente;dependienta|vendeur;vendeuse|commesso;commessa|店員|점원
noun|people|cashier|收銀員|cajero;cajera|caissier;caissière|cassiere;cassiera|レジ係|계산원
noun|people|manager|經理|gerente|gérant;gérante|direttore;direttrice|マネージャー|매니저
noun|people|secretary|秘書;祕書|secretario;secretaria|secrétaire|segretario;segretaria|秘書|비서
noun|people|scientist|科學家|científico;científica|scientifique|scienziato;scienziata|科学者|과학자
noun|people|pilot|機師;飛行員|piloto|pilote|pilota|パイロット|조종사
noun|people|flight attendant|空服員|auxiliar de vuelo|steward;hôtesse de l'air|assistente di volo|客室乗務員|승무원
noun|people|soldier|軍人|soldado|soldat|soldato|軍人|군인
noun|people|dentist|牙醫|dentista|dentiste|dentista|歯医者|치과 의사
noun|people|pharmacist|藥師;藥劑師|farmacéutico;farmacéutica|pharmacien;pharmacienne|farmacista|薬剤師|약사
noun|people|architect|建築師|arquitecto;arquitecta|architecte|architetto|建築家|건축가
noun|people|photographer|攝影師|fotógrafo;fotógrafa|photographe|fotografo;fotografa|写真家|사진작가
noun|people|actor|演員|actor;actriz|acteur;actrice|attore;attrice|俳優|배우
noun|people|musician|音樂家|músico|musicien;musicienne|musicista|音楽家|음악가
noun|people|mechanic|修車師傅|mecánico;mecánica|mécanicien;mécanicienne|meccanico|整備士|정비사
noun|people|cleaner|清潔人員;清潔工|limpiador;limpiadora|agent d'entretien|addetto alle pulizie;addetta alle pulizie|清掃員|청소부
noun|people|receptionist|櫃檯人員;接待員|recepcionista|réceptionniste|receptionist|受付係|접수원
noun|people|worker|工人|obrero;obrera|ouvrier;ouvrière|operaio;operaia|労働者|노동자
noun|people|office worker|上班族|oficinista|employé de bureau;employée de bureau|impiegato;impiegata|会社員|회사원
noun|people|businessman|商人|empresario;empresaria|homme d'affaires;femme d'affaires|uomo d'affari;donna d'affari|ビジネスマン|사업가
noun|people|civil servant|公務員|funcionario;funcionaria|fonctionnaire|dipendente pubblico;dipendente pubblica|公務員|공무원
noun|people|tour guide|導遊|guía turístico;guía turística|guide|guida turistica|ツアーガイド|관광 가이드
noun|people|hairdresser|美髮師|peluquero;peluquera|coiffeur;coiffeuse|parrucchiere;parrucchiera|美容師|미용사
noun|people|baker|麵包師傅|panadero;panadera|boulanger;boulangère|fornaio;fornaia|パン職人|제빵사
noun|people|butcher|肉販|carnicero;carnicera|boucher;bouchère|macellaio;macellaia|肉屋|정육점 주인
noun|people|accountant|會計師|contador;contadora|comptable|contabile|会計士|회계사
noun|people|judge|法官|juez;jueza|juge|giudice|裁判官|판사
noun|people|veterinarian|獸醫|veterinario;veterinaria|vétérinaire|veterinario;veterinaria|獣医|수의사
noun|people|postman|郵差|cartero;cartera|facteur;factrice|postino;postina|郵便配達員|집배원
noun|people|security guard|警衛;保全|guardia de seguridad|agent de sécurité|guardia giurata|警備員|경비원
noun|people|delivery person|外送員|repartidor;repartidora|livreur;livreuse|fattorino;fattorina|配達員|배달원
noun|people|housewife|家庭主婦|ama de casa|femme au foyer|casalinga|主婦|주부
noun|people|coach|教練|entrenador;entrenadora|entraîneur;entraîneuse|allenatore;allenatrice|コーチ|코치
noun|people|athlete|運動員|atleta|athlète|atleta|運動選手|운동선수
noun|people|dancer|舞者|bailarín;bailarina|danseur;danseuse|ballerino;ballerina|ダンサー|무용수
noun|people|painter|畫家|pintor;pintora|peintre|pittore;pittrice|画家|화가
noun|people|translator|翻譯;譯者|traductor;traductora|traducteur;traductrice|traduttore;traduttrice|翻訳者|번역가
noun|people|model|模特兒|modelo|mannequin|modello;modella|モデル|모델
noun|people|gardener|園丁|jardinero;jardinera|jardinier;jardinière|giardiniere;giardiniera|庭師|정원사
noun|people|fisherman|漁夫|pescador;pescadora|pêcheur;pêcheuse|pescatore;pescatrice|漁師|어부
noun|people|babysitter|保母;保姆|niñero;niñera|baby-sitter|babysitter|ベビーシッター|베이비시터
noun|people|principal|校長|director;directora|directeur;directrice|preside|校長|교장
noun|objects|body|身體|cuerpo|corps|corpo|体|몸
noun|objects|head|頭|cabeza|tête|testa|頭|머리
noun|objects|hair|頭髮|pelo|cheveux|capelli|髪|머리카락
noun|objects|face|臉|cara|visage|viso|顔|얼굴
noun|objects|forehead|額頭|frente|front|fronte|額|이마
noun|objects|eyebrow|眉毛|ceja|sourcil|sopracciglio|眉毛|눈썹
noun|objects|eyelash|睫毛|pestaña|cil|ciglio|まつげ|속눈썹
noun|objects|eye|眼睛|ojo|œil|occhio|目|눈
noun|objects|ear|耳朵|oreja|oreille|orecchio|耳|귀
noun|objects|nose|鼻子|nariz|nez|naso|鼻|코
noun|objects|mouth|嘴巴|boca|bouche|bocca|口|입
noun|objects|lip|嘴唇|labio|lèvre|labbro|唇|입술
noun|objects|tooth|牙齒|diente|dent|dente|歯|이;치아
noun|objects|tongue|舌頭|lengua|langue|lingua|舌|혀
noun|objects|cheek|臉頰|mejilla|joue|guancia|頬|뺨;볼
noun|objects|chin|下巴|barbilla|menton|mento|あご|턱
noun|objects|beard|鬍子|barba|barbe|barba|ひげ|수염
noun|objects|neck|脖子|cuello|cou|collo|首|목
noun|objects|throat|喉嚨|garganta|gorge|gola|喉|목구멍
noun|objects|shoulder|肩膀|hombro|épaule|spalla|肩|어깨
noun|objects|arm|手臂|brazo|bras|braccio|腕|팔
noun|objects|elbow|手肘|codo|coude|gomito|ひじ|팔꿈치
noun|objects|wrist|手腕|muñeca|poignet|polso|手首|손목
noun|objects|hand|手|mano|main|mano|手|손
noun|objects|finger|手指|dedo|doigt|dito|指|손가락
noun|objects|thumb|大拇指;拇指|pulgar|pouce|pollice|親指|엄지손가락
noun|objects|fingernail|指甲|uña|ongle|unghia|爪|손톱
noun|objects|chest|胸部|pecho|poitrine|petto|胸|가슴
noun|objects|back|背部;背|espalda|dos|schiena|背中|등
noun|objects|waist|腰|cintura|taille|vita|腰|허리
noun|objects|belly|肚子|barriga|ventre|pancia|お腹|배
noun|objects|stomach|胃|estómago|estomac|stomaco|胃|위
noun|objects|leg|腿|pierna|jambe|gamba|脚|다리
noun|objects|knee|膝蓋|rodilla|genou|ginocchio|ひざ|무릎
noun|objects|ankle|腳踝|tobillo|cheville|caviglia|足首|발목
noun|objects|foot|腳|pie|pied|piede|足|발
noun|objects|heel|腳跟|talón|talon|tallone|かかと|발뒤꿈치
noun|objects|toe|腳趾|dedo del pie|orteil|dito del piede|足の指|발가락
noun|objects|skin|皮膚|piel|peau|pelle|肌|피부
noun|objects|bone|骨頭|hueso|os|osso|骨|뼈
noun|objects|muscle|肌肉|músculo|muscle|muscolo|筋肉|근육
noun|objects|heart|心臟|corazón|cœur|cuore|心臓|심장
noun|objects|blood|血;血液|sangre|sang|sangue|血|피
noun|objects|brain|大腦;腦|cerebro|cerveau|cervello|脳|뇌
noun|objects|lung|肺|pulmón|poumon|polmone|肺|폐
noun|objects|liver|肝;肝臟|hígado|foie|fegato|肝臓|간
noun|other|health|健康|salud|santé|salute|健康|건강
noun|other|illness|疾病;病|enfermedad|maladie|malattia|病気|질병
noun|other|pain|疼痛;痛|dolor|douleur|dolore|痛み|통증
noun|other|headache|頭痛|dolor de cabeza|mal de tête|mal di testa|頭痛|두통
noun|other|toothache|牙痛|dolor de muelas|mal de dents|mal di denti|歯痛|치통
noun|other|stomachache;stomach ache|肚子痛|dolor de estómago|mal de ventre|mal di pancia|腹痛|복통
noun|other|sore throat|喉嚨痛|dolor de garganta|mal de gorge|mal di gola|喉の痛み|인후통
noun|other|fever|發燒|fiebre|fièvre|febbre|熱|열
noun|other|flu|流感|gripe|grippe|influenza|インフルエンザ|독감
noun|other|allergy|過敏|alergia|allergie|allergia|アレルギー|알레르기
noun|other|injury|傷|herida|blessure|ferita|けが|부상
noun|other|symptom|症狀|síntoma|symptôme|sintomo|症状|증상
noun|objects|medicine|藥|medicina|médicament|medicina|薬|약
noun|objects|pill|藥丸|pastilla|comprimé|pastiglia|錠剤|알약
noun|objects|vaccine|疫苗|vacuna|vaccin|vaccino|ワクチン|백신
noun|objects|hospital|醫院|hospital|hôpital|ospedale|病院|병원
noun|objects|clinic|診所|clínica|centre médical|ambulatorio|クリニック|의원
noun|objects|doctor's office|診所|consultorio|cabinet médical|studio medico|診療所|진료소
noun|objects|pharmacy|藥局;藥房|farmacia|pharmacie|farmacia|薬局|약국
noun|objects|emergency room|急診室|urgencias|urgences|pronto soccorso|救急外来|응급실
noun|objects|prescription|處方箋;處方|receta|ordonnance|ricetta|処方箋|처방전
noun|other|appointment|預約|cita|rendez-vous|appuntamento|予約|예약
noun|other|surgery|手術|operación|opération|operazione|手術|수술
noun|other|checkup;check-up|健康檢查|chequeo médico|bilan de santé|check-up|健康診断|건강 검진
noun|other|weight|重量|peso|poids|peso|重さ|무게
noun|other|weight|體重|peso|poids|peso|体重|체중;몸무게
noun|other|height|高度|altura|hauteur|altezza|高さ|높이
noun|other|height|身高|estatura|taille|altezza|身長|키
noun|other|birth|出生|nacimiento|naissance|nascita|誕生|출생
noun|other|life|人生|vida|vie|vita|人生|인생
noun|other|death|死亡|muerte|mort|morte|死|죽음
noun|other|wedding|婚禮|boda|mariage|matrimonio|結婚式|결혼식
noun|other|marriage|婚姻|matrimonio|mariage|matrimonio|結婚|결혼
noun|other|divorce|離婚|divorcio|divorce|divorzio|離婚|이혼
noun|other|funeral|葬禮;喪禮|funeral|enterrement|funerale|葬式|장례식
noun|other|birthday|生日|cumpleaños|anniversaire|compleanno|誕生日|생일
noun|other|age|年紀;年齡|edad|âge|età|年齢|나이
noun|other|childhood|童年|infancia|enfance|infanzia|子ども時代|어린 시절
noun|other|youth|青春|juventud|jeunesse|giovinezza|青春|청춘
noun|other|old age|老年|vejez|vieillesse|vecchiaia|老年|노년
noun|other|retirement|退休|jubilación|retraite|pensione|退職|은퇴
noun|other|honeymoon|蜜月|luna de miel|lune de miel|luna di miele|新婚旅行|신혼여행
noun|other|generation|世代|generación|génération|generazione|世代|세대
noun|other|name|名字|nombre|nom|nome|名前|이름
noun|other|last name|姓氏;姓|apellido|nom de famille|cognome|名字|성
noun|objects|food|食物|comida|nourriture|cibo|食べ物|음식
noun|objects|rice|米飯;飯;白飯|arroz|riz|riso|ご飯|밥
noun|objects|noodles|麵;麵條|fideos|nouilles|noodles|麺|면;국수
noun|objects|instant noodles|泡麵;速食麵|fideos instantáneos|nouilles instantanées|noodles istantanei|インスタントラーメン|라면
noun|objects|meat|肉|carne|viande|carne|肉|고기
noun|objects|beef|牛肉|carne de res;carne de vaca;ternera|bœuf|manzo|牛肉|소고기
noun|objects|pork|豬肉|carne de cerdo;cerdo|porc|carne di maiale;maiale|豚肉|돼지고기
noun|objects|chicken|雞肉|pollo|poulet|pollo|鶏肉|닭고기
noun|objects|lamb|羊肉|cordero|agneau|agnello|羊肉|양고기
noun|objects|steak|牛排|bistec|steak;bifteck|bistecca|ステーキ|스테이크
noun|objects|pork chop|豬排|chuleta de cerdo|côtelette de porc;côte de porc|braciola di maiale|ポークチョップ|돼지갈비
noun|objects|ham|火腿|jamón|jambon|prosciutto|ハム|햄
noun|objects|sausage|香腸|salchicha|saucisse|salsiccia|ソーセージ|소시지
noun|objects|bacon|培根|tocino;beicon|bacon|pancetta;bacon|ベーコン|베이컨
noun|objects|meatball|肉丸|albóndiga|boulette de viande|polpetta|ミートボール|미트볼
noun|objects|seafood|海鮮|mariscos;marisco|fruits de mer|frutti di mare|海鮮|해산물
noun|objects|shrimp|蝦子;蝦|camarón;gamba|crevette|gambero|エビ|새우
noun|objects|salmon|鮭魚|salmón|saumon|salmone|サーモン;鮭|연어
noun|objects|tuna|鮪魚|atún|thon|tonno|マグロ|참치
noun|objects|oyster|牡蠣;蚵仔|ostra|huître|ostrica|カキ|굴
noun|objects|squid|魷魚|calamar|calmar;encornet|calamaro|イカ|오징어
noun|objects|clam|蛤蜊|almeja|palourde|vongola|ハマグリ|조개
noun|objects|egg|蛋;雞蛋|huevo|œuf|uovo|卵|달걀;계란
noun|objects|fried egg|荷包蛋;煎蛋|huevo frito;huevo estrellado|œuf au plat|uovo fritto;uovo al tegamino|目玉焼き|계란 프라이
noun|objects|tofu|豆腐|tofu|tofu|tofu|豆腐|두부
noun|objects|stinky tofu|臭豆腐|tofu apestoso|tofu puant|tofu puzzolente|臭豆腐|취두부
noun|objects|cheese|起司;乳酪|queso|fromage|formaggio|チーズ|치즈
noun|objects|butter|奶油|mantequilla|beurre|burro|バター|버터
noun|objects|milk|牛奶;鮮奶|leche|lait|latte|牛乳|우유
noun|objects|yogurt;yoghurt|優格|yogur;yogurt|yaourt|yogurt|ヨーグルト|요구르트
noun|objects|cream|鮮奶油|nata;crema|crème|panna|クリーム|크림
noun|objects|sugar|糖|azúcar|sucre|zucchero|砂糖|설탕
noun|objects|salt|鹽;鹽巴|sal|sel|sale|塩|소금
noun|objects|pepper|胡椒;胡椒粉|pimienta|poivre|pepe|コショウ|후추
noun|objects|oil|油|aceite|huile|olio|油|기름
noun|objects|olive oil|橄欖油|aceite de oliva|huile d'olive|olio d'oliva|オリーブオイル|올리브유
noun|objects|vinegar|醋|vinagre|vinaigre|aceto|酢|식초
noun|objects|soy sauce|醬油|salsa de soja;salsa de soya|sauce soja;sauce soya|salsa di soia|醤油|간장
noun|objects|flour|麵粉|harina|farine|farina|小麦粉|밀가루
noun|objects|sauce|醬汁;醬|salsa|sauce|salsa|ソース|소스
noun|objects|ketchup|番茄醬|kétchup|ketchup|ketchup|ケチャップ|케첩
noun|objects|mayonnaise|美乃滋|mayonesa|mayonnaise|maionese|マヨネーズ|마요네즈
noun|objects|mustard|黃芥末|mostaza|moutarde|senape|マスタード|머스터드
noun|objects|spice|香料|especia|épice|spezia|スパイス|향신료
noun|objects|cinnamon|肉桂|canela|cannelle|cannella|シナモン|계피
noun|objects|honey|蜂蜜|miel|miel|miele|はちみつ|꿀
noun|objects|jam|果醬|mermelada|confiture|marmellata|ジャム|잼
noun|objects|ingredient|食材;材料|ingrediente|ingrédient|ingrediente|材料|재료
noun|objects|dumpling|餃子;水餃|dumpling;empanadilla china|ravioli chinois;dumpling|raviolo cinese;dumpling|ギョーザ|만두
noun|objects|fried rice|炒飯|arroz frito|riz frit;riz cantonais|riso fritto;riso alla cantonese|チャーハン|볶음밥
noun|objects|French fries;fries|薯條|papas fritas;patatas fritas|frites|patatine fritte;patatine|フライドポテト|감자튀김
noun|objects|sandwich|三明治|sándwich|sandwich|panino;sandwich|サンドイッチ|샌드위치
noun|objects|salad|沙拉|ensalada|salade|insalata|サラダ|샐러드
noun|objects|sushi|壽司|sushi|sushi|sushi|寿司|초밥
noun|objects|curry|咖哩|curry;curri|curry|curry|カレー|카레
noun|objects|hot pot|火鍋|hot pot;fondue china|fondue chinoise|hot pot|鍋料理|훠궈;전골
noun|objects|toast|烤吐司;吐司|pan tostado;tostada|pain grillé|pane tostato|トースト|토스트
noun|objects|cereal|麥片;穀片|cereal;cereales|céréales|cereali|シリアル|시리얼
noun|objects|croissant|可頌;牛角麵包|croissant;cruasán;medialuna|croissant|cornetto;brioche|クロワッサン|크루아상
noun|objects|waffle|格子鬆餅;鬆餅|gofre;waffle|gaufre|waffle|ワッフル|와플
noun|objects|donut;doughnut|甜甜圈|dona;dónut|donut;doughnut|ciambella|ドーナツ|도넛
noun|objects|cake|蛋糕|pastel;tarta;torta|gâteau|torta|ケーキ|케이크
noun|objects|cookie|餅乾|galleta|biscuit;cookie|biscotto|クッキー|쿠키
noun|objects|chocolate|巧克力|chocolate|chocolat|cioccolato;cioccolata|チョコレート|초콜릿
noun|objects|candy;sweets|糖果|caramelo;dulce;golosina|bonbon|caramella|あめ|사탕
noun|objects|chewing gum;gum|口香糖|chicle|chewing-gum|gomma da masticare;chewing gum|ガム|껌
noun|objects|popcorn|爆米花|palomitas;palomitas de maíz|pop-corn;popcorn|popcorn|ポップコーン|팝콘
noun|objects|peanut|花生|cacahuete;cacahuate;maní|cacahuète;arachide|arachide;nocciolina|ピーナッツ|땅콩
noun|objects|almond|杏仁|almendra|amande|mandorla|アーモンド|아몬드
noun|objects|dessert|甜點|postre|dessert|dolce;dessert|デザート|디저트
noun|objects|snack|點心;零食|snack;tentempié|en-cas;snack|spuntino|おやつ|간식
noun|objects|frozen food|冷凍食品|comida congelada;congelados|surgelés;produits surgelés|surgelati;cibi surgelati|冷凍食品|냉동식품
noun|objects|fruit|水果|fruta|fruit|frutta|果物|과일
noun|objects|grape|葡萄|uva|raisin|uva|ぶどう|포도
noun|objects|watermelon|西瓜|sandía|pastèque|anguria;cocomero|すいか|수박
noun|objects|peach|桃子|durazno;melocotón|pêche|pesca|桃|복숭아
noun|objects|pear|梨子;水梨|pera|poire|pera|梨|배
noun|objects|mango|芒果|mango|mangue|mango|マンゴー|망고
noun|objects|cherry|櫻桃|cereza|cerise|ciliegia|さくらんぼ|체리
noun|objects|kiwi|奇異果|kiwi|kiwi|kiwi|キウイ|키위
noun|objects|guava|芭樂|guayaba|goyave|guava;guaiava|グアバ|구아바
noun|objects|papaya|木瓜|papaya|papaye|papaya|パパイヤ|파파야
noun|objects|lychee;litchi|荔枝|lichi|litchi|litchi|ライチ|리치
noun|objects|coconut|椰子|coco|noix de coco|cocco;noce di cocco|ココナッツ|코코넛
noun|objects|avocado|酪梨|aguacate;palta|avocat|avocado|アボカド|아보카도
noun|objects|plum|李子|ciruela|prune|susina;prugna|すもも|자두
noun|objects|blueberry|藍莓|arándano|myrtille|mirtillo|ブルーベリー|블루베리
noun|objects|grapefruit|葡萄柚|pomelo;toronja|pamplemousse|pompelmo|グレープフルーツ|자몽
noun|objects|dragon fruit|火龍果|pitahaya;pitaya|fruit du dragon;pitaya|pitaya;frutto del drago|ドラゴンフルーツ|용과
noun|objects|tangerine|橘子|mandarina|mandarine|mandarino|みかん|귤
noun|objects|olive|橄欖|aceituna;oliva|olive|oliva|オリーブ|올리브
noun|objects|vegetable|蔬菜;青菜|verdura|légume|verdura|野菜|채소;야채
noun|objects|onion|洋蔥|cebolla|oignon|cipolla|玉ねぎ|양파
noun|objects|garlic|大蒜;蒜頭|ajo|ail|aglio|にんにく|마늘
noun|objects|ginger|薑|jengibre|gingembre|zenzero|しょうが|생강
noun|objects|green onion;scallion;spring onion|蔥;青蔥|cebolleta;cebollín;cebolla de verdeo|oignon vert;ciboule|cipollotto|ねぎ|파
noun|objects|chili pepper;chili;chilli|辣椒|chile;ají;guindilla|piment|peperoncino|唐辛子|고추
noun|objects|potato|馬鈴薯;洋芋|papa;patata|pomme de terre|patata|じゃがいも|감자
noun|objects|sweet potato|地瓜;番薯|batata;camote;boniato|patate douce|patata dolce;patata americana|さつまいも|고구마
noun|objects|tomato|番茄;蕃茄|tomate;jitomate|tomate|pomodoro|トマト|토마토
noun|objects|carrot|紅蘿蔔;胡蘿蔔|zanahoria|carotte|carota|にんじん|당근
noun|objects|bean|豆子|frijol;alubia;judía;poroto|haricot|fagiolo|豆|콩
noun|objects|pea|豌豆;青豆|guisante;arveja;chícharo|petit pois|pisello|えんどう豆|완두콩
noun|objects|bean sprouts|豆芽;豆芽菜|brotes de soja;brotes de soya|pousses de soja;germes de soja|germogli di soia|もやし|숙주나물
noun|objects|lettuce|生菜;萵苣|lechuga|laitue|lattuga|レタス|상추
noun|objects|spinach|菠菜|espinaca;espinacas|épinards;épinard|spinaci|ほうれん草|시금치
noun|objects|eggplant;aubergine|茄子|berenjena|aubergine|melanzana|なす|가지
noun|objects|celery|芹菜|apio|céleri|sedano|セロリ|셀러리
noun|objects|asparagus|蘆筍|espárrago|asperge|asparago|アスパラガス|아스파라거스
noun|other|breakfast|早餐|desayuno|petit-déjeuner;petit déjeuner|colazione|朝食|아침 식사
noun|other|lunch|午餐;午飯|almuerzo;comida|déjeuner|pranzo|昼食|점심 식사
noun|other|dinner|晚餐;晚飯|cena|dîner|cena|夕食|저녁 식사
noun|other|brunch|早午餐|brunch|brunch|brunch|ブランチ|브런치
noun|other|meal|一餐;一頓飯|comida|repas|pasto|食事|식사
noun|objects|dish|菜;料理|plato|plat|piatto|料理|요리
noun|other|recipe|食譜|receta|recette|ricetta|レシピ|레시피
noun|objects|appetizer;starter|開胃菜;前菜|entrante;entrada|entrée|antipasto|前菜|전채
noun|objects|main course|主菜|plato principal;plato fuerte|plat principal|piatto principale;secondo|メインディッシュ|메인 요리
noun|objects|side dish|配菜|guarnición;acompañamiento|accompagnement|contorno|おかず|반찬
noun|objects|leftovers|剩菜|sobras|restes|avanzi;resti|残り物|남은 음식
noun|objects|street food|小吃|comida callejera|cuisine de rue;street food|cibo di strada;street food|屋台の食べ物|길거리 음식
noun|objects|fast food|速食|comida rápida|fast-food;restauration rapide|fast food|ファストフード|패스트푸드
noun|objects|vegetarian food|素食|comida vegetariana|nourriture végétarienne;cuisine végétarienne|cibo vegetariano|ベジタリアン料理|채식
noun|other|flavor;flavour|口味;味道|sabor|goût;saveur|gusto;sapore|味|맛
noun|other|picnic|野餐|pícnic|pique-nique|picnic|ピクニック|소풍
noun|other|barbecue|烤肉|barbacoa;asado;parrillada|barbecue|grigliata;barbecue|バーベキュー|바비큐
noun|objects|water|水|agua|eau|acqua|水|물
noun|objects|hot water|熱水|agua caliente|eau chaude|acqua calda|お湯|뜨거운 물
noun|objects|mineral water|礦泉水|agua mineral|eau minérale|acqua minerale|ミネラルウォーター|생수
noun|objects|sparkling water|氣泡水|agua con gas|eau gazeuse|acqua frizzante;acqua gassata|炭酸水|탄산수
noun|objects|ice cube|冰塊|cubito de hielo;cubo de hielo|glaçon|cubetto di ghiaccio|氷|얼음
noun|objects|beverage|飲料|bebida|boisson|bevanda;bibita|飲み物|음료
noun|objects|tea|茶|té|thé|tè|お茶|차
noun|objects|green tea|綠茶|té verde|thé vert|tè verde|緑茶|녹차
noun|objects|black tea|紅茶|té negro|thé noir|tè nero|紅茶|홍차
noun|objects|iced tea|冰紅茶|té helado;té frío|thé glacé|tè freddo|アイスティー|아이스티
noun|objects|milk tea|奶茶|té con leche|thé au lait|tè al latte|ミルクティー|밀크티
noun|objects|bubble tea|珍珠奶茶;珍奶|té de burbujas;té con perlas;bubble tea|thé aux perles;bubble tea|bubble tea|タピオカミルクティー|버블티
noun|objects|latte|拿鐵|café con leche;latte|café au lait;café latte|caffellatte;caffè latte|ラテ|라테
noun|objects|hot chocolate|熱可可;熱巧克力|chocolate caliente|chocolat chaud|cioccolata calda|ホットチョコレート|핫초코
noun|objects|juice|果汁|jugo;zumo|jus|succo|ジュース|주스
noun|objects|orange juice|柳橙汁|jugo de naranja;zumo de naranja|jus d'orange|succo d'arancia|オレンジジュース|오렌지 주스
noun|objects|soy milk|豆漿|leche de soja;leche de soya|lait de soja|latte di soia|豆乳|두유
noun|objects|milkshake|奶昔|batido;malteada|milk-shake|frappè;milkshake|ミルクセーキ|밀크셰이크
noun|objects|soda|汽水|refresco;gaseosa|soda|bibita;bibita gassata|炭酸飲料|탄산음료
noun|objects|beer|啤酒|cerveza|bière|birra|ビール|맥주
noun|objects|wine|葡萄酒|vino|vin|vino|ワイン|와인
noun|objects|alcohol|酒|alcohol|alcool|alcol|お酒|술
noun|objects|cocktail|雞尾酒|cóctel|cocktail|cocktail|カクテル|칵테일
noun|objects|whisky;whiskey|威士忌|whisky;güisqui|whisky|whisky|ウイスキー|위스키
noun|objects|straw|吸管|pajita;popote;pitillo;sorbete|paille|cannuccia|ストロー|빨대
phrase|other|no ice|去冰|sin hielo|sans glaçons|senza ghiaccio|氷なし|얼음 빼고
phrase|other|less ice|少冰|con poco hielo|avec peu de glaçons|con poco ghiaccio|氷少なめ|얼음 조금
phrase|other|no sugar|無糖|sin azúcar|sans sucre|senza zucchero|砂糖なし|무설탕
phrase|other|to go;takeaway|外帶|para llevar|à emporter|da asporto;da portare via|持ち帰り|포장
phrase|other|for here|內用|para comer aquí|sur place|da mangiare qui|店内で|매장에서
noun|objects|bar|酒吧|bar|bar|bar|バー|바
noun|objects|food court|美食街|patio de comidas;zona de comidas|aire de restauration|food court;area ristorazione|フードコート|푸드코트
noun|objects|buffet|自助餐|bufé;buffet|buffet|buffet|ビュッフェ|뷔페
noun|objects|stall|攤位;攤子|puesto|stand|bancarella|屋台|노점
noun|objects|fork|叉子|tenedor|fourchette|forchetta|フォーク|포크
noun|objects|chopsticks|筷子|palillos;palitos|baguettes|bacchette;bastoncini|箸|젓가락
noun|objects|teaspoon|小湯匙;茶匙|cucharita;cucharilla|petite cuillère;cuillère à café|cucchiaino|ティースプーン|티스푼
noun|objects|napkin|餐巾紙;餐巾|servilleta|serviette|tovagliolo|ナプキン|냅킨
noun|objects|toothpick|牙籤|palillo;mondadientes|cure-dent|stuzzicadenti|つまようじ|이쑤시개
noun|objects|bill|帳單|cuenta|addition|conto|勘定|계산서
noun|other|tip|小費|propina|pourboire|mancia|チップ|팁
noun|other|service charge|服務費|cargo por servicio|frais de service;service|servizio;costo del servizio|サービス料|봉사료
noun|other|portion|一份;份量|porción;ración|portion;part|porzione|一人前|일 인분
noun|other|delivery|外送|entrega a domicilio;servicio a domicilio|livraison|consegna a domicilio|配達|배달
noun|objects|cutting board|砧板;切菜板|tabla de cortar|planche à découper|tagliere|まな板|도마
noun|objects|lid|蓋子|tapa|couvercle|coperchio|ふた|뚜껑
noun|objects|kettle|熱水壺;快煮壺|hervidor|bouilloire|bollitore|やかん|주전자
noun|objects|rice cooker|電鍋;電子鍋|arrocera;olla arrocera|cuiseur à riz|cuociriso|炊飯器|밥솥
noun|objects|blender|果汁機|licuadora;batidora|mixeur;blender|frullatore|ミキサー|믹서기
noun|objects|bottle opener|開瓶器|abrebotellas;destapador|décapsuleur;ouvre-bouteille|apribottiglie|栓抜き|병따개
noun|objects|thermos|保溫瓶|termo|thermos|thermos|魔法瓶|보온병
noun|objects|convenience store|便利商店;超商|tienda de conveniencia|supérette;dépanneur|minimarket|コンビニ|편의점
noun|objects|clothing store|服飾店;服裝店|tienda de ropa|magasin de vêtements|negozio di abbigliamento|洋服店|옷 가게
noun|objects|online store|網路商店;網店|tienda en línea;tienda online|boutique en ligne|negozio online|ネットショップ|온라인 쇼핑몰
noun|objects|flea market|跳蚤市場|mercadillo;mercado de pulgas|marché aux puces|mercatino delle pulci|フリーマーケット|벼룩시장
noun|objects|shop window|櫥窗|escaparate;vitrina;aparador|vitrine|vetrina|ショーウインドー|쇼윈도
noun|objects|fitting room|試衣間|probador|cabine d'essayage|camerino|試着室|탈의실
noun|objects|checkout|結帳櫃台;收銀台|caja|caisse|cassa|レジ|계산대
noun|other|queue|隊伍|fila;cola|queue;file d'attente|fila;coda|列|줄
noun|other|price|價格;價錢|precio|prix|prezzo|値段|가격
noun|objects|price tag|價格標籤|etiqueta de precio;etiqueta|étiquette|cartellino del prezzo;cartellino|値札|가격표
noun|other|discount|折扣|descuento|réduction;remise|sconto|割引|할인
noun|other|sale|特賣;大拍賣|rebajas;ofertas|soldes|saldi|セール|세일
noun|objects|coupon|優惠券;折價券|cupón|bon de réduction;coupon|buono sconto;coupon|クーポン|쿠폰
noun|objects|receipt|收據;發票|recibo;ticket|reçu;ticket de caisse|scontrino;ricevuta|レシート|영수증
noun|other|refund|退款;退費|reembolso|remboursement|rimborso|返金|환불
noun|other|tax|稅;稅金|impuesto|taxe|tassa;imposta|税金|세금
noun|objects|bag|袋子|bolsa|sac|sacchetto;busta|袋|봉투
noun|objects|shopping bag|購物袋|bolsa de compras;bolsa de la compra|sac de courses|borsa della spesa|買い物袋|쇼핑백
noun|objects|shopping list|購物清單|lista de la compra;lista de compras|liste de courses|lista della spesa|買い物リスト|쇼핑 목록
noun|other|online shopping|網購;網路購物|compras en línea;compras por internet|achats en ligne|acquisti online;shopping online|ネットショッピング|인터넷 쇼핑
noun|objects|package|包裹|paquete|colis|pacco|小包|소포
noun|objects|product|產品;商品|producto|produit|prodotto|製品|제품
noun|other|brand|品牌;牌子|marca|marque|marca|ブランド|브랜드
noun|other|quality|品質|calidad|qualité|qualità|品質|품질
noun|objects|gift|禮物|regalo|cadeau|regalo|贈り物|선물
noun|other|opening hours|營業時間|horario de apertura;horario|horaires d'ouverture|orario di apertura|営業時間|영업시간
noun|objects|money|錢|dinero|argent|soldi;denaro|お金|돈
noun|objects|cash|現金|efectivo|espèces;liquide|contanti|現金|현금
noun|objects|coin|硬幣;銅板|moneda|pièce;pièce de monnaie|moneta|硬貨|동전
noun|objects|banknote|鈔票;紙鈔|billete|billet|banconota|紙幣|지폐
noun|objects|small change|零錢|cambio;suelto;sencillo|monnaie;petite monnaie|spiccioli|小銭|잔돈
noun|objects|coin purse|零錢包|monedero|porte-monnaie|portamonete;borsellino|小銭入れ|동전 지갑
noun|objects|credit card|信用卡|tarjeta de crédito|carte de crédit|carta di credito|クレジットカード|신용카드
noun|other|mobile payment|行動支付|pago móvil|paiement mobile|pagamento mobile|モバイル決済|모바일 결제
noun|other|payment|付款;支付|pago|paiement|pagamento|支払い|결제
noun|objects|bank|銀行|banco|banque|banca|銀行|은행
noun|other|bank account|銀行帳戶;帳戶|cuenta bancaria;cuenta de banco|compte bancaire;compte en banque|conto in banca;conto bancario|銀行口座|은행 계좌
noun|objects|red envelope|紅包|sobre rojo|enveloppe rouge|busta rossa|お年玉;紅包|세뱃돈;홍바오
noun|other|currency|貨幣|moneda;divisa|monnaie;devise|valuta|通貨|통화
noun|other|exchange rate|匯率|tipo de cambio;tasa de cambio|taux de change|tasso di cambio|為替レート|환율
noun|other|dollar|美元;美金|dólar|dollar|dollaro|ドル|달러
noun|other|euro|歐元|euro|euro|euro|ユーロ|유로
noun|other|New Taiwan dollar;NT dollar|新台幣;台幣;新臺幣|dólar taiwanés|dollar taïwanais|dollaro taiwanese|台湾ドル|대만 달러
noun|other|salary|薪水;薪資|sueldo;salario|salaire|stipendio|給料|월급;급여
noun|other|income|收入|ingresos|revenu;revenus|reddito|収入|수입
noun|other|expense|花費;開銷|gasto|dépense|spesa|支出|지출
noun|other|budget|預算|presupuesto|budget|budget|予算|예산
noun|other|savings|存款;積蓄|ahorros|économies|risparmi|貯金|저금
noun|other|loan|貸款|préstamo|prêt|prestito|ローン|대출
noun|other|debt|債務;欠款|deuda|dette|debito|借金|빚
noun|other|interest rate|利率|tasa de interés;tipo de interés|taux d'intérêt|tasso d'interesse|金利|금리
noun|objects|house|房子|casa|maison|casa|家|집
noun|objects|home|家|casa|maison|casa|うち;家庭|집;가정
noun|objects|apartment;flat|公寓|apartamento;piso;departamento|appartement|appartamento|アパート|아파트
noun|objects|room|房間|habitación;cuarto|pièce|stanza|部屋|방
noun|objects|bedroom|臥室|dormitorio|chambre|camera da letto|寝室|침실
noun|objects|living room|客廳|sala de estar;salón|salon|soggiorno;salotto|リビング|거실
noun|objects|bathroom|浴室|baño|salle de bain;salle de bains|bagno|浴室|욕실
noun|objects|kitchen|廚房|cocina|cuisine|cucina|台所|부엌
noun|objects|dining room|餐廳|comedor|salle à manger|sala da pranzo|ダイニング|식당
noun|objects|floor|地板|suelo;piso|sol|pavimento|床|바닥
noun|objects|wall|牆壁;牆|pared|mur|parete|壁|벽
noun|objects|ceiling|天花板|techo|plafond|soffitto|天井|천장
noun|objects|roof|屋頂|tejado;techo|toit|tetto|屋根|지붕
noun|objects|stairs|樓梯|escaleras;escalera|escalier;escaliers|scale|階段|계단
noun|objects|elevator;lift|電梯|ascensor|ascenseur|ascensore|エレベーター|엘리베이터
noun|objects|escalator|手扶梯;電扶梯|escalera mecánica|escalator|scala mobile|エスカレーター|에스컬레이터
noun|objects|garden|花園|jardín|jardin|giardino|庭|정원
noun|objects|balcony|陽台|balcón|balcon|balcone|ベランダ|발코니
noun|objects|key|鑰匙|llave|clé;clef|chiave|鍵|열쇠
noun|objects|light bulb|燈泡|bombilla;foco|ampoule|lampadina|電球|전구
noun|objects|furniture|家具;傢俱|muebles|meubles|mobili|家具|가구
noun|objects|shelf|架子|estante|étagère|mensola|棚|선반
noun|objects|mirror|鏡子|espejo|miroir|specchio|鏡|거울
noun|objects|curtain|窗簾|cortina|rideau|tenda|カーテン|커튼
noun|objects|carpet|地毯|alfombra|tapis|tappeto|じゅうたん|카펫
noun|objects|drawer|抽屜|cajón|tiroir|cassetto|引き出し|서랍
noun|objects|mattress|床墊|colchón|matelas|materasso|マットレス|매트리스
noun|objects|armchair|扶手椅|sillón|fauteuil|poltrona|ひじ掛けいす|안락의자
noun|objects|faucet;tap|水龍頭|grifo|robinet|rubinetto|蛇口|수도꼭지
noun|objects|hallway|走廊|pasillo|couloir|corridoio|廊下|복도
noun|objects|entrance|入口|entrada|entrée|ingresso;entrata|入り口|입구
noun|objects|exit|出口|salida|sortie|uscita|出口|출구
noun|objects|garage|車庫|garaje|garage|garage|車庫|차고
noun|objects|doorbell|門鈴|timbre|sonnette|campanello|呼び鈴|초인종
noun|objects|oven|烤箱|horno|four|forno|オーブン|오븐
noun|objects|air conditioner|冷氣|aire acondicionado|climatiseur|condizionatore|エアコン|에어컨
noun|other|address|地址|dirección|adresse|indirizzo|住所|주소
noun|people|landlord|房東|casero;casera|propriétaire|padrone di casa;padrona di casa|大家|집주인
noun|other|housework|家事|tareas domésticas|tâches ménagères|faccende domestiche|家事|집안일
noun|objects|bed sheet|床單|sábana|drap|lenzuolo|シーツ|침대 시트
noun|objects|blanket|毯子|manta;cobija|couverture|coperta|毛布|담요
noun|objects|soap|肥皂|jabón|savon|sapone|せっけん|비누
noun|objects|shampoo|洗髮精|champú|shampooing;shampoing|shampoo|シャンプー|샴푸
noun|objects|toothbrush|牙刷|cepillo de dientes|brosse à dents|spazzolino|歯ブラシ|칫솔
noun|objects|toothpaste|牙膏|pasta de dientes|dentifrice|dentifricio|歯磨き粉|치약
noun|objects|comb|梳子|peine|peigne|pettine|くし|빗
noun|objects|trash;garbage|垃圾|basura|ordures;déchets|spazzatura;immondizia|ごみ|쓰레기
noun|objects|trash bag;garbage bag|垃圾袋|bolsa de basura|sac-poubelle|sacchetto della spazzatura|ごみ袋|쓰레기봉투
noun|other|recycling|資源回收|reciclaje|recyclage|riciclo|リサイクル|재활용
noun|objects|laundry detergent|洗衣精|detergente|lessive|detersivo|洗濯洗剤|세탁 세제
noun|objects|hanger|衣架|percha|cintre|gruccia|ハンガー|옷걸이
verb|actions|sweep|掃地|barrer|balayer|spazzare|掃く|쓸다
phrase|other|make the bed|鋪床|hacer la cama|faire le lit|fare il letto|ベッドを整える|침대를 정리하다
phrase|other|take out the trash|倒垃圾|sacar la basura|sortir la poubelle|portare fuori la spazzatura|ごみを出す|쓰레기를 버리다
phrase|other|fold clothes|摺衣服;折衣服|doblar la ropa|plier les vêtements|piegare i vestiti|服をたたむ|옷을 개다
phrase|other|hang up the laundry|晾衣服;曬衣服|tender la ropa|étendre le linge|stendere i panni|洗濯物を干す|빨래를 널다
noun|objects|clothes|衣服|ropa|vêtements|vestiti|服|옷
noun|objects|shirt|襯衫|camisa|chemise|camicia|シャツ|셔츠
noun|objects|pants;trousers|褲子|pantalones;pantalón|pantalon|pantaloni|ズボン|바지
noun|objects|shorts|短褲|pantalones cortos|short|pantaloncini|半ズボン|반바지
noun|objects|jacket|外套;夾克|chaqueta|veste|giacca|ジャケット|재킷
noun|objects|hoodie|帽T|sudadera con capucha|sweat à capuche|felpa con cappuccio|パーカー|후드티
noun|objects|cap|鴨舌帽;棒球帽|gorra|casquette|cappellino|キャップ|모자
noun|objects|belt|皮帶|cinturón|ceinture|cintura|ベルト|벨트
noun|objects|pocket|口袋|bolsillo|poche|tasca|ポケット|주머니
noun|objects|button|扣子;釦子;鈕扣|botón|bouton|bottone|ボタン|단추
noun|objects|zipper;zip|拉鍊|cremallera;cierre|fermeture éclair|cerniera;zip|ファスナー|지퍼
noun|objects|sleeve|袖子|manga|manche|manica|袖|소매
noun|objects|glasses|眼鏡|gafas;lentes|lunettes|occhiali|眼鏡|안경
noun|objects|ring|戒指|anillo|bague|anello|指輪|반지
noun|objects|earring|耳環|pendiente;arete|boucle d'oreille|orecchino|イヤリング|귀걸이
noun|objects|bracelet|手鍊|pulsera|bracelet|braccialetto|ブレスレット|팔찌
noun|objects|jewelry;jewellery|首飾|joyas|bijoux|gioielli|アクセサリー|장신구
noun|objects|underwear|內衣褲|ropa interior|sous-vêtements|biancheria intima|下着|속옷
noun|objects|uniform|制服|uniforme|uniforme|uniforme|制服|교복;제복
noun|objects|slippers|拖鞋|pantuflas|chaussons;pantoufles|pantofole;ciabatte|スリッパ|슬리퍼
noun|objects|flip-flops|夾腳拖|chanclas|tongs|infradito|ビーチサンダル|쪼리
noun|objects|raincoat|雨衣|impermeable|imperméable|impermeabile|レインコート|우비
noun|other|size|大小|tamaño|taille|dimensione|大きさ|크기
noun|other|size|尺寸;尺碼|talla|taille|taglia|サイズ|사이즈
noun|objects|city|城市|ciudad|ville|città|都市|도시
noun|objects|town|小鎮|pueblo|ville|cittadina|町|마을;소도시
noun|objects|village|村莊;村子|pueblo|village|villaggio|村|마을
noun|objects|country|國家|país|pays|paese|国|나라
noun|objects|countryside|鄉下;鄉村|campo|campagne|campagna|田舎|시골
noun|objects|capital|首都|capital|capitale|capitale|首都|수도
noun|objects|street|街;街道|calle|rue|strada;via|通り|거리
noun|objects|road|路;道路|carretera|route|strada|道|길
noun|objects|avenue|大道|avenida|avenue|viale;corso|大通り|대로
noun|objects|alley|巷子|callejón|ruelle|vicolo|路地|골목
noun|objects|square|廣場|plaza|place|piazza|広場|광장
noun|other|square|正方形|cuadrado|carré|quadrato|正方形|정사각형
noun|objects|corner|轉角;街角|esquina|coin|angolo|角|모퉁이
noun|objects|intersection|路口;十字路口|cruce|carrefour|incrocio|交差点|교차로
noun|objects|sidewalk|人行道|acera|trottoir|marciapiede|歩道|인도
noun|objects|crosswalk;zebra crossing|斑馬線|paso de peatones;paso de cebra|passage piéton|strisce pedonali|横断歩道|횡단보도
noun|objects|school|學校|escuela|école|scuola|学校|학교
noun|objects|university|大學|universidad|université|università|大学|대학교
noun|objects|museum|博物館|museo|musée|museo|博物館|박물관
noun|objects|art museum|美術館|museo de arte|musée d'art|museo d'arte|美術館|미술관
noun|objects|aquarium|水族館|acuario|aquarium|acquario|水族館|수족관
noun|objects|zoo|動物園|zoológico;zoo|zoo|zoo|動物園|동물원
noun|objects|temple|寺廟;廟|templo|temple|tempio|寺|절
noun|objects|post office|郵局|oficina de correos;correos|poste;bureau de poste|ufficio postale;posta|郵便局|우체국
noun|objects|police station|警察局;派出所|comisaría|commissariat|commissariato|警察署|경찰서
noun|objects|fire station|消防局;消防隊|estación de bomberos;parque de bomberos|caserne de pompiers|caserma dei vigili del fuoco|消防署|소방서
noun|objects|city hall|市政府|ayuntamiento;alcaldía|mairie;hôtel de ville|municipio;comune|市役所|시청
noun|objects|embassy|大使館|embajada|ambassade|ambasciata|大使館|대사관
noun|objects|hotel|飯店|hotel|hôtel|hotel;albergo|ホテル|호텔
noun|objects|hostel|青年旅館|albergue juvenil;albergue|auberge de jeunesse|ostello|ユースホステル|유스호스텔
noun|objects|airport|機場|aeropuerto|aéroport|aeroporto|空港|공항
noun|objects|station|車站|estación|gare|stazione|駅|역
noun|objects|train station|火車站|estación de tren|gare|stazione|鉄道駅|기차역
noun|objects|bus stop|公車站|parada de autobús|arrêt de bus|fermata dell'autobus|バス停|버스 정류장
noun|objects|metro station;subway station|捷運站|estación de metro|station de métro|stazione della metropolitana;fermata della metro|地下鉄の駅|지하철역
noun|objects|parking lot;car park|停車場|estacionamiento;aparcamiento|parking|parcheggio|駐車場|주차장
noun|objects|gas station;petrol station|加油站|gasolinera|station-service|distributore di benzina|ガソリンスタンド|주유소
noun|objects|office|辦公室|oficina|bureau|ufficio|事務所|사무실
noun|objects|factory|工廠|fábrica|usine|fabbrica|工場|공장
noun|objects|farm|農場|granja|ferme|fattoria|農場|농장
noun|objects|building|建築物;大樓|edificio|bâtiment|edificio|建物|건물
noun|objects|skyscraper|摩天大樓|rascacielos|gratte-ciel|grattacielo|高層ビル|고층 빌딩
noun|objects|tower|塔|torre|tour|torre|塔|탑
noun|objects|statue|雕像|estatua|statue|statua|像|동상
noun|objects|downtown;city center|市中心|centro|centre-ville|centro|繁華街|시내
noun|objects|neighborhood;neighbourhood|社區|barrio|quartier|quartiere|地域|동네
noun|objects|store;shop|商店|tienda|magasin|negozio|店|가게
noun|objects|shopping mall;mall|購物中心|centro comercial|centre commercial|centro commerciale|ショッピングモール|쇼핑몰
noun|objects|department store|百貨公司|grandes almacenes|grand magasin|grande magazzino|デパート|백화점
noun|objects|market|市場|mercado|marché|mercato|市場|시장
noun|objects|night market|夜市|mercado nocturno|marché de nuit;marché nocturne|mercato notturno|夜市|야시장
noun|objects|cafe;café|咖啡廳;咖啡店|cafetería;café|café|caffè|カフェ|카페
noun|objects|hair salon|美髮店;髮廊|peluquería|salon de coiffure|parrucchiere|美容院|미용실
noun|objects|gym|健身房|gimnasio|salle de sport|palestra|ジム|헬스장
noun|objects|swimming pool|游泳池|piscina|piscine|piscina|プール|수영장
noun|objects|stadium|體育場|estadio|stade|stadio|スタジアム|경기장
noun|objects|theater;theatre|劇院|teatro|théâtre|teatro|劇場|극장
noun|objects|amusement park|遊樂園|parque de atracciones;parque de diversiones|parc d'attractions|parco divertimenti|遊園地|놀이공원
noun|objects|restroom|洗手間;廁所|baño|toilettes|bagno|お手洗い|화장실
noun|objects|front desk|櫃檯|recepción|réception|reception|フロント|프런트
noun|objects|port|港口|puerto|port|porto|港|항구
noun|objects|map|地圖|mapa|carte|mappa;cartina|地図|지도
noun|other|direction|方向|dirección|direction|direzione|方向|방향
noun|other|left|左邊|izquierda|gauche|sinistra|左|왼쪽
noun|other|north|北|norte|nord|nord|北|북쪽
noun|other|south|南|sur|sud|sud|南|남쪽
noun|other|east|東|este|est|est|東|동쪽
noun|other|west|西|oeste|ouest|ovest|西|서쪽
phrase|other|turn left|左轉|girar a la izquierda;doblar a la izquierda|tourner à gauche|girare a sinistra|左に曲がる|좌회전하다
phrase|other|turn right|右轉|girar a la derecha;doblar a la derecha|tourner à droite|girare a destra|右に曲がる|우회전하다
phrase|other|go straight|直走|seguir recto;seguir derecho|aller tout droit|andare dritto;andare diritto|まっすぐ行く|직진하다
other|other|across from|對面|enfrente de|en face de|di fronte a|～の向かい|맞은편
noun|objects|metro;subway|捷運|metro|métro|metropolitana;metro|地下鉄|지하철
noun|objects|motorcycle|機車;摩托車|moto;motocicleta|moto|moto;motocicletta|バイク|오토바이
noun|objects|boat|船|barco|bateau|barca|船|배
noun|objects|ferry|渡輪|ferry|ferry|traghetto|フェリー|여객선
noun|objects|helicopter|直升機|helicóptero|hélicoptère|elicottero|ヘリコプター|헬리콥터
noun|objects|high-speed rail;high-speed train|高鐵|tren de alta velocidad|train à grande vitesse|treno ad alta velocità|新幹線;高速鉄道|고속 철도
noun|objects|cable car|纜車|teleférico|téléphérique|funivia|ロープウェー|케이블카
noun|objects|ticket|票|billete;boleto|billet;ticket|biglietto|切符|표
noun|objects|one-way ticket|單程票|billete de ida;boleto de ida|aller simple|biglietto di sola andata|片道切符|편도표
noun|objects|round-trip ticket;return ticket|來回票|billete de ida y vuelta;boleto de ida y vuelta|aller-retour|biglietto di andata e ritorno|往復切符|왕복표
noun|objects|ticket office|售票處|taquilla;boletería|guichet|biglietteria|切符売り場|매표소
noun|objects|platform|月台|andén|quai|binario|ホーム|승강장
noun|objects|train car;carriage|車廂|vagón|wagon|carrozza;vagone|車両|객차
noun|objects|seat|座位;位子|asiento|place;siège|posto;sedile|席|좌석
noun|objects|window seat|靠窗座位|asiento de ventanilla|place côté fenêtre|posto finestrino|窓側の席|창가 좌석
noun|objects|aisle seat|靠走道座位|asiento de pasillo|place côté couloir|posto corridoio|通路側の席|통로 좌석
noun|objects|boarding pass|登機證|tarjeta de embarque;pase de abordar|carte d'embarquement|carta d'imbarco|搭乗券|탑승권
noun|objects|boarding gate|登機門|puerta de embarque|porte d'embarquement|uscita d'imbarco|搭乗口|탑승구
noun|other|flight|班機;航班|vuelo|vol|volo|便|항공편
noun|other|traffic|交通|tráfico|circulation|traffico|交通|교통
noun|other|traffic jam|塞車|atasco;embotellamiento|embouteillage;bouchon|ingorgo|渋滞|교통 체증
noun|other|rush hour|尖峰時間|hora punta;hora pico|heure de pointe|ora di punta|ラッシュアワー|러시아워
noun|objects|highway;freeway|高速公路|autopista|autoroute|autostrada|高速道路|고속도로
noun|objects|tunnel|隧道|túnel|tunnel|tunnel;galleria|トンネル|터널
noun|objects|gasoline;petrol|汽油|gasolina|essence|benzina|ガソリン|휘발유
noun|objects|driver's license|駕照|licencia de conducir;carné de conducir|permis de conduire|patente|運転免許証|운전면허증
noun|other|delay|延誤;誤點|retraso|retard|ritardo|遅れ|지연
noun|objects|timetable|時刻表|horario|horaire|orario|時刻表|시간표
noun|people|traveler;traveller|旅客|viajero;viajera|voyageur;voyageuse|viaggiatore;viaggiatrice|旅行者|여행자
phrase|other|next stop|下一站|próxima parada|prochain arrêt|prossima fermata|次の駅|다음 역
phrase|other|last train|末班車|último tren|dernier train|ultimo treno|終電|막차
phrase|other|change trains|轉車;換車|cambiar de tren|changer de train|cambiare treno|乗り換える|갈아타다
phrase|other|take the metro|搭捷運;坐捷運|tomar el metro|prendre le métro|prendere la metro;prendere la metropolitana|地下鉄に乗る|지하철을 타다
phrase|other|take a taxi|搭計程車;坐計程車|tomar un taxi|prendre un taxi|prendere un taxi|タクシーに乗る|택시를 타다
phrase|other|take the train|搭火車;坐火車|tomar el tren|prendre le train|prendere il treno|電車に乗る|기차를 타다
other|other|on foot|走路;步行|a pie|à pied|a piedi|歩いて|걸어서
noun|other|trip|旅行|viaje|voyage|viaggio|旅行|여행
noun|other|vacation;holiday|假期|vacaciones|vacances|vacanza;vacanze|休暇|휴가
phrase|other|go on vacation|去度假|ir de vacaciones|partir en vacances|andare in vacanza|休暇に出かける|휴가를 가다
noun|other|business trip|出差|viaje de negocios|voyage d'affaires|viaggio di lavoro|出張|출장
noun|objects|passport|護照|pasaporte|passeport|passaporto|パスポート|여권
noun|objects|visa|簽證|visa;visado|visa|visto|ビザ|비자
noun|objects|luggage;baggage|行李|equipaje|bagages|bagagli;bagaglio|荷物|짐
noun|objects|suitcase|行李箱|maleta|valise|valigia|スーツケース|여행 가방
noun|other|reservation|預訂|reserva;reservación|réservation|prenotazione|予約|예약
verb|actions|reserve|預訂|reservar|réserver|prenotare|予約する|예약하다
phrase|other|check in|辦理入住|registrarse;hacer el check-in|s'enregistrer|fare il check-in|チェックインする|체크인하다
phrase|other|check out|退房|dejar la habitación;hacer el check-out|libérer la chambre|lasciare la camera;fare il check-out|チェックアウトする|체크아웃하다
noun|objects|tourist attraction|景點;觀光景點|atracción turística;lugar turístico|site touristique|attrazione turistica|観光地|관광지
noun|other|guided tour|導覽|visita guiada|visite guidée|visita guidata|ガイドツアー|가이드 투어
noun|people|guide|導遊|guía|guide|guida|ガイド|가이드
noun|objects|souvenir|紀念品|recuerdo;souvenir|souvenir|souvenir|お土産|기념품
phrase|other|go sightseeing|去觀光|hacer turismo|faire du tourisme|fare un giro turistico|観光する|관광하다
noun|other|itinerary|行程|itinerario|itinéraire|itinerario|旅程|여행 일정
noun|objects|travel agency|旅行社|agencia de viajes|agence de voyages|agenzia di viaggi;agenzia viaggi|旅行会社|여행사
noun|other|customs|海關|aduana|douane|dogana|税関|세관
noun|other|security check|安檢|control de seguridad|contrôle de sécurité|controllo di sicurezza|保安検査|보안 검색
noun|other|jet lag|時差|jet lag;desfase horario|décalage horaire|jet lag|時差ぼけ|시차증
phrase|other|go abroad|出國|ir al extranjero|partir à l'étranger;aller à l'étranger|andare all'estero|海外に行く|해외에 가다
phrase|other|exchange money|換錢|cambiar dinero|changer de l'argent|cambiare soldi|両替する|환전하다
phrase|other|rent a car|租車|alquilar un coche;alquilar un auto|louer une voiture|noleggiare un'auto;noleggiare una macchina|レンタカーを借りる|차를 빌리다
noun|other|nature|大自然;自然|naturaleza|nature|natura|自然|자연
noun|objects|sky|天空|cielo|ciel|cielo|空|하늘
noun|objects|sun|太陽|sol|soleil|sole|太陽|태양;해
noun|objects|moon|月亮|luna|lune|luna|月|달
noun|objects|star|星星|estrella|étoile|stella|星|별
noun|objects|cloud|雲|nube|nuage|nuvola|雲|구름
noun|other|wind|風|viento|vent|vento|風|바람
noun|other|storm|暴風雨|tormenta|tempête|tempesta|嵐|폭풍
noun|other|typhoon|颱風|tifón|typhon|tifone|台風|태풍
noun|other|hurricane|颶風|huracán|ouragan|uragano|ハリケーン|허리케인
noun|other|earthquake|地震|terremoto;sismo|tremblement de terre;séisme|terremoto|地震|지진
noun|other|fog|霧|niebla|brouillard|nebbia|霧|안개
noun|other|thunder|雷;雷聲|trueno|tonnerre|tuono|雷|천둥
noun|other|lightning|閃電|relámpago|éclair|fulmine|稲妻|번개
noun|objects|rainbow|彩虹|arcoíris;arco iris|arc-en-ciel|arcobaleno|虹|무지개
noun|objects|sea|海;大海|mar|mer|mare|海|바다
noun|objects|ocean|海洋|océano|océan|oceano|大洋|대양
noun|objects|river|河;河流|río|rivière|fiume|川|강
noun|objects|island|島|isla|île|isola|島|섬
noun|objects|forest|森林|bosque|forêt|foresta|森|숲
noun|objects|jungle|叢林|selva;jungla|jungle|giungla|ジャングル|정글
noun|objects|desert|沙漠|desierto|désert|deserto|砂漠|사막
noun|objects|hill|山丘;小山|colina|colline|collina|丘|언덕
noun|objects|cave|山洞;洞穴|cueva|grotte|grotta|洞窟|동굴
noun|objects|waterfall|瀑布|cascada|cascade;chute d'eau|cascata|滝|폭포
noun|objects|pond|池塘|estanque|étang|stagno|池|연못
noun|objects|coast|海岸|costa|côte|costa|海岸|해안
noun|objects|wave|海浪;浪|ola|vague|onda|波|파도
noun|objects|tree|樹|árbol|arbre|albero|木|나무
noun|objects|flower|花|flor|fleur|fiore|花|꽃
noun|objects|grass|草|hierba;pasto|herbe|erba|草|풀
noun|objects|leaf|葉子|hoja|feuille|foglia|葉|잎
noun|objects|branch|樹枝|rama|branche|ramo|枝|나뭇가지
noun|objects|root|根|raíz|racine|radice|根|뿌리
noun|objects|seed|種子|semilla|graine|seme|種|씨앗
noun|objects|animal|動物|animal|animal|animale|動物|동물
noun|objects|stone|石頭|piedra|pierre|pietra|石|돌
noun|objects|sand|沙子;沙|arena|sable|sabbia|砂|모래
noun|objects|soil|泥土;土|tierra|terre|terra|土|흙
noun|objects|mud|泥巴|barro;lodo|boue|fango|泥|진흙
noun|objects|dust|灰塵|polvo|poussière|polvere|ほこり|먼지
noun|objects|ground|地面|suelo|sol|terreno|地面|땅
noun|objects|Earth|地球|Tierra|Terre|Terra|地球|지구
noun|objects|planet|行星;星球|planeta|planète|pianeta|惑星|행성
noun|other|world|世界|mundo|monde|mondo|世界|세계
noun|objects|fire|火|fuego|feu|fuoco|火|불
noun|objects|ice|冰|hielo|glace|ghiaccio|氷|얼음
noun|other|air|空氣|aire|air|aria|空気|공기
noun|other|environment|環境|medio ambiente|environnement|ambiente|環境|환경
noun|other|sunlight|陽光|luz del sol|lumière du soleil|luce del sole|日光|햇빛
noun|other|shadow|影子|sombra|ombre|ombra|影|그림자
noun|other|sunrise|日出|amanecer;salida del sol|lever du soleil|alba|日の出|일출
noun|other|sunset|日落|puesta de sol|coucher de soleil|tramonto|日の入り|일몰
noun|other|weather|天氣|tiempo|temps|tempo|天気|날씨
noun|other|weather forecast|天氣預報|pronóstico del tiempo|prévisions météo;météo|previsioni del tempo;meteo|天気予報|일기 예보
noun|other|climate|氣候|clima|climat|clima|気候|기후
noun|other|temperature|溫度|temperatura|température|temperatura|温度|온도
noun|other|degree|度|grado|degré|grado|度|도
noun|other|humidity|濕度|humedad|humidité|umidità|湿度|습도
adjective|other|sunny|晴朗|soleado;soleada|ensoleillé;ensoleillée|soleggiato;soleggiata|晴れた|맑다
adjective|other|rainy|多雨|lluvioso;lluviosa|pluvieux;pluvieuse|piovoso;piovosa|雨の多い|비가 많이 오다
adjective|other|cloudy|多雲|nublado;nublada|nuageux;nuageuse|nuvoloso;nuvolosa|曇った|흐리다
adjective|other|windy|多風|ventoso;ventosa|venteux;venteuse|ventoso;ventosa|風の強い|바람이 많이 불다
adjective|other|humid|潮濕|húmedo;húmeda|humide|umido;umida|湿気の多い|습하다
noun|other|season|季節|estación|saison|stagione|季節|계절
noun|other|spring|春天|primavera|printemps|primavera|春|봄
noun|other|summer|夏天|verano|été|estate|夏|여름
noun|other|autumn;fall|秋天|otoño|automne|autunno|秋|가을
noun|other|winter|冬天|invierno|hiver|inverno|冬|겨울
noun|other|time|時間|tiempo|temps|tempo|時間|시간
noun|other|hour|小時;鐘頭|hora|heure|ora|時間（1時間）|시간
noun|other|minute|分鐘|minuto|minute|minuto|分|분
other|other|second|第二|segundo;segunda|deuxième|secondo;seconda|二番目|두 번째
noun|other|second|秒|segundo|seconde|secondo|秒|초
noun|other|day|天|día|jour|giorno|日|날;일
noun|other|week|星期;禮拜;週|semana|semaine|settimana|週|주
noun|other|month|月|mes|mois|mese|月（暦）|월;달
noun|other|year|年|año|année;an|anno|年|년;해
noun|other|decade|十年|década|décennie|decennio|十年|십 년
noun|other|century|世紀|siglo|siècle|secolo|世紀|세기
noun|other|morning|早上|mañana|matin|mattina|朝|아침
noun|other|noon|中午|mediodía|midi|mezzogiorno|正午|정오
noun|other|afternoon|下午|tarde|après-midi|pomeriggio|午後|오후
noun|other|evening|晚上|noche|soir|sera|夕方|저녁
noun|other|night|夜晚;晚上|noche|nuit|notte|夜|밤
noun|other|midnight|午夜|medianoche|minuit|mezzanotte|真夜中|자정
noun|other|weekend|週末|fin de semana|week-end;weekend|fine settimana;weekend|週末|주말
noun|other|holiday|假日|día festivo;feriado|jour férié|giorno festivo|休日|휴일
noun|other|date|日期|fecha|date|data|日付|날짜
noun|objects|calendar|日曆|calendario|calendrier|calendario|カレンダー|달력
noun|other|past|過去|pasado|passé|passato|過去|과거
noun|other|present|現在|presente|présent|presente|現在|현재
noun|other|future|未來;將來|futuro|avenir|futuro|未来|미래
noun|other|moment|時刻|momento|moment|momento|瞬間|순간
noun|other|New Year|新年|Año Nuevo|Nouvel An|Capodanno|新年|새해
noun|other|Chinese New Year;Lunar New Year|農曆新年;春節|Año Nuevo chino|Nouvel An chinois|Capodanno cinese|旧正月|설날
noun|other|Christmas|聖誕節|Navidad|Noël|Natale|クリスマス|크리스마스
phrase|other|half an hour|半小時;半個小時|media hora|demi-heure|mezz'ora|30分|30분
noun|other|Monday|星期一;禮拜一|lunes|lundi|lunedì|月曜日|월요일
noun|other|Tuesday|星期二;禮拜二|martes|mardi|martedì|火曜日|화요일
noun|other|Wednesday|星期三;禮拜三|miércoles|mercredi|mercoledì|水曜日|수요일
noun|other|Thursday|星期四;禮拜四|jueves|jeudi|giovedì|木曜日|목요일
noun|other|Friday|星期五;禮拜五|viernes|vendredi|venerdì|金曜日|금요일
noun|other|Saturday|星期六;禮拜六|sábado|samedi|sabato|土曜日|토요일
noun|other|Sunday|星期日;星期天;禮拜天|domingo|dimanche|domenica|日曜日|일요일
noun|other|January|一月|enero|janvier|gennaio|一月|1월
noun|other|February|二月|febrero|février|febbraio|二月|2월
noun|other|March|三月|marzo|mars|marzo|三月|3월
noun|other|April|四月|abril|avril|aprile|四月|4월
noun|other|May|五月|mayo|mai|maggio|五月|5월
noun|other|June|六月|junio|juin|giugno|六月|6월
noun|other|July|七月|julio|juillet|luglio|七月|7월
noun|other|August|八月|agosto|août|agosto|八月|8월
noun|other|September|九月|septiembre;setiembre|septembre|settembre|九月|9월
noun|other|October|十月|octubre|octobre|ottobre|十月|10월
noun|other|November|十一月|noviembre|novembre|novembre|十一月|11월
noun|other|December|十二月|diciembre|décembre|dicembre|十二月|12월
other|other|zero|零|cero|zéro|zero|ゼロ|영
other|other|one|一|uno;una|un;une|uno;una|一|일;하나
other|other|two|二;兩|dos|deux|due|二|이;둘
other|other|three|三|tres|trois|tre|三|삼;셋
other|other|four|四|cuatro|quatre|quattro|四|사;넷
other|other|five|五|cinco|cinq|cinque|五|오;다섯
other|other|six|六|seis|six|sei|六|육;여섯
other|other|seven|七|siete|sept|sette|七|칠;일곱
other|other|eight|八|ocho|huit|otto|八|팔;여덟
other|other|nine|九|nueve|neuf|nove|九|구;아홉
other|other|ten|十|diez|dix|dieci|十|십;열
other|other|eleven|十一|once|onze|undici|十一|십일;열하나
other|other|twelve|十二|doce|douze|dodici|十二|십이;열둘
other|other|thirteen|十三|trece|treize|tredici|十三|십삼
other|other|fourteen|十四|catorce|quatorze|quattordici|十四|십사
other|other|fifteen|十五|quince|quinze|quindici|十五|십오
other|other|sixteen|十六|dieciséis|seize|sedici|十六|십육
other|other|seventeen|十七|diecisiete|dix-sept|diciassette|十七|십칠
other|other|eighteen|十八|dieciocho|dix-huit|diciotto|十八|십팔
other|other|nineteen|十九|diecinueve|dix-neuf|diciannove|十九|십구
other|other|twenty|二十|veinte|vingt|venti|二十|이십;스물
other|other|thirty|三十|treinta|trente|trenta|三十|삼십;서른
other|other|forty|四十|cuarenta|quarante|quaranta|四十|사십;마흔
other|other|fifty|五十|cincuenta|cinquante|cinquanta|五十|오십;쉰
other|other|sixty|六十|sesenta|soixante|sessanta|六十|육십
other|other|seventy|七十|setenta|soixante-dix|settanta|七十|칠십
other|other|eighty|八十|ochenta|quatre-vingts|ottanta|八十|팔십
other|other|ninety|九十|noventa|quatre-vingt-dix|novanta|九十|구십
other|other|hundred|一百|cien|cent|cento|百|백
other|other|thousand|一千|mil|mille|mille|千|천
other|other|ten thousand|一萬|diez mil|dix mille|diecimila|一万|만
other|other|million|一百萬|millón|million|milione|百万|백만
other|other|billion|十億|mil millones|milliard|miliardo|十億|십억
other|other|third|第三|tercero;tercera|troisième|terzo;terza|三番目|세 번째
other|other|fourth|第四|cuarto;cuarta|quatrième|quarto;quarta|四番目|네 번째
other|other|fifth|第五|quinto;quinta|cinquième|quinto;quinta|五番目|다섯 번째
other|other|half|一半|mitad|moitié|metà|半分|절반
other|other|double|雙倍;兩倍|doble|double|doppio|二倍|두 배
other|other|dozen|一打|docena|douzaine|dozzina|ダース|다스
noun|other|number|數字|número|nombre|numero|数字|숫자
noun|other|color;colour|顏色|color|couleur|colore|色|색깔
adjective|other|red|紅色|rojo;roja|rouge|rosso;rossa|赤|빨간색
adjective|other|yellow|黃色|amarillo;amarilla|jaune|giallo;gialla|黄色|노란색
adjective|other|green|綠色|verde|vert;verte|verde|緑|초록색
adjective|other|blue|藍色|azul|bleu;bleue|blu|青|파란색
adjective|other|purple|紫色|morado;morada|violet;violette|viola|紫|보라색
adjective|other|pink|粉紅色|rosa;rosado;rosada|rose|rosa|ピンク|분홍색
adjective|other|brown|咖啡色;棕色|marrón|marron|marrone|茶色|갈색
adjective|other|black|黑色|negro;negra|noir;noire|nero;nera|黒|검은색
adjective|other|white|白色|blanco;blanca|blanc;blanche|bianco;bianca|白|흰색
adjective|other|gray;grey|灰色|gris|gris;grise|grigio;grigia|灰色|회색
adjective|other|gold|金色|dorado;dorada|doré;dorée|dorato;dorata|金色|금색
adjective|other|silver|銀色|plateado;plateada|argenté;argentée|argentato;argentata|銀色|은색
adjective|other|beige|米色|beige|beige|beige|ベージュ|베이지색
adjective|other|transparent|透明|transparente|transparent;transparente|trasparente|透明な|투명하다
noun|other|circle|圓形|círculo|cercle|cerchio|円|원
noun|other|rectangle|長方形|rectángulo|rectangle|rettangolo|長方形|직사각형
noun|other|triangle|三角形|triángulo|triangle|triangolo|三角形|삼각형
noun|other|oval|橢圓形|óvalo|ovale|ovale|楕円|타원
noun|other|line|線|línea|ligne|linea|線|선
noun|other|point|點|punto|point|punto|点|점
noun|other|shape|形狀|forma|forme|forma|形|모양
noun|other|length|長度|longitud|longueur|lunghezza|長さ|길이
noun|other|width|寬度|ancho;anchura|largeur|larghezza|幅|너비
noun|other|meter;metre|公尺|metro|mètre|metro|メートル|미터
noun|other|kilometer;kilometre|公里|kilómetro|kilomètre|chilometro|キロメートル|킬로미터
noun|other|centimeter;centimetre|公分|centímetro|centimètre|centimetro|センチメートル|센티미터
noun|other|kilogram;kilo|公斤|kilogramo;kilo|kilogramme;kilo|chilogrammo;chilo|キログラム|킬로그램
noun|other|gram;gramme|公克;克|gramo|gramme|grammo|グラム|그램
noun|objects|wood|木頭|madera|bois|legno|木材|나무
noun|objects|metal|金屬|metal|métal|metallo|金属|금속
noun|objects|plastic|塑膠|plástico|plastique|plastica|プラスチック|플라스틱
noun|objects|paper|紙|papel|papier|carta|紙|종이
noun|objects|cotton|棉|algodón|coton|cotone|綿|면
noun|objects|leather|皮革|cuero|cuir|pelle|革|가죽
noun|objects|steel|鋼|acero|acier|acciaio|鋼|강철
noun|objects|rubber|橡膠|goma|caoutchouc|gomma|ゴム|고무
noun|objects|wool|羊毛|lana|laine|lana|羊毛|양모
noun|objects|silk|絲綢|seda|soie|seta|絹|비단
noun|objects|fabric|布;布料|tela|tissu|tessuto;stoffa|布|천
noun|objects|brick|磚塊;磚頭|ladrillo|brique|mattone|れんが|벽돌
noun|objects|cardboard|紙板|cartón|carton|cartone|段ボール|골판지
noun|objects|ceramic|陶瓷|cerámica|céramique|ceramica|陶磁器|도자기
noun|other|class|課|clase|cours|lezione|授業|수업
noun|objects|classroom|教室|aula|salle de classe|aula|教室|교실
noun|other|lesson|課|lección|leçon|lezione|課|과
noun|other|course|課程|curso|cours|corso|講座|강좌
noun|other|homework|作業;功課|deberes;tarea|devoirs|compiti|宿題|숙제
noun|other|exam|考試|examen|examen|esame|試験|시험
noun|other|test|測驗|prueba|test|test|テスト|테스트
noun|other|grade|成績|nota|note|voto|成績|성적
noun|other|score|分數|puntuación;puntaje|score|punteggio|点数|점수
noun|other|question|問題|pregunta|question|domanda|質問|질문
noun|other|word|單字;詞|palabra|mot|parola|単語|단어
noun|other|sentence|句子|frase;oración|phrase|frase|文|문장
noun|other|language|語言|idioma;lengua|langue|lingua|言語|언어
noun|other|grammar|文法|gramática|grammaire|grammatica|文法|문법
noun|other|vocabulary|詞彙;字彙|vocabulario|vocabulaire|vocabolario|語彙|어휘
noun|objects|dictionary|字典;辭典|diccionario|dictionnaire|dizionario|辞書|사전
noun|other|pronunciation|發音|pronunciación|prononciation|pronuncia|発音|발음
noun|other|mistake|錯誤|error|erreur;faute|errore;sbaglio|間違い|실수;오류
noun|other|example|例子|ejemplo|exemple|esempio|例|예
noun|other|meaning|意思|significado|sens|significato|意味|의미;뜻
noun|objects|page|頁|página|page|pagina|ページ|페이지;쪽
noun|objects|notebook|筆記本|cuaderno|cahier|quaderno|ノート|공책
noun|objects|textbook|課本;教科書|libro de texto|manuel|libro di testo|教科書|교과서
noun|other|subject|科目|asignatura;materia|matière|materia|科目|과목
noun|other|math;maths|數學|matemáticas|mathématiques;maths|matematica|数学|수학
noun|other|history|歷史|historia|histoire|storia|歴史|역사
noun|other|science|科學|ciencia|science|scienza|科学|과학
noun|other|geography|地理|geografía|géographie|geografia|地理|지리
noun|other|physics|物理|física|physique|fisica|物理|물리
noun|other|chemistry|化學|química|chimie|chimica|化学|화학
noun|other|biology|生物|biología|biologie|biologia|生物|생물
noun|other|physical education;PE|體育|educación física|éducation physique|educazione fisica|体育|체육
noun|other|accent|口音|acento|accent|accento|なまり|억양;사투리
noun|other|level|程度|nivel|niveau|livello|レベル|수준
noun|other|translation|翻譯|traducción|traduction|traduzione|翻訳|번역
noun|other|foreign language|外語;外文|lengua extranjera;idioma extranjero|langue étrangère|lingua straniera|外国語|외국어
noun|other|native language;mother tongue|母語|lengua materna|langue maternelle|lingua madre;madrelingua|母語|모국어
noun|other|verb|動詞|verbo|verbe|verbo|動詞|동사
noun|other|noun|名詞|sustantivo|nom|nome;sostantivo|名詞|명사
noun|other|adjective|形容詞|adjetivo|adjectif|aggettivo|形容詞|형용사
noun|other|knowledge|知識|conocimiento|connaissances|conoscenza|知識|지식
noun|people|beginner|初學者|principiante|débutant;débutante|principiante|初心者|초보자
noun|other|English|英文;英語|inglés|anglais|inglese|英語|영어
noun|other|Chinese|中文|chino|chinois|cinese|中国語|중국어
noun|other|Spanish|西班牙文;西班牙語|español|espagnol|spagnolo|スペイン語|스페인어
noun|other|French|法文;法語|francés|français|francese|フランス語|프랑스어
noun|other|Italian|義大利文;義大利語|italiano|italien|italiano|イタリア語|이탈리아어
noun|other|Japanese|日文;日語|japonés|japonais|giapponese|日本語|일본어
noun|other|Korean|韓文;韓語|coreano|coréen|coreano|韓国語|한국어
noun|other|German|德文;德語|alemán|allemand|tedesco|ドイツ語|독일어
noun|other|job|工作|trabajo;empleo|travail;emploi|lavoro|仕事|일;직업
noun|other|company|公司|empresa|entreprise|azienda|会社|회사
noun|other|meeting|會議|reunión|réunion|riunione|会議|회의
noun|other|project|專案|proyecto|projet|progetto|プロジェクト|프로젝트
noun|other|interview|面試|entrevista|entretien|colloquio|面接|면접
noun|other|contract|合約;契約|contrato|contrat|contratto|契約|계약
noun|other|business|生意|negocios|affaires|affari|商売|사업
noun|other|team|團隊|equipo|équipe|squadra|チーム|팀
noun|other|idea|主意;點子|idea|idée|idea|アイデア|아이디어
noun|other|problem|問題|problema|problème|problema|問題|문제
noun|other|solution|解決辦法;解決方法|solución|solution|soluzione|解決策|해결책
noun|other|result|結果|resultado|résultat|risultato|結果|결과
noun|other|goal|目標|objetivo;meta|objectif|obiettivo|目標|목표
noun|other|report|報告|informe;reporte|rapport|relazione;rapporto|報告書|보고서
noun|other|email;e-mail|電子郵件|correo electrónico;email|e-mail;mail;courriel|email;e-mail;mail|メール|이메일
noun|objects|document|文件|documento|document|documento|書類|서류
noun|other|schedule|時間表|horario|emploi du temps|orario|スケジュール|일정
noun|other|deadline|截止日期|fecha límite|date limite|scadenza|締め切り|마감
noun|other|presentation|簡報|presentación|présentation|presentazione|プレゼン|발표
noun|people|client|客戶|cliente|client;cliente|cliente|顧客|고객
noun|other|skill|技能|habilidad|compétence|competenza|技能|기술
noun|objects|résumé;resume;CV|履歷;履歷表|currículum|CV|curriculum|履歴書|이력서
noun|other|internship|實習|prácticas;pasantía|stage|tirocinio;stage|インターンシップ|인턴십
noun|other|responsibility|責任|responsabilidad|responsabilité|responsabilità|責任|책임
noun|objects|phone|電話|teléfono|téléphone|telefono|電話|전화
noun|objects|smartphone|智慧型手機|smartphone;teléfono inteligente|smartphone|smartphone|スマートフォン|스마트폰
noun|other|internet|網路|internet|internet|internet|インターネット|인터넷
noun|other|website|網站|sitio web;página web|site web;site internet|sito web;sito internet|ウェブサイト|웹사이트
noun|other|app|應用程式;App|aplicación;app|application;appli|app;applicazione|アプリ|앱
noun|other|password|密碼|contraseña|mot de passe|password|パスワード|비밀번호
noun|other|message|訊息|mensaje|message|messaggio|メッセージ|메시지
noun|objects|photo|照片;相片|foto|photo|foto|写真|사진
noun|other|video|影片|vídeo;video|vidéo|video|動画|동영상
noun|objects|screen|螢幕|pantalla|écran|schermo|画面|화면
noun|objects|battery|電池|batería|batterie|batteria|電池|배터리
noun|objects|charger|充電器|cargador|chargeur|caricabatterie;caricatore|充電器|충전기
noun|other|Wi-Fi;wifi|無線網路;Wi-Fi|wifi|wifi;wi-fi|wi-fi;wifi|Wi-Fi|와이파이
noun|other|account|帳號|cuenta|compte|account|アカウント|계정
noun|other|software|軟體|software|logiciel|software|ソフトウェア|소프트웨어
noun|other|data|資料|datos|données|dati|データ|데이터
noun|other|information|資訊|información|information;informations|informazione;informazioni|情報|정보
noun|other|social media|社群媒體|redes sociales|réseaux sociaux|social media;social|SNS|소셜 미디어
noun|other|file|檔案|archivo;fichero|fichier|file|ファイル|파일
noun|other|link|連結|enlace|lien|link;collegamento|リンク|링크
noun|other|video call|視訊通話;視訊|videollamada|appel vidéo|videochiamata|ビデオ通話|영상 통화
noun|other|phone call|電話|llamada|appel|telefonata;chiamata|通話|통화
noun|objects|selfie|自拍照;自拍|selfie;selfi|selfie|selfie|自撮り|셀카
noun|other|artificial intelligence;AI|人工智慧|inteligencia artificial|intelligence artificielle|intelligenza artificiale|人工知能|인공지능
noun|other|technology|科技|tecnología|technologie|tecnologia|技術|기술
noun|other|video game|電玩;電動|videojuego|jeu vidéo|videogioco;videogame|テレビゲーム|비디오 게임
noun|objects|headphones|耳機|auriculares;audífonos|casque|cuffie|ヘッドホン|헤드폰
noun|objects|tablet|平板電腦;平板|tableta;tablet|tablette|tablet|タブレット|태블릿
noun|other|notification|通知|notificación|notification|notifica|通知|알림
noun|other|comment|留言|comentario|commentaire|commento|コメント|댓글
noun|other|conversation|對話|conversación|conversation|conversazione|会話|대화
noun|other|news|新聞|noticias|actualités|notizie|ニュース|뉴스
noun|other|story|故事|historia|histoire|storia|物語|이야기
noun|objects|letter|信;信件|carta|lettre|lettera|手紙|편지
noun|other|voice|聲音|voz|voix|voce|声|목소리
noun|other|sound|聲音|sonido|son|suono|音|소리
noun|other|noise|噪音|ruido|bruit|rumore|騒音|소음
noun|other|speech|演講|discurso|discours|discorso|スピーチ|연설
noun|other|advice|建議|consejo|conseil|consiglio|助言|조언
noun|other|discussion|討論|discusión|discussion|discussione|議論|토론
noun|objects|newspaper|報紙|periódico;diario|journal|giornale|新聞|신문
noun|objects|magazine|雜誌|revista|magazine|rivista|雑誌|잡지
noun|other|language exchange|語言交換|intercambio de idiomas|échange linguistique|scambio linguistico|言語交換|언어 교환
noun|other|topic|話題|tema|sujet|argomento|話題|화제
noun|other|feeling|感覺|sensación|sensation|sensazione|気持ち|느낌
noun|other|emotion|情緒;情感|emoción|émotion|emozione|感情|감정
noun|other|happiness|幸福|felicidad|bonheur|felicità|幸せ|행복
noun|other|sadness|悲傷|tristeza|tristesse|tristezza|悲しみ|슬픔
noun|other|fear|恐懼|miedo|peur|paura|恐怖|두려움
noun|other|anger|憤怒|enojo;enfado|colère|rabbia|怒り|분노
noun|other|stress|壓力|estrés|stress|stress|ストレス|스트레스
noun|other|surprise|驚喜|sorpresa|surprise|sorpresa|驚き|놀라움
noun|other|joy|喜悅|alegría|joie|gioia|喜び|기쁨
noun|other|luck|運氣|suerte|chance|fortuna|運|운
noun|other|memory|回憶|recuerdo|souvenir|ricordo|思い出|추억;기억
noun|other|experience|經驗|experiencia|expérience|esperienza|経験|경험
noun|other|opinion|意見;看法|opinión|avis;opinion|opinione|意見|의견
noun|other|reason|原因|razón;motivo|raison|motivo;ragione|理由|이유
noun|other|truth|真相|verdad|vérité|verità|真実|진실
noun|other|secret|秘密;祕密|secreto|secret|segreto|秘密|비밀
noun|other|chance|機會|oportunidad|occasion|occasione|機会|기회
noun|other|choice|選擇|elección|choix|scelta|選択|선택
noun|other|decision|決定|decisión|décision|decisione|決定|결정
noun|other|habit|習慣|hábito;costumbre|habitude|abitudine|習慣|습관
noun|other|mood|心情|humor|humeur|umore|気分|기분
noun|other|courage|勇氣|valentía;valor|courage|coraggio|勇気|용기
noun|other|patience|耐心|paciencia|patience|pazienza|忍耐|인내심
noun|other|interest|興趣|interés|intérêt|interesse|興味|관심
noun|other|thought|想法|pensamiento|pensée|pensiero|考え|생각
noun|other|respect|尊重|respeto|respect|rispetto|尊敬|존중
noun|other|friendship|友誼;友情|amistad|amitié|amicizia|友情|우정
noun|other|relationship|關係|relación|relation|rapporto|関係|관계
noun|other|success|成功|éxito|succès;réussite|successo|成功|성공
noun|other|failure|失敗|fracaso|échec|fallimento|失敗|실패
noun|other|effort|努力|esfuerzo|effort|sforzo|努力|노력
noun|other|fact|事實|hecho|fait|fatto|事実|사실
noun|other|difference|差別;差異|diferencia|différence|differenza|違い|차이
noun|other|situation|情況;狀況|situación|situation|situazione|状況|상황
noun|other|method|方法|método|méthode|metodo|方法|방법
noun|other|advantage|優點|ventaja|avantage|vantaggio|長所|장점
noun|other|disadvantage|缺點|desventaja|inconvénient|svantaggio|短所|단점
noun|other|progress|進步|progreso|progrès|progresso|進歩|발전
noun|other|talent|天分;天賦|talento|talent|talento|才能|재능
noun|other|culture|文化|cultura|culture|cultura|文化|문화
noun|other|art|藝術|arte|art|arte|芸術|예술
noun|other|music|音樂|música|musique|musica|音楽|음악
noun|other|movie;film|電影|película|film|film|映画|영화
noun|other|song|歌;歌曲|canción|chanson|canzone|歌|노래
noun|other|game|遊戲|juego|jeu|gioco|ゲーム|게임
noun|other|sport|運動|deporte|sport|sport|スポーツ|스포츠;운동
noun|other|party|派對|fiesta|fête|festa|パーティー|파티
noun|other|festival|節慶|festival|festival|festival|祭り|축제
noun|other|tradition|傳統|tradición|tradition|tradizione|伝統|전통
noun|other|politics|政治|política|politique|politica|政治|정치
noun|other|economy|經濟|economía|économie|economia|経済|경제
noun|other|society|社會|sociedad|société|società|社会|사회
noun|other|government|政府|gobierno|gouvernement|governo|政府|정부
noun|other|law|法律|ley|loi|legge|法律|법
noun|other|rule|規則;規定|regla;norma|règle|regola|規則|규칙
noun|other|freedom|自由|libertad|liberté|libertà|自由|자유
noun|other|peace|和平|paz|paix|pace|平和|평화
noun|other|war|戰爭|guerra|guerre|guerra|戦争|전쟁
noun|other|education|教育|educación|éducation|istruzione|教育|교육
noun|other|religion|宗教|religión|religion|religione|宗教|종교
noun|other|literature|文學|literatura|littérature|letteratura|文学|문학
noun|other|poem|詩|poema|poème|poesia|詩|시
noun|other|novel|小說|novela|roman|romanzo|小説|소설
noun|other|character|角色|personaje|personnage|personaggio|登場人物|등장인물
noun|other|series|影集|serie|série|serie|ドラマ|드라마
noun|other|TV show|電視節目|programa de televisión|émission de télévision|programma televisivo|テレビ番組|텔레비전 프로그램
noun|other|hobby|興趣;嗜好|pasatiempo;afición|passe-temps;loisir|hobby;passatempo|趣味|취미
noun|other|reading|閱讀|lectura|lecture|lettura|読書|독서
noun|other|soccer;football|足球|fútbol;futbol|football;foot|calcio|サッカー|축구
noun|other|tennis|網球|tenis|tennis|tennis|テニス|테니스
noun|other|swimming|游泳|natación|natation|nuoto|水泳|수영
noun|other|running|跑步|correr|course à pied|corsa|ランニング|달리기
noun|other|yoga|瑜伽;瑜珈|yoga|yoga|yoga|ヨガ|요가
noun|other|competition|比賽|competición;competencia|compétition|gara;competizione|試合|시합;대회
noun|people|player|選手|jugador;jugadora|joueur;joueuse|giocatore;giocatrice|選手|선수
noun|people|champion|冠軍|campeón;campeona|champion;championne|campione;campionessa|チャンピオン|챔피언
noun|other|badminton|羽球;羽毛球|bádminton|badminton|badminton|バドミントン|배드민턴
noun|other|table tennis;ping-pong|桌球;乒乓球|tenis de mesa;ping-pong|tennis de table;ping-pong|ping-pong;tennis da tavolo|卓球|탁구
noun|other|golf|高爾夫球;高爾夫|golf|golf|golf|ゴルフ|골프
noun|other|hiking|健行|senderismo|randonnée|escursionismo;trekking|ハイキング|하이킹
noun|other|cooking|烹飪|cocina|cuisine|cucina|料理（すること）|요리
noun|other|gardening|園藝|jardinería|jardinage|giardinaggio|ガーデニング|원예
noun|other|fishing|釣魚|pesca|pêche|pesca|釣り|낚시
noun|other|chess|西洋棋|ajedrez|échecs|scacchi|チェス|체스
noun|other|board game|桌遊|juego de mesa|jeu de société|gioco da tavolo|ボードゲーム|보드게임
noun|other|Olympics;Olympic Games|奧運|Juegos Olímpicos|Jeux olympiques|Olimpiadi|オリンピック|올림픽
noun|other|concert|演唱會|concierto|concert|concerto|コンサート|콘서트
noun|other|exhibition|展覽|exposición|exposition|mostra|展覧会|전시회
noun|other|painting|繪畫|pintura|peinture|pittura|絵画|그림
noun|objects|drawing|畫;圖畫|dibujo|dessin|disegno|絵|그림
noun|other|photography|攝影|fotografía|photographie|fotografia|写真撮影|사진 촬영
noun|other|opera|歌劇|ópera|opéra|opera|オペラ|오페라
noun|objects|instrument|樂器|instrumento|instrument|strumento|楽器|악기
noun|other|band|樂團|grupo;banda|groupe|gruppo;band|バンド|밴드
phrase|other|even if|即使|aunque|même si|anche se|たとえ～でも|비록 ~라도
phrase|other|for example|例如|por ejemplo|par exemple|per esempio|たとえば|예를 들어
phrase|other|in fact|事實上|de hecho|en fait|infatti|実際に|사실
phrase|other|at least|至少|al menos|au moins|almeno|少なくとも|적어도
phrase|other|at first|一開始|al principio|au début|all'inizio|最初は|처음에는
phrase|other|so far|到目前為止|hasta ahora|jusqu'à présent|finora|今までのところ|지금까지
other|other|ago|…前|hace|il y a|fa|～前|~ 전
other|other|forever|永遠|para siempre|pour toujours|per sempre|永遠に|영원히
other|other|finally|終於|por fin|enfin|finalmente|ついに|드디어;마침내
other|other|suddenly|突然|de repente|soudain|all'improvviso|突然|갑자기
other|other|perhaps|也許;或許|quizás;tal vez|peut-être|forse|もしかしたら|어쩌면
other|other|exactly|正好|exactamente|exactement|esattamente|ちょうど|정확히
other|other|immediately|立即|inmediatamente|immédiatement|immediatamente|ただちに|즉시
other|other|completely|完全|completamente|complètement|completamente|完全に|완전히
other|other|absolutely|絕對|absolutamente|absolument|assolutamente|絶対に|절대적으로
other|other|obviously|顯然|obviamente|évidemment|ovviamente|明らかに|분명히
other|other|clearly|清楚地|claramente|clairement|chiaramente|はっきりと|명확하게
other|other|currently|目前|actualmente|actuellement|attualmente|現在|현재
other|other|directly|直接|directamente|directement|direttamente|直接|직접
other|other|eventually|最終|al final|finalement|alla fine|最終的に|결국
other|other|nearly|幾乎|casi|presque|quasi|ほぼ|거의
other|other|quite|相當|bastante|assez|abbastanza|かなり|꽤
other|other|simply|單純|simplemente|simplement|semplicemente|単に|단순히
other|other|mainly|主要|principalmente|principalement|principalmente|主に|주로
other|other|gradually|逐漸|gradualmente|progressivement|gradualmente|だんだん|점점
other|other|slightly|稍微|ligeramente|légèrement|leggermente|少し|약간
other|other|relatively|相對地|relativamente|relativement|relativamente|比較的|비교적
other|other|apparently|看來|al parecer|apparemment|a quanto pare|どうやら|보아하니
other|other|seriously|認真地|en serio|sérieusement|seriamente|真剣に|진지하게
other|other|hardly|幾乎不|apenas|à peine|a malapena|ほとんど～ない|거의 ~ 않다
other|other|therefore|因此|por lo tanto|donc|quindi|したがって|따라서
other|other|unless|除非|a menos que|à moins que|a meno che|～しない限り|~하지 않는 한
other|other|whether|是否|si|si|se|～かどうか|~인지 아닌지
other|other|whereas|而|mientras que|alors que|mentre|一方|반면
other|other|meanwhile|與此同時|mientras tanto|pendant ce temps|nel frattempo|その間に|그동안
other|other|nevertheless|儘管如此|no obstante|néanmoins|ciononostante|それでも|그럼에도 불구하고
phrase|other|instead of|而不是|en lugar de|au lieu de|invece di|～の代わりに|~ 대신에
phrase|other|because of|因為|a causa de|à cause de|a causa di|～のせいで|~ 때문에
phrase|other|according to|根據|según|selon|secondo|～によると|~에 따르면
phrase|other|thanks to|多虧|gracias a|grâce à|grazie a|～のおかげで|~ 덕분에
other|other|unlike|不像|a diferencia de|contrairement à|a differenza di|～と違って|~와 달리
other|other|beyond|超出|más allá de|au-delà de|oltre|～を越えて|~을 넘어
other|other|along|沿著|a lo largo de|le long de|lungo|～に沿って|~을 따라
phrase|other|as well as|以及|así como|ainsi que|così come|～も同様に|~뿐만 아니라
phrase|other|so that|以便|para que|pour que|affinché|～するように|~하도록
phrase|other|in order to|為了|con el fin de|afin de|al fine di|～するために|~하기 위해
phrase|other|such as|像是|como|comme|come|～のような|~ 같은
phrase|other|as if|好像|como si|comme si|come se|まるで～のように|마치 ~처럼
phrase|other|as long as|只要|siempre que|tant que|purché|～さえすれば|~하기만 하면
phrase|other|now that|既然|ahora que|maintenant que|ora che|～した以上|~한 이상
phrase|other|in addition|此外|además|en plus|inoltre|さらに|게다가
phrase|other|on the other hand|另一方面|por otro lado|d'un autre côté|d'altra parte|一方で|다른 한편으로
phrase|other|in other words|換句話說|en otras palabras|autrement dit|in altre parole|言い換えれば|다시 말해
phrase|other|after all|畢竟|después de todo|après tout|dopotutto|結局|결국
phrase|other|at the same time|同時|al mismo tiempo|en même temps|allo stesso tempo|同時に|동시에
phrase|other|at the moment|目前;現在|en este momento|en ce moment|in questo momento|今のところ|지금은
phrase|other|from now on|從現在起|de ahora en adelante|à partir de maintenant|d'ora in poi|これからは|앞으로는
phrase|other|from today on|從今天起|a partir de hoy|à partir d'aujourd'hui|da oggi in poi|今日から|오늘부터
phrase|other|once more|再一次|una vez más|encore une fois|ancora una volta|もう一度|한 번 더
phrase|other|more or less|大致上|más o menos|plus ou moins|più o meno|多かれ少なかれ|대체로
phrase|other|every time|每次|cada vez|chaque fois|ogni volta|毎回|매번
phrase|other|like this|像這樣|así|comme ça|così|このように|이렇게
phrase|other|on time|準時|a tiempo|à l'heure|in orario|時間どおりに|제시간에
phrase|other|in advance|提前|con antelación|à l'avance|in anticipo|前もって|미리
phrase|other|in a hurry|趕時間|con prisa|pressé;pressée|di fretta|急いで|급하게
phrase|other|for a while|一陣子|durante un rato|pendant un moment|per un po'|しばらく|한동안
phrase|other|as usual|照常|como siempre|comme d'habitude|come al solito|いつもどおり|평소처럼
phrase|other|by heart|背起來|de memoria|par cœur|a memoria|暗記して|외워서
phrase|other|by mistake|不小心|por error|par erreur|per errore|うっかり|실수로
phrase|other|on purpose|故意|a propósito;adrede|exprès|apposta|わざと|일부러
phrase|other|by the way|順帶一提;順便一提|por cierto|au fait|a proposito|ところで|그런데
phrase|other|as soon as possible|盡快|lo antes posible|dès que possible|il prima possibile|できるだけ早く|최대한 빨리
phrase|other|it depends|看情況|depende|ça dépend|dipende|場合による|상황에 따라 달라요
phrase|other|never mind|算了|olvídalo|laisse tomber|lascia stare|気にしないで|신경 쓰지 마
phrase|other|not at all|一點也不|para nada|pas du tout|per niente|全然|전혀
phrase|other|not bad|不錯|nada mal|pas mal|niente male|悪くない|나쁘지 않아
phrase|other|take your time|慢慢來|tómate tu tiempo|prends ton temps|prenditi il tuo tempo|ゆっくりでいいよ|천천히 해
phrase|other|no doubt|毫無疑問|sin duda|sans aucun doute|senza dubbio|間違いなく|틀림없이
phrase|other|no wonder|難怪|con razón|pas étonnant|non c'è da stupirsi|道理で|어쩐지
phrase|other|out of order|故障|fuera de servicio|en panne|fuori servizio|故障中|고장
phrase|other|just in case|以防萬一|por si acaso|au cas où|per ogni evenienza|念のため|만일을 위해
phrase|other|up to you|由你決定|tú decides|c'est à toi de voir|decidi tu|あなた次第|네가 정해
phrase|other|that's all|就這樣|eso es todo|c'est tout|è tutto|以上です|그게 다예요
phrase|other|that's right|沒錯|así es|c'est ça|esatto|その通り|맞아요
phrase|other|that makes sense|有道理|tiene sentido|c'est logique|ha senso|なるほど|일리가 있네요
phrase|other|you're right|你說得對|tienes razón|tu as raison|hai ragione|あなたの言う通り|네 말이 맞아
phrase|other|I agree|我同意|estoy de acuerdo|je suis d'accord|sono d'accordo|賛成です|동의해요
phrase|other|good idea|好主意|buena idea|bonne idée|buona idea|いい考え|좋은 생각
phrase|other|what happened|發生什麼事了|qué pasó|que s'est-il passé|cosa è successo|何があったの|무슨 일이 있었어요
phrase|other|what's wrong|怎麼了|qué pasa|qu'est-ce qu'il y a|che c'è|どうしたの|무슨 일이야
phrase|other|what a pity|真可惜|qué lástima|quel dommage|che peccato|残念|아쉽다
phrase|other|I'm sorry|我很抱歉|lo siento|je suis désolé;je suis désolée|mi dispiace|申し訳ありません|죄송해요
phrase|other|I think so|我想是吧|creo que sí|je pense que oui|penso di sì|そう思う|그런 것 같아요
phrase|other|I hope so|希望如此|eso espero|je l'espère|spero di sì|そうだといいね|그러면 좋겠어요
phrase|other|I don't think so|我不覺得|no lo creo|je ne pense pas|non credo|そうは思わない|그렇게 생각하지 않아요
phrase|other|give me|給我|dame|donne-moi|dammi|ちょうだい|줘
phrase|other|I love you|我愛你|te quiero;te amo|je t'aime|ti amo|愛してる|사랑해
phrase|other|I miss you|我想你|te extraño;te echo de menos|tu me manques|mi manchi|会いたい|보고 싶어
phrase|other|look at me|看我|mírame|regarde-moi|guardami|私を見て|나를 봐
phrase|other|keep me posted|隨時讓我知道|mantenme al tanto|tiens-moi au courant|tienimi aggiornato|随時知らせてね|계속 알려 줘
other|other|both|兩者都|ambos;ambas|les deux|entrambi;entrambe|両方|둘 다
other|other|most|大部分|la mayoría|la plupart|la maggior parte|ほとんどの|대부분
other|other|none|一個也沒有|ninguno;ninguna|aucun;aucune|nessuno;nessuna|一つもない|하나도 없다
other|other|any|任何|cualquier|n'importe quel;n'importe quelle|qualsiasi|どんな～でも|어떤
other|other|such|這樣的|tal|tel;telle|tale|そのような|그런
phrase|other|each other|互相|el uno al otro|l'un l'autre|a vicenda|お互い|서로
other|other|anyone|任何人|cualquiera|n'importe qui|chiunque|誰でも|누구든지
other|other|anything|任何東西|cualquier cosa|n'importe quoi|qualsiasi cosa|何でも|무엇이든
other|other|anywhere|任何地方|en cualquier lugar|n'importe où|ovunque|どこでも|어디든지
other|other|nowhere|哪裡都沒有|en ninguna parte|nulle part|da nessuna parte|どこにも～ない|아무 데도
other|other|twice|兩次|dos veces|deux fois|due volte|二回|두 번
phrase|other|a bit of|一些|un poco de|un peu de|un po' di|少しの|약간의
noun|other|percentage|百分比|porcentaje|pourcentage|percentuale|パーセンテージ|백분율
noun|other|amount|數量|cantidad|quantité|quantità|量|양
noun|other|average|平均|promedio;media|moyenne|media|平均|평균
noun|other|maximum|最大值|máximo|maximum|massimo|最大|최대
noun|other|minimum|最小值|mínimo|minimum|minimo|最小|최소
noun|other|quarter|四分之一|cuarto|quart|quarto|四分の一|사분의 일
noun|other|pair|一對|par|paire|paio|ペア|쌍
verb|actions|consider|考慮|considerar|considérer|considerare|考慮する|고려하다
verb|actions|attract|吸引|atraer|attirer|attrarre|引きつける|끌다
verb|actions|assume|假設|suponer|supposer|supporre|仮定する|가정하다
verb|actions|achieve|達成|lograr|atteindre|raggiungere|達成する|달성하다
verb|actions|deserve|應得|merecer|mériter|meritare|値する|받을 만하다
verb|actions|detect|偵測|detectar|détecter|rilevare|検知する|감지하다
verb|actions|increase|增加|aumentar|augmenter|aumentare|増える|증가하다
verb|actions|reduce|降低|reducir|réduire|ridurre|減らす|줄이다
verb|actions|decrease|減少|disminuir|diminuer|diminuire|減る|감소하다
verb|actions|reveal|透露|revelar|révéler|rivelare|明かす|드러내다
verb|actions|prevent|防止|prevenir|empêcher|prevenire|防ぐ|막다
verb|actions|replace|取代|reemplazar|remplacer|sostituire|取り替える|대체하다
verb|actions|identify|辨識|identificar|identifier|identificare|特定する|식별하다
verb|actions|affect|影響|afectar|affecter|influenzare|影響する|영향을 주다
verb|actions|appreciate|欣賞|apreciar|apprécier|apprezzare|ありがたく思う|감상하다;고마워하다
verb|actions|arrange|安排|organizar|organiser|organizzare|手配する|준비하다;정리하다
verb|actions|attend|出席|asistir a|assister à|partecipare a|出席する|참석하다
verb|actions|belong|屬於|pertenecer|appartenir|appartenere|属する|속하다
verb|actions|cause|造成|causar|causer|causare|引き起こす|일으키다
verb|actions|combine|結合|combinar|combiner|combinare|組み合わせる|결합하다
verb|actions|connect|連接|conectar|connecter|collegare|つなぐ|연결하다
verb|actions|contain|含有|contener|contenir|contenere|含む|함유하다
verb|actions|convince|說服|convencer|convaincre|convincere|納得させる|설득하다
verb|actions|cover|覆蓋|cubrir|couvrir|coprire|覆う|덮다
verb|actions|depend|取決於|depender|dépendre|dipendere|～次第である|~에 달려 있다
verb|actions|deliver|送達|entregar|livrer|consegnare|届ける|배달하다
verb|actions|develop|發展|desarrollar|développer|sviluppare|発展させる|발전시키다
verb|actions|disturb|打擾|molestar|déranger|disturbare|邪魔する|방해하다
verb|actions|doubt|懷疑|dudar|douter|dubitare|疑う|의심하다
verb|actions|encourage|鼓勵|animar|encourager|incoraggiare|励ます|격려하다
verb|actions|ensure|確保|garantizar|garantir|garantire|保証する|보장하다
verb|actions|make sure|確認|asegurarse|s'assurer|assicurarsi|確かめる|확인하다
verb|actions|expect|預期|esperar|s'attendre à|aspettarsi|期待する|기대하다
verb|actions|express|表達|expresar|exprimer|esprimere|表現する|표현하다
verb|actions|focus|專注|concentrarse|se concentrer|concentrarsi|集中する|집중하다
verb|actions|handle|處理|manejar|gérer|gestire|扱う|다루다
verb|actions|ignore|忽略|ignorar|ignorer|ignorare|無視する|무시하다
verb|actions|insist|堅持|insistir|insister|insistere|言い張る|고집하다
verb|actions|own|擁有|poseer|posséder|possedere|所有する|소유하다
verb|actions|pretend|假裝|fingir|faire semblant|fingere|ふりをする|~인 척하다
verb|actions|produce|生產|producir|produire|produrre|生産する|생산하다
verb|actions|provide|提供|proporcionar|fournir|fornire|提供する|제공하다
verb|actions|separate|分開|separar|séparer|separare|分ける|나누다
verb|actions|survive|存活|sobrevivir|survivre|sopravvivere|生き残る|살아남다
verb|actions|treat|對待|tratar|traiter|trattare|扱う（人を）|대하다
verb|actions|wonder|想知道|preguntarse|se demander|chiedersi|～かと思う|궁금해하다
verb|actions|overcome|克服|superar|surmonter|superare|克服する|극복하다
verb|actions|afford|負擔得起|permitirse|se permettre|permettersi|余裕がある|여유가 있다
verb|actions|prove|證明|demostrar|prouver|dimostrare|証明する|증명하다
verb|actions|admit|承認|admitir|admettre|ammettere|認める|인정하다
verb|actions|remove|移除|quitar|enlever|rimuovere|取り除く|제거하다
verb|actions|escape|逃脫|escapar|s'échapper|scappare|逃げる|탈출하다
verb|actions|exceed|超過|exceder|dépasser|superare|超える|초과하다
verb|actions|mislead|誤導|inducir a error|induire en erreur|fuorviare|誤解させる|오해하게 하다
verb|actions|neglect|忽視|descuidar|négliger|trascurare|怠る|소홀히 하다
verb|actions|manipulate|操縱|manipular|manipuler|manipolare|操る|조종하다
verb|actions|prioritize|優先考慮|priorizar|prioriser|dare priorità|優先する|우선시하다
verb|actions|retrieve|取回|recuperar|récupérer|recuperare|取り戻す|되찾다
verb|actions|strive|努力|esforzarse|s'efforcer|sforzarsi|努める|노력하다
verb|actions|tackle|應對|abordar|s'attaquer à|affrontare|取り組む|대처하다
verb|actions|unfold|展開|desarrollarse|se dérouler|svolgersi|展開する|펼쳐지다
verb|actions|coordinate|協調|coordinar|coordonner|coordinare|調整する|조정하다
verb|actions|reverse|逆轉|invertir|inverser|invertire|逆転させる|뒤집다
verb|actions|spread|擴散|propagarse|se propager|diffondersi|広がる|퍼지다
verb|actions|give up|放棄|rendirse|abandonner|arrendersi|あきらめる|포기하다
verb|actions|look forward to|期待|esperar con ansias;esperar con ilusión|avoir hâte de|non vedere l'ora di|楽しみにする|기대하다
verb|actions|get used to|習慣|acostumbrarse|s'habituer|abituarsi|慣れる|익숙해지다
verb|actions|hurry up|趕快|darse prisa;apurarse|se dépêcher|sbrigarsi|急ぐ|서두르다
verb|actions|take place|舉行|tener lugar|avoir lieu|avere luogo|行われる|열리다
verb|actions|run out of|用完|quedarse sin|être à court de|rimanere senza|使い果たす|다 써 버리다
verb|actions|keep in touch|保持聯絡|mantenerse en contacto|rester en contact|restare in contatto|連絡を取り合う|연락하고 지내다
verb|actions|take the initiative|採取主動|tomar la iniciativa|prendre l'initiative|prendere l'iniziativa|率先する|주도하다
verb|actions|go all out|全力以赴|darlo todo|tout donner|dare tutto|全力を尽くす|최선을 다하다
verb|actions|pick up|撿起來|recoger|ramasser|raccogliere|拾う|줍다
adjective|other|accurate|準確|preciso;precisa|précis;précise|accurato;accurata|正確な|정확하다
adjective|other|enormous|龐大|enorme|énorme|enorme|莫大な|막대하다
adjective|other|critical|關鍵|crítico;crítica|critique|critico;critica|決定的な|결정적이다
adjective|other|obvious|明顯|obvio;obvia|évident;évidente|ovvio;ovvia|明白な|명백하다
adjective|other|unusual|不尋常|inusual|inhabituel;inhabituelle|insolito;insolita|珍しい|드물다
adjective|other|available|可用|disponible|disponible|disponibile|利用できる|이용할 수 있다
adjective|other|essential|不可或缺|esencial|essentiel;essentielle|essenziale|不可欠な|필수적이다
adjective|other|excessive|過度|excesivo;excesiva|excessif;excessive|eccessivo;eccessiva|過度の|과도하다
adjective|other|exclusive|專屬|exclusivo;exclusiva|exclusif;exclusive|esclusivo;esclusiva|独占的な|독점적이다
adjective|other|extensive|廣泛|extenso;extensa|étendu;étendue|esteso;estesa|広範な|광범위하다
adjective|other|instant|即時|instantáneo;instantánea|instantané;instantanée|istantaneo;istantanea|即座の|즉각적이다
adjective|other|intense|強烈|intenso;intensa|intense|intenso;intensa|強烈な|강렬하다
adjective|other|relevant|相關|relevante|pertinent;pertinente|rilevante|関連のある|관련 있다
adjective|other|severe|嚴重|grave|grave|grave|深刻な|심각하다
adjective|other|successful|成功|exitoso;exitosa|réussi;réussie|riuscito;riuscita|成功した|성공적이다
adjective|other|temporary|暫時|temporal|temporaire|temporaneo;temporanea|一時的な|일시적이다
adjective|other|positive|正面|positivo;positiva|positif;positive|positivo;positiva|前向きな|긍정적이다
adjective|other|compatible|相容|compatible|compatible|compatibile|互換性のある|호환되다
adjective|other|inevitable|不可避免|inevitable|inévitable|inevitabile|避けられない|불가피하다
adjective|other|preliminary|初步|preliminar|préliminaire|preliminare|予備的な|예비적이다
adjective|other|deliberate|故意|deliberado;deliberada|délibéré;délibérée|deliberato;deliberata|意図的な|의도적이다
adjective|other|urgent|緊急|urgente|urgent;urgente|urgente|緊急の|긴급하다
adjective|other|harmless|無害|inofensivo;inofensiva|inoffensif;inoffensive|innocuo;innocua|無害な|무해하다
adjective|other|lasting|持久|duradero;duradera|durable|duraturo;duratura|長続きする|지속적이다
adjective|other|accidental|意外|accidental|accidentel;accidentelle|accidentale|偶然の|우연하다
adjective|other|professional|專業|profesional|professionnel;professionnelle|professionale|専門的な|전문적이다
adjective|other|fundamental|根本|fundamental|fondamental;fondamentale|fondamentale|根本的な|근본적이다
noun|other|thing|東西|cosa|chose|cosa|もの|것;물건
noun|other|way|方式|manera|façon|modo|やり方|방식
noun|other|purpose|目的|propósito|but|scopo|目的|목적
noun|other|condition|條件|condición|condition|condizione|条件|조건
noun|other|factor|因素|factor|facteur|fattore|要因|요인
noun|other|effect|效果|efecto|effet|effetto|効果|효과
noun|other|attitude|態度|actitud|attitude|atteggiamento|態度|태도
noun|other|challenge|挑戰|desafío;reto|défi|sfida|挑戦|도전
noun|other|circumstance|情況;情形|circunstancia|circonstance|circostanza|事情|사정
noun|other|connection|關聯|conexión|lien|connessione|つながり|연관
noun|other|consequence|後果|consecuencia|conséquence|conseguenza|結果|결과
noun|other|detail|細節|detalle|détail|dettaglio|細部|세부 사항
noun|other|function|功能|función|fonction|funzione|機能|기능
noun|other|priority|優先事項|prioridad|priorité|priorità|優先事項|우선순위
noun|other|phenomenon|現象|fenómeno|phénomène|fenomeno|現象|현상
noun|other|barrier|障礙|barrera|barrière|barriera|障壁|장벽
noun|other|obstacle|阻礙|obstáculo|obstacle|ostacolo|障害|장애물
noun|other|alternative|替代方案|alternativa|alternative|alternativa|代替案|대안
noun|other|approach|做法|enfoque|approche|approccio|取り組み方|접근법
noun|other|technique|技巧|técnica|technique|tecnica|技術|기술
noun|other|benefit|好處|beneficio|avantage|beneficio|利点|이점
noun|other|risk|風險|riesgo|risque|rischio|リスク|위험
noun|other|role|角色|papel;rol|rôle|ruolo|役割|역할
noun|other|source|來源|fuente|source|fonte|出典|출처
noun|other|scene|場景|escena|scène|scena|場面|장면
noun|other|mystery|謎團|misterio|mystère|mistero|謎|수수께끼
noun|other|origin|起源|origen|origine|origine|起源|기원
noun|other|efficiency|效率|eficiencia|efficacité|efficienza|効率|효율
noun|other|routine|例行公事|rutina|routine|routine|日課|일과
noun|other|to-do list|待辦事項|lista de tareas|liste de tâches|lista di cose da fare|やることリスト|할 일 목록
noun|other|survey|問卷調查|encuesta|enquête|sondaggio|アンケート調査|설문 조사
noun|other|rhythm|節奏|ritmo|rythme|ritmo|リズム|리듬
noun|other|spirit|精神|espíritu|esprit|spirito|精神|정신
noun|other|discipline|紀律|disciplina|discipline|disciplina|規律|규율
noun|other|clue|線索|pista|indice|indizio|手がかり|단서
noun|other|guideline|指引|directriz|directive|linea guida|指針|지침
noun|other|preposition|介系詞;介詞|preposición|préposition|preposizione|前置詞|전치사
noun|other|note|筆記|nota|note|nota|メモ|메모
noun|other|assumption|假設|suposición|supposition|supposizione|仮定|가정
noun|other|component|元件|componente|composant|componente|部品|부품
noun|people|employer|雇主|empleador;empleadora|employeur|datore di lavoro;datrice di lavoro|雇用主|고용주
noun|other|career|職涯|carrera profesional;carrera|carrière|carriera|キャリア|경력
noun|other|profession|職業|profesión|profession|professione|職業|직업
noun|other|unemployment|失業|desempleo;paro|chômage|disoccupazione|失業|실업
noun|other|promotion|升遷;升職|ascenso|promotion|promozione|昇進|승진
noun|other|bonus|獎金|bono;bonificación|prime;bonus|bonus|ボーナス|보너스
noun|other|wage|工資;薪資|salario;sueldo|salaire|paga;salario|賃金|임금
noun|other|minimum wage|最低工資;基本工資|salario mínimo|salaire minimum|salario minimo|最低賃金|최저 임금
noun|other|overtime|加班|horas extra;horas extras|heures supplémentaires|straordinario|残業|야근
phrase|other|work overtime|加班|hacer horas extra|faire des heures supplémentaires|fare gli straordinari|残業する|야근하다
adjective|other|full-time|全職|a tiempo completo|à temps plein|a tempo pieno|正社員|정규직
adjective|other|part-time|兼職|a tiempo parcial|à temps partiel|part-time;a tempo parziale|アルバイト|아르바이트
verb|actions|hire|僱用;雇用|contratar|embaucher|assumere|雇う|고용하다
verb|actions|recruit|招募|reclutar|recruter|reclutare|募集する|모집하다
verb|actions|lay off|裁員|despedir|licencier|licenziare|解雇する|해고하다
phrase|other|get fired|被解僱;被開除|ser despedido;ser despedida|être licencié;être licenciée|essere licenziato;essere licenziata|クビになる|해고당하다
noun|other|job opening|職缺|oferta de empleo;vacante|offre d'emploi|offerta di lavoro|求人|채용 공고
noun|other|job interview|面試|entrevista de trabajo|entretien d'embauche|colloquio di lavoro|就職面接|취업 면접
noun|other|cover letter|求職信|carta de presentación|lettre de motivation|lettera di presentazione|カバーレター|자기소개서
phrase|other|apply for a job|應徵工作|solicitar un empleo|postuler à un emploi|candidarsi per un posto|仕事に応募する|일자리에 지원하다
noun|other|work experience|工作經驗|experiencia laboral|expérience professionnelle|esperienza lavorativa|職歴|경력
noun|other|workplace|職場|lugar de trabajo|lieu de travail|luogo di lavoro|職場|직장
noun|other|working hours|工作時間;工時|horario laboral;horario de trabajo|horaires de travail;heures de travail|orario di lavoro|勤務時間|근무 시간
noun|other|day off|休假|día libre|jour de congé|giorno libero|休みの日|쉬는 날
noun|other|sick leave|病假|baja por enfermedad;baja médica|congé maladie|congedo per malattia|病気休暇|병가
noun|other|maternity leave|產假|baja por maternidad;licencia por maternidad|congé maternité|congedo di maternità|産休|출산 휴가
noun|other|lunch break|午休|pausa para comer;pausa del almuerzo|pause déjeuner|pausa pranzo|昼休み|점심시간
noun|other|night shift|夜班|turno de noche|équipe de nuit|turno di notte|夜勤|야간 근무
noun|other|commute|通勤|trayecto al trabajo;desplazamiento al trabajo|trajet domicile-travail|tragitto casa-lavoro|通勤|통근
phrase|other|work from home|在家工作|trabajar desde casa|télétravailler|lavorare da casa|在宅勤務する|재택근무하다
noun|other|remote work|遠距工作|teletrabajo|télétravail|smart working;lavoro da remoto|リモートワーク|원격 근무
noun|other|training|培訓|formación;capacitación|formation|formazione|研修|교육;연수
noun|people|intern|實習生|becario;becaria;pasante|stagiaire|stagista;tirocinante|インターン|인턴
noun|people|apprentice|學徒|aprendiz;aprendiza|apprenti;apprentie|apprendista|見習い|견습생
noun|people|freelancer|自由工作者|autónomo;autónoma;freelance|indépendant;indépendante;freelance|libero professionista;libera professionista;freelance|フリーランサー|프리랜서
noun|people|consultant|顧問|consultor;consultora|consultant;consultante|consulente|コンサルタント|컨설턴트
noun|people|assistant|助理|asistente|assistant;assistante|assistente|アシスタント|조수
noun|people|expert|專家|experto;experta|expert;experte|esperto;esperta|専門家|전문가
noun|people|entrepreneur|創業家;企業家|emprendedor;emprendedora|entrepreneur;entrepreneuse|imprenditore;imprenditrice|起業家|창업가
noun|people|contractor|承包商|contratista|entrepreneur|appaltatore;appaltatrice|請負業者|하청업체
noun|people|supplier|供應商|proveedor;proveedora|fournisseur|fornitore;fornitrice|供給業者|공급업체
noun|people|investor|投資人;投資者|inversor;inversora;inversionista|investisseur;investisseuse|investitore;investitrice|投資家|투자자
noun|people|shareholder|股東|accionista|actionnaire|azionista|株主|주주
noun|people|founder|創辦人|fundador;fundadora|fondateur;fondatrice|fondatore;fondatrice|創業者|창업자
noun|people|buyer|買家|comprador;compradora|acheteur;acheteuse|compratore;compratrice;acquirente|買い手|구매자
noun|people|seller|賣家|vendedor;vendedora|vendeur;vendeuse|venditore;venditrice|売り手|판매자
noun|people|competitor|競爭對手|competidor;competidora|concurrent;concurrente|concorrente|競争相手|경쟁자
noun|people|consumer|消費者|consumidor;consumidora|consommateur;consommatrice|consumatore;consumatrice|消費者|소비자
noun|other|profit|利潤|beneficio;ganancia|bénéfice|profitto;utile|利益|이익
noun|other|loss|虧損|pérdida|perte|perdita|損失|손실
noun|other|investment|投資|inversión|investissement|investimento|投資|투자
verb|actions|invest|投資|invertir|investir|investire|投資する|투자하다
noun|other|stock market|股市|bolsa de valores;bolsa|bourse|borsa|株式市場|주식 시장
noun|other|fund|基金|fondo|fonds|fondo|ファンド|펀드
noun|other|bankruptcy|破產|quiebra;bancarrota|faillite|fallimento|倒産|파산
noun|other|turnover|營業額|facturación|chiffre d'affaires|fatturato|売上高|매출액
noun|other|earnings|收益|ganancias|revenus;gains|guadagni|収益|수익
noun|other|market share|市佔率;市占率|cuota de mercado|part de marché|quota di mercato|市場シェア|시장 점유율
noun|other|growth|成長|crecimiento|croissance|crescita|成長|성장
noun|other|recession|經濟衰退|recesión|récession|recessione|景気後退|경기 침체
noun|other|inflation|通貨膨脹;通膨|inflación|inflation|inflazione|インフレ|인플레이션
noun|other|deficit|赤字|déficit|déficit|deficit|赤字|적자
noun|other|surplus|盈餘;剩餘|excedente;superávit|excédent|eccedenza;surplus|黒字|흑자
noun|other|demand|需求|demanda|demande|domanda|需要|수요
phrase|other|supply and demand|供需|oferta y demanda|offre et demande|domanda e offerta|需給|수요와 공급
noun|other|monopoly|壟斷|monopolio|monopole|monopolio|独占|독점
noun|other|trade|貿易|comercio|commerce|commercio|貿易|무역
noun|other|export|出口|exportación|exportation;export|esportazione;export|輸出|수출
noun|other|import|進口|importación|importation;import|importazione;import|輸入|수입
noun|other|tariff|關稅|arancel|droit de douane|dazio|関税|관세
noun|other|industry|產業|industria|industrie|industria|産業|산업
adjective|other|economic|經濟的|económico;económica|économique|economico;economica|経済の|경제적
adjective|other|financial|財務的|financiero;financiera|financier;financière|finanziario;finanziaria|財務の|재정적
noun|other|wealth|財富|riqueza|richesse|ricchezza|富|부
noun|other|cost of living|生活成本|costo de vida;coste de la vida|coût de la vie|costo della vita|生活費|생활비
noun|other|price increase|漲價|subida de precios;aumento de precios|hausse des prix|aumento dei prezzi|値上げ|가격 인상
noun|other|cost|成本|costo;coste|coût|costo|費用|비용
noun|other|fee|費用|tarifa;cuota|frais|tariffa;quota|料金|요금
noun|other|value|價值|valor|valeur|valore|価値|가치
noun|other|total|總額;總計|total|total|totale|合計|합계
noun|other|balance|餘額|saldo|solde|saldo|残高|잔액
noun|other|bank statement|銀行對帳單|extracto bancario|relevé bancaire|estratto conto|銀行明細書|은행 거래 내역서
noun|other|account number|帳號|número de cuenta|numéro de compte|numero di conto|口座番号|계좌 번호
noun|other|bank transfer|轉帳;匯款|transferencia bancaria|virement bancaire|bonifico bancario|振り込み|계좌 이체
noun|other|savings account|儲蓄帳戶|cuenta de ahorros;cuenta de ahorro|compte d'épargne|conto di risparmio|普通預金口座|예금 계좌
noun|other|current account|活期帳戶|cuenta corriente|compte courant|conto corrente|当座預金口座|당좌 예금
noun|objects|debit card|金融卡;簽帳金融卡|tarjeta de débito|carte de débit|carta di debito|デビットカード|체크카드
noun|objects|cheque|支票|cheque|chèque|assegno|小切手|수표
verb|actions|deposit|存錢|depositar;ingresar|déposer|versare;depositare|預金する|입금하다
verb|actions|withdraw|領錢;提款|retirar|retirer|prelevare|引き出す|출금하다
noun|other|security deposit|押金|fianza;depósito|caution;dépôt de garantie|cauzione|敷金|보증금
noun|other|mortgage|房貸|hipoteca|prêt immobilier|mutuo|住宅ローン|주택 담보 대출
noun|other|insurance|保險|seguro|assurance|assicurazione|保険|보험
noun|other|pension|退休金|pensión;jubilación|retraite|pensione|年金|연금
noun|other|income tax|所得稅|impuesto sobre la renta|impôt sur le revenu|imposta sul reddito|所得税|소득세
noun|other|tax return|報稅|declaración de impuestos;declaración de la renta|déclaration d'impôts;déclaration de revenus|dichiarazione dei redditi|確定申告|세금 신고
noun|other|invoice|發票|factura|facture|fattura|請求書|청구서;영수증
noun|other|payslip;pay slip|薪資單|nómina|fiche de paie|busta paga|給与明細|급여 명세서
noun|other|price quote|報價|presupuesto|devis|preventivo|見積もり|견적
noun|other|agreement|協議|acuerdo|accord|accordo|合意|합의
noun|other|clause|條款|cláusula|clause|clausola|条項|조항
noun|other|lease|租約|contrato de alquiler|bail|contratto d'affitto|賃貸契約|임대 계약
noun|people|tenant|房客|inquilino;inquilina|locataire|inquilino;inquilina|入居者|세입자
phrase|other|on sale|特價|en oferta|en promotion|in offerta|セール中|할인 중
noun|other|bargain|便宜貨|ganga|bonne affaire|affare|掘り出し物|싼 물건
verb|actions|haggle|討價還價|regatear|marchander|contrattare|値切る|값을 깎다
adjective|other|affordable|平價的|asequible|abordable|accessibile|手頃な|저렴하다
adjective|other|second-hand|二手的|de segunda mano|d'occasion|usato;usata;di seconda mano|中古の|중고
noun|other|luxury|奢華|lujo|luxe|lusso|贅沢|사치
noun|objects|loyalty card|會員卡|tarjeta de fidelidad;tarjeta de cliente|carte de fidélité|carta fedeltà|ポイントカード|멤버십 카드
noun|objects|gift card|禮券;禮物卡|tarjeta de regalo|carte cadeau|buono regalo|ギフトカード|상품권
noun|other|subscription|訂閱|suscripción|abonnement|abbonamento|定期購読|구독
noun|other|warranty|保固|garantía|garantie|garanzia|保証|보증
noun|other|complaint|投訴|queja;reclamación|réclamation|reclamo;lamentela|苦情|불만
noun|other|customer service|客服|atención al cliente;servicio al cliente|service client|assistenza clienti;servizio clienti|カスタマーサービス|고객 서비스
noun|other|advertisement|廣告|anuncio;publicidad|publicité;pub|pubblicità;annuncio|広告|광고
noun|other|marketing|行銷|marketing;mercadotecnia|marketing|marketing|マーケティング|마케팅
noun|objects|chain store|連鎖店|cadena de tiendas|chaîne de magasins|catena di negozi|チェーン店|체인점
noun|objects|grocery store|雜貨店|tienda de abarrotes;tienda de comestibles;tienda de alimentación|épicerie|negozio di alimentari|食料品店|식료품점
noun|objects|hardware store|五金行|ferretería|quincaillerie|ferramenta|金物屋|철물점
noun|objects|shoe store|鞋店|zapatería|magasin de chaussures|negozio di scarpe|靴屋|신발 가게
noun|objects|paper bag|紙袋|bolsa de papel|sac en papier|sacchetto di carta|紙袋|종이 봉투
noun|objects|stationery|文具|papelería|papeterie|cancelleria|文房具|문구
noun|objects|stapler|釘書機;訂書機|grapadora;engrapadora|agrafeuse|cucitrice;pinzatrice|ホッチキス|스테이플러
noun|objects|paperclip|迴紋針|clip;sujetapapeles|trombone|graffetta;fermaglio|クリップ|클립
noun|objects|calculator|計算機|calculadora|calculatrice|calcolatrice|電卓|계산기
noun|objects|photocopier|影印機|fotocopiadora|photocopieuse|fotocopiatrice|コピー機|복사기
noun|objects|sticky note|便利貼|nota adhesiva;post-it|post-it|post-it|付箋|포스트잇
noun|objects|business card|名片|tarjeta de visita;tarjeta de presentación|carte de visite|biglietto da visita|名刺|명함
noun|other|email address|電子郵件地址;電子信箱|dirección de correo electrónico;dirección de email|adresse e-mail;adresse mail|indirizzo email;indirizzo e-mail|メールアドレス|이메일 주소
noun|other|attachment|附件|archivo adjunto;adjunto|pièce jointe|allegato|添付ファイル|첨부 파일
noun|other|inbox|收件匣|bandeja de entrada|boîte de réception|posta in arrivo|受信トレイ|받은 편지함
verb|actions|attach|附上|adjuntar|joindre|allegare|添付する|첨부하다
verb|actions|forward|轉寄|reenviar|transférer|inoltrare|転送する|전달하다
noun|people|sender|寄件人;寄件者|remitente|expéditeur;expéditrice|mittente|送信者|보낸 사람
noun|people|recipient|收件人;收件者|destinatario;destinataria|destinataire|destinatario;destinataria|受信者|받는 사람
noun|other|signature|簽名|firma|signature|firma|署名|서명
noun|other|voicemail|語音信箱|buzón de voz|messagerie vocale|segreteria telefonica|留守番電話|음성 사서함
noun|other|form|表格|formulario|formulaire|modulo|用紙|양식
noun|objects|spreadsheet|試算表|hoja de cálculo|tableur;feuille de calcul|foglio di calcolo|スプレッドシート|스프레드시트
noun|other|chart|圖表|gráfico;gráfica|graphique|grafico|グラフ|차트
noun|objects|catalog;catalogue|型錄|catálogo|catalogue|catalogo|カタログ|카탈로그
phrase|other|free shipping|免運費|envío gratuito;envío gratis|livraison gratuite|spedizione gratuita|送料無料|무료 배송
noun|other|shipping cost|運費|gastos de envío|frais de livraison;frais de port|spese di spedizione|送料|배송비
phrase|other|in stock|有現貨|en stock;disponible|en stock|disponibile|在庫あり|재고 있음
phrase|other|out of stock|缺貨|agotado|en rupture de stock|esaurito|在庫切れ|품절
noun|other|original price|原價|precio original|prix d'origine;prix initial|prezzo originale|定価|정가
phrase|other|cash only|只收現金|solo efectivo|uniquement en espèces|solo contanti|現金のみ|현금만
phrase|other|pay in cash|付現|pagar en efectivo|payer en espèces|pagare in contanti|現金で払う|현금으로 내다
phrase|other|pay by card|刷卡|pagar con tarjeta|payer par carte|pagare con la carta|カードで払う|카드로 결제하다
phrase|other|keep the change|不用找了|quédese con el cambio|gardez la monnaie|tenga il resto|お釣りはいりません|잔돈은 됐어요
noun|other|pocket money|零用錢|dinero de bolsillo;paga;mesada|argent de poche|paghetta|お小遣い|용돈
noun|other|cryptocurrency|加密貨幣|criptomoneda|cryptomonnaie|criptovaluta|暗号資産|암호 화폐
noun|other|foreign currency|外幣|moneda extranjera;divisa|devise étrangère|valuta estera;valuta straniera|外貨|외화
noun|other|yen|日圓;日幣|yen|yen|yen|円|엔
noun|other|pound sterling|英鎊|libra esterlina|livre sterling|sterlina|英ポンド|파운드
noun|other|cent|美分|centavo;céntimo|cent;centime|cent;centesimo|セント|센트
noun|other|online banking|網路銀行|banca en línea;banca online|banque en ligne|banca online;home banking|ネットバンキング|인터넷 뱅킹
verb|actions|waste|浪費|desperdiciar;malgastar|gaspiller|sprecare|無駄|낭비
verb|actions|owe|欠|deber|devoir|dovere|借りがある|빚지다
verb|actions|pay back|還錢|devolver|rembourser|restituire|返済する|갚다
noun|people|sponsor|贊助商|patrocinador;patrocinadora|sponsor|sponsor|スポンサー|후원사
noun|other|auction|拍賣|subasta|vente aux enchères|asta|オークション|경매
noun|people|bidder|競標者;出價者|postor;postora|enchérisseur;enchérisseuse|offerente|入札者|입찰자
noun|other|consultancy|顧問公司;顧問服務|consultoría|consultance;conseil|consulenza|コンサルティング会社|컨설팅 회사
noun|other|franchise|加盟店|franquicia|franchise|franchising;franchise|フランチャイズ店|가맹점
adjective|other|frugal|節儉的|frugal|frugal;frugale|frugale|倹約な|검소하다
noun|other|windfall|意外之財|ganancia inesperada|aubaine|guadagno inaspettato|思わぬ収入|횡재
noun|other|labor;labour|勞動力|mano de obra|main-d'œuvre|manodopera|労働力|노동력
noun|other|startup|新創公司|startup;empresa emergente|start-up|startup|スタートアップ|스타트업
noun|other|small business|小型企業|pequeña empresa|petite entreprise|piccola impresa|中小企業|소기업
noun|people|shopkeeper|店主|tendero;tendera|commerçant;commerçante|negoziante|店主|가게 주인
noun|people|street vendor|攤販|vendedor ambulante;vendedora ambulante|vendeur ambulant;vendeuse ambulante|venditore ambulante;venditrice ambulante|露天商|노점상
noun|people|banker|銀行家|banquero;banquera|banquier;banquière|banchiere;banchiera|銀行家|은행가
noun|people|economist|經濟學家|economista|économiste|economista|経済学者|경제학자
noun|people|analyst|分析師|analista|analyste|analista|アナリスト|분석가
noun|people|technician|技術人員;技師|técnico;técnica|technicien;technicienne|tecnico;tecnica|技術者|기술자
noun|people|electrician|電工|electricista|électricien;électricienne|elettricista|電気技師|전기 기사
noun|people|plumber|水電工;水管工|fontanero;plomero|plombier|idraulico|配管工|배관공
noun|people|carpenter|木工|carpintero;carpintera|menuisier;menuisière|falegname|大工|목수
noun|people|construction worker|建築工人|obrero de la construcción|ouvrier du bâtiment|operaio edile|建設作業員|건설 노동자
noun|people|business partner|合夥人|socio;socia|associé;associée|socio;socia|共同経営者|동업자
noun|people|staff|工作人員|personal|personnel|personale|スタッフ|직원
noun|other|headquarters|總部|sede central;sede|siège;siège social|sede centrale;sede|本社|본사
noun|other|branch office|分公司|sucursal|succursale|filiale|支社|지사
noun|other|department|部門|departamento|service;département|reparto;dipartimento|部署|부서
noun|other|human resources|人力資源;人資|recursos humanos|ressources humaines|risorse umane|人事|인사
noun|other|accounting|會計|contabilidad|comptabilité|contabilità|経理|회계
noun|objects|meeting room|會議室|sala de reuniones|salle de réunion|sala riunioni|会議室|회의실
noun|other|conference|研討會|conferencia;congreso|conférence|conferenza;convegno|学会|학회
noun|other|agenda|議程|orden del día|ordre du jour|ordine del giorno|議題|의제
noun|other|task|任務|tarea|tâche|compito|任務|업무
noun|other|target|目標|objetivo|objectif|obiettivo|目標値|목표
noun|other|workload|工作量|carga de trabajo|charge de travail|carico di lavoro|仕事量|업무량
noun|other|teamwork|團隊合作|trabajo en equipo|travail d'équipe|lavoro di squadra|チームワーク|팀워크
noun|other|productivity|生產力|productividad|productivité|produttività|生産性|생산성
verb|actions|postpone|延後;延期|aplazar;posponer|reporter|rimandare;rinviare|延期する|연기하다
verb|actions|approve|批准;核准|aprobar|approuver|approvare|承認する|승인하다
verb|actions|hand in|繳交|entregar|remettre|consegnare|提出する|제출하다
verb|actions|fill in|填寫|rellenar;llenar|remplir|compilare|記入する|기입하다
verb|actions|launch|推出|lanzar|lancer|lanciare|発売する|출시하다
verb|actions|manage|管理|gestionar;administrar|gérer|gestire|管理する|관리하다
noun|other|management|管理|gestión;administración|gestion|gestione|経営|경영
noun|other|production|生產|producción|production|produzione|生産|생산
noun|objects|equipment|設備|equipo;equipamiento|équipement|attrezzatura|設備|설비
noun|objects|machine|機器|máquina|machine|macchina|機械|기계
noun|objects|goods|商品|mercancía|marchandise|merce|商品|상품
noun|objects|item|物品|artículo|article|articolo|品物|물품
noun|objects|sample|樣品|muestra|échantillon|campione|サンプル|샘플
noun|objects|packaging|包裝|embalaje;empaque|emballage|imballaggio|包装|포장
noun|objects|warehouse|倉庫|almacén|entrepôt|magazzino|倉庫|창고
noun|objects|inventory|庫存|existencias;inventario|stock;inventaire|scorte;inventario|在庫|재고
noun|other|strategy|策略;戰略|estrategia|stratégie|strategia|戦略|전략
noun|other|tactic|戰術|táctica|tactique|tattica|戦術|전술
noun|other|quantity|數量|cantidad|quantité|quantità|数量|수량
noun|other|service|服務|servicio|service|servizio|サービス|서비스
noun|other|employment|就業|empleo|emploi|occupazione|雇用|고용
adjective|other|unemployed|失業的|desempleado;desempleada|au chômage|disoccupato;disoccupata|失業中の|실업 상태의
noun|objects|construction site|工地|obra|chantier|cantiere|工事現場|공사장
noun|other|proposal|提案|propuesta|proposition|proposta|提案|제안
noun|other|online meeting|線上會議|reunión en línea;reunión virtual|réunion en ligne|riunione online|オンライン会議|온라인 회의
noun|other|retail|零售|venta minorista;comercio minorista|vente au détail;commerce de détail|vendita al dettaglio|小売|소매
noun|other|wholesale|批發|venta mayorista;venta al por mayor|vente en gros|vendita all'ingrosso|卸売|도매
noun|other|pay raise|加薪|aumento de sueldo;aumento de salario|augmentation de salaire|aumento di stipendio|昇給|임금 인상
noun|other|monthly salary|月薪|sueldo mensual|salaire mensuel|stipendio mensile|月給|월급
noun|other|hourly wage|時薪|salario por hora|salaire horaire|paga oraria|時給|시급
noun|other|working day|工作日|día laborable;día hábil|jour ouvrable;jour ouvré|giorno lavorativo|平日|평일
noun|objects|office supplies|辦公用品|material de oficina|fournitures de bureau|articoli per ufficio|事務用品|사무용품
noun|other|payment method|付款方式|método de pago;forma de pago|mode de paiement|metodo di pagamento|支払い方法|결제 방법
noun|other|installment;instalment|分期付款|cuota;plazo|versement|rata|分割払い|할부
noun|other|price range|價位|rango de precios;gama de precios|gamme de prix|fascia di prezzo|価格帯|가격대
noun|other|promo code;discount code|優惠碼|código promocional;código de descuento|code promo|codice sconto|プロモコード|할인 코드
noun|other|supply chain|供應鏈|cadena de suministro|chaîne d'approvisionnement|catena di approvvigionamento|サプライチェーン|공급망
noun|objects|raw material|原料;原物料|materia prima|matière première|materia prima|原料|원료
noun|objects|assembly line|生產線;裝配線|línea de ensamblaje;cadena de montaje|chaîne de montage|catena di montaggio|組み立てライン|조립 라인
noun|people|manufacturer|製造商|fabricante|fabricant|produttore|製造業者|제조업체
noun|other|dividend|股息;股利|dividendo|dividende|dividendo|配当|배당금
noun|other|cash flow|現金流|flujo de caja|flux de trésorerie|flusso di cassa|キャッシュフロー|현금 흐름
adjective|other|commercial|商業的|comercial|commercial;commerciale|commerciale|商業の|상업적
adjective|other|industrial|工業的|industrial|industriel;industrielle|industriale|工業の|공업적
adjective|other|competitive|有競爭力的|competitivo;competitiva|compétitif;compétitive|competitivo;competitiva|競争力のある|경쟁력 있다
adjective|other|profitable|賺錢的;有利可圖的|rentable|rentable|redditizio;redditizia|もうかる|수익성 있다
adjective|other|punctual|準時的|puntual|ponctuel;ponctuelle|puntuale|時間に正確な|시간을 잘 지키다
adjective|other|reliable|可靠的|fiable;confiable|fiable|affidabile|頼りになる|믿을 수 있다
adjective|other|valuable|貴重的;有價值的|valioso;valiosa|précieux;précieuse|prezioso;preziosa|貴重な|귀중하다
noun|objects|briefcase|公事包|maletín|mallette|valigetta;ventiquattrore|ブリーフケース|서류 가방
noun|objects|badge|識別證|credencial;tarjeta de identificación|badge|badge;tesserino|社員証|사원증
noun|objects|office chair|辦公椅|silla de oficina|chaise de bureau|sedia da ufficio|オフィスチェア|사무용 의자
noun|objects|counter|櫃檯;櫃台|mostrador|comptoir|bancone|カウンター|카운터
adjective|other|proactive|主動的|proactivo;proactiva|proactif;proactive|proattivo;proattiva|積極的な|적극적이다
noun|other|purchase|購買|compra|achat|acquisto|購入|구매
noun|other|e-commerce|電子商務;電商|comercio electrónico|commerce électronique;e-commerce|e-commerce;commercio elettronico|電子商取引|전자 상거래
noun|other|payday|發薪日|día de pago;día de cobro|jour de paie|giorno di paga|給料日|월급날
noun|people|president|總統|presidente;presidenta|président;présidente|presidente|大統領|대통령
noun|other|election|選舉|elección|élection|elezione|選挙|선거
verb|actions|vote|投票|votar|voter|votare|投票する|투표하다
noun|people|police|警察|policía|police|polizia|警察|경찰
noun|other|crime|犯罪|delito|crime|reato|犯罪|범죄
noun|other|crisis|危機|crisis|crise|crisi|危機|위기
noun|other|policy|政策|política|politique|politica|政策|정책
noun|people|minister|部長|ministro;ministra|ministre|ministro;ministra|大臣|장관
noun|people|prime minister|首相;總理|primer ministro;primera ministra|premier ministre;première ministre|primo ministro|首相|총리
noun|other|army|軍隊|ejército|armée|esercito|軍隊|군대
noun|other|court|法院|tribunal|tribunal|tribunale|裁判所|법원
noun|people|citizen|公民|ciudadano;ciudadana|citoyen;citoyenne|cittadino;cittadina|市民|시민
noun|other|democracy|民主|democracia|démocratie|democrazia|民主主義|민주주의
noun|people|politician|政治人物|político;política|homme politique;femme politique|politico;politica|政治家|정치인
adjective|other|political|政治的|político;política|politique|politico;politica|政治的な|정치적
noun|other|political party|政黨|partido político|parti politique|partito politico|政党|정당
noun|other|parliament|國會|parlamento|parlement|parlamento|議会|국회
noun|people|candidate|候選人|candidato;candidata|candidat;candidate|candidato;candidata|候補者|후보자
noun|people|voter|選民|votante|électeur;électrice|elettore;elettrice|有権者|유권자
noun|other|campaign|競選活動|campaña|campagne|campagna|選挙運動|선거 운동
verb|actions|protest|抗議|protestar|protester|protestare|抗議|항의
noun|other|demonstration|示威|manifestación|manifestation|manifestazione|デモ|시위
noun|people|protester|抗議者|manifestante|manifestant;manifestante|manifestante|抗議者|시위자
noun|other|conflict|衝突|conflicto|conflit|conflitto|紛争|갈등;분쟁
noun|other|attack|攻擊|ataque|attaque|attacco|攻撃|공격
noun|objects|weapon|武器|arma|arme|arma|武器|무기
noun|objects|gun|槍|pistola|pistolet|pistola|銃|총
noun|objects|bomb|炸彈|bomba|bombe|bomba|爆弾|폭탄
noun|other|explosion|爆炸|explosión|explosion|esplosione|爆発|폭발
noun|other|violence|暴力|violencia|violence|violenza|暴力|폭력
adjective|other|violent|暴力的|violento;violenta|violent;violente|violento;violenta|暴力的な|폭력적이다
noun|people|victim|受害者|víctima|victime|vittima|被害者|피해자
noun|people|suspect|嫌犯|sospechoso;sospechosa|suspect;suspecte|sospettato;sospettata|容疑者|용의자
verb|actions|arrest|逮捕|detener|arrêter|arrestare|逮捕する|체포하다
noun|objects|prison|監獄|cárcel|prison|prigione|刑務所|교도소
noun|people|prisoner|囚犯|preso;presa|détenu;détenue|detenuto;detenuta|囚人|죄수
noun|people|criminal|罪犯|delincuente|criminel;criminelle|criminale|犯罪者|범죄자
noun|people|thief|小偷|ladrón;ladrona|voleur;voleuse|ladro;ladra|泥棒|도둑
noun|other|murder|謀殺|asesinato|meurtre|omicidio|殺人|살인
noun|people|murderer|殺人犯|asesino;asesina|meurtrier;meurtrière|assassino;assassina|殺人犯|살인범
noun|other|theft|竊盜|robo|vol|furto|窃盗|절도
noun|other|robbery|搶劫|atraco;asalto|braquage|rapina|強盗|강도
verb|actions|investigate|調查|investigar|enquêter|indagare|調査する|조사하다
noun|other|investigation|調查|investigación|enquête|indagine|捜査|수사
noun|other|evidence|證據|prueba|preuve|prova|証拠|증거
noun|people|witness|證人|testigo|témoin|testimone|証人|증인
noun|other|trial|審判|juicio|procès|processo|裁判|재판
noun|other|verdict|判決|veredicto|verdict|verdetto|判決|판결
adjective|other|guilty|有罪的|culpable|coupable|colpevole|有罪の|유죄의
adjective|other|innocent|無辜的|inocente|innocent;innocente|innocente|無実の|무죄의
adjective|other|illegal|違法的;非法的|ilegal|illégal;illégale|illegale|違法な|불법이다
adjective|other|legal|合法的|legal|légal;légale|legale|合法な|합법이다
noun|other|justice|正義|justicia|justice|giustizia|正義|정의
noun|other|human rights|人權|derechos humanos|droits de l'homme|diritti umani|人権|인권
noun|other|equality|平等|igualdad|égalité|uguaglianza|平等|평등
noun|other|discrimination|歧視|discriminación|discrimination|discriminazione|差別|차별
noun|other|racism|種族歧視|racismo|racisme|razzismo|人種差別|인종 차별
noun|other|poverty|貧窮|pobreza|pauvreté|povertà|貧困|빈곤
noun|other|inequality|不平等|desigualdad|inégalité|disuguaglianza|不平等|불평등
noun|other|population|人口|población|population|popolazione|人口|인구
noun|other|community|社區|comunidad|communauté|comunità|地域社会|지역 사회
adjective|other|social|社會的|social|social;sociale|sociale|社会的な|사회적
noun|other|issue|議題|cuestión|question|questione|問題|사안;이슈
noun|other|impact|影響|impacto|impact|impatto|影響|영향
noun|other|decline|下降|descenso|baisse|calo|減少|감소
noun|other|threat|威脅|amenaza|menace|minaccia|脅威|위협
verb|actions|threaten|威脅|amenazar|menacer|minacciare|脅す|위협하다
noun|other|warning|警告|advertencia|avertissement|avvertimento|警告|경고
verb|actions|warn|警告|advertir|avertir|avvertire|警告する|경고하다
noun|other|alert|警報|alerta|alerte|allerta|警報|경보
noun|other|controversy|爭議|polémica|controverse|controversia|論争|논란
adjective|other|controversial|有爭議的|polémico;polémica|controversé;controversée|controverso;controversa|物議をかもす|논란이 많다
noun|other|scandal|醜聞|escándalo|scandale|scandalo|スキャンダル|스캔들
noun|other|debate|辯論|debate|débat|dibattito|討論|토론
noun|other|criticism|批評|crítica|critique|critica|批判|비판
verb|actions|criticize;criticise|批評|criticar|critiquer|criticare|批判する|비판하다
noun|other|tragedy|悲劇|tragedia|tragédie|tragedia|悲劇|비극
noun|other|disaster|災難|desastre|catastrophe|disastro|災害|재난
noun|other|natural disaster|天然災害|desastre natural|catastrophe naturelle|calamità naturale|自然災害|자연재해
noun|other|flood|水災|inundación|inondation|alluvione|洪水|홍수
noun|other|drought|乾旱|sequía|sécheresse|siccità|干ばつ|가뭄
noun|other|wildfire|野火|incendio forestal|incendie de forêt|incendio boschivo|山火事|산불
noun|other|tsunami|海嘯|tsunami|tsunami|tsunami|津波|쓰나미
noun|other|landslide|山崩|deslizamiento de tierra|glissement de terrain|frana|土砂崩れ|산사태
noun|other|aftershock|餘震|réplica|réplique|scossa di assestamento|余震|여진
noun|other|emergency|緊急情況|emergencia|urgence|emergenza|緊急事態|비상사태
verb|actions|evacuate|撤離|evacuar|évacuer|evacuare|避難する|대피하다
noun|other|evacuation|撤離|evacuación|évacuation|evacuazione|避難|대피
verb|actions|rescue|救援|rescatar|secourir|soccorrere|救助|구조
noun|objects|shelter|避難所|refugio|abri|rifugio|避難所|대피소
noun|people|survivor|倖存者|sobreviviente;superviviente|survivant;survivante|sopravvissuto;sopravvissuta|生存者|생존자
noun|other|death toll|死亡人數|número de muertos|nombre de morts|numero dei morti|死者数|사망자 수
noun|other|fatality|死亡案例|víctima mortal|décès|decesso|死亡事故|사망 사고
noun|other|damage|損害|daño|dégât|danno|被害|피해
verb|actions|destroy|摧毀|destruir|détruire|distruggere|破壊する|파괴하다
noun|other|destruction|破壞|destrucción|destruction|distruzione|破壊|파괴
adjective|other|missing|失蹤的|desaparecido;desaparecida|disparu;disparue|disperso;dispersa|行方不明の|실종된
noun|other|disappearance|失蹤|desaparición|disparition|scomparsa|失踪|실종
noun|other|accident|意外|accidente|accident|incidente|事故|사고
noun|other|collision|碰撞|colisión|collision|collisione|衝突|충돌
noun|other|plane crash|墜機|accidente aéreo|accident d'avion|incidente aereo|墜落事故|비행기 추락
noun|other|pollution|汙染;污染|contaminación|pollution|inquinamento|汚染|오염
verb|actions|pollute|汙染;污染|contaminar|polluer|inquinare|汚染する|오염시키다
noun|other|climate change|氣候變遷|cambio climático|changement climatique|cambiamento climatico|気候変動|기후 변화
noun|other|global warming|全球暖化|calentamiento global|réchauffement climatique|riscaldamento globale|地球温暖化|지구 온난화
noun|other|greenhouse gas|溫室氣體|gas de efecto invernadero|gaz à effet de serre|gas serra|温室効果ガス|온실가스
noun|other|emission|排放|emisión|émission|emissione|排出|배출
noun|other|carbon footprint|碳足跡|huella de carbono|empreinte carbone|impronta di carbonio|カーボンフットプリント|탄소 발자국
noun|other|renewable energy|再生能源|energía renovable|énergie renouvelable|energia rinnovabile|再生可能エネルギー|재생 에너지
noun|other|solar energy|太陽能|energía solar|énergie solaire|energia solare|太陽エネルギー|태양 에너지
noun|other|wind power|風力發電|energía eólica|énergie éolienne|energia eolica|風力発電|풍력 발전
noun|other|nuclear power|核能|energía nuclear|énergie nucléaire|energia nucleare|原子力|원자력
noun|other|fossil fuel|化石燃料|combustible fósil|combustible fossile|combustibile fossile|化石燃料|화석 연료
noun|objects|power plant|發電廠|central eléctrica|centrale électrique|centrale elettrica|発電所|발전소
noun|other|power outage|停電|apagón|coupure de courant|blackout|停電|정전
noun|other|air pollution|空氣汙染;空氣污染|contaminación del aire|pollution de l'air|inquinamento atmosferico|大気汚染|대기 오염
noun|other|environmental protection|環保|protección del medio ambiente|protection de l'environnement|tutela dell'ambiente|環境保護|환경 보호
adjective|other|eco-friendly|環保的|ecológico;ecológica|écologique|ecologico;ecologica|環境にやさしい|친환경적이다
adjective|other|sustainable|永續的|sostenible;sustentable|durable|sostenibile|持続可能な|지속 가능하다
noun|other|sustainability|永續|sostenibilidad|durabilité|sostenibilità|持続可能性|지속 가능성
verb|actions|recycle|回收|reciclar|recycler|riciclare|リサイクルする|재활용하다
noun|other|deforestation|森林砍伐|deforestación|déforestation|deforestazione|森林伐採|삼림 벌채
noun|other|extinction|滅絕|extinción|extinction|estinzione|絶滅|멸종
adjective|other|endangered|瀕危的|en peligro de extinción|menacé d'extinction;menacée d'extinction|in via di estinzione|絶滅危惧の|멸종 위기의
noun|other|conservation|保育|conservación|préservation|tutela|保護活動|보전
noun|other|sea level|海平面|nivel del mar|niveau de la mer|livello del mare|海面|해수면
noun|people|mayor|市長|alcalde;alcaldesa|maire|sindaco;sindaca|市長|시장
noun|people|king|國王|rey|roi|re|王|왕
noun|people|queen|女王|reina|reine|regina|女王|여왕
noun|people|prince|王子|príncipe|prince|principe|王子|왕자
noun|people|princess|公主|princesa|princesse|principessa|王女|공주
noun|people|emperor|皇帝|emperador|empereur|imperatore|皇帝|황제
noun|other|empire|帝國|imperio|empire|impero|帝国|제국
noun|other|kingdom|王國|reino|royaume|regno|王国|왕국
noun|other|republic|共和國|república|république|repubblica|共和国|공화국
noun|other|monarchy|君主制|monarquía|monarchie|monarchia|君主制|군주제
noun|other|royal family|王室|familia real|famille royale|famiglia reale|王室|왕실
noun|other|constitution|憲法|constitución|constitution|costituzione|憲法|헌법
noun|people|leader|領袖|líder|dirigeant;dirigeante|leader|指導者|지도자
noun|other|power|權力|poder|pouvoir|potere|権力|권력
noun|other|authority|當局|autoridad|autorité|autorità|当局|당국
noun|people|official|官員|funcionario;funcionaria|responsable|funzionario;funzionaria|役人|관리
noun|other|reform|改革|reforma|réforme|riforma|改革|개혁
noun|other|regulation|法規|regulación|réglementation|normativa|規制|규제
noun|other|sanction|制裁|sanción|sanction|sanzione|制裁|제재
noun|other|treaty|條約|tratado|traité|trattato|条約|조약
noun|other|negotiation|談判|negociación|négociation|negoziato|交渉|협상
verb|actions|negotiate|談判|negociar|négocier|negoziare|交渉する|협상하다
noun|people|diplomat|外交官|diplomático;diplomática|diplomate|diplomatico;diplomatica|外交官|외교관
noun|other|diplomacy|外交|diplomacia|diplomatie|diplomazia|外交|외교
noun|people|ambassador|大使|embajador;embajadora|ambassadeur;ambassadrice|ambasciatore;ambasciatrice|大使|대사
noun|other|summit|高峰會|cumbre|sommet|vertice|首脳会談|정상 회담
noun|other|alliance|聯盟|alianza|alliance|alleanza|同盟|동맹
noun|people|ally|盟友|aliado;aliada|allié;alliée|alleato;alleata|同盟国|동맹국
noun|other|independence|獨立|independencia|indépendance|indipendenza|独立|독립
noun|other|sovereignty|主權|soberanía|souveraineté|sovranità|主権|주권
noun|other|territory|領土|territorio|territoire|territorio|領土|영토
noun|other|border|邊境|frontera|frontière|frontiera|国境|국경
noun|objects|strait|海峽|estrecho|détroit|stretto|海峡|해협
noun|other|nation|國家|nación|nation|nazione|国家|국가
noun|people|vice president|副總統|vicepresidente;vicepresidenta|vice-président;vice-présidente|vicepresidente|副大統領|부통령
noun|people|refugee|難民|refugiado;refugiada|réfugié;réfugiée|rifugiato;rifugiata|難民|난민
noun|people|immigrant|移民|inmigrante|immigré;immigrée|immigrato;immigrata|移民（人）|이민자
noun|other|immigration|移民|inmigración|immigration|immigrazione|移民|이민
noun|other|migration|遷移|migración|migration|migrazione|移住|이주
noun|other|asylum|庇護|asilo|asile|asilo|亡命|망명
verb|actions|deport|驅逐出境|deportar|expulser|espellere|国外追放する|추방하다
noun|other|eviction|驅逐|desalojo;desahucio|expulsion|sfratto|立ち退き|퇴거
verb|actions|flee|逃離|huir|fuir|fuggire|逃れる|도망치다
verb|actions|immigrate|移民|inmigrar|immigrer|immigrare|移住する|이민하다
noun|other|dictatorship|獨裁統治|dictadura|dictature|dittatura|独裁|독재
noun|people|dictator|獨裁者|dictador;dictadora|dictateur;dictatrice|dittatore;dittatrice|独裁者|독재자
noun|other|regime|政權|régimen|régime|regime|政権|정권
adjective|other|authoritarian|威權的|autoritario;autoritaria|autoritaire|autoritario;autoritaria|権威主義的な|권위주의적
adjective|other|democratic|民主的|democrático;democrática|démocratique|democratico;democratica|民主的な|민주적
noun|other|referendum|公投|referéndum|référendum|referendum|国民投票|국민 투표
noun|objects|ballot|選票|papeleta;boleta|bulletin de vote|scheda elettorale|投票用紙|투표용지
noun|other|poll|民調|encuesta|sondage|sondaggio|世論調査|여론 조사
verb|actions|elect|選出|elegir|élire|eleggere|選出する|선출하다
noun|other|opposition|在野黨|oposición|opposition|opposizione|野党|야당
noun|other|ruling party|執政黨|partido gobernante|parti au pouvoir|partito di governo|与党|여당
noun|other|majority|多數|mayoría|majorité|maggioranza|多数派|다수
noun|other|minority|少數|minoría|minorité|minoranza|少数派|소수
adjective|other|left-wing|左派的|de izquierda|de gauche|di sinistra|左派の|좌파의
adjective|other|right-wing|右派的|de derecha|de droite|di destra|右派の|우파의
adjective|other|conservative|保守的|conservador;conservadora|conservateur;conservatrice|conservatore;conservatrice|保守的な|보수적이다
adjective|other|liberal|自由派的|liberal|libéral;libérale|liberale|リベラルな|진보적이다
noun|people|extremist|極端分子|extremista|extrémiste|estremista|過激派|극단주의자
adjective|other|radical|激進的|radical|radical;radicale|radicale|急進的な|급진적이다
noun|other|nationalism|民族主義|nacionalismo|nationalisme|nazionalismo|ナショナリズム|민족주의
noun|other|communism|共產主義|comunismo|communisme|comunismo|共産主義|공산주의
noun|other|capitalism|資本主義|capitalismo|capitalisme|capitalismo|資本主義|자본주의
noun|other|public opinion|輿論|opinión pública|opinion publique|opinione pubblica|世論|여론
noun|other|statement|聲明|declaración|déclaration|dichiarazione|声明|성명
verb|actions|announce|宣布|anunciar|annoncer|annunciare|発表する|발표하다
noun|other|press conference|記者會|rueda de prensa|conférence de presse|conferenza stampa|記者会見|기자 회견
noun|people|spokesperson|發言人|portavoz|porte-parole|portavoce|報道官|대변인
noun|other|council|議會|consejo|conseil|consiglio|評議会|의회
noun|objects|polling station|投票所|colegio electoral|bureau de vote|seggio elettorale|投票所|투표소
noun|other|turnout|投票率|participación|taux de participation|affluenza|投票率|투표율
noun|other|inauguration|就職典禮|toma de posesión|investiture|insediamento|就任式|취임식
noun|other|bureaucracy|官僚體制|burocracia|bureaucratie|burocrazia|官僚制|관료제
verb|actions|resign|辭職|dimitir;renunciar|démissionner|dimettersi|辞任する|사임하다
verb|actions|appoint|任命|nombrar|nommer|nominare|任命する|임명하다
verb|actions|govern|治理|gobernar|gouverner|governare|統治する|통치하다
noun|objects|flag|旗子|bandera|drapeau|bandiera|旗|깃발
noun|other|national anthem|國歌|himno nacional|hymne national|inno nazionale|国歌|국가
noun|other|national day|國慶日|fiesta nacional|fête nationale|festa nazionale|建国記念日|국경일
adjective|other|national|國家的|nacional|national;nationale|nazionale|国の|국가의
adjective|other|global|全球的|global|mondial;mondiale|globale|世界的な|세계적
noun|other|globalization;globalisation|全球化|globalización|mondialisation|globalizzazione|グローバル化|세계화
noun|other|superpower|超級強國|superpotencia|superpuissance|superpotenza|超大国|초강대국
noun|other|unification|統一|unificación|unification|unificazione|統一|통일
noun|other|colony|殖民地|colonia|colonie|colonia|植民地|식민지
noun|other|developing country|開發中國家|país en desarrollo|pays en développement|paese in via di sviluppo|開発途上国|개발도상국
noun|other|developed country|已開發國家|país desarrollado|pays développé|paese sviluppato|先進国|선진국
noun|other|aid|援助|ayuda|aide|aiuto|援助|원조
adjective|other|humanitarian|人道的|humanitario;humanitaria|humanitaire|umanitario;umanitaria|人道的な|인도적
noun|other|famine|饑荒;飢荒|hambruna|famine|carestia|飢饉|기근
adjective|other|military|軍事的|militar|militaire|militare|軍事の|군사적
noun|other|navy|海軍|armada|marine|marina|海軍|해군
noun|other|air force|空軍|fuerza aérea|armée de l'air|aeronautica militare|空軍|공군
noun|people|veteran|退伍軍人|veterano;veterana|ancien combattant;ancienne combattante|veterano;veterana|退役軍人|퇴역 군인
noun|other|battle|戰役|batalla|bataille|battaglia|戦闘|전투
verb|actions|invade|入侵|invadir|envahir|invadere|侵攻する|침공하다
noun|other|invasion|入侵|invasión|invasion|invasione|侵攻|침공
noun|other|ceasefire|停火|alto el fuego|cessez-le-feu|cessate il fuoco|停戦|휴전
noun|objects|missile|飛彈|misil|missile|missile|ミサイル|미사일
noun|objects|nuclear weapon|核武|arma nuclear|arme nucléaire|arma nucleare|核兵器|핵무기
noun|other|defense;defence|國防|defensa|défense|difesa|国防|국방
noun|other|victory|勝利|victoria|victoire|vittoria|勝利|승리
noun|other|defeat|挫敗|derrota|défaite|sconfitta|敗北|패배
verb|actions|surrender|投降|rendirse|se rendre|arrendersi|降伏する|항복하다
noun|people|civilian|平民|civil|civil;civile|civile|民間人|민간인
noun|people|hero|英雄|héroe;heroína|héros;héroïne|eroe;eroina|英雄|영웅
noun|people|spy|間諜|espía|espion;espionne|spia|スパイ|간첩
noun|other|tension|緊張局勢|tensión|tension|tensione|緊張状態|긴장
verb|actions|deter|嚇阻|disuadir|dissuader|dissuadere|抑止する|억제하다
verb|actions|escalate|升級|intensificarse|s'intensifier|intensificarsi|激化する|격화되다
noun|other|terrorism|恐怖主義|terrorismo|terrorisme|terrorismo|テロ|테러
noun|people|terrorist|恐怖分子|terrorista|terroriste|terrorista|テロリスト|테러리스트
noun|other|bombing|轟炸|bombardeo|bombardement|bombardamento|爆撃|폭격
noun|other|shooting|槍擊|tiroteo|fusillade|sparatoria|銃撃|총격
verb|actions|shoot|開槍|disparar|tirer|sparare|撃つ|쏘다
verb|actions|explode|爆炸|explotar|exploser|esplodere|爆発する|폭발하다
noun|other|massacre|屠殺|masacre|massacre|massacro|虐殺|학살
noun|other|genocide|種族滅絕|genocidio|génocide|genocidio|ジェノサイド|집단 학살
noun|other|airstrike|空襲|ataque aéreo|frappe aérienne|attacco aereo|空爆|공습
noun|objects|warship|軍艦|buque de guerra|navire de guerre|nave da guerra|軍艦|군함
noun|objects|fighter jet|戰鬥機|avión de combate|avion de chasse|aereo da caccia|戦闘機|전투기
noun|objects|military base|軍事基地|base militar|base militaire|base militare|軍事基地|군사 기지
noun|other|military service|兵役|servicio militar|service militaire|servizio militare|兵役|병역
noun|other|civil war|內戰|guerra civil|guerre civile|guerra civile|内戦|내전
noun|other|world war|世界大戰|guerra mundial|guerre mondiale|guerra mondiale|世界大戦|세계 대전
noun|other|Cold War|冷戰|Guerra Fría|guerre froide|guerra fredda|冷戦|냉전
noun|other|security|安全|seguridad|sécurité|sicurezza|安全保障|안보
noun|other|surveillance|監控|vigilancia|surveillance|sorveglianza|監視|감시
noun|people|hostage|人質|rehén|otage|ostaggio|人質|인질
verb|actions|kidnap|綁架|secuestrar|enlever|rapire|誘拐する|납치하다
noun|other|revolution|革命|revolución|révolution|rivoluzione|革命|혁명
noun|people|rebel|叛亂分子|rebelde|rebelle|ribelle|反乱者|반군
noun|other|coup|政變|golpe de Estado|coup d'État|colpo di Stato|クーデター|쿠데타
noun|other|riot|暴動|disturbio|émeute|sommossa|暴動|폭동
noun|other|strike|罷工|huelga|grève|sciopero|ストライキ|파업
noun|people|activist|社運人士|activista|militant;militante|attivista|活動家|활동가
noun|other|social movement|社會運動|movimiento social|mouvement social|movimento sociale|社会運動|사회 운동
noun|other|petition|請願|petición|pétition|petizione|請願|청원
noun|other|boycott|抵制|boicot|boycott|boicottaggio|ボイコット|불매 운동
noun|other|freedom of speech|言論自由|libertad de expresión|liberté d'expression|libertà di espressione|言論の自由|언론의 자유
noun|other|freedom of the press|新聞自由|libertad de prensa|liberté de la presse|libertà di stampa|報道の自由|언론 자유
noun|other|censorship|審查制度|censura|censure|censura|検閲|검열
noun|other|propaganda|政治宣傳|propaganda|propagande|propaganda|プロパガンダ|선전
noun|other|fake news|假新聞|noticia falsa|fausse information|notizia falsa|フェイクニュース|가짜 뉴스
noun|other|disinformation|假訊息|desinformación|désinformation|disinformazione|偽情報|허위 정보
adjective|other|misleading|誤導性的|engañoso;engañosa|trompeur;trompeuse|fuorviante|誤解を招く|오해의 소지가 있다
noun|other|rumor;rumour|謠言|rumor|rumeur|diceria|うわさ|소문
noun|other|slogan|口號|eslogan|slogan|slogan|スローガン|구호
noun|other|rally|集會|mitin|rassemblement|comizio|集会|집회
noun|objects|tear gas|催淚瓦斯|gas lacrimógeno|gaz lacrymogène|gas lacrimogeno|催涙ガス|최루탄
noun|other|curfew|宵禁|toque de queda|couvre-feu|coprifuoco|夜間外出禁止令|통행금지
noun|other|martial law|戒嚴|ley marcial|loi martiale|legge marziale|戒厳令|계엄령
noun|other|state of emergency|緊急狀態|estado de emergencia|état d'urgence|stato di emergenza|非常事態|비상사태
noun|people|dissident|異議人士|disidente|dissident;dissidente|dissidente|反体制派|반체제 인사
noun|people|political prisoner|政治犯|preso político;presa política|prisonnier politique;prisonnière politique|prigioniero politico;prigioniera politica|政治犯|정치범
noun|other|exile|流亡|exilio|exil|esilio|亡命生活|망명
noun|people|prosecutor|檢察官|fiscal|procureur|pubblico ministero|検察官|검사
noun|people|defendant|被告|acusado;acusada|accusé;accusée|imputato;imputata|被告|피고
noun|other|jury|陪審團|jurado|jury|giuria|陪審|배심원단
noun|other|lawsuit|訴訟|demanda|action en justice|causa|訴訟|소송
verb|actions|sue|提告|demandar|poursuivre en justice|fare causa|訴える|고소하다
verb|actions|accuse|指控|acusar|accuser|accusare|告発する|고발하다
noun|other|accusation|指控|acusación|accusation|accusa|非難|비난
noun|other|allegation|指控|denuncia|allégation|accusa|申し立て|혐의
noun|other|legislation|立法|legislación|législation|legislazione|立法|입법
verb|actions|abolish|廢除|abolir|abolir|abolire|廃止する|폐지하다
noun|other|abolition|廢除|abolición|abolition|abolizione|廃止|폐지
verb|actions|revoke|撤銷|revocar|révoquer|revocare|取り消す|취소하다
verb|actions|legalize;legalise|合法化|legalizar|légaliser|legalizzare|合法化する|합법화하다
verb|actions|criminalize;criminalise|入罪化|criminalizar|criminaliser|criminalizzare|犯罪とする|범죄화하다
verb|actions|indict|起訴|acusar formalmente|inculper|incriminare|起訴する|기소하다
noun|other|settlement|和解|acuerdo extrajudicial|accord à l'amiable|accordo extragiudiziale|和解|합의
verb|actions|violate|違反|violar|enfreindre|violare|違反する|위반하다
noun|other|violation|違規|infracción|infraction|violazione|違反|위반
verb|actions|comply|遵守|cumplir|respecter|rispettare|従う|준수하다
noun|other|ban|禁令|prohibición|interdiction|divieto|禁止|금지
noun|other|rule of law|法治|Estado de derecho|État de droit|Stato di diritto|法の支配|법치
noun|other|supreme court|最高法院|tribunal supremo;corte suprema|cour suprême|corte suprema|最高裁判所|대법원
noun|other|death penalty|死刑|pena de muerte|peine de mort|pena di morte|死刑|사형
noun|other|imprisonment|監禁|encarcelamiento|emprisonnement|carcerazione|禁錮|징역
noun|other|punishment|懲罰|castigo|punition|punizione|罰|벌
verb|actions|punish|懲罰|castigar|punir|punire|罰する|벌하다
verb|actions|confess|認罪|confesar|avouer|confessare|自白する|자백하다
noun|other|bail|保釋|fianza|caution|cauzione|保釈|보석
verb|actions|interrogate|審問|interrogar|interroger|interrogare|尋問する|심문하다
noun|people|pickpocket|扒手|carterista|pickpocket|borseggiatore;borseggiatrice|すり|소매치기
noun|other|drunk driving|酒駕|conducción en estado de ebriedad|conduite en état d'ivresse|guida in stato di ebbrezza|飲酒運転|음주 운전
noun|other|drug trafficking|販毒|narcotráfico|trafic de drogue|traffico di droga|麻薬密売|마약 밀매
noun|other|organized crime;organised crime|組織犯罪|crimen organizado|crime organisé|criminalità organizzata|組織犯罪|조직 범죄
noun|other|smuggling|走私|contrabando|contrebande|contrabbando|密輸|밀수
noun|other|corruption|貪腐|corrupción|corruption|corruzione|汚職|부패
adjective|other|corrupt|貪腐的|corrupto;corrupta|corrompu;corrompue|corrotto;corrotta|腐敗した|부패하다
noun|other|bribe|賄賂|soborno|pot-de-vin|tangente|賄賂|뇌물
noun|other|fraud|詐欺|fraude|fraude|frode|詐欺|사기
noun|other|scam|詐騙|estafa|arnaque|truffa|詐欺（だまし）|사기
noun|other|gang|幫派|banda|gang|banda|ギャング|조직폭력배
noun|other|harassment|騷擾|acoso|harcèlement|molestia|ハラスメント|괴롭힘
noun|other|bullying|霸凌|acoso escolar|harcèlement scolaire|bullismo|いじめ|따돌림
noun|other|domestic violence|家暴|violencia doméstica|violence domestique|violenza domestica|家庭内暴力|가정 폭력
noun|other|human trafficking|人口販運|trata de personas|traite des êtres humains|tratta di esseri umani|人身売買|인신매매
noun|other|gender|性別|género|genre|genere|性別|성별
noun|other|feminism|女性主義|feminismo|féminisme|femminismo|フェミニズム|페미니즘
noun|other|same-sex marriage|同性婚姻|matrimonio homosexual|mariage homosexuel|matrimonio omosessuale|同性婚|동성 결혼
noun|other|abortion|墮胎|aborto|avortement|aborto|中絶|낙태
noun|other|birth rate|出生率|tasa de natalidad|taux de natalité|tasso di natalità|出生率|출생률
noun|other|aging;ageing|高齡化|envejecimiento|vieillissement|invecchiamento|高齢化|고령화
noun|other|census|人口普查|censo|recensement|censimento|国勢調査|인구 조사
noun|other|ethnic group|族群|grupo étnico|groupe ethnique|gruppo etnico|民族|민족
noun|people|indigenous people|原住民|pueblo indígena|peuple autochtone|popolo indigeno|先住民|원주민
noun|other|custom|習俗|costumbre|coutume|usanza|風習|풍습
noun|other|heritage|文化遺產|patrimonio|patrimoine|patrimonio|文化遺産|문화유산
noun|other|ceremony|儀式|ceremonia|cérémonie|cerimonia|儀式|의식
noun|other|taboo|禁忌|tabú|tabou|tabù|タブー|금기
noun|other|superstition|迷信|superstición|superstition|superstizione|迷信|미신
noun|people|ancestor|祖先|antepasado;antepasada|ancêtre|antenato;antenata|祖先|조상
noun|other|civilization;civilisation|文明|civilización|civilisation|civiltà|文明|문명
noun|people|homeless person|遊民|persona sin hogar|sans-abri|senzatetto|ホームレス|노숙자
noun|people|orphan|孤兒|huérfano;huérfana|orphelin;orpheline|orfano;orfana|孤児|고아
noun|other|charity|慈善機構|organización benéfica|association caritative|ente di beneficenza|慈善団体|자선 단체
noun|other|donation|捐款|donación|don|donazione|寄付|기부
noun|other|social class|社會階級|clase social|classe sociale|classe sociale|社会階級|사회 계층
noun|other|middle class|中產階級|clase media|classe moyenne|ceto medio|中流階級|중산층
noun|other|privilege|特權|privilegio|privilège|privilegio|特権|특권
noun|other|diversity|多元|diversidad|diversité|diversità|多様性|다양성
noun|other|prejudice|偏見|prejuicio|préjugé|pregiudizio|偏見|편견
noun|other|stereotype|刻板印象|estereotipo|stéréotype|stereotipo|固定観念|고정관념
noun|other|morality|道德|moralidad|moralité|moralità|道徳|도덕
noun|other|slavery|奴隸制度|esclavitud|esclavage|schiavitù|奴隷制|노예 제도
noun|other|housing|住宅|vivienda|logement|alloggio|住宅|주택
noun|people|resident|居民|residente|habitant;habitante|residente|住民|주민
adjective|other|rural|鄉村的|rural|rural;rurale|rurale|田舎の|시골의
adjective|other|urban|都市的|urbano;urbana|urbain;urbaine|urbano;urbana|都会の|도시의
noun|other|gambling|賭博|juego de azar|jeu d'argent|gioco d'azzardo|ギャンブル|도박
noun|other|labor union;labour union|工會|sindicato|syndicat|sindacato|労働組合|노동조합
noun|other|solidarity|團結|solidaridad|solidarité|solidarietà|連帯|연대
noun|other|consensus|共識|consenso|consensus|consenso|合意|합의
noun|other|compromise|妥協|término medio|compromis|compromesso|妥協|타협
noun|other|stability|穩定|estabilidad|stabilité|stabilità|安定|안정
noun|other|chaos|混亂|caos|chaos|caos|混乱|혼란
noun|other|shortage|短缺|escasez|pénurie|carenza|不足|부족
noun|other|collapse|倒塌|derrumbe|effondrement|crollo|崩壊|붕괴
noun|other|crackdown|取締|medidas enérgicas|répression|giro di vite|取り締まり|단속
noun|other|deadlock|僵局|punto muerto|impasse|stallo|行き詰まり|교착 상태
noun|other|confrontation|對抗|confrontación|confrontation|confronto|対立|대립
noun|other|clash|衝突|enfrentamiento|affrontement|scontro|衝突|충돌
noun|other|surge|激增|repunte|flambée|impennata|急増|급증
noun|other|breakthrough|突破|avance|percée|svolta|突破口|돌파구
noun|other|disruption|中斷|interrupción|perturbation|interruzione|混乱（中断）|중단
noun|other|intervention|干預|intervención|intervention|intervento|介入|개입
verb|actions|interfere|干涉|interferir|interférer|interferire|干渉する|간섭하다
verb|actions|undermine|削弱|socavar|saper|minare|弱体化させる|약화시키다
verb|actions|implement|實施|implementar|mettre en œuvre|implementare|実施する|시행하다
verb|actions|displace|使流離失所|desplazar|déplacer|sfollare|追い立てる|쫓아내다
adjective|other|unprecedented|前所未有的|sin precedentes|sans précédent|senza precedenti|前例のない|전례 없다
adjective|other|mandatory|強制的|obligatorio;obligatoria|obligatoire|obbligatorio;obbligatoria|義務的な|의무적이다
adjective|other|former|前任的|antiguo;antigua|ancien;ancienne|ex|元の|전
adjective|other|subversive|顛覆性的|subversivo;subversiva|subversif;subversive|sovversivo;sovversiva|破壊的な|체제 전복적
adjective|other|turbulent|動盪的|turbulento;turbulenta|turbulent;turbulente|turbolento;turbolenta|激動の|격동의
noun|people|representative|代表|representante|représentant;représentante|rappresentante|代表|대표
noun|other|constituency|選區|circunscripción|circonscription|collegio elettorale|選挙区|선거구
noun|people|advocate|倡導者|defensor;defensora|défenseur|sostenitore;sostenitrice|提唱者|옹호자
noun|people|supporter|支持者|partidario;partidaria|partisan;partisane|sostenitore;sostenitrice|支持者|지지자
noun|people|correspondent|特派員|corresponsal|correspondant;correspondante|corrispondente|特派員|특파원
noun|people|commentator|評論員|comentarista|commentateur;commentatrice|commentatore;commentatrice|解説者|해설자
noun|other|outbreak|疫情爆發|brote|flambée épidémique|focolaio|流行の発生|발병
noun|other|epidemic|流行病|epidemia|épidémie|epidemia|流行病|유행병
noun|other|pandemic|全球大流行|pandemia|pandémie|pandemia|パンデミック|팬데믹
noun|other|lockdown|封城|confinamiento|confinement|lockdown|ロックダウン|봉쇄
noun|other|mourning|哀悼|luto|deuil|lutto|喪|애도
noun|other|pilgrimage|朝聖|peregrinación|pèlerinage|pellegrinaggio|巡礼|순례
adjective|other|religious|宗教的|religioso;religiosa|religieux;religieuse|religioso;religiosa|宗教的な|종교적
noun|other|God|上帝|Dios|Dieu|Dio|神|신;하나님
noun|other|Buddhism|佛教|budismo|bouddhisme|buddismo|仏教|불교
noun|other|Christianity|基督教|cristianismo|christianisme|cristianesimo|キリスト教|기독교
noun|other|Islam|伊斯蘭教|islam|islam|islam|イスラム教|이슬람교
noun|other|Taoism|道教|taoísmo|taoïsme|taoismo|道教|도교
noun|people|Buddhist|佛教徒|budista|bouddhiste|buddista|仏教徒|불교도
noun|people|Christian|基督徒|cristiano;cristiana|chrétien;chrétienne|cristiano;cristiana|キリスト教徒|기독교인
noun|people|Muslim|穆斯林|musulmán;musulmana|musulman;musulmane|musulmano;musulmana|イスラム教徒|무슬림
verb|actions|pray|祈禱|rezar|prier|pregare|祈る|기도하다
noun|other|prayer|禱告|oración|prière|preghiera|祈り|기도
noun|people|priest|神父|sacerdote|prêtre|prete|神父|신부
noun|people|monk|僧侶|monje|moine|monaco|僧|승려
noun|people|nun|修女|monja|religieuse|suora|修道女|수녀
noun|objects|mosque|清真寺|mezquita|mosquée|moschea|モスク|모스크
noun|objects|abbey|修道院|abadía|abbaye|abbazia|修道院|수도원
noun|objects|Bible|聖經|Biblia|Bible|Bibbia|聖書|성경
noun|other|faith|信仰|fe|foi|fede|信仰|신앙
noun|other|heaven|天堂|cielo|paradis|paradiso|天国|천국
noun|other|hell|地獄|infierno|enfer|inferno|地獄|지옥
noun|other|devil|魔鬼|diablo|diable|diavolo|悪魔|악마
noun|other|soul|靈魂|alma|âme|anima|魂|영혼
noun|objects|cross|十字架|cruz|croix|croce|十字架|십자가
noun|other|angel|天使|ángel|ange|angelo|天使|천사
noun|other|ghost|鬼|fantasma|fantôme|fantasma|幽霊|유령
noun|other|miracle|奇蹟|milagro|miracle|miracolo|奇跡|기적
noun|other|sin|罪|pecado|péché|peccato|罪|죄
adjective|other|sacred|神聖的|sagrado;sagrada|sacré;sacrée|sacro;sacra|神聖な|신성하다
noun|people|atheist|無神論者|ateo;atea|athée|ateo;atea|無神論者|무신론자
noun|other|Mid-Autumn Festival|中秋節|Fiesta del Medio Otoño|fête de la Mi-Automne|festa di metà autunno|中秋節|추석
noun|other|Dragon Boat Festival|端午節|Festival del Bote del Dragón|fête des bateaux-dragons|festa delle barche drago|端午節|단오
noun|other|Lantern Festival|元宵節|Festival de los Faroles|fête des lanternes|festa delle lanterne|元宵節|정월 대보름
noun|other|Tomb Sweeping Day|清明節|Festival de Qingming|fête de Qingming|festa di Qingming|清明節|청명절
noun|other|Easter|復活節|Pascua|Pâques|Pasqua|イースター|부활절
noun|other|Halloween|萬聖節|Halloween|Halloween|Halloween|ハロウィン|핼러윈
noun|other|Ramadan|齋戒月|ramadán|ramadan|ramadan|ラマダン|라마단
verb|actions|deny|否認|negar|nier|negare|否定する|부인하다
verb|actions|confirm|確認|confirmar|confirmer|confermare|確認する|확인하다
verb|actions|condemn|譴責|condenar|condamner|condannare|非難する|규탄하다
verb|actions|injure|傷害|herir|blesser|ferire|傷つける|다치게 하다
adjective|other|peaceful|和平的|pacífico;pacífica|pacifique|pacifico;pacifica|平和な|평화롭다
adjective|other|armed|武裝的|armado;armada|armé;armée|armato;armata|武装した|무장한
adjective|other|racist|種族歧視的|racista|raciste|razzista|人種差別的な|인종 차별적
noun|other|network|網路|red|réseau|rete|ネットワーク|네트워크
noun|other|web page|網頁|página web|page web|pagina web|ウェブページ|웹페이지
noun|other|browser|瀏覽器|navegador|navigateur|browser|ブラウザ|브라우저
noun|other|search engine|搜尋引擎|buscador;motor de búsqueda|moteur de recherche|motore di ricerca|検索エンジン|검색 엔진
noun|other|program|程式|programa|programme|programma|プログラム|프로그램
noun|other|code|程式碼|código|code|codice|コード|코드
noun|other|folder|資料夾|carpeta|dossier|cartella|フォルダ|폴더
noun|other|icon|圖示|icono|icône|icona|アイコン|아이콘
noun|other|cursor|游標|cursor|curseur|cursore|カーソル|커서
noun|other|spam|垃圾郵件|correo basura;spam|spam;courrier indésirable|spam|迷惑メール|스팸
noun|people|hacker|駭客|hacker;pirata informático|pirate informatique;hacker|hacker|ハッカー|해커
noun|other|backup|備份|copia de seguridad|sauvegarde|backup;copia di sicurezza|バックアップ|백업
noun|other|update|更新|actualización|mise à jour|aggiornamento|アップデート|업데이트
verb|actions|install|安裝|instalar|installer|installare|インストールする|설치하다
verb|actions|uninstall|解除安裝|desinstalar|désinstaller|disinstallare|アンインストールする|삭제하다
verb|actions|upload|上傳|subir|mettre en ligne;téléverser|caricare|アップロードする|업로드하다
verb|actions|copy|複製|copiar|copier|copiare|コピーする|복사하다
verb|actions|paste|貼上|pegar|coller|incollare|貼り付ける|붙여넣다
verb|actions|recharge|充電|recargar;cargar|recharger|ricaricare;caricare|充電する|충전하다
verb|actions|swipe|滑動|deslizar|balayer;glisser|scorrere|スワイプする|스와이프하다
phrase|other|press and hold|按住|mantener pulsado;mantener presionado|appuyer longuement|tenere premuto|長押しする|길게 누르다
noun|objects|touchscreen|觸控螢幕|pantalla táctil|écran tactile|schermo tattile;touchscreen|タッチスクリーン|터치스크린
noun|other|screenshot|截圖;螢幕截圖|captura de pantalla|capture d'écran|screenshot;schermata|スクリーンショット|스크린숏
noun|other|ringtone|鈴聲|tono de llamada|sonnerie|suoneria|着信音|벨소리
noun|other|text message|簡訊|mensaje de texto;SMS|SMS|SMS|ショートメッセージ|문자 메시지
noun|other|emoji|表情符號|emoji|émoji|emoji|絵文字|이모티콘
noun|other|voice message|語音訊息|mensaje de voz;nota de voz|message vocal|messaggio vocale|音声メッセージ|음성 메시지
noun|other|group chat|群組|chat de grupo|groupe de discussion|chat di gruppo|グループチャット|단톡방
noun|other|hashtag|主題標籤;hashtag|hashtag|hashtag|hashtag|ハッシュタグ|해시태그
noun|people|follower|追蹤者|seguidor;seguidora|abonné;abonnée|follower|フォロワー|팔로워
noun|other|post|貼文|publicación;post|publication;post|post|投稿|게시물
noun|other|profile|個人檔案|perfil|profil|profilo|プロフィール|프로필
noun|other|username|使用者名稱|nombre de usuario|nom d'utilisateur|nome utente|ユーザー名|사용자 이름
verb|actions|log out|登出|cerrar sesión|se déconnecter|disconnettersi|ログアウトする|로그아웃하다
verb|actions|sign up|註冊|registrarse|s'inscrire|registrarsi;iscriversi|登録する|가입하다
adjective|other|online|線上|en línea|en ligne|online;in linea|オンライン|온라인
adjective|other|offline|離線|sin conexión;fuera de línea|hors ligne|offline|オフライン|오프라인
adjective|other|wireless|無線|inalámbrico;inalámbrica|sans fil|senza fili;wireless|無線の|무선
noun|other|Bluetooth|藍牙|Bluetooth|Bluetooth|Bluetooth|ブルートゥース|블루투스
noun|other|signal|訊號|señal|signal|segnale|電波|신호
noun|objects|router|路由器;分享器|router;enrutador|routeur|router|ルーター|공유기
noun|objects|webcam|網路攝影機|cámara web;webcam|webcam|webcam|ウェブカメラ|웹캠
noun|other|server|伺服器|servidor|serveur|server|サーバー|서버
noun|other|database|資料庫|base de datos|base de données|database;base di dati|データベース|데이터베이스
noun|other|algorithm|演算法|algoritmo|algorithme|algoritmo|アルゴリズム|알고리즘
noun|objects|robot|機器人|robot|robot|robot|ロボット|로봇
noun|objects|drone|無人機|dron|drone|drone|ドローン|드론
noun|objects|satellite|衛星|satélite|satellite|satellite|衛星|위성
noun|objects|rocket|火箭|cohete|fusée|razzo|ロケット|로켓
noun|other|version|版本|versión|version|versione|バージョン|버전
noun|other|option|選項|opción|option|opzione|選択肢|선택지
noun|other|setting|設定|configuración;ajuste|paramètre;réglage|impostazione|設定|설정
adjective|other|default|預設|predeterminado;predeterminada|par défaut|predefinito;predefinita|初期設定|기본값
noun|other|brightness|亮度|brillo|luminosité|luminosità|明るさ|밝기
noun|other|volume|音量|volumen|volume|volume|音量|음량
noun|other|airplane mode|飛航模式|modo avión|mode avion|modalità aereo|機内モード|비행기 모드
noun|other|tab|分頁|pestaña|onglet|scheda|タブ|탭
noun|other|research|研究|investigación|recherche|ricerca|研究|연구
noun|people|researcher|研究人員;研究者|investigador;investigadora|chercheur;chercheuse|ricercatore;ricercatrice|研究者|연구원
noun|other|theory|理論|teoría|théorie|teoria|理論|이론
noun|other|hypothesis|假說;假設|hipótesis|hypothèse|ipotesi|仮説|가설
noun|other|analysis|分析|análisis|analyse|analisi|分析|분석
verb|actions|analyze;analyse|分析|analizar|analyser|analizzare|分析する|분석하다
noun|other|conclusion|結論|conclusión|conclusion|conclusione|結論|결론
noun|other|proof|證明|prueba|preuve|prova|証明|증명
noun|other|experiment|實驗|experimento|expérience|esperimento|実験|실험
noun|objects|laboratory|實驗室|laboratorio|laboratoire|laboratorio|研究室|실험실
noun|other|perception|感知;知覺|percepción|perception|percezione|知覚|지각
noun|other|paradox|悖論|paradoja|paradoxe|paradosso|逆説|역설
noun|other|analogy|類比|analogía|analogie|analogia|類推|유추
noun|other|concept|概念|concepto|concept|concetto|概念|개념
noun|other|principle|原則|principio|principe|principio|原則|원칙
noun|other|capability|能力|capacidad|capacité|capacità|能力|능력
noun|other|abbreviation|縮寫|abreviatura|abréviation|abbreviazione|略語|약어
noun|other|questionnaire|問卷|cuestionario|questionnaire|questionario|アンケート|설문지
noun|other|measurement|測量|medición;medida|mesure|misurazione;misura|測定|측정
noun|other|formula|公式|fórmula|formule|formula|公式|공식
noun|other|equation|方程式|ecuación|équation|equazione|方程式|방정식
noun|other|statistics|統計|estadística|statistique|statistica|統計|통계
noun|other|diagram|示意圖|diagrama|schéma|schema|図|도표
noun|other|geometry|幾何|geometría|géométrie|geometria|幾何学|기하학
noun|other|algebra|代數|álgebra|algèbre|algebra|代数|대수
noun|other|fraction|分數|fracción|fraction|frazione|分数|분수
noun|other|angle|角度|ángulo|angle|angolo|角度|각도
verb|actions|subtract|減去;減|restar|soustraire|sottrarre|引く|빼다
verb|actions|multiply|乘以;乘|multiplicar|multiplier|moltiplicare|掛ける|곱하다
verb|actions|divide|除以;除|dividir|diviser|dividere|割る|나누다
noun|other|atom|原子|átomo|atome|atomo|原子|원자
noun|other|molecule|分子|molécula|molécule|molecola|分子|분자
noun|other|cell|細胞|célula|cellule|cellula|細胞|세포
noun|other|gene|基因|gen|gène|gene|遺伝子|유전자
noun|other|DNA|DNA|ADN|ADN|DNA|DNA|DNA
noun|other|evolution|演化|evolución|évolution|evoluzione|進化|진화
noun|other|energy|能量|energía|énergie|energia|エネルギー|에너지
noun|other|gravity|重力|gravedad|gravité|gravità|重力|중력
noun|other|electricity|電|electricidad|électricité|elettricità|電気|전기
noun|objects|magnet|磁鐵|imán|aimant|magnete;calamita|磁石|자석
noun|other|oxygen|氧氣|oxígeno|oxygène|ossigeno|酸素|산소
noun|other|hydrogen|氫|hidrógeno|hydrogène|idrogeno|水素|수소
noun|other|carbon dioxide|二氧化碳|dióxido de carbono|dioxyde de carbone|anidride carbonica|二酸化炭素|이산화탄소
noun|other|element|元素|elemento|élément|elemento|元素|원소
noun|other|liquid|液體|líquido|liquide|liquido|液体|액체
noun|other|solid|固體|sólido|solide|solido|固体|고체
noun|objects|microscope|顯微鏡|microscopio|microscope|microscopio|顕微鏡|현미경
noun|objects|telescope|望遠鏡|telescopio|télescope|telescopio|望遠鏡|망원경
noun|objects|thermometer|溫度計|termómetro|thermomètre|termometro|温度計|온도계
noun|objects|sensor|感測器|sensor|capteur|sensore|センサー|센서
noun|other|circuit|電路|circuito|circuit|circuito|回路|회로
noun|other|orbit|軌道|órbita|orbite|orbita|軌道|궤도
noun|other|astronomy|天文學|astronomía|astronomie|astronomia|天文学|천문학
noun|objects|prism|稜鏡|prisma|prisme|prisma|プリズム|프리즘
noun|other|hexagon|六邊形|hexágono|hexagone|esagono|六角形|육각형
noun|other|inertia|慣性|inercia|inertie|inerzia|慣性|관성
noun|other|condensation|凝結|condensación|condensation|condensazione;condensa|凝結|응결
noun|other|dopamine|多巴胺|dopamina|dopamine|dopamina|ドーパミン|도파민
noun|other|pronoun|代名詞|pronombre|pronom|pronome|代名詞|대명사
noun|other|adverb|副詞|adverbio|adverbe|avverbio|副詞|부사
noun|other|conjunction|連接詞|conjunción|conjonction|congiunzione|接続詞|접속사
noun|other|vowel|母音|vocal|voyelle|vocale|母音|모음
noun|other|consonant|子音|consonante|consonne|consonante|子音|자음
noun|other|syllable|音節|sílaba|syllabe|sillaba|音節|음절
noun|other|alphabet|字母表|alfabeto|alphabet|alfabeto|アルファベット|알파벳
noun|other|punctuation|標點符號|puntuación|ponctuation|punteggiatura|句読点|문장 부호
noun|other|comma|逗號|coma|virgule|virgola|コンマ|쉼표
noun|other|full stop|句號|punto|point|punto|句点|마침표
noun|other|question mark|問號|signo de interrogación|point d'interrogation|punto interrogativo|疑問符|물음표
noun|other|exclamation mark|驚嘆號|signo de exclamación|point d'exclamation|punto esclamativo|感嘆符|느낌표
noun|other|paragraph|段落|párrafo|paragraphe|paragrafo|段落|단락
noun|other|tense|時態|tiempo verbal|temps|tempo verbale|時制|시제
noun|other|plural|複數|plural|pluriel|plurale|複数形|복수
noun|other|singular|單數|singular|singulier|singolare|単数形|단수
adjective|other|masculine|陽性|masculino;masculina|masculin;masculine|maschile|男性形|남성형
adjective|other|feminine|陰性|femenino;femenina|féminin;féminine|femminile|女性形|여성형
noun|other|spelling|拼字|ortografía|orthographe|ortografia|つづり|철자
noun|other|synonym|同義詞|sinónimo|synonyme|sinonimo|同義語|동의어
noun|other|antonym|反義詞|antónimo|antonyme|contrario;antonimo|反義語|반의어
noun|other|idiom|慣用語|modismo|expression idiomatique|modo di dire|慣用句|관용구
noun|other|slang|俚語|jerga|argot|gergo|俗語|속어
noun|other|proverb|諺語|proverbio;refrán|proverbe|proverbio|ことわざ|속담
noun|other|dialect|方言|dialecto|dialecte|dialetto|方言|방언;사투리
noun|people|native speaker|母語人士|hablante nativo;hablante nativa|locuteur natif;locutrice native|madrelingua|ネイティブスピーカー|원어민
adjective|other|bilingual|雙語|bilingüe|bilingue|bilingue|バイリンガルの|이중 언어
adjective|other|fluent|流利|fluido;fluida|courant;courante|fluente|流暢な|유창하다
noun|people|interpreter|口譯員|intérprete|interprète|interprete|通訳者|통역사
noun|other|subtitle|字幕|subtítulo|sous-titre|sottotitolo|字幕|자막
noun|other|chapter|章節|capítulo|chapitre|capitolo|章|장
noun|other|summary|摘要|resumen|résumé|riassunto|要約|요약
verb|actions|summarize;summarise|總結|resumir|résumer|riassumere|要約する|요약하다
noun|other|essay|作文|redacción|rédaction|tema|作文|작문
noun|other|thesis|論文|tesis|thèse|tesi|論文|논문
noun|other|assignment|作業|tarea|devoir|compito|課題|과제
phrase|other|take notes|做筆記|tomar apuntes|prendre des notes|prendere appunti|メモを取る|필기하다
noun|objects|flashcard|單字卡|tarjeta de estudio;flashcard|fiche de révision;flashcard|flashcard;scheda di studio|単語カード|단어 카드
verb|actions|revise|複習|repasar|réviser|ripassare|見直す|복습하다
verb|actions|cheat|作弊|hacer trampa|tricher|barare|カンニングする|커닝하다
phrase|other|skip class|翹課|faltar a clase|sécher les cours|saltare la lezione|授業をサボる|수업을 빼먹다
noun|objects|blackboard|黑板|pizarra;pizarrón|tableau;tableau noir|lavagna|黒板|칠판
noun|objects|whiteboard|白板|pizarra blanca|tableau blanc|lavagna bianca|ホワイトボード|화이트보드
noun|objects|chalk|粉筆|tiza|craie|gesso|チョーク|분필
noun|objects|highlighter|螢光筆|marcador fluorescente;resaltador|surligneur|evidenziatore|蛍光ペン|형광펜
noun|objects|school bus|校車|autobús escolar|car scolaire;bus scolaire|scuolabus|スクールバス|스쿨버스
noun|objects|locker|置物櫃|casillero;taquilla|casier|armadietto|ロッカー|사물함
noun|objects|kindergarten|幼兒園|jardín de infancia;kínder|école maternelle|scuola dell'infanzia;scuola materna|幼稚園|유치원
noun|objects|primary school|國小;小學|escuela primaria|école primaire|scuola elementare|小学校|초등학교
noun|objects|middle school|國中|escuela secundaria|collège|scuola media|中学校|중학교
noun|objects|high school|高中|bachillerato;preparatoria|lycée|scuola superiore;liceo|高校|고등학교
noun|people|professor|教授|profesor;profesora|professeur;professeure|professore;professoressa|教授|교수
noun|people|graduate|畢業生|graduado;graduada|diplômé;diplômée|laureato;laureata|卒業生|졸업생
noun|people|private tutor|家教|profesor particular;profesora particular|professeur particulier;professeure particulière|insegnante privato;insegnante privata|家庭教師|과외 선생님
noun|other|scholarship|獎學金|beca|bourse|borsa di studio|奨学金|장학금
noun|objects|diploma|畢業證書;文憑|diploma|diplôme|diploma|卒業証書|졸업장
noun|other|semester|學期|semestre|semestre|semestre|学期|학기
noun|objects|campus|校園|campus|campus|campus|キャンパス|캠퍼스
noun|objects|dormitory|宿舍|residencia universitaria|résidence universitaire|residenza universitaria|寮|기숙사
noun|other|lecture|演講;講座|conferencia|conférence|conferenza|講義|강의
noun|other|master's degree|碩士學位|máster;maestría|master|laurea magistrale|修士号|석사 학위
noun|other|bachelor's degree|學士學位|licenciatura;grado|licence|laurea triennale|学士号|학사 학위
noun|other|doctorate|博士學位|doctorado|doctorat|dottorato|博士号|박사 학위
noun|other|curriculum|課程|plan de estudios|programme scolaire|piano di studi|カリキュラム|교육 과정
adjective|other|academic|學術|académico;académica|académique|accademico;accademica|学問的な|학문적
adjective|other|scientific|科學的|científico;científica|scientifique|scientifico;scientifica|科学的な|과학적
adjective|other|digital|數位|digital|numérique|digitale|デジタルの|디지털
adjective|other|electronic|電子|electrónico;electrónica|électronique|elettronico;elettronica|電子の|전자
adjective|other|automatic|自動|automático;automática|automatique|automatico;automatica|自動の|자동
adjective|other|virtual|虛擬|virtual|virtuel;virtuelle|virtuale|仮想の|가상
adjective|other|artificial|人工;人造|artificial|artificiel;artificielle|artificiale|人工の|인공
adjective|other|advanced|進階|avanzado;avanzada|avancé;avancée|avanzato;avanzata|上級の|고급
adjective|other|intermediate|中級|intermedio;intermedia|intermédiaire|intermedio;intermedia|中級の|중급
adjective|other|basic|基本|básico;básica|de base;basique|di base;basilare|基本的な|기본
verb|actions|predict|預測|predecir;prever|prédire;prévoir|prevedere;predire|予測する|예측하다
verb|actions|estimate|估計|estimar|estimer|stimare|見積もる|추정하다
verb|actions|observe|觀察|observar|observer|osservare|観察する|관찰하다
verb|actions|examine|檢查|examinar|examiner|esaminare|調べる|검사하다
verb|actions|define|定義|definir|définir|definire|定義する|정의하다
noun|other|definition|定義|definición|définition|definizione|定義|정의
verb|actions|evaluate|評估|evaluar|évaluer|valutare|評価する|평가하다
noun|other|reference|參考|referencia|référence|riferimento|参考|참고
noun|other|trend|趨勢|tendencia|tendance|tendenza|傾向|추세
noun|other|aspect|層面;方面|aspecto|aspect|aspetto|側面|측면
noun|other|category|類別|categoría|catégorie|categoria|カテゴリー|범주
noun|other|structure|結構|estructura|structure|struttura|構造|구조
noun|other|system|系統|sistema|système|sistema|システム|시스템
noun|other|process|過程|proceso|processus|processo|過程|과정
noun|other|phase|階段|fase|phase|fase|段階|단계
noun|other|development|發展|desarrollo|développement|sviluppo|発展|발전
noun|other|innovation|創新|innovación|innovation|innovazione|革新|혁신
noun|objects|device|裝置|dispositivo|appareil|dispositivo|装置|장치
noun|objects|engine|引擎;發動機|motor|moteur|motore|エンジン|엔진
noun|other|invention|發明|invento;invención|invention|invenzione|発明|발명
verb|actions|invent|發明|inventar|inventer|inventare|発明する|발명하다
noun|other|discovery|發現|descubrimiento|découverte|scoperta|発見|발견
noun|people|inventor|發明家|inventor;inventora|inventeur;inventrice|inventore;inventrice|発明家|발명가
noun|people|developer|開發人員;開發者|desarrollador;desarrolladora|développeur;développeuse|sviluppatore;sviluppatrice|開発者|개발자
noun|people|user|使用者|usuario;usuaria|utilisateur;utilisatrice|utente|ユーザー|사용자
noun|people|blogger|部落客|bloguero;bloguera|blogueur;blogueuse|blogger|ブロガー|블로거
noun|people|influencer|網紅|influencer;influenciador|influenceur;influenceuse|influencer|インフルエンサー|인플루언서
noun|other|blog|部落格|blog|blog|blog|ブログ|블로그
noun|people|reporter|記者|reportero;reportera|reporter|reporter|記者|기자
noun|objects|flash drive|隨身碟|memoria USB;pendrive|clé USB|chiavetta USB|USBメモリー|USB 메모리
noun|objects|hard drive|硬碟|disco duro|disque dur|disco rigido|ハードディスク|하드 디스크
noun|objects|power bank|行動電源|batería externa;power bank|batterie externe|power bank|モバイルバッテリー|보조 배터리
noun|objects|phone case|手機殼|funda|coque|custodia|スマホケース|휴대폰 케이스
noun|objects|desktop computer|桌上型電腦;桌機|computadora de escritorio;ordenador de sobremesa|ordinateur de bureau|computer fisso|デスクトップパソコン|데스크톱 컴퓨터
noun|other|operating system|作業系統|sistema operativo|système d'exploitation|sistema operativo|オペレーティングシステム|운영 체제
noun|other|font|字型;字體|fuente;tipografía|police|carattere|フォント|글꼴
noun|other|software bug|程式錯誤;bug|error de software;bug|bug|bug|バグ|버그
noun|other|glitch|小故障|fallo;falla|pépin|glitch;intoppo|不具合|오류
verb|actions|restart|重新啟動;重開機|reiniciar|redémarrer|riavviare|再起動する|재시작하다
noun|other|media|媒體|medios de comunicación;medios|médias|media|メディア|미디어
noun|other|headline|標題|titular|titre|titolo|見出し|헤드라인
noun|other|article|文章|artículo|article|articolo|記事|기사
noun|other|channel|頻道|canal|chaîne|canale|チャンネル|채널
noun|other|episode|集|episodio|épisode|episodio|話（エピソード）|회;에피소드
noun|other|audience|觀眾|público|public|pubblico|観客|관객
verb|actions|subscribe|訂閱|suscribirse|s'abonner|abbonarsi|登録する（購読）|구독하다
noun|other|streaming|串流|streaming|streaming|streaming|ストリーミング|스트리밍
noun|other|playlist|播放清單|lista de reproducción|playlist|playlist|プレイリスト|재생 목록
noun|other|privacy|隱私|privacidad|vie privée|privacy;riservatezza|プライバシー|사생활
noun|other|tutorial|教學|tutorial|tutoriel|tutorial|チュートリアル|튜토리얼
noun|other|chatbot|聊天機器人|chatbot|chatbot|chatbot|チャットボット|챗봇
adjective|other|stressed|壓力大|estresado;estresada|stressé;stressée|stressato;stressata|ストレスがたまった|스트레스를 받다
adjective|other|anxious|焦慮|ansioso;ansiosa|anxieux;anxieuse|ansioso;ansiosa|不安な|불안하다
adjective|other|exhausted|筋疲力盡|agotado;agotada|épuisé;épuisée|esausto;esausta|へとへとの|녹초가 되다
adjective|other|confident|有自信;有信心|seguro de sí mismo;segura de sí misma|sûr de soi;sûre de soi|sicuro di sé;sicura di sé|自信のある|자신 있다
adjective|other|curious|好奇|curioso;curiosa|curieux;curieuse|curioso;curiosa|好奇心のある|호기심이 많다
adjective|other|bored|無聊|aburrido;aburrida|qui s'ennuie;ennuyé;ennuyée|annoiato;annoiata|退屈した|지루하다
adjective|other|scared|害怕|asustado;asustada|effrayé;effrayée|spaventato;spaventata|怖い|무섭다
adjective|other|shocked|震驚|impactado;impactada|choqué;choquée|scioccato;scioccata|ショックを受けた|충격을 받다
adjective|other|annoyed|惱火|molesto;molesta|agacé;agacée|infastidito;infastidita|いらいらした|짜증 나다
adjective|other|depressed|沮喪|deprimido;deprimida|déprimé;déprimée|depresso;depressa|落ち込んだ|우울하다
adjective|other|allergic|過敏|alérgico;alérgica|allergique|allergico;allergica|アレルギーのある|알레르기가 있다
adjective|other|painful|疼痛|doloroso;dolorosa|douloureux;douloureuse|doloroso;dolorosa|痛い|아프다
adjective|other|sleepy|想睡|con sueño|somnolent;somnolente|assonnato;assonnata|眠い|졸리다
adjective|other|nauseous|想吐|con náuseas|nauséeux;nauséeuse|nauseato;nauseata|吐き気がする|메스껍다
noun|other|diarrhea|腹瀉;拉肚子|diarrea|diarrhée|diarrea|下痢|설사
noun|other|nausea|噁心;反胃|náusea|nausée|nausea|吐き気|메스꺼움
verb|actions|vomit|嘔吐;吐|vomitar|vomir|vomitare|吐く|토하다
noun|other|rash|皮疹;疹子|sarpullido|éruption cutanée|eruzione cutanea|発疹|발진
noun|other|swelling|腫脹;腫|hinchazón|gonflement|gonfiore|腫れ|부기
noun|objects|wound|傷口|herida|plaie|ferita|傷口|상처
verb|actions|bleed|流血|sangrar|saigner|sanguinare|出血する|피가 나다
verb|actions|faint|暈倒;昏倒|desmayarse|s'évanouir|svenire|気絶する|기절하다
noun|other|infection|感染|infección|infection|infezione|感染|감염
noun|other|virus|病毒|virus|virus|virus|ウイルス|바이러스
noun|other|cancer|癌症|cáncer|cancer|cancro|がん|암
noun|other|diabetes|糖尿病|diabetes|diabète|diabete|糖尿病|당뇨병
noun|other|asthma|氣喘|asma|asthme|asma|ぜんそく|천식
noun|other|injection|注射|inyección|injection|iniezione|注射|주사
noun|objects|antibiotic|抗生素|antibiótico|antibiotique|antibiotico|抗生物質|항생제
noun|objects|painkiller|止痛藥|analgésico|antidouleur;analgésique|antidolorifico;analgesico|痛み止め|진통제
noun|other|side effect|副作用|efecto secundario|effet secondaire|effetto collaterale|副作用|부작용
noun|other|treatment|治療|tratamiento|traitement|trattamento|治療|치료
verb|actions|recover|康復|recuperarse|se rétablir|riprendersi|回復する|회복하다
noun|other|blood pressure|血壓|presión arterial;tensión arterial|tension artérielle|pressione sanguigna;pressione arteriosa|血圧|혈압
noun|other|x-ray|X光|radiografía|radiographie;radio|radiografia|レントゲン|엑스레이
noun|objects|waiting room|候診室|sala de espera|salle d'attente|sala d'attesa|待合室|대기실
noun|other|first aid|急救|primeros auxilios|premiers secours|primo soccorso|応急手当|응급 처치
noun|people|surgeon|外科醫師;外科醫生|cirujano;cirujana|chirurgien;chirurgienne|chirurgo;chirurga|外科医|외과 의사
noun|other|pregnancy|懷孕|embarazo|grossesse|gravidanza|妊娠|임신
noun|other|insomnia|失眠|insomnio|insomnie|insonnia|不眠症|불면증
noun|other|migraine|偏頭痛|migraña|migraine|emicrania|片頭痛|편두통
noun|other|depression|憂鬱症|depresión|dépression|depressione|うつ病|우울증
noun|other|anxiety|焦慮|ansiedad|anxiété|ansia;ansietà|不安（症）|불안
noun|other|addiction|成癮|adicción|dépendance|dipendenza|依存症|중독
adjective|other|addicted|上癮|adicto;adicta|dépendant;dépendante|dipendente|依存した|중독되다
noun|other|mental health|心理健康|salud mental|santé mentale|salute mentale|心の健康|정신 건강
verb|actions|stretch|伸展|estirarse|s'étirer|stirarsi|ストレッチする|스트레칭하다
verb|actions|lose weight|減肥;減重|adelgazar|maigrir|dimagrire|痩せる|살을 빼다
noun|other|diet|節食|dieta|régime|dieta|ダイエット|다이어트
noun|other|massage|按摩|masaje|massage|massaggio|マッサージ|마사지
noun|other|vitamin|維他命;維生素|vitamina|vitamine|vitamina|ビタミン|비타민
noun|objects|abdomen|腹部|abdomen|abdomen|addome|腹部|복부
noun|objects|spine|脊椎|columna vertebral|colonne vertébrale|colonna vertebrale|背骨|척추
noun|objects|rib|肋骨|costilla|côte|costola|肋骨|갈비뼈
noun|objects|skull|頭骨;頭蓋骨|cráneo|crâne|cranio|頭蓋骨|두개골
noun|objects|skeleton|骨骼|esqueleto|squelette|scheletro|骨格|골격
noun|objects|joint|關節|articulación|articulation|articolazione|関節|관절
noun|objects|kidney|腎臟;腎|riñón|rein|rene|腎臓|신장
noun|objects|nerve|神經|nervio|nerf|nervo|神経|신경
noun|objects|palm|手掌|palma de la mano;palma|paume|palmo della mano;palma della mano|手のひら|손바닥
noun|objects|wrinkle|皺紋|arruga|ride|ruga|しわ|주름
noun|objects|scar|疤痕;傷疤|cicatriz|cicatrice|cicatrice|傷跡|흉터
noun|objects|tattoo|刺青;紋身|tatuaje|tatouage|tatuaggio|タトゥー|문신
noun|objects|bruise|瘀青|moretón;moratón|bleu|livido|あざ|멍
noun|objects|pimple|痘痘|grano;espinilla|bouton|brufolo|にきび|여드름
noun|objects|sweat|汗|sudor|sueur|sudore|汗|땀
noun|other|tooth decay|蛀牙|caries|carie|carie|虫歯|충치
noun|other|fatigue|疲勞|cansancio|fatigue|stanchezza|疲労|피로
noun|other|dizziness|頭暈|mareo|vertige;étourdissement|capogiro|めまい|어지럼증
noun|other|constipation|便祕|estreñimiento|constipation|stitichezza|便秘|변비
verb|actions|itch|癢|picar|démanger|prudere|かゆみ|가려움
verb|actions|swell|腫起來|hincharse|enfler|gonfiarsi|腫れる|붓다
noun|other|sprain|扭傷|esguince|entorse|distorsione|ねんざ|삠
noun|other|fracture|骨折|fractura|fracture|frattura|骨折|골절
noun|other|cramp|抽筋|calambre|crampe|crampo|けいれん|쥐
noun|objects|blister|水泡|ampolla|ampoule|vescica|水ぶくれ|물집
verb|actions|snore|打呼|roncar|ronfler|russare|いびきをかく|코를 골다
verb|actions|yawn|打哈欠|bostezar|bâiller|sbadigliare|あくびをする|하품하다
verb|actions|shiver|發抖|tiritar|frissonner|rabbrividire|震える|떨다
noun|other|hangover|宿醉|resaca|gueule de bois|postumi della sbornia|二日酔い|숙취
noun|other|sunburn|曬傷|quemadura solar|coup de soleil|scottatura solare|日焼け|햇볕에 탐
noun|other|heatstroke|中暑|golpe de calor|coup de chaleur|colpo di calore|熱中症|열사병
noun|other|hay fever|花粉症|fiebre del heno|rhume des foins|raffreddore da fieno|花粉症|꽃가루 알레르기
noun|other|runny nose|流鼻水|moqueo|nez qui coule|naso che cola|鼻水|콧물
noun|other|stuffy nose|鼻塞|nariz tapada|nez bouché|naso chiuso|鼻づまり|코막힘
noun|other|food poisoning|食物中毒|intoxicación alimentaria|intoxication alimentaire|intossicazione alimentare|食中毒|식중독
noun|other|heart attack|心臟病發作;心肌梗塞|infarto;ataque al corazón|crise cardiaque|infarto|心臓発作|심장마비
noun|other|pneumonia|肺炎|neumonía|pneumonie|polmonite|肺炎|폐렴
adjective|other|chronic|慢性|crónico;crónica|chronique|cronico;cronica|慢性の|만성
adjective|other|benign|良性|benigno;benigna|bénin;bénigne|benigno;benigna|良性の|양성
adjective|other|contagious|有傳染性|contagioso;contagiosa|contagieux;contagieuse|contagioso;contagiosa|伝染性の|전염성이 있다
noun|objects|capsule|膠囊|cápsula|gélule|capsula|カプセル|캡슐
noun|objects|cough syrup|止咳糖漿|jarabe para la tos|sirop contre la toux|sciroppo per la tosse|せき止めシロップ|기침 시럽
noun|objects|ointment|藥膏|pomada;ungüento|pommade|pomata|軟膏|연고
noun|objects|petroleum jelly|凡士林|vaselina|vaseline|vaselina|ワセリン|바셀린
noun|other|vaccination|疫苗接種|vacunación|vaccination|vaccinazione|予防接種|예방 접종
noun|objects|wheelchair|輪椅|silla de ruedas|fauteuil roulant|sedia a rotelle|車いす|휠체어
noun|people|midwife|助產師;助產士|partera;matrona|sage-femme|ostetrica|助産師|조산사
noun|other|physical therapy|物理治療|fisioterapia|kinésithérapie|fisioterapia|理学療法|물리 치료
noun|other|scoliosis|脊椎側彎|escoliosis|scoliose|scoliosi|側弯症|척추 측만증
noun|objects|lymph node|淋巴結;淋巴腺|ganglio linfático|ganglion lymphatique|linfonodo|リンパ節|림프샘
noun|other|health scare|健康警訊;健康驚魂|susto de salud|alerte de santé|allarme per la salute|健康不安|건강 경고
noun|other|back pain|背痛;腰痛|dolor de espalda|mal de dos|mal di schiena|腰痛|허리 통증
verb|actions|catch a cold|感冒|resfriarse|attraper un rhume|raffreddarsi|風邪をひく|감기에 걸리다
verb|actions|have a fever|發燒|tener fiebre|avoir de la fièvre|avere la febbre|熱がある|열이 나다
verb|actions|take medicine|吃藥|tomar medicina|prendre un médicament|prendere una medicina|薬を飲む|약을 먹다
verb|actions|make an appointment|預約|pedir cita;pedir una cita|prendre rendez-vous|prendere appuntamento|予約を取る|예약하다
verb|actions|warm up|熱身|calentar|s'échauffer|riscaldarsi|ウォーミングアップする|준비 운동하다
verb|actions|jog|慢跑|hacer jogging;trotar|faire du jogging|fare jogging|ジョギングする|조깅하다
verb|actions|gain weight|變胖|engordar|grossir|ingrassare|太る|살이 찌다
noun|other|workout|健身|entrenamiento|entraînement|allenamento|トレーニング|운동
noun|other|push-up|伏地挺身|flexión;lagartija|pompe|flessione|腕立て伏せ|팔굽혀펴기
noun|other|calorie|卡路里;熱量|caloría|calorie|caloria|カロリー|칼로리
noun|other|protein|蛋白質|proteína|protéine|proteina|タンパク質|단백질
noun|other|sauna|三溫暖|sauna|sauna|sauna|サウナ|사우나
noun|other|foot massage|腳底按摩|masaje de pies|massage des pieds|massaggio ai piedi|足つぼマッサージ|발 마사지
noun|other|meditation|冥想|meditación|méditation|meditazione|瞑想|명상
noun|people|bodybuilder|健美選手|culturista;fisicoculturista|culturiste|culturista|ボディビルダー|보디빌더
adjective|other|overweight|過重|con sobrepeso|en surpoids|in sovrappeso|太りすぎの|과체중
adjective|other|slim|苗條|delgado;delgada|mince|snello;snella|ほっそりした|날씬하다
adjective|other|skinny|瘦巴巴|flaco;flaca|maigre|magro;magra|がりがりの|빼빼 마르다
adjective|other|blind|失明;看不見|ciego;ciega|aveugle|cieco;cieca|目の見えない|시각 장애가 있다
adjective|other|deaf|耳聾;聾;失聰|sordo;sorda|sourd;sourde|sordo;sorda|耳の聞こえない|청각 장애가 있다
adjective|other|attractive|有吸引力|atractivo;atractiva|séduisant;séduisante|attraente|魅力的な|매력적이다
adjective|other|cheerful|開朗|alegre|joyeux;joyeuse|allegro;allegra|明るい（性格）|명랑하다
adjective|other|moved|感動|conmovido;conmovida|ému;émue|commosso;commossa|感動した|감동하다
adjective|other|furious|暴怒|furioso;furiosa|furieux;furieuse|furioso;furiosa|激怒した|격노하다
adjective|other|relieved|如釋重負|aliviado;aliviada|soulagé;soulagée|sollevato;sollevata|ほっとした|안도하다
adjective|other|hopeful|充滿希望|esperanzado;esperanzada|plein d'espoir;pleine d'espoir|speranzoso;speranzosa|希望に満ちた|희망에 차다
adjective|other|terrified|驚恐|aterrorizado;aterrorizada|terrifié;terrifiée|terrorizzato;terrorizzata|おびえた|겁에 질리다
adjective|other|insecure|沒有安全感|inseguro;insegura|peu sûr de soi;peu sûre de soi|insicuro;insicura|自信のない|불안정하다
adjective|other|melancholy|憂鬱|melancólico;melancólica|mélancolique|malinconico;malinconica|憂鬱な|우울하다
adjective|other|disgusting|噁心|asqueroso;asquerosa|dégoûtant;dégoûtante|disgustoso;disgustosa|気持ち悪い|역겹다
adjective|other|negative|負面|negativo;negativa|négatif;négative|negativo;negativa|否定的な|부정적이다
other|other|proudly|自豪地|con orgullo|fièrement|orgogliosamente|誇らしげに|자랑스럽게
noun|other|boredom|無聊|aburrimiento|ennui|noia|退屈|지루함
noun|other|loneliness|孤單;寂寞|soledad|solitude|solitudine|孤独|외로움
noun|other|jealousy|嫉妒|celos|jalousie|gelosia|嫉妬|질투
noun|other|envy|羨慕|envidia|envie|invidia|羨望|부러움
noun|other|shame|羞愧;羞恥|vergüenza|honte|vergogna|恥|수치심
noun|other|guilt|罪惡感;內疚|culpa|culpabilité|colpa|罪悪感|죄책감
noun|other|embarrassment|尷尬|vergüenza|embarras|imbarazzo|気まずさ|민망함
noun|other|despair|絕望|desesperación|désespoir|disperazione|絶望|절망
noun|other|nostalgia|懷舊|nostalgia|nostalgie|nostalgia|郷愁|향수
noun|other|grief|悲痛|dolor|chagrin|dolore|深い悲しみ|비통
noun|other|pride|自豪|orgullo|fierté|orgoglio|誇り|자부심
noun|other|gratitude|感激|gratitud|gratitude|gratitudine|感謝の気持ち|감사
noun|other|curiosity|好奇心|curiosidad|curiosité|curiosità|好奇心|호기심
noun|other|disappointment|失望|decepción|déception|delusione|失望|실망
noun|other|confusion|困惑|confusión|confusion|confusione|混乱|혼란
noun|other|self-esteem|自尊|autoestima|estime de soi|autostima|自尊心|자존감
noun|other|confidence|自信|confianza en uno mismo|confiance en soi|fiducia in sé|自信|자신감
noun|other|personality|個性;性格|personalidad|personnalité|personalità|性格|성격
noun|other|sense of humor|幽默感|sentido del humor|sens de l'humour|senso dell'umorismo|ユーモアのセンス|유머 감각
noun|other|ambition|野心|ambición|ambition|ambizione|野心|야망
noun|other|arrogance|傲慢|arrogancia|arrogance|arroganza|傲慢|오만
noun|other|self-discipline|自律|autodisciplina|autodiscipline|autodisciplina|自制心|자기 관리
adjective|other|ambitious|有野心|ambicioso;ambiciosa|ambitieux;ambitieuse|ambizioso;ambiziosa|野心的な|야심 있다
adjective|other|arrogant|傲慢|arrogante|arrogant;arrogante|arrogante|傲慢な|오만하다
adjective|other|courageous|勇敢|valiente|courageux;courageuse|coraggioso;coraggiosa|勇ましい|용감하다
adjective|other|courteous|有禮貌|cortés|courtois;courtoise|cortese|礼儀正しい|공손하다
adjective|other|meticulous|一絲不苟|meticuloso;meticulosa|méticuleux;méticuleuse|meticoloso;meticolosa|几帳面な|꼼꼼하다
adjective|other|conscientious|盡責|concienzudo;concienzuda|consciencieux;consciencieuse|coscienzioso;coscienziosa|良心的な|성실하다
adjective|other|audacious|大膽|audaz|audacieux;audacieuse|audace|大胆な|대담하다
adjective|other|discreet|低調|discreto;discreta|discret;discrète|discreto;discreta|控えめな|신중하다
adjective|other|tenacious|堅毅|tenaz|tenace|tenace|粘り強い|끈질기다
adjective|other|stubborn|固執;頑固|terco;terca|têtu;têtue|testardo;testarda|頑固な|고집이 세다
adjective|other|mature|成熟|maduro;madura|mûr;mûre|maturo;matura|成熟した|성숙하다
adjective|other|unconditional|無條件|incondicional|inconditionnel;inconditionnelle|incondizionato;incondizionata|無条件の|무조건적
adjective|other|humble|謙卑|humilde|humble|umile|謙虚な|겸허하다
adjective|other|modest|謙虛|modesto;modesta|modeste|modesto;modesta|謙遜した|겸손하다
adjective|other|sincere|真誠|sincero;sincera|sincère|sincero;sincera|誠実な|진실하다
adjective|other|considerate|體貼|considerado;considerada|prévenant;prévenante|premuroso;premurosa|思いやりのある|배려심 있다
adjective|other|loyal|忠誠|leal|loyal;loyale|leale|忠実な|충실하다
adjective|other|determined|有決心|decidido;decidida|déterminé;déterminée|determinato;determinata|決意の固い|결심이 굳다
adjective|other|cautious|謹慎|cauteloso;cautelosa|prudent;prudente|cauto;cauta|用心深い|신중하다
adjective|other|charming|迷人|encantador;encantadora|charmant;charmante|affascinante|魅力的な|매력 있다
adjective|other|creative|有創意|creativo;creativa|créatif;créative|creativo;creativa|創造的な|창의적이다
adjective|other|cruel|殘忍|cruel|cruel;cruelle|crudele|残酷な|잔인하다
adjective|other|cowardly|膽小|cobarde|lâche|codardo;codarda|臆病な|겁이 많다
adjective|other|dishonest|不誠實|deshonesto;deshonesta|malhonnête|disonesto;disonesta|不誠実な|부정직하다
adjective|other|energetic|精力充沛|enérgico;enérgica|énergique|energico;energica|元気いっぱいの|활기차다
adjective|other|extroverted|外向|extrovertido;extrovertida|extraverti;extravertie|estroverso;estroversa|外向的な|외향적이다
adjective|other|introverted|內向|introvertido;introvertida|introverti;introvertie|introverso;introversa|内向的な|내성적이다
adjective|other|greedy|貪心|codicioso;codiciosa|avide|avido;avida|欲張りな|욕심이 많다
adjective|other|naive|天真|ingenuo;ingenua|naïf;naïve|ingenuo;ingenua|世間知らずの|순진하다
adjective|other|sensitive|敏感|sensible|sensible|sensibile|敏感な|예민하다
adjective|other|talkative|話多|hablador;habladora|bavard;bavarde|loquace|おしゃべりな|수다스럽다
adjective|other|wise|有智慧|sabio;sabia|sage|saggio;saggia|賢い|지혜롭다
adjective|other|grumpy|脾氣差|gruñón;gruñona|grincheux;grincheuse|scontroso;scontrosa|気難しい|까칠하다
adjective|other|silly|傻氣|tonto;tonta|bête|sciocco;sciocca|ばかげた|바보 같다
adjective|other|tender|溫柔|tierno;tierna|tendre|tenero;tenera|優しい|상냥하다
noun|people|acquaintance|熟人|conocido;conocida|connaissance|conoscente|知り合い|지인
noun|people|ex|前任|ex|ex|ex|元恋人|전 애인
noun|people|fiancé|未婚夫|prometido|fiancé|fidanzato|婚約者（男性）|약혼자
noun|people|fiancée|未婚妻|prometida|fiancée|fidanzata|婚約者（女性）|약혼녀
noun|people|spouse|配偶|cónyuge|conjoint;conjointe|coniuge|配偶者|배우자
noun|people|widow|寡婦|viuda|veuve|vedova|未亡人|과부
noun|people|twin|雙胞胎|gemelo;gemela|jumeau;jumelle|gemello;gemella|双子の一人|쌍둥이
noun|people|father-in-law|岳父;公公|suegro|beau-père|suocero|義父|장인;시아버지
noun|people|mother-in-law|岳母;婆婆|suegra|belle-mère|suocera|義母|장모;시어머니
noun|people|son-in-law|女婿|yerno|gendre|genero|婿|사위
noun|people|daughter-in-law|媳婦|nuera|belle-fille|nuora|嫁|며느리
noun|people|stepfather|繼父|padrastro|beau-père|patrigno|継父|새아버지
noun|people|stepmother|繼母|madrastra|belle-mère|matrigna|継母|새어머니
noun|people|grandparent|祖父母|abuelo;abuela|grand-parent|nonno;nonna|祖父母（の一人）|조부모
noun|people|old friend|老朋友|viejo amigo;vieja amiga|vieil ami;vieille amie|vecchio amico;vecchia amica|古い友だち|오랜 친구
noun|people|new friend|新朋友|nuevo amigo;nueva amiga|nouvel ami;nouvelle amie|nuovo amico;nuova amica|新しい友だち|새 친구
noun|people|childhood friend|童年好友|amigo de la infancia;amiga de la infancia|ami d'enfance;amie d'enfance|amico d'infanzia;amica d'infanzia|幼なじみ|소꿉친구
noun|people|sweetheart|甜心|cariño|chéri;chérie|tesoro|恋人|자기;연인
noun|people|bride|新娘|novia|mariée|sposa|花嫁|신부
noun|people|groom|新郎|novio|marié|sposo|花婿|신랑
adjective|other|divorced|離婚|divorciado;divorciada|divorcé;divorcée|divorziato;divorziata|離婚した|이혼하다
adjective|other|engaged|已訂婚|comprometido;comprometida|fiancé;fiancée|fidanzato;fidanzata|婚約した|약혼하다
adjective|other|separated|分居|separado;separada|séparé;séparée|separato;separata|別居中の|별거 중이다
noun|other|anniversary|紀念日;週年|aniversario|anniversaire|anniversario|記念日|기념일
noun|other|bachelor party|單身派對|despedida de soltero|enterrement de vie de garçon|addio al celibato|独身最後のパーティー|총각 파티
noun|other|birthday party|生日派對|fiesta de cumpleaños|fête d'anniversaire|festa di compleanno|誕生日パーティー|생일 파티
noun|objects|wedding dress|婚紗|vestido de novia|robe de mariée|abito da sposa|ウェディングドレス|웨딩드레스
noun|objects|wedding ring|婚戒|anillo de boda;alianza|alliance|fede nuziale|結婚指輪|결혼반지
noun|other|burial|安葬;埋葬|entierro|enterrement|sepoltura|埋葬|매장
phrase|other|my condolences|請節哀;節哀順變|mi más sentido pésame;mi pésame|mes condoléances|le mie condoglianze|ご愁傷様です|삼가 고인의 명복을 빕니다
phrase|other|rest in peace|安息吧|descanse en paz|repose en paix|riposa in pace|安らかに眠れ|편히 쉬세요
verb|actions|propose marriage|求婚|proponer matrimonio|demander en mariage|chiedere in sposa|プロポーズする|청혼하다
verb|actions|give birth|生小孩;分娩|dar a luz|accoucher|partorire|出産する|출산하다
verb|actions|adopt|領養;收養|adoptar|adopter|adottare|養子にする|입양하다
verb|actions|bury|埋葬|enterrar|enterrer|seppellire|埋める|묻다
verb|actions|flirt|調情|coquetear;flirtear|flirter|flirtare|いちゃつく|추파를 던지다
verb|actions|reconcile|和好|reconciliarse|se réconcilier|riconciliarsi|仲直りする|화해하다
verb|actions|get along|處得來|llevarse bien|s'entendre bien|andare d'accordo|仲良くする|잘 지내다
verb|actions|hold hands|牽手|tomarse de la mano|se tenir la main|tenersi per mano|手をつなぐ|손을 잡다
verb|actions|betray|背叛|traicionar|trahir|tradire|裏切る|배신하다
verb|actions|quarrel|吵架|pelearse;discutir|se disputer|litigare|口げんかする|말다툼하다
verb|actions|insult|侮辱|insultar|insulter|insultare|侮辱する|모욕하다
verb|actions|lose touch|失去聯絡|perder el contacto|perdre le contact|perdere i contatti|連絡が途絶える|연락이 끊기다
verb|actions|make friends|交朋友|hacer amigos|se faire des amis|fare amicizia|友だちを作る|친구를 사귀다
verb|actions|let down|讓人失望|decepcionar|décevoir|deludere|がっかりさせる|실망시키다
verb|actions|burst into tears|突然大哭|romper a llorar|éclater en sanglots|scoppiare a piangere|わっと泣き出す|울음을 터뜨리다
verb|actions|comfort|安慰|consolar|consoler|consolare|慰める|위로하다
verb|actions|admire|欽佩;佩服|admirar|admirer|ammirare|感心する|존경하다
verb|actions|adore|熱愛|adorar|adorer|adorare|大好きである|아주 좋아하다
verb|actions|blame|責怪|culpar|blâmer|incolpare|責める|탓하다
verb|actions|panic|驚慌|entrar en pánico|paniquer|andare nel panico|パニックになる|당황하다
verb|actions|pout|噘嘴|hacer pucheros;hacer un mohín|faire la moue|fare il broncio|口をとがらせる|입을 삐죽이다
verb|actions|regret|後悔|arrepentirse|regretter|pentirsi|後悔する|후회하다
verb|actions|scream|尖叫|gritar;chillar|hurler|urlare|悲鳴を上げる|비명을 지르다
adjective|other|retired|退休|jubilado;jubilada|retraité;retraitée|in pensione|退職した|은퇴하다
adjective|other|elderly|年長|anciano;anciana|âgé;âgée|anziano;anziana|年配の|나이 든
adjective|other|middle-aged|中年|de mediana edad|d'âge moyen|di mezza età|中年の|중년의
verb|actions|sob|啜泣|sollozar|sangloter|singhiozzare|すすり泣く|흐느끼다
verb|actions|sigh|嘆氣|suspirar|soupirer|sospirare|ため息をつく|한숨 쉬다
verb|actions|blush|臉紅|sonrojarse;ruborizarse|rougir|arrossire|顔を赤らめる|얼굴이 빨개지다
noun|objects|attic|閣樓|desván|grenier|soffitta|屋根裏|다락방
noun|objects|basement|地下室|sótano|sous-sol|scantinato|地下室|지하실
noun|objects|terrace|露台|terraza|terrasse|terrazza|テラス|테라스
noun|objects|courtyard|中庭|patio|cour|cortile|中庭|안뜰
noun|objects|chimney|煙囪|chimenea|cheminée|comignolo|煙突|굴뚝
noun|objects|fireplace|壁爐|chimenea|cheminée|camino|暖炉|벽난로
noun|objects|door handle|門把;門把手|picaporte;manija|poignée de porte|maniglia|ドアノブ|문손잡이
noun|objects|gate|大門|portón;verja|portail|cancello|門|대문
noun|objects|window sill|窗台|alféizar|rebord de fenêtre|davanzale|窓台|창턱
noun|objects|wallpaper|壁紙|papel pintado;papel tapiz|papier peint|carta da parati|壁紙|벽지
noun|objects|ground floor|一樓|planta baja|rez-de-chaussée|piano terra|一階|1층
noun|objects|top floor|頂樓|último piso;última planta|dernier étage|ultimo piano|最上階|꼭대기 층
noun|objects|pipe|水管|tubería|tuyau|tubo|管|파이프
noun|objects|socket|插座|toma de corriente;enchufe|prise de courant|presa|コンセント|콘센트
noun|objects|plug|插頭|enchufe;clavija|fiche|spina|プラグ|플러그
noun|objects|extension cord|延長線|alargador;extensión|rallonge|prolunga|延長コード|멀티탭
noun|objects|light switch|電燈開關;開關|interruptor|interrupteur|interruttore|電気のスイッチ|전등 스위치
noun|objects|smoke alarm|煙霧警報器;火災警報器|detector de humo|détecteur de fumée|rilevatore di fumo|煙感知器|화재경보기
noun|objects|water heater|熱水器|calentador de agua|chauffe-eau|scaldabagno|給湯器|온수기
noun|objects|cupboard|櫥櫃|armario|placard|armadio|戸棚|찬장
noun|objects|pantry|食物儲藏室|despensa|garde-manger|dispensa|食品庫|식료품 저장실
noun|objects|storage room|儲藏室|trastero;bodega|débarras|ripostiglio|物置|창고
noun|objects|laundry room|洗衣間|lavadero|buanderie|lavanderia|洗濯室|세탁실
noun|objects|guest room|客房|habitación de invitados|chambre d'amis|camera degli ospiti|客間|손님방
noun|objects|master bedroom|主臥室;主臥|dormitorio principal|chambre parentale|camera da letto principale|主寝室|안방
noun|objects|children's room|兒童房|habitación infantil|chambre d'enfant|cameretta|子ども部屋|아이 방
noun|objects|entryway|玄關|recibidor;entrada|entrée|ingresso|玄関|현관
noun|objects|shower|淋浴|ducha|douche|doccia|シャワー|샤워
noun|objects|villa|別墅|villa|villa|villa|別荘|별장
noun|objects|apartment building|公寓大樓|edificio de apartamentos;bloque de pisos|immeuble|condominio|マンション|아파트 건물
noun|objects|parking space|停車位|plaza de aparcamiento;plaza de estacionamiento|place de parking|posto auto|駐車スペース|주차 공간
noun|objects|house number|門牌號碼|número de la casa|numéro de rue|numero civico|番地|번지
noun|other|postal code;zip code|郵遞區號|código postal|code postal|codice postale|郵便番号|우편번호
noun|objects|spare key|備用鑰匙|llave de repuesto|clé de rechange|chiave di scorta|合鍵|여분 열쇠
noun|objects|padlock|掛鎖|candado|cadenas|lucchetto|南京錠|자물쇠
noun|objects|security camera|監視器|cámara de seguridad|caméra de surveillance|telecamera di sorveglianza|防犯カメラ|감시 카메라
noun|objects|fire extinguisher|滅火器|extintor|extincteur|estintore|消火器|소화기
noun|objects|intercom|對講機|portero automático;interfono|interphone|citofono|インターホン|인터폰
noun|people|building manager|大樓管理員;管理員|conserje;portero|gardien d'immeuble|portiere|管理人|관리인
noun|other|heating|暖氣|calefacción|chauffage|riscaldamento|暖房|난방
noun|other|electricity bill|電費|factura de la luz;recibo de la luz|facture d'électricité|bolletta della luce|電気代|전기 요금
noun|other|water bill|水費|factura del agua;recibo del agua|facture d'eau|bolletta dell'acqua|水道代|수도 요금
noun|objects|garbage truck|垃圾車|camión de la basura|camion poubelle|camion della spazzatura|ごみ収集車|쓰레기 수거차
noun|objects|laundromat|自助洗衣店|lavandería|laverie|lavanderia|コインランドリー|빨래방
noun|objects|dry cleaner|乾洗店|tintorería|pressing|tintoria|クリーニング店|세탁소
adjective|other|furnished|附家具的|amueblado;amueblada|meublé;meublée|ammobiliato;ammobiliata|家具付きの|가구가 딸린
noun|people|real estate agent|房仲|agente inmobiliario;agente inmobiliaria|agent immobilier;agente immobilière|agente immobiliare|不動産業者|부동산 중개인
noun|objects|studio apartment|套房|estudio|studio|monolocale|ワンルーム|원룸
noun|people|homeowner|屋主|propietario;propietaria|propriétaire|proprietario;proprietaria|家の持ち主|집주인
noun|objects|moving truck|搬家貨車|camión de mudanzas|camion de déménagement|camion dei traslochi|引っ越しトラック|이삿짐 트럭
noun|other|moving company|搬家公司|empresa de mudanzas|entreprise de déménagement|ditta di traslochi|引っ越し業者|이삿짐센터
phrase|other|for rent|出租|se alquila|à louer|affittasi|貸し出し中|임대
phrase|other|for sale|出售|se vende|à vendre|in vendita|売り出し中|매매
noun|objects|coffee table|茶几|mesa de centro|table basse|tavolino|ローテーブル|탁자
noun|objects|bedside table|床頭櫃|mesilla de noche;mesita de noche|table de chevet|comodino|ナイトテーブル|협탁
noun|objects|stool|凳子|taburete|tabouret|sgabello|丸いす|스툴
noun|objects|bunk bed|上下鋪;上下舖|litera|lit superposé|letto a castello|二段ベッド|이층 침대
noun|objects|sofa bed|沙發床|sofá cama|canapé-lit|divano letto|ソファーベッド|소파 베드
noun|objects|pillowcase|枕頭套|funda de almohada|taie d'oreiller|federa|枕カバー|베갯잇
noun|objects|duvet|被子|edredón|couette|piumone|掛け布団|이불
noun|objects|cushion|抱枕;靠墊|cojín|coussin|cuscino|クッション|쿠션
noun|objects|rug|地毯|alfombra|tapis|tappeto|ラグ|러그
noun|objects|picture frame|相框|marco de fotos;marco de fotografías|cadre photo|cornice|写真立て|액자
noun|objects|poster|海報|póster|affiche|poster|ポスター|포스터
noun|objects|wall clock|掛鐘|reloj de pared|horloge murale|orologio da parete|掛け時計|벽시계
noun|objects|alarm clock|鬧鐘|despertador|réveil|sveglia|目覚まし時計|자명종
noun|objects|ceiling light|吸頂燈;天花板燈|lámpara de techo|plafonnier|plafoniera|シーリングライト|천장등
noun|objects|floor lamp|落地燈|lámpara de pie|lampadaire|lampada da terra|フロアランプ|플로어 램프
noun|objects|desk lamp|檯燈|lámpara de escritorio;lámpara de mesa|lampe de bureau|lampada da scrivania|デスクライト|스탠드
noun|objects|chandelier|吊燈|lámpara de araña|lustre|lampadario|シャンデリア|샹들리에
noun|objects|armrest|扶手|reposabrazos;apoyabrazos|accoudoir|bracciolo|ひじ掛け|팔걸이
noun|objects|coat rack|衣帽架|perchero|portemanteau|appendiabiti|コート掛け|옷걸이
noun|objects|shoe rack|鞋櫃;鞋架|zapatero|meuble à chaussures|scarpiera|靴箱|신발장
noun|objects|storage box|收納盒|caja de almacenaje|boîte de rangement|scatola portaoggetti|収納ボックス|수납함
noun|objects|laundry basket|洗衣籃|cesto de la ropa sucia|panier à linge|cesto della biancheria|洗濯かご|빨래 바구니
noun|objects|ironing board|燙衣板|tabla de planchar|planche à repasser|asse da stiro|アイロン台|다리미판
noun|objects|drying rack|曬衣架|tendedero|étendoir|stendino|物干しラック|빨래 건조대
noun|objects|clothespin|曬衣夾|pinza de la ropa;pinza|pince à linge|molletta|洗濯ばさみ|빨래집게
noun|objects|ashtray|菸灰缸|cenicero|cendrier|posacenere|灰皿|재떨이
noun|objects|mosquito net|蚊帳|mosquitera|moustiquaire|zanzariera|蚊帳|모기장
noun|objects|mosquito coil|蚊香|espiral antimosquitos|spirale anti-moustiques|zampirone|蚊取り線香|모기향
noun|objects|insect repellent|防蚊液|repelente de insectos|répulsif anti-moustiques|repellente per insetti|虫よけ|모기 기피제
noun|objects|fridge|冰箱|nevera;refrigerador|frigo|frigorifero|冷蔵庫|냉장고
noun|objects|clothes dryer|烘衣機|secadora|sèche-linge|asciugatrice|衣類乾燥機|건조기
noun|objects|air purifier|空氣清淨機|purificador de aire|purificateur d'air|purificatore d'aria|空気清浄機|공기 청정기
noun|objects|humidifier|加濕器|humidificador|humidificateur|umidificatore|加湿器|가습기
noun|objects|dehumidifier|除濕機|deshumidificador|déshumidificateur|deumidificatore|除湿機|제습기
noun|objects|coffee maker|咖啡機|cafetera|machine à café|macchina del caffè|コーヒーメーカー|커피 메이커
noun|objects|range hood|抽油煙機|campana extractora|hotte aspirante|cappa|換気扇|레인지 후드
noun|objects|dustpan|畚箕|recogedor|pelle à poussière|paletta|ちりとり|쓰레받기
noun|objects|mop|拖把|fregona;trapeador|serpillière|mocio|モップ|대걸레
noun|objects|rag|抹布|trapo|chiffon|straccio|ぞうきん|걸레
noun|objects|sponge|海綿|esponja|éponge|spugna|スポンジ|스펀지
noun|objects|dish soap|洗碗精|jabón para platos;lavavajillas|liquide vaisselle|detersivo per piatti|食器用洗剤|주방 세제
noun|objects|bleach|漂白水|lejía;cloro|eau de Javel|candeggina|漂白剤|표백제
noun|objects|fabric softener|衣物柔軟精;柔軟精|suavizante|assouplissant|ammorbidente|柔軟剤|섬유 유연제
noun|objects|cleaning product|清潔用品|producto de limpieza|produit ménager|prodotto per le pulizie|掃除用品|청소용품
noun|objects|dish rack|碗盤架;碗架|escurreplatos|égouttoir|scolapiatti|水切りかご|식기 건조대
noun|objects|tumbler|平底玻璃杯|vaso|verre à boire|bicchiere|タンブラー|텀블러 잔
noun|objects|bottled water|瓶裝水|agua embotellada|eau en bouteille|acqua in bottiglia|ペットボトルの水|생수
noun|objects|bath mat|浴室地墊|alfombrilla de baño|tapis de bain|tappetino da bagno|バスマット|욕실 매트
noun|objects|towel rack|毛巾架|toallero|porte-serviettes|portasciugamani|タオル掛け|수건걸이
noun|objects|toilet brush|馬桶刷|escobilla de baño|brosse de toilette|scopino|トイレブラシ|변기 솔
noun|objects|shower head|蓮蓬頭|cabezal de ducha|pommeau de douche|soffione|シャワーヘッド|샤워기 헤드
noun|objects|bathrobe|浴袍|albornoz;bata de baño|peignoir|accappatoio|バスローブ|목욕 가운
noun|objects|razor|刮鬍刀|maquinilla de afeitar;rastrillo|rasoir|rasoio|かみそり|면도기
noun|objects|cotton swab|棉花棒|bastoncillo;hisopo|coton-tige|cotton fioc|綿棒|면봉
noun|objects|deodorant|體香劑;除臭劑|desodorante|déodorant|deodorante|デオドラント|데오도란트
noun|objects|conditioner|潤髮乳|acondicionador|après-shampoing|balsamo|リンス|린스
noun|objects|body wash|沐浴乳|gel de ducha;gel de baño|gel douche|bagnoschiuma|ボディーソープ|바디워시
noun|objects|facial cleanser|洗面乳|limpiador facial|nettoyant visage|detergente viso|洗顔料|클렌징폼
noun|objects|moisturizer;moisturiser|保濕霜|crema hidratante|crème hydratante|crema idratante|保湿クリーム|보습제
noun|objects|makeup;make-up|化妝品;彩妝|maquillaje|maquillage|trucco|化粧品|화장품
noun|objects|nail polish|指甲油|esmalte de uñas|vernis à ongles|smalto|マニキュア|매니큐어
noun|objects|nail clipper|指甲剪|cortauñas|coupe-ongles|tagliaunghie|爪切り|손톱깎이
noun|objects|tweezers|鑷子|pinzas|pince à épiler|pinzette|ピンセット|핀셋
noun|objects|scissors|剪刀|tijeras|ciseaux|forbici|はさみ|가위
noun|objects|hair tie|髮圈|goma del pelo;coletero|élastique à cheveux|elastico per capelli|ヘアゴム|머리끈
noun|objects|hairbrush|髮刷|cepillo para el pelo;cepillo para el cabello|brosse à cheveux|spazzola per capelli|ヘアブラシ|헤어브러시
noun|objects|dental floss|牙線|hilo dental|fil dentaire|filo interdentale|デンタルフロス|치실
noun|objects|mouthwash|漱口水|enjuague bucal|bain de bouche|collutorio|マウスウォッシュ|가글
noun|objects|lip balm|護唇膏|bálsamo labial|baume à lèvres|balsamo per le labbra|リップクリーム|립밤
noun|objects|hand cream|護手霜|crema de manos|crème pour les mains|crema per le mani|ハンドクリーム|핸드크림
noun|objects|hand sanitizer|乾洗手|gel hidroalcohólico|gel hydroalcoolique|gel igienizzante|手指消毒液|손 소독제
noun|objects|tissue|面紙|pañuelo de papel;pañuelo desechable|mouchoir en papier|fazzoletto di carta|ティッシュ|휴지
noun|objects|wet wipe|濕紙巾|toallita húmeda|lingette|salvietta umidificata|ウェットティッシュ|물티슈
noun|objects|saw|鋸子|sierra|scie|sega|のこぎり|톱
noun|objects|wrench|扳手|llave inglesa|clé à molette|chiave inglese|スパナ|렌치
noun|objects|pliers|鉗子|alicates|pince|pinze|ペンチ|펜치
noun|objects|nail|釘子|clavo|clou|chiodo|くぎ|못
noun|objects|ladder|梯子|escalera|échelle|scala|はしご|사다리
noun|objects|tape measure|捲尺|cinta métrica;flexómetro|mètre ruban|metro a nastro|メジャー|줄자
noun|objects|sandpaper|砂紙|papel de lija;lija|papier de verre|carta vetrata|紙やすり|사포
noun|objects|paint roller|油漆滾筒|rodillo de pintura|rouleau à peinture|rullo per pittura|ペイントローラー|페인트 롤러
noun|objects|rope|繩子|cuerda|corde|corda|ロープ|밧줄
noun|objects|rake|耙子|rastrillo|râteau|rastrello|熊手|갈퀴
noun|objects|watering can|澆水壺|regadera|arrosoir|annaffiatoio|じょうろ|물뿌리개
noun|objects|staple|釘書針;訂書針|grapa|agrafe|punto metallico|ホッチキスの針|스테이플러 심
noun|objects|tape|膠帶|cinta adhesiva|ruban adhésif|nastro adesivo|テープ|테이프
noun|objects|glue|膠水|pegamento|colle|colla|のり|풀
noun|objects|marker|麥克筆;馬克筆|rotulador;marcador|feutre|pennarello|マーカー|마커
noun|objects|colored pencil;coloured pencil|色鉛筆|lápiz de color|crayon de couleur|matita colorata|色鉛筆|색연필
noun|objects|crayon|蠟筆|crayón;lápiz de cera|crayon de cire|pastello a cera|クレヨン|크레파스
noun|objects|rubber band|橡皮筋|goma elástica;liga|élastique|elastico|輪ゴム|고무줄
noun|objects|sticker|貼紙|pegatina;calcomanía|autocollant|adesivo|シール|스티커
noun|objects|bookmark|書籤|marcapáginas|marque-page|segnalibro|しおり|책갈피
noun|objects|diary|日記|diario|journal intime|diario|日記|일기
noun|objects|ballpoint pen|原子筆|bolígrafo|stylo bille|penna a sfera|ボールペン|볼펜
noun|objects|fountain pen|鋼筆|pluma estilográfica|stylo plume|penna stilografica|万年筆|만년필
noun|objects|correction fluid|修正液;立可白|corrector|correcteur blanc|correttore|修正液|수정액
noun|objects|stamp|郵票|sello;estampilla|timbre|francobollo|切手|우표
noun|objects|tracksuit|運動服|chándal|survêtement|tuta|ジャージ|운동복
noun|objects|leggings|內搭褲|leggings;mallas|legging|leggings|レギンス|레깅스
noun|objects|tights|褲襪|medias;pantis|collant|collant|タイツ|스타킹
noun|objects|tank top|背心|camiseta de tirantes;camiseta sin mangas|débardeur|canotta|タンクトップ|민소매
noun|objects|blouse|女襯衫|blusa|chemisier|camicetta|ブラウス|블라우스
noun|objects|blazer|西裝外套|americana;saco|blazer|blazer|ブレザー|블레이저
noun|objects|cardigan|開襟衫;針織外套|cárdigan;rebeca|cardigan|cardigan|カーディガン|카디건
noun|objects|turtleneck|高領毛衣|jersey de cuello alto|pull à col roulé|dolcevita|タートルネック|터틀넥
noun|objects|down jacket|羽絨外套|plumífero;chaqueta de plumas|doudoune|piumino|ダウンジャケット|패딩
noun|objects|windbreaker|防風外套|cortavientos|coupe-vent|giacca a vento|ウインドブレーカー|바람막이
noun|objects|trench coat|風衣|gabardina|trench|trench|トレンチコート|트렌치코트
noun|objects|shawl|披肩|chal|châle|scialle|ショール|숄
noun|objects|mitten|連指手套|manopla|moufle|muffola|ミトン|벙어리장갑
noun|objects|beanie|毛帽|gorro|bonnet|berretto|ニット帽|비니
noun|objects|baseball cap|棒球帽|gorra|casquette|cappellino da baseball|野球帽|야구 모자
noun|objects|straw hat|草帽|sombrero de paja|chapeau de paille|cappello di paglia|麦わら帽子|밀짚모자
noun|objects|wristwatch|手錶|reloj de pulsera|montre|orologio da polso|腕時計|손목시계
noun|objects|keychain|鑰匙圈|llavero|porte-clés|portachiavi|キーホルダー|열쇠고리
noun|objects|fanny pack|腰包|riñonera|sac banane|marsupio|ウエストポーチ|힙색
noun|objects|rain boot|雨靴|bota de agua;bota de lluvia|botte de pluie|stivale di gomma|長靴|장화
noun|objects|high heels|高跟鞋|zapatos de tacón|chaussures à talons|scarpe con il tacco|ハイヒール|하이힐
noun|objects|loafer|樂福鞋|mocasín|mocassin|mocassino|ローファー|로퍼
noun|objects|leather shoes|皮鞋|zapatos de cuero|chaussures en cuir|scarpe di pelle|革靴|구두
noun|objects|shoelace|鞋帶|cordón|lacet|laccio|靴ひも|신발 끈
noun|objects|collar|領子|cuello|col|colletto|襟|칼라
noun|objects|needle|針|aguja|aiguille|ago|針|바늘
noun|objects|stain|污漬|mancha|tache|macchia|しみ|얼룩
noun|objects|fur|毛皮|piel|fourrure|pelliccia|毛皮|모피
noun|objects|linen|亞麻|lino|lin|lino|麻|리넨
noun|objects|denim|牛仔布|tela vaquera;mezclilla|denim|denim|デニム|데님
noun|objects|nylon|尼龍|nailon;nylon|nylon|nylon|ナイロン|나일론
noun|objects|polyester|聚酯纖維|poliéster|polyester|poliestere|ポリエステル|폴리에스테르
noun|objects|velvet|天鵝絨|terciopelo|velours|velluto|ベルベット|벨벳
noun|objects|lace|蕾絲|encaje|dentelle|pizzo|レース|레이스
noun|objects|concrete|混凝土|hormigón;concreto|béton|calcestruzzo|コンクリート|콘크리트
noun|objects|cement|水泥|cemento|ciment|cemento|セメント|시멘트
noun|objects|aluminum;aluminium|鋁|aluminio|aluminium|alluminio|アルミニウム|알루미늄
noun|objects|copper|銅|cobre|cuivre|rame|銅|구리
noun|objects|marble|大理石|mármol|marbre|marmo|大理石|대리석
noun|objects|porcelain|瓷器|porcelana|porcelaine|porcellana|磁器|자기
noun|objects|clay|黏土|arcilla|argile|argilla|粘土|점토
noun|objects|tile|瓷磚|azulejo;baldosa|carreau|piastrella|タイル|타일
noun|objects|cardboard box|紙箱|caja de cartón|carton|scatola di cartone|段ボール箱|상자
noun|objects|earphone case|耳機盒|estuche de auriculares|boîtier d'écouteurs|custodia per auricolari|イヤホンケース|이어폰 케이스
noun|objects|earphones|耳機|auriculares|écouteurs|auricolari|イヤホン|이어폰
noun|other|fuchsia|紫紅色|fucsia|fuchsia|fucsia|赤紫|자홍색
noun|other|navy blue|藏青色;海軍藍;深藍色|azul marino|bleu marine|blu marino|紺色|남색
noun|other|turquoise|土耳其藍;藍綠色|turquesa|turquoise|turchese|ターコイズブルー|청록색
noun|other|burgundy|酒紅色|granate;burdeos|bordeaux|bordeaux|ワインレッド|와인색
noun|other|lilac|淡紫色|lila|lilas|lilla|ライラック色|연보라색
noun|other|khaki|卡其色|caqui|kaki|cachi|カーキ|카키색
noun|other|light blue|淺藍色|azul claro|bleu clair|azzurro|水色|하늘색
noun|other|dark blue|深藍色|azul oscuro|bleu foncé|blu scuro|紺|짙은 파란색
noun|other|sky blue|天藍色|azul cielo|bleu ciel|celeste|空色|하늘색
noun|other|cube|立方體|cubo|cube|cubo|立方体|정육면체
noun|other|sphere|球體|esfera|sphère|sfera|球|구
noun|other|pyramid|金字塔|pirámide|pyramide|piramide|ピラミッド|피라미드
noun|other|stripe|條紋|raya|rayure|riga|しま|줄무늬
adjective|other|striped|有條紋的;條紋的|a rayas|rayé;rayée|a righe|しま模様の|줄무늬의
adjective|other|checked|格子的|de cuadros|à carreaux|a quadri|チェックの|체크무늬의
adjective|other|plain|素色的|liso;lisa|uni;unie|tinta unita|無地の|무늬 없는
adjective|other|colorful;colourful|色彩繽紛的|colorido;colorida|coloré;colorée|colorato;colorata|色とりどりの|알록달록하다
adjective|other|loose|寬鬆的|holgado;holgada|ample|ampio;ampia|ゆったりした|헐렁하다
adjective|other|wrinkled|皺的|arrugado;arrugada|froissé;froissée|stropicciato;stropicciata|しわくちゃの|구겨지다
adjective|other|cozy;cosy|溫馨的|acogedor;acogedora|cosy|accogliente|居心地のいい|아늑하다
adjective|other|spacious|寬敞的|espacioso;espaciosa|spacieux;spacieuse|spazioso;spaziosa|広々とした|널찍하다
adjective|other|waterproof|防水的|impermeable|imperméable|impermeabile|防水の|방수
adjective|other|disposable|一次性的;拋棄式的|desechable|jetable|usa e getta|使い捨ての|일회용
adjective|other|foldable|可摺疊的;可折疊的|plegable|pliant;pliante|pieghevole|折りたたみ式の|접이식
adjective|other|washable|可水洗的|lavable|lavable|lavabile|洗える|세탁 가능한
adjective|other|slippery|滑的|resbaladizo;resbaladiza|glissant;glissante|scivoloso;scivolosa|滑りやすい|미끄럽다
adjective|other|smooth|光滑的|liso;lisa|lisse|liscio;liscia|なめらかな|매끄럽다
adjective|other|rough|粗糙的|áspero;áspera|rugueux;rugueuse|ruvido;ruvida|ざらざらした|거칠다
adjective|other|clogged|堵塞的|atascado;atascada|bouché;bouchée|intasato;intasata|詰まった|막히다
verb|actions|mop the floor|拖地|fregar el suelo;trapear|passer la serpillière|lavare il pavimento|床をモップがけする|걸레질하다
verb|actions|vacuum|吸地|pasar la aspiradora|passer l'aspirateur|passare l'aspirapolvere|掃除機をかける|청소기를 돌리다
verb|actions|wipe the table|擦桌子|limpiar la mesa|essuyer la table|pulire il tavolo|テーブルを拭く|식탁을 닦다
verb|actions|scrub|刷洗|fregar|frotter|strofinare|こする|문질러 닦다
verb|actions|rinse|沖洗|enjuagar|rincer|sciacquare|すすぐ|헹구다
verb|actions|soak|浸泡|remojar|faire tremper|ammollare|つける（浸す）|담그다
verb|actions|do the ironing|燙衣服|planchar|repasser|stirare|アイロンがけをする|다림질하다
verb|actions|shrink|縮水|encoger|rétrécir|restringersi|縮む|줄어들다
verb|actions|tie your shoes|綁鞋帶|atarse los cordones|lacer ses chaussures|allacciarsi le scarpe|靴ひもを結ぶ|신발 끈을 묶다
verb|actions|assemble|組裝|montar|monter|montare|組み立てる|조립하다
verb|actions|unscrew|拆下螺絲;旋開|desatornillar|dévisser|svitare|ねじを外す|나사를 풀다
verb|actions|tighten|鎖緊|apretar|serrer|stringere|締める|조이다
verb|actions|drip|滴水|gotear|goutter|gocciolare|したたる|물이 떨어지다
verb|actions|plug in|插電|enchufar|brancher|attaccare la spina|コンセントにつなぐ|플러그를 꽂다
verb|actions|unplug|拔掉插頭|desenchufar|débrancher|staccare la spina|コンセントを抜く|플러그를 뽑다
noun|other|leak|漏水|fuga|fuite|perdita|漏れる|새다
noun|other|crack|裂縫|grieta|fissure|crepa|ひび|금
noun|other|rust|鐵鏽;鏽|óxido|rouille|ruggine|さび|녹
noun|other|mold;mould|黴菌;霉|moho|moisissure|muffa|かび|곰팡이
noun|other|chore|家務事;家事|tarea doméstica|corvée|faccenda|雑用|집안일
noun|other|spring cleaning|大掃除|limpieza de primavera;limpieza general|grand ménage|pulizie di primavera|大掃除|대청소
noun|other|daily routine|日常作息;作息|rutina diaria|routine quotidienne|routine quotidiana|日課|일과
noun|objects|kitchen counter|流理台|encimera|plan de travail|piano di lavoro|調理台|조리대
verb|actions|sleep in|睡懶覺|dormir hasta tarde|faire la grasse matinée|dormire fino a tardi|朝寝坊する|늦잠을 자다
verb|actions|stay up late|熬夜|trasnochar|veiller tard|fare le ore piccole|夜更かしする|밤을 새우다
verb|actions|oversleep|睡過頭|quedarse dormido|se réveiller en retard|svegliarsi tardi|寝過ごす|늦잠 자다
verb|actions|set an alarm|設鬧鐘|poner la alarma|mettre un réveil|mettere la sveglia|目覚ましをかける|알람을 맞추다
verb|actions|wash your face|洗臉|lavarse la cara|se laver le visage|lavarsi il viso|顔を洗う|세수하다
verb|actions|comb your hair|梳頭髮|peinarse|se peigner|pettinarsi|髪をとかす|머리를 빗다
verb|actions|put on makeup|化妝|maquillarse|se maquiller|truccarsi|化粧する|화장하다
verb|actions|take off makeup|卸妝|desmaquillarse|se démaquiller|struccarsi|化粧を落とす|화장을 지우다
verb|actions|dry your hair|吹頭髮|secarse el pelo|se sécher les cheveux|asciugarsi i capelli|髪を乾かす|머리를 말리다
verb|actions|get a haircut|剪頭髮|cortarse el pelo|se faire couper les cheveux|tagliarsi i capelli|髪を切ってもらう|머리를 자르다
verb|actions|water the plants|澆花|regar las plantas|arroser les plantes|annaffiare le piante|植物に水をやる|화분에 물을 주다
verb|actions|walk the dog|遛狗|pasear al perro|promener le chien|portare a spasso il cane|犬を散歩させる|개를 산책시키다
verb|actions|set the table|擺碗筷;擺餐具|poner la mesa|mettre la table|apparecchiare la tavola|食卓の用意をする|상을 차리다
verb|actions|clear the table|收拾餐桌|recoger la mesa;quitar la mesa|débarrasser la table|sparecchiare la tavola|食卓を片付ける|상을 치우다
verb|actions|lock the door|鎖門|cerrar la puerta con llave|fermer la porte à clé|chiudere la porta a chiave|ドアに鍵をかける|문을 잠그다
verb|actions|open the door|開門|abrir la puerta|ouvrir la porte|aprire la porta|ドアを開ける|문을 열다
verb|actions|close the door|關門|cerrar la puerta|fermer la porte|chiudere la porta|ドアを閉める|문을 닫다
verb|actions|turn on the light|開燈|encender la luz|allumer la lumière|accendere la luce|電気をつける|불을 켜다
verb|actions|turn off the light|關燈|apagar la luz|éteindre la lumière|spegnere la luce|電気を消す|불을 끄다
verb|actions|charge the phone|幫手機充電|cargar el móvil;cargar el celular|charger le téléphone|caricare il telefono|スマホを充電する|휴대폰을 충전하다
verb|actions|come home|回家|volver a casa|rentrer à la maison|tornare a casa|帰宅する|귀가하다
verb|actions|pay the rent|付房租|pagar el alquiler|payer le loyer|pagare l'affitto|家賃を払う|월세를 내다
verb|actions|move in|搬進去;入住|mudarse|emménager|trasferirsi|入居する|입주하다
verb|actions|hang a picture|掛畫|colgar un cuadro|accrocher un tableau|appendere un quadro|絵を掛ける|그림을 걸다
noun|other|haircut|剪髮;理髮|corte de pelo|coupe de cheveux|taglio di capelli|散髪|이발
noun|people|barber|理髮師|barbero|barbier|barbiere|理容師|이발사
noun|people|locksmith|鎖匠|cerrajero;cerrajera|serrurier;serrurière|fabbro|鍵屋|열쇠공
noun|objects|plane|飛機|avión|avion|aereo|飛行機|비행기
noun|objects|bike|腳踏車;單車|bici;bicicleta|vélo|bici;bicicletta|自転車|자전거
noun|other|journey|旅程|viaje|voyage|viaggio|旅路|여정
noun|other|tourism|觀光|turismo|tourisme|turismo|観光|관광
noun|other|transportation;transport|交通|transporte|transport|trasporto|交通手段|교통수단
noun|other|public transportation|大眾運輸|transporte público|transports en commun|mezzi pubblici|公共交通機関|대중교통
noun|other|destination|目的地|destino|destination|destinazione|目的地|목적지
noun|other|route|路線|ruta|itinéraire|percorso|ルート|경로
noun|other|distance|距離|distancia|distance|distanza|距離|거리
noun|other|departure|出發|salida|départ|partenza|出発|출발
noun|other|arrival|抵達;到達|llegada|arrivée|arrivo|到着|도착
noun|other|accommodation|住宿|alojamiento|hébergement|alloggio|宿泊|숙박
noun|other|booking|預訂|reserva|réservation|prenotazione|予約（すること）|예약
noun|other|cancellation|取消|cancelación|annulation|cancellazione|キャンセル|취소
noun|other|airline|航空公司|aerolínea|compagnie aérienne|compagnia aerea|航空会社|항공사
noun|objects|bus station|客運站|estación de autobuses|gare routière|stazione degli autobus|バスターミナル|버스 터미널
noun|objects|resort|度假村|complejo turístico|complexe hôtelier|villaggio turistico|リゾート|리조트
noun|objects|guesthouse|民宿|casa de huéspedes|maison d'hôtes|pensione|民宿|민박
noun|objects|lobby|大廳|vestíbulo|hall|hall|ロビー|로비
noun|objects|single room|單人房|habitación individual|chambre simple|camera singola|シングルルーム|싱글룸
noun|objects|double room|雙人房|habitación doble|chambre double|camera doppia|ダブルルーム|더블룸
noun|other|room service|客房服務|servicio de habitaciones|service en chambre|servizio in camera|ルームサービス|룸서비스
adjective|other|fully booked|客滿|completo;completa|complet;complète|al completo|満室|만실
noun|objects|landscape|風景|paisaje|paysage|paesaggio|風景|풍경
noun|other|view|景色|vista|vue|vista|眺め|전망
noun|objects|field|田野|campo|champ|campo|野原|들판
noun|objects|rock|岩石|roca|rocher|roccia|岩|바위
noun|objects|stream|小溪|arroyo|ruisseau|ruscello|小川|개울
noun|objects|bay|海灣|bahía|baie|baia|湾|만
noun|objects|shore|岸邊|orilla|rivage|riva|岸|물가
noun|objects|trail|步道|sendero|sentier|sentiero|遊歩道|산책로
noun|objects|path|小路|camino|chemin|sentiero|小道|오솔길
noun|objects|national park|國家公園|parque nacional|parc national|parco nazionale|国立公園|국립공원
noun|objects|hot spring|溫泉|fuente termal|source chaude|sorgente termale|温泉|온천
noun|other|region|地區|región|région|regione|地域|지역
other|other|abroad|國外|en el extranjero|à l'étranger|all'estero|海外|해외
noun|people|backpacker|背包客|mochilero;mochilera|routard;routarde|saccopelista|バックパッカー|배낭여행자
noun|people|pedestrian|行人|peatón;peatona|piéton;piétonne|pedone|歩行者|보행자
noun|people|astronaut|太空人|astronauta|astronaute|astronauta|宇宙飛行士|우주 비행사
noun|people|explorer|探險家|explorador;exploradora|explorateur;exploratrice|esploratore;esploratrice|探検家|탐험가
noun|other|adventure|冒險|aventura|aventure|avventura|冒険|모험
noun|objects|insect|昆蟲|insecto|insecte|insetto|虫|곤충
noun|objects|pet|寵物|mascota|animal de compagnie|animale domestico|ペット|반려동물
noun|objects|wild animal|野生動物|animal salvaje|animal sauvage|animale selvatico|野生動物|야생 동물
noun|objects|creature|生物|criatura|créature|creatura|生き物|생물
noun|objects|deer|鹿|ciervo|cerf|cervo|鹿|사슴
noun|objects|dolphin|海豚|delfín|dauphin|delfino|イルカ|돌고래
noun|objects|giraffe|長頸鹿|jirafa|girafe|giraffa|キリン|기린
noun|objects|mosquito|蚊子|mosquito|moustique|zanzara|蚊|모기
noun|objects|octopus|章魚|pulpo|pieuvre|polpo|タコ|문어
noun|objects|pigeon|鴿子|paloma|pigeon|piccione|ハト|비둘기
noun|objects|puppy|小狗|cachorro|chiot|cucciolo|子犬|강아지
noun|objects|kitten|小貓|gatito|chaton|gattino|子猫|새끼 고양이
noun|objects|tail|尾巴|cola|queue|coda|しっぽ|꼬리
noun|objects|wing|翅膀|ala|aile|ala|翼|날개
noun|objects|feather|羽毛|pluma|plume|piuma|羽|깃털
noun|objects|nest|鳥巢|nido|nid|nido|巣|둥지
noun|objects|rose|玫瑰|rosa|rose|rosa|バラ|장미
noun|objects|sunflower|向日葵|girasol|tournesol|girasole|ひまわり|해바라기
noun|objects|bamboo|竹子|bambú|bambou|bambù|竹|대나무
noun|objects|palm tree|棕櫚樹|palmera|palmier|palma|ヤシの木|야자나무
noun|objects|pine tree|松樹|pino|pin|pino|松|소나무
noun|objects|cherry blossom|櫻花|flor de cerezo|fleur de cerisier|fiore di ciliegio|桜|벚꽃
noun|objects|bush|灌木|arbusto|buisson|cespuglio|茂み|덤불
noun|objects|lawn|草坪;草皮|césped|pelouse|prato|芝生|잔디밭
noun|objects|weed|雜草|mala hierba|mauvaise herbe|erbaccia|雑草|잡초
noun|other|heat|炎熱|calor|chaleur|caldo|暑さ|더위
noun|other|forecast|預報|pronóstico|prévision|previsione|予報|예보
noun|other|breeze|微風|brisa|brise|brezza|そよ風|산들바람
noun|other|thunderstorm|雷雨|tormenta eléctrica|orage|temporale|雷雨|뇌우
noun|other|heat wave|熱浪|ola de calor|canicule|ondata di caldo|熱波|폭염
noun|other|rainy season|雨季|temporada de lluvias|saison des pluies|stagione delle piogge|梅雨|장마
noun|other|tornado|龍捲風|tornado|tornade|tornado|竜巻|토네이도
noun|other|drizzle|毛毛雨|llovizna|bruine|pioggerella|霧雨|이슬비
noun|other|heavy rain|大雨|lluvia fuerte|forte pluie|pioggia forte|大雨|폭우
noun|other|hail|冰雹|granizo|grêle|grandine|ひょう|우박
noun|other|frost|霜|escarcha|givre|brina|霜|서리
noun|objects|snowflake|雪花|copo de nieve|flocon de neige|fiocco di neve|雪片|눈송이
noun|objects|snowman|雪人|muñeco de nieve|bonhomme de neige|pupazzo di neve|雪だるま|눈사람
noun|objects|puddle|水坑|charco|flaque|pozzanghera|水たまり|웅덩이
noun|other|shade|陰涼處|sombra|ombre|ombra|日陰|그늘
adjective|other|foggy|有霧|neblinoso;neblinosa|brumeux;brumeuse|nebbioso;nebbiosa|霧の深い|안개가 끼다
adjective|other|snowy|多雪|nevoso;nevosa|neigeux;neigeuse|nevoso;nevosa|雪の多い|눈이 많이 오다
adjective|other|freezing|冰冷|helado;helada|glacial;glaciale|gelido;gelida|凍えるような|몹시 춥다
adjective|other|mild|溫和|templado;templada|doux;douce|mite|穏やかな|온화하다
phrase|other|below zero|零下|bajo cero|en dessous de zéro|sotto zero|氷点下|영하
noun|objects|outer space|外太空|espacio exterior|espace|spazio|宇宙空間|우주 공간
noun|objects|universe|宇宙|universo|univers|universo|宇宙|우주
noun|objects|galaxy|星系|galaxia|galaxie|galassia|銀河|은하
noun|objects|solar system|太陽系|sistema solar|système solaire|sistema solare|太陽系|태양계
noun|objects|full moon|滿月|luna llena|pleine lune|luna piena|満月|보름달
noun|objects|shooting star|流星|estrella fugaz|étoile filante|stella cadente|流れ星|별똥별
noun|other|meteor shower|流星雨|lluvia de estrellas|pluie d'étoiles filantes|sciame meteorico|流星群|유성우
noun|other|solar eclipse|日食;日蝕|eclipse solar|éclipse solaire|eclissi solare|日食|일식
noun|other|moonlight|月光|luz de luna|clair de lune|chiaro di luna|月明かり|달빛
noun|other|dawn|黎明|amanecer|aube|alba|夜明け|새벽
noun|other|dusk|黃昏|anochecer|crépuscule|crepuscolo|夕暮れ|황혼
noun|other|darkness|黑暗|oscuridad|obscurité|oscurità|暗闇|어둠
noun|other|horizon|地平線|horizonte|horizon|orizzonte|地平線|지평선
noun|other|Ghost Festival|中元節|Festival de los Fantasmas|fête des Fantômes|Festa dei fantasmi|中元節|중원절
noun|other|Lunar New Year's Eve|除夕|Nochevieja china|veille du Nouvel An chinois|vigilia del Capodanno cinese|大みそか（旧暦）|섣달그믐
noun|other|New Year's Eve|跨年夜|Nochevieja|Saint-Sylvestre|San Silvestro|大みそか|새해 전야
noun|other|New Year's Day|元旦|día de Año Nuevo|jour de l'An|Capodanno|元日|새해 첫날
noun|other|Christmas Eve|平安夜|Nochebuena|veille de Noël|vigilia di Natale|クリスマスイブ|크리스마스이브
noun|other|Valentine's Day|情人節|día de San Valentín|Saint-Valentin|San Valentino|バレンタインデー|밸런타인데이
noun|other|Mother's Day|母親節|día de la Madre|fête des Mères|festa della mamma|母の日|어머니날
noun|other|Father's Day|父親節|día del Padre|fête des Pères|festa del papà|父の日|아버지날
noun|other|Thanksgiving|感恩節|día de Acción de Gracias|Thanksgiving|festa del Ringraziamento|感謝祭|추수감사절
noun|other|Labor Day;Labour Day|勞動節|día del Trabajo|fête du Travail|festa dei lavoratori|労働者の日|노동절
noun|other|public holiday|國定假日|día festivo|jour férié|giorno festivo|祝日|공휴일
noun|other|long weekend|連假|fin de semana largo|week-end prolongé|weekend lungo|連休|연휴
noun|other|summer vacation|暑假|vacaciones de verano|vacances d'été|vacanze estive|夏休み|여름 방학
noun|other|winter vacation|寒假|vacaciones de invierno|vacances d'hiver|vacanze invernali|冬休み|겨울 방학
noun|objects|fireworks|煙火|fuegos artificiales|feu d'artifice|fuochi d'artificio|花火|불꽃놀이
noun|objects|firecracker|鞭炮|petardo|pétard|petardo|爆竹|폭죽
noun|objects|lantern|燈籠|farol|lanterne|lanterna|ちょうちん|등롱
noun|objects|sky lantern|天燈|farolillo volador|lanterne céleste|lanterna volante|天灯|풍등
noun|objects|mooncake|月餅|pastel de luna|gâteau de lune|torta della luna|月餅|월병
noun|objects|rice dumpling|粽子|zongzi|zongzi|zongzi|ちまき|쫑즈
noun|objects|dragon boat|龍舟|barco dragón|bateau-dragon|barca drago|ドラゴンボート|용선
noun|objects|Christmas tree|聖誕樹|árbol de Navidad|sapin de Noël|albero di Natale|クリスマスツリー|크리스마스트리
noun|people|Santa Claus|聖誕老人|Papá Noel|père Noël|Babbo Natale|サンタクロース|산타클로스
noun|other|parade|遊行|desfile|défilé|sfilata|パレード|퍼레이드
noun|other|carnival|嘉年華|carnaval|carnaval|carnevale|カーニバル|카니발
noun|other|celebration|慶祝活動|celebración|célébration|celebrazione|祝典|축하 행사
noun|other|countdown|倒數|cuenta atrás;cuenta regresiva|compte à rebours|conto alla rovescia|カウントダウン|카운트다운
phrase|other|happy holidays|節日快樂|felices fiestas|joyeuses fêtes|buone feste|楽しい休日を|즐거운 휴일 보내세요
phrase|other|have a safe trip|一路平安|buen viaje|bon voyage|buon viaggio|道中ご無事で|안전한 여행 되세요
phrase|other|have a good flight|飛行愉快|buen vuelo|bon vol|buon volo|よいフライトを|좋은 비행 되세요
phrase|other|how do I get to|怎麼去|cómo llego a|comment aller à|come arrivo a|～へはどう行きますか|~에 어떻게 가요
phrase|other|is it far|遠嗎|está lejos|c'est loin|è lontano|遠いですか|멀어요
phrase|other|around the corner|在轉角|a la vuelta de la esquina|au coin de la rue|dietro l'angolo|角を曲がったところに|모퉁이를 돌면
verb|actions|ask for directions|問路|preguntar el camino|demander son chemin|chiedere indicazioni|道を尋ねる|길을 묻다
verb|actions|go camping|去露營|ir de camping;ir de acampada|faire du camping|andare in campeggio|キャンプに行く|캠핑을 가다
verb|actions|board a plane|登機|embarcar|embarquer|imbarcarsi|飛行機に乗り込む|비행기에 탑승하다
verb|actions|depart|出發|salir|partir|partire|出発する|출발하다
verb|actions|explore|探索|explorar|explorer|esplorare|探検する|탐험하다
verb|actions|sail|航行|navegar|naviguer|navigare|航海する|항해하다
verb|actions|miss the bus|錯過公車|perder el autobús|rater le bus|perdere l'autobus|バスに乗り遅れる|버스를 놓치다
verb|actions|accelerate|加速|acelerar|accélérer|accelerare|加速する|가속하다
verb|actions|drift|漂流|ir a la deriva|dériver|andare alla deriva|漂う|떠다니다
verb|actions|drown|溺水|ahogarse|se noyer|annegare|おぼれる|물에 빠지다
verb|actions|freeze|結冰|helar|geler|gelare|凍る|얼다
verb|actions|melt|融化|derretirse|fondre|sciogliersi|溶ける|녹다
verb|actions|blow|吹|soplar|souffler|soffiare|吹く|불다
verb|actions|shine|照耀|brillar|briller|splendere|輝く|빛나다
verb|actions|bloom|開花|florecer|fleurir|fiorire|咲く|피다
verb|actions|wither|枯萎|marchitarse|se faner|appassire|しおれる|시들다
verb|actions|hunt|打獵|cazar|chasser|cacciare|狩りをする|사냥하다
verb|actions|bark|吠|ladrar|aboyer|abbaiare|ほえる|짖다
verb|actions|sting|叮|picar|piquer|pungere|刺す|쏘다
verb|actions|mow the lawn|割草|cortar el césped|tondre la pelouse|tagliare l'erba|芝を刈る|잔디를 깎다
verb|actions|prune|修剪|podar|élaguer|potare|刈り込む|가지치기하다
other|other|nearby|附近|cerca|à proximité|nelle vicinanze|近くの|근처의
other|other|meow|喵|miau|miaou|miao|ニャー|야옹
adjective|other|wild|野生|salvaje|sauvage|selvatico;selvatica|野生の|야생의
adjective|other|tropical|熱帶|tropical|tropical;tropicale|tropicale|熱帯の|열대의
adjective|other|remote|偏遠|remoto;remota|isolé;isolée|isolato;isolata|へんぴな|외딴
adjective|other|outdoor|戶外|al aire libre|en plein air|all'aperto|屋外の|야외의
adjective|other|ancient|古代|antiguo;antigua|ancien;ancienne|antico;antica|古代の|고대의
adjective|other|luxurious|奢華|lujoso;lujosa|luxueux;luxueuse|lussuoso;lussuosa|豪華な|호화롭다
adjective|other|picturesque|風景如畫|pintoresco;pintoresca|pittoresque|pittoresco;pittoresca|絵のように美しい|그림 같다
adjective|other|quaint|古色古香|con encanto|pittoresque|caratteristico;caratteristica|古風な趣のある|예스럽다
adjective|other|vast|廣闊|vasto;vasta|vaste|vasto;vasta|広大な|광대하다
noun|objects|terminal|航廈|terminal|terminal|terminal|ターミナル|터미널
noun|objects|runway|跑道|pista|piste|pista|滑走路|활주로
noun|other|takeoff|起飛|despegue|décollage|decollo|離陸|이륙
noun|other|landing|降落|aterrizaje|atterrissage|atterraggio|着陸|착륙
noun|other|layover|轉機|escala|escale|scalo|乗り継ぎ|경유
noun|other|connecting flight|轉機航班|vuelo de conexión|vol de correspondance|volo in coincidenza|乗り継ぎ便|연결 항공편
noun|other|direct flight|直飛航班|vuelo directo|vol direct|volo diretto|直行便|직항편
noun|other|domestic flight|國內航班|vuelo nacional|vol intérieur|volo nazionale|国内線|국내선
noun|other|international flight|國際航班|vuelo internacional|vol international|volo internazionale|国際線|국제선
noun|objects|carry-on|隨身行李|equipaje de mano|bagage à main|bagaglio a mano|機内持ち込み手荷物|기내 수하물
noun|objects|checked baggage|托運行李|equipaje facturado|bagage en soute|bagaglio da stiva|預け荷物|위탁 수하물
noun|objects|baggage claim|行李提領處|recogida de equipajes|retrait des bagages|ritiro bagagli|手荷物受取所|수하물 찾는 곳
noun|objects|duty-free shop|免稅店|tienda libre de impuestos|boutique hors taxes|negozio duty free|免税店|면세점
noun|objects|passport control|證照查驗|control de pasaportes|contrôle des passeports|controllo passaporti|出入国審査|출입국 심사
noun|other|economy class|經濟艙|clase turista;clase económica|classe économique|classe economica|エコノミークラス|일반석
noun|other|business class|商務艙|clase business|classe affaires|classe business|ビジネスクラス|비즈니스석
noun|other|first class|頭等艙|primera clase|première classe|prima classe|ファーストクラス|일등석
noun|objects|life jacket|救生衣|chaleco salvavidas|gilet de sauvetage|giubbotto di salvataggio|救命胴衣|구명조끼
noun|other|travel insurance|旅遊保險|seguro de viaje|assurance voyage|assicurazione di viaggio|旅行保険|여행자 보험
noun|objects|guidebook|旅遊指南|guía de viaje|guide de voyage|guida turistica|ガイドブック|여행 안내서
noun|objects|postcard|明信片|postal|carte postale|cartolina|絵はがき|엽서
noun|objects|souvenir shop|紀念品店|tienda de recuerdos|boutique de souvenirs|negozio di souvenir|土産物店|기념품 가게
noun|other|entrance fee|入場費|precio de entrada|prix d'entrée|prezzo d'ingresso|入場料|입장료
noun|objects|tourist office|遊客中心|oficina de turismo|office de tourisme|ufficio turistico|観光案内所|관광 안내소
noun|other|tour group|旅行團|grupo turístico|groupe de touristes|gruppo turistico|団体旅行|단체 여행
noun|objects|tour bus|遊覽車|autobús turístico|car de tourisme|pullman turistico|観光バス|관광버스
noun|other|day trip|一日遊|excursión de un día|excursion d'une journée|gita di un giorno|日帰り旅行|당일 여행
noun|other|road trip|公路旅行|viaje por carretera|road trip|viaggio in macchina|ドライブ旅行|자동차 여행
noun|other|cruise|郵輪旅遊|crucero|croisière|crociera|クルーズ|크루즈 여행
noun|objects|yacht|遊艇|yate|yacht|yacht|ヨット|요트
noun|objects|hot-air balloon|熱氣球|globo aerostático|montgolfière|mongolfiera|熱気球|열기구
noun|objects|van|廂型車|furgoneta|camionnette|furgone|バン|밴
noun|objects|railway;railroad|鐵路|ferrocarril|chemin de fer|ferrovia|鉄道|철도
noun|other|fare|車資|tarifa|tarif|tariffa|運賃|요금
noun|other|speed limit|速限|límite de velocidad|limitation de vitesse|limite di velocità|制限速度|제한 속도
noun|objects|lane|車道|carril|voie|corsia|車線|차선
noun|objects|one-way street|單行道|calle de sentido único|rue à sens unique|strada a senso unico|一方通行|일방통행
noun|objects|dead end|死巷|callejón sin salida|impasse|vicolo cieco|行き止まり|막다른 길
noun|objects|roundabout|圓環|rotonda;glorieta|rond-point|rotatoria|ロータリー|로터리
noun|objects|city block|街區|manzana;cuadra|pâté de maisons|isolato|街区|블록
noun|objects|pavement|人行道|acera|trottoir|marciapiede|歩道|보도
noun|other|car accident|車禍|accidente de tráfico|accident de voiture|incidente stradale|交通事故|교통사고
noun|other|shortcut|捷徑|atajo|raccourci|scorciatoia|近道|지름길
noun|other|lost and found|失物招領|objetos perdidos|objets trouvés|oggetti smarriti|遺失物取扱所|분실물 센터
noun|other|northeast|東北|noreste|nord-est|nord-est|北東|북동
noun|other|northwest|西北|noroeste|nord-ouest|nord-ovest|北西|북서
noun|other|southeast|東南|sureste|sud-est|sud-est|南東|남동
noun|other|southwest|西南|suroeste|sud-ouest|sud-ovest|南西|남서
noun|objects|harbor;harbour|港灣|puerto|port|porto|港湾|항만
noun|objects|pier|碼頭|muelle|jetée|molo|桟橋|부두
noun|objects|suburb|郊區|afueras|banlieue|periferia|郊外|교외
noun|objects|old town|舊城區|casco antiguo|vieille ville|centro storico|旧市街|구시가지
noun|objects|landmark|地標|lugar emblemático|lieu emblématique|luogo simbolo|ランドマーク|랜드마크
noun|objects|monument|紀念碑|monumento|monument|monumento|記念碑|기념비
noun|objects|ruin|遺跡|ruina|ruine|rovina|遺跡|유적
noun|objects|cathedral|大教堂|catedral|cathédrale|cattedrale|大聖堂|대성당
noun|objects|botanical garden|植物園|jardín botánico|jardin botanique|orto botanico|植物園|식물원
noun|objects|theme park|主題樂園|parque temático|parc à thème|parco a tema|テーマパーク|테마파크
noun|objects|playground|遊樂場|parque infantil|aire de jeux|parco giochi|遊び場|놀이터
noun|objects|cemetery|墓園|cementerio|cimetière|cimitero|墓地|묘지
noun|objects|viewpoint|觀景台|mirador|belvédère|belvedere|展望台|전망대
noun|other|night view|夜景|vista nocturna|vue de nuit|vista notturna|夜景|야경
noun|objects|cityscape|城市景觀|paisaje urbano|paysage urbain|paesaggio urbano|街並み|도시 경관
noun|objects|utility pole|電線桿|poste eléctrico|poteau électrique|palo della luce|電柱|전봇대
noun|objects|fire hydrant|消防栓|hidrante|borne d'incendie|idrante|消火栓|소화전
noun|objects|hometown|家鄉|ciudad natal|ville natale|città natale|故郷|고향
noun|objects|county|縣|condado|comté|contea|県|군
noun|objects|province|省|provincia|province|provincia|省|성
noun|objects|rice paddy|稻田|arrozal|rizière|risaia|田んぼ|논
noun|objects|orchard|果園|huerto frutal|verger|frutteto|果樹園|과수원
noun|objects|vineyard|葡萄園|viñedo|vignoble|vigneto|ぶどう園|포도밭
noun|objects|tea plantation|茶園|plantación de té|plantation de thé|piantagione di tè|茶畑|차밭
noun|objects|cabin|小木屋|cabaña|cabane|capanna|山小屋|오두막
noun|objects|windmill|風車|molino de viento|moulin à vent|mulino a vento|風車|풍차
noun|objects|dam|水壩|presa|barrage|diga|ダム|댐
noun|objects|canal|運河|canal|canal|canale|運河|운하
noun|objects|peak|山峰|pico|pic|picco|山頂|산봉우리
noun|objects|mountain range|山脈|cordillera|chaîne de montagnes|catena montuosa|山脈|산맥
noun|objects|canyon|峽谷|cañón|canyon|canyon|峡谷|협곡
noun|objects|glacier|冰河|glaciar|glacier|ghiacciaio|氷河|빙하
noun|objects|peninsula|半島|península|péninsule|penisola|半島|반도
noun|objects|continent|洲|continente|continent|continente|大陸|대륙
noun|other|altitude|海拔;海拔高度|altitud|altitude|altitudine|標高|해발
noun|other|tide|潮汐|marea|marée|marea|潮|조수
noun|other|natural wonder|天然奇景|maravilla natural|merveille naturelle|meraviglia naturale|自然の驚異|자연의 경이
noun|other|fresh air|新鮮空氣|aire fresco|air frais|aria fresca|新鮮な空気|맑은 공기
noun|other|cold wave|寒流|ola de frío|vague de froid|ondata di freddo|寒波|한파
noun|other|rain shower|陣雨|chubasco|averse|acquazzone|にわか雨|소나기
noun|objects|fossil|化石|fósil|fossile|fossile|化石|화석
noun|objects|tulip|鬱金香|tulipán|tulipe|tulipano|チューリップ|튤립
noun|objects|lotus|蓮花|loto|lotus|loto|ハス|연꽃
noun|objects|orchid|蘭花|orquídea|orchidée|orchidea|ラン|난초
noun|objects|lavender|薰衣草|lavanda|lavande|lavanda|ラベンダー|라벤더
noun|objects|jasmine|茉莉花|jazmín|jasmin|gelsomino|ジャスミン|재스민
noun|objects|plum blossom|梅花|flor de ciruelo|fleur de prunier|fiore di pruno|梅の花|매화
noun|objects|cactus|仙人掌|cactus|cactus|cactus|サボテン|선인장
noun|objects|oak|橡樹|roble|chêne|quercia|オーク|참나무
noun|objects|maple|楓樹|arce|érable|acero|カエデ|단풍나무
noun|objects|petal|花瓣|pétalo|pétale|petalo|花びら|꽃잎
noun|objects|stump|樹樁|tocón|souche|ceppo|切り株|그루터기
noun|objects|bouquet|花束|ramo de flores|bouquet|mazzo di fiori|花束|꽃다발
noun|objects|rhinoceros|犀牛|rinoceronte|rhinocéros|rinoceronte|サイ|코뿔소
noun|objects|polar bear|北極熊|oso polar|ours polaire|orso polare|ホッキョクグマ|북극곰
noun|objects|seal|海豹|foca|phoque|foca|アザラシ|물개
noun|objects|sea turtle|海龜|tortuga marina|tortue de mer|tartaruga marina|ウミガメ|바다거북
noun|objects|abalone|鮑魚|abulón|ormeau|abalone|アワビ|전복
noun|objects|bat|蝙蝠|murciélago|chauve-souris|pipistrello|コウモリ|박쥐
noun|objects|buffalo|水牛|búfalo|buffle|bufalo|水牛|물소
noun|objects|bull|公牛|toro|taureau|toro|雄牛|황소
noun|objects|donkey|驢子|burro|âne|asino|ロバ|당나귀
noun|objects|crow|烏鴉|cuervo|corbeau|corvo|カラス|까마귀
noun|objects|seagull|海鷗|gaviota|mouette|gabbiano|カモメ|갈매기
noun|objects|caterpillar|毛毛蟲|oruga|chenille|bruco|毛虫|애벌레
noun|objects|firefly|螢火蟲|luciérnaga|luciole|lucciola|ホタル|반딧불이
noun|objects|paw|爪子|pata|patte|zampa|足（動物の）|발
noun|objects|dragon|龍|dragón|dragon|drago|竜|용
noun|objects|kimchi|泡菜;韓式泡菜|kimchi|kimchi|kimchi|キムチ|김치
noun|objects|cola|可樂|refresco de cola;cola|cola|cola|コーラ|콜라
noun|objects|soju|燒酒|soju|soju|soju|焼酎|소주
noun|objects|tap water|自來水|agua del grifo;agua de la llave|eau du robinet|acqua del rubinetto|水道水|수돗물
noun|objects|ramen|拉麵|ramen|ramen|ramen|ラーメン|라멘
noun|objects|spaghetti|義大利麵|espagueti;espaguetis|spaghetti|spaghetti|スパゲッティ|스파게티
noun|objects|pancake|鬆餅|panqueque;tortita|pancake|pancake|パンケーキ|팬케이크
noun|objects|crepe|可麗餅|crepe;crepa|crêpe|crêpe|クレープ|크레이프
noun|objects|omelet|歐姆蛋;煎蛋捲|tortilla francesa;omelette|omelette|omelette|オムレツ|오믈렛
noun|objects|stew|燉菜|estofado|ragoût|stufato|シチュー|스튜
noun|objects|pie|派|tarta;pastel|tarte|crostata|パイ|파이
noun|objects|pudding|布丁|pudín;flan|pudding;flan|budino|プリン|푸딩
noun|objects|jelly|果凍|gelatina|gelée|gelatina|ゼリー|젤리
noun|objects|potato chips|洋芋片|patatas fritas;papas fritas|chips|patatine|ポテトチップス|감자칩
noun|objects|whipped cream|鮮奶油|nata montada;crema batida|crème chantilly|panna montata|ホイップクリーム|휘핑크림
noun|objects|espresso|濃縮咖啡|café expreso;espresso|expresso;espresso|espresso|エスプレッソ|에스프레소
noun|objects|cappuccino|卡布奇諾|capuchino;cappuccino|cappuccino|cappuccino|カプチーノ|카푸치노
noun|objects|iced coffee|冰咖啡|café helado|café glacé|caffè freddo|アイスコーヒー|아이스커피
noun|objects|black coffee|黑咖啡|café negro;café solo|café noir|caffè nero|ブラックコーヒー|블랙커피
noun|objects|lemonade|檸檬水|limonada|citronnade|limonata|レモネード|레모네이드
noun|objects|smoothie|冰沙;果昔|batido;smoothie|smoothie|frullato|スムージー|스무디
noun|objects|tea bag|茶包|bolsita de té|sachet de thé|bustina di tè|ティーバッグ|티백
noun|objects|oolong tea|烏龍茶|té oolong|thé oolong|tè oolong|ウーロン茶|우롱차
noun|objects|herbal tea|花草茶|infusión|tisane|tisana|ハーブティー|허브티
noun|objects|matcha|抹茶|matcha|matcha|matcha|抹茶|말차
noun|objects|sake|清酒|sake|saké|sake;sakè|日本酒|사케
noun|people|bartender|調酒師|barman;bartender|barman|barman|バーテンダー|바텐더
noun|objects|brown sugar|黑糖;紅糖|azúcar moreno|sucre roux;cassonade|zucchero di canna|黒糖|흑설탕
noun|objects|peanut butter|花生醬|mantequilla de maní;crema de cacahuete|beurre de cacahuète|burro di arachidi|ピーナッツバター|땅콩버터
noun|objects|sesame oil|麻油;芝麻油|aceite de sésamo|huile de sésame|olio di sesamo|ごま油|참기름
noun|objects|turkey|火雞|pavo|dinde|tacchino|七面鳥|칠면조
noun|objects|pork ribs|排骨|costillas de cerdo|travers de porc|costine di maiale|スペアリブ|돼지 갈비
noun|objects|minced meat|絞肉|carne picada;carne molida|viande hachée|carne macinata|ひき肉|다진 고기
noun|objects|chicken wing|雞翅|ala de pollo|aile de poulet|aletta di pollo|手羽先|닭 날개
noun|objects|chicken breast|雞胸肉|pechuga de pollo|blanc de poulet|petto di pollo|鶏むね肉|닭가슴살
noun|objects|fried chicken|炸雞|pollo frito|poulet frit|pollo fritto|フライドチキン|치킨;프라이드치킨
noun|objects|roast chicken|烤雞|pollo asado|poulet rôti|pollo arrosto|ローストチキン|통닭구이
noun|objects|radish|小蘿蔔;櫻桃蘿蔔|rábano|radis|ravanello|ラディッシュ|래디시
noun|objects|bok choy|青江菜|col china;bok choy|pak-choï|pak choi|チンゲン菜|청경채
noun|objects|bamboo shoot|竹筍|brote de bambú|pousse de bambou|germoglio di bambù|たけのこ|죽순
noun|objects|seaweed|海藻|alga|algue|alga|海藻|해초;김
noun|objects|green bean|四季豆|judía verde;ejote|haricot vert|fagiolino|さやいんげん|껍질콩
noun|objects|coriander;cilantro|香菜|cilantro;culantro|coriandre|coriandolo|パクチー|고수
noun|objects|parsley|巴西里|perejil|persil|prezzemolo|パセリ|파슬리
noun|objects|basil|羅勒|albahaca|basilic|basilico|バジル|바질
noun|objects|mint|薄荷|menta|menthe|menta|ミント|민트
noun|objects|herb|香草植物;香草|hierba aromática|herbe aromatique|erba aromatica|ハーブ|허브
noun|objects|melon|哈密瓜|melón|melon|melone|メロン|멜론
noun|objects|lime|萊姆|lima|citron vert|lime|ライム|라임
noun|objects|raisin|葡萄乾|pasa|raisin sec|uvetta|レーズン|건포도
noun|objects|walnut|核桃|nuez|noix|noce|クルミ|호두
noun|objects|chestnut|栗子|castaña|châtaigne|castagna|栗|밤
noun|objects|boiled egg|水煮蛋|huevo cocido|œuf dur|uovo sodo|ゆで卵|삶은 달걀
noun|objects|scrambled eggs|炒蛋|huevos revueltos|œufs brouillés|uova strapazzate|スクランブルエッグ|스크램블드에그
noun|objects|oats|燕麥片|copos de avena|flocons d'avoine|fiocchi d'avena|オートミール|오트밀
noun|objects|oyster sauce|蠔油|salsa de ostras|sauce d'huître|salsa di ostriche|オイスターソース|굴 소스
noun|objects|chili sauce|辣椒醬|salsa picante|sauce pimentée|salsa piccante|チリソース|칠리소스
noun|objects|broth|高湯|caldo|bouillon|brodo|だし|육수
noun|objects|pickle|酸黃瓜|pepinillo|cornichon|cetriolino|ピクルス|피클
noun|objects|beef noodle soup|牛肉麵|sopa de fideos con carne de res|soupe de nouilles au bœuf|zuppa di noodle al manzo|牛肉麺|우육면
noun|objects|braised pork rice|滷肉飯|arroz con cerdo estofado|riz au porc braisé|riso con maiale brasato|魯肉飯|루러우판
noun|objects|oyster omelet|蚵仔煎|tortilla de ostras|omelette aux huîtres|frittata di ostriche|カキのオムレツ|굴전
noun|objects|scallion pancake|蔥油餅|tortita de cebolleta|galette à l'oignon vert|frittella di cipollotto|ねぎ餅|파전병
noun|objects|soup dumpling|小籠包|xiaolongbao|xiaolongbao|xiaolongbao|小籠包|샤오룽바오
noun|objects|potsticker|鍋貼|gyoza|gyoza|gyoza|焼き餃子|군만두
noun|objects|spring roll|春捲|rollito de primavera|rouleau de printemps|involtino primavera|春巻き|춘권
noun|objects|rice ball|飯糰|bola de arroz|boule de riz|palla di riso|おにぎり|주먹밥
noun|objects|fried dough stick|油條|churro chino|beignet chinois|youtiao|揚げパン|요우티아오
noun|objects|congee|稀飯;粥|congee|congee|congee|おかゆ|죽
noun|objects|pineapple cake|鳳梨酥|pastel de piña|gâteau à l'ananas|torta all'ananas|パイナップルケーキ|펑리수
noun|objects|shaved ice|刨冰;剉冰|hielo raspado|glace pilée|ghiaccio tritato|かき氷|빙수
noun|objects|tapioca pearl|珍珠|perla de tapioca|perle de tapioca|perla di tapioca|タピオカ|타피오카 펄
noun|objects|tea egg|茶葉蛋|huevo de té|œuf au thé|uovo al tè|茶葉卵|차예단
noun|objects|oden|關東煮|oden|oden|oden|おでん|어묵탕
noun|objects|bento|便當|bento|bento|bento|弁当|도시락
noun|objects|tempura|天婦羅|tempura|tempura|tempura|天ぷら|튀김
noun|objects|udon|烏龍麵|udon|udon|udon|うどん|우동
noun|objects|miso soup|味噌湯|sopa de miso|soupe miso|zuppa di miso|みそ汁|된장국
noun|objects|sashimi|生魚片|sashimi|sashimi|sashimi|刺身|회
noun|objects|dim sum|港式點心|dim sum|dim sum|dim sum|飲茶|딤섬
noun|objects|wonton|餛飩|wonton|wonton|wonton|ワンタン|완탕
noun|objects|steamed bun|包子|bollo al vapor|pain à la vapeur|panino al vapore|まんじゅう|찐빵
noun|objects|mochi|麻糬|mochi|mochi|mochi|もち|떡
noun|objects|taro|芋頭|taro|taro|taro|サトイモ|토란
noun|objects|sticky rice|糯米|arroz glutinoso|riz gluant|riso glutinoso|もち米|찹쌀
noun|objects|rice noodles|米粉|fideos de arroz|nouilles de riz|noodle di riso|ビーフン|쌀국수
noun|objects|kebab|沙威瑪;土耳其烤肉|kebab|kebab|kebab|ケバブ|케밥
noun|objects|lasagna|千層麵|lasaña|lasagnes|lasagne|ラザニア|라자냐
noun|objects|risotto|燉飯|risotto|risotto|risotto|リゾット|리소토
noun|objects|bread roll|餐包;小麵包|panecillo|petit pain|panino|ロールパン|모닝빵
verb|actions|bake|烤;烘焙|hornear|cuire au four|cuocere al forno|焼く（オーブンで）|굽다
verb|actions|boil|煮;煮沸|hervir|bouillir|bollire|ゆでる|삶다
verb|actions|fry|炸|freír|frire|friggere|揚げる|튀기다
verb|actions|stir-fry|炒|saltear|faire sauter|saltare in padella|炒める|볶다
verb|actions|grill|烤;燒烤|asar a la parrilla|griller|grigliare|網焼きにする|석쇠에 굽다
verb|actions|roast|烤|asar|rôtir|arrostire|ローストする|굽다
verb|actions|steam|蒸|cocer al vapor|cuire à la vapeur|cuocere a vapore|蒸す|찌다
verb|actions|stir|攪拌|remover|remuer|mescolare|かき混ぜる|젓다
verb|actions|pour|倒|verter|verser|versare|注ぐ|붓다
verb|actions|chop|切碎|picar|hacher|tritare|刻む|다지다
verb|actions|slice|切片|cortar en rodajas|couper en tranches|affettare|薄く切る|얇게 썰다
verb|actions|peel|削皮;剝皮|pelar|éplucher|sbucciare|皮をむく|껍질을 벗기다
verb|actions|marinate|醃|marinar|mariner|marinare|漬け込む|재우다
verb|actions|simmer|燉|cocer a fuego lento|mijoter|cuocere a fuoco lento|煮込む|끓이다
verb|actions|defrost|解凍|descongelar|décongeler|scongelare|解凍する|해동하다
verb|actions|reheat|加熱|recalentar|réchauffer|riscaldare|温め直す|데우다
verb|actions|serve|上菜|servir|servir|servire|料理を出す|음식을 내다
verb|actions|chew|咀嚼;嚼|masticar|mâcher|masticare|かむ（咀嚼）|씹다
verb|actions|swallow|吞|tragar|avaler|ingoiare|飲み込む|삼키다
verb|actions|squeeze|擠|exprimir|presser|spremere|しぼる|짜다
adjective|other|bland|沒味道|soso;sosa|fade|insipido;insipida|味気ない|싱겁다
adjective|other|greasy|油膩|grasiento;grasienta|gras;grasse|unto;unta|脂っこい|느끼하다
adjective|other|crispy|酥脆|crujiente|croustillant;croustillante|croccante|サクサクした|바삭하다
adjective|other|juicy|多汁|jugoso;jugosa|juteux;juteuse|succoso;succosa|ジューシーな|즙이 많다
adjective|other|creamy|綿密|cremoso;cremosa|crémeux;crémeuse|cremoso;cremosa|クリーミーな|부드럽다
adjective|other|rotten|腐爛|podrido;podrida|pourri;pourrie|marcio;marcia|腐った|썩다
adjective|other|ripe|成熟|maduro;madura|mûr;mûre|maturo;matura|熟した|익다
adjective|other|fried|油炸的|frito;frita|frit;frite|fritto;fritta|揚げた|튀긴
adjective|other|boiled|水煮的|hervido;hervida|bouilli;bouillie|bollito;bollita|ゆでた|삶은
adjective|other|grilled|燒烤的;烤的|a la parrilla|grillé;grillée|alla griglia|焼いた|구운
adjective|other|steamed|蒸的|al vapor|à la vapeur|al vapore|蒸した|찐
adjective|other|smoked|煙燻的|ahumado;ahumada|fumé;fumée|affumicato;affumicata|燻製の|훈제한
adjective|other|sticky|黏的|pegajoso;pegajosa|collant;collante|appiccicoso;appiccicosa|ねばねばした|끈적하다
adjective|other|homemade|自製的|casero;casera|fait maison|fatto in casa|手作りの|수제
adjective|other|organic|有機的|orgánico;orgánica|biologique;bio|biologico;biologica|有機の|유기농
adjective|other|vegan|純素的|vegano;vegana|végétalien;végétalienne|vegano;vegana|ヴィーガンの|비건
adjective|other|gluten-free|無麩質的|sin gluten|sans gluten|senza glutine|グルテンフリーの|글루텐 프리
noun|other|aroma|香味;香氣|aroma|arôme|aroma|香り|향기
noun|other|appetite|胃口;食慾|apetito|appétit|appetito|食欲|식욕
noun|objects|freezer|冷凍庫|congelador|congélateur|congelatore|冷凍庫|냉동실
noun|objects|baking tray|烤盤|bandeja de horno|plaque de cuisson|teglia|天板|베이킹 트레이
noun|objects|steamer|蒸籠|vaporera|cuit-vapeur|vaporiera|せいろ|찜기
noun|objects|pressure cooker|壓力鍋|olla a presión|autocuiseur;cocotte-minute|pentola a pressione|圧力鍋|압력솥
noun|objects|air fryer|氣炸鍋|freidora de aire|friteuse à air|friggitrice ad aria|エアフライヤー|에어프라이어
noun|objects|jar|罐子;玻璃罐|frasco;tarro|bocal|barattolo|瓶（びん）|병;단지
noun|objects|cutlery|餐具|cubiertos|couverts|posate|食器|식기
noun|objects|lunch box|便當盒|fiambrera;lonchera|boîte à repas|portapranzo|弁当箱|도시락통
noun|objects|water bottle|水壺|botella de agua|gourde|borraccia|水筒|물병
noun|objects|dining table|餐桌|mesa de comedor|table à manger|tavolo da pranzo|食卓|식탁
noun|objects|signature dish|招牌菜|especialidad de la casa|spécialité de la maison|specialità della casa|看板料理|대표 메뉴
noun|objects|set meal|套餐|menú;combo|menu|menu fisso|定食|세트 메뉴
noun|other|food delivery|外送|comida a domicilio|livraison de repas|consegna a domicilio|フードデリバリー|음식 배달
noun|objects|tea house|茶館|casa de té|salon de thé|sala da tè|茶館|찻집
noun|objects|bubble tea shop|手搖飲料店;手搖飲店|tienda de té de burbujas|boutique de bubble tea|negozio di bubble tea|ドリンクスタンド|버블티 가게
noun|people|barista|咖啡師|barista|barista|barista|バリスタ|바리스타
phrase|other|all-you-can-eat|吃到飽|buffet libre|à volonté|all you can eat|食べ放題|무한 리필
phrase|other|I'm full|我吃飽了|estoy lleno;estoy llena|je n'ai plus faim|sono pieno;sono piena|お腹いっぱいです|배불러요
noun|other|boxing|拳擊|boxeo|boxe|boxe|ボクシング|권투
noun|other|karate|空手道|kárate;karate|karaté|karate|空手|가라테
noun|other|judo|柔道|judo;yudo|judo|judo|柔道|유도
noun|other|martial arts|武術|artes marciales|arts martiaux|arti marziali|武術|무술
noun|other|cycling|單車運動|ciclismo|cyclisme|ciclismo|サイクリング|사이클링
noun|other|surfing|衝浪|surf|surf|surf|サーフィン|서핑
noun|objects|skateboard|滑板|monopatín;patineta|skateboard|skateboard|スケートボード|스케이트보드
noun|other|gymnastics|體操|gimnasia|gymnastique|ginnastica|体操|체조
noun|other|athletics|田徑|atletismo|athlétisme|atletica|陸上競技|육상
noun|other|marathon|馬拉松|maratón|marathon|maratona|マラソン|마라톤
noun|other|weightlifting|舉重|halterofilia|haltérophilie|sollevamento pesi|重量挙げ|역도
noun|objects|treadmill|跑步機|cinta de correr|tapis de course|tapis roulant|ランニングマシン|러닝머신
noun|objects|yoga mat|瑜伽墊|esterilla de yoga|tapis de yoga|tappetino da yoga|ヨガマット|요가 매트
noun|other|fitness|健身|fitness|fitness|fitness|フィットネス|피트니스
noun|other|warm-up|熱身|calentamiento|échauffement|riscaldamento|ウォーミングアップ|준비 운동
noun|people|referee|裁判|árbitro;árbitra|arbitre|arbitro;arbitra|審判|심판
noun|other|tournament|錦標賽|torneo|tournoi|torneo|トーナメント|토너먼트
noun|other|league|聯賽|liga|championnat|campionato|リーグ|리그
noun|objects|medal|獎牌|medalla|médaille|medaglia|メダル|메달
noun|objects|gold medal|金牌|medalla de oro|médaille d'or|medaglia d'oro|金メダル|금메달
noun|objects|trophy|獎盃|trofeo|trophée|trofeo|トロフィー|트로피
noun|other|World Cup|世界盃|Mundial;Copa del Mundo|Coupe du monde|Coppa del Mondo|ワールドカップ|월드컵
noun|people|opponent|對手|oponente;rival|adversaire|avversario;avversaria|対戦相手|상대
noun|other|penalty kick|十二碼;十二碼罰球|penalti;penal|penalty|calcio di rigore;rigore|ペナルティーキック|페널티 킥
noun|people|winner|贏家|ganador;ganadora|gagnant;gagnante|vincitore;vincitrice|勝者|승자
noun|people|loser|輸家|perdedor;perdedora|perdant;perdante|perdente|敗者|패자
noun|people|teammate|隊友|compañero de equipo;compañera de equipo|coéquipier;coéquipière|compagno di squadra;compagna di squadra|チームメイト|팀 동료
noun|people|team captain|隊長|capitán;capitana|capitaine|capitano;capitana|キャプテン|주장
noun|people|goalkeeper|守門員|portero;portera|gardien de but|portiere|ゴールキーパー|골키퍼
noun|other|race|賽跑|carrera|course|corsa|競走|경주
noun|other|rock climbing|攀岩|escalada|escalade|arrampicata|ロッククライミング|암벽 등반
noun|other|scuba diving|潛水|buceo|plongée sous-marine|immersione subacquea|スキューバダイビング|스쿠버 다이빙
noun|other|snorkeling|浮潛|esnórquel;snorkel|plongée avec tuba|snorkeling|シュノーケリング|스노클링
noun|other|bowling|保齡球|bolos;boliche|bowling|bowling|ボウリング|볼링
noun|other|billiards|撞球|billar|billard|biliardo|ビリヤード|당구
noun|objects|jump rope|跳繩|cuerda de saltar;comba|corde à sauter|corda per saltare|縄跳び|줄넘기
noun|objects|frisbee|飛盤|frisbee;disco volador|frisbee|frisbee|フリスビー|프리스비
noun|objects|kite|風箏|cometa;papalote|cerf-volant|aquilone|凧|연
noun|objects|jersey|球衣|camiseta|maillot|maglia|ユニフォーム|유니폼
noun|people|personal trainer|私人教練|entrenador personal;entrenadora personal|coach sportif|personal trainer|パーソナルトレーナー|개인 트레이너
noun|objects|kettlebell|壺鈴|pesa rusa|kettlebell|kettlebell|ケトルベル|케틀벨
noun|other|weight class|量級|categoría de peso|catégorie de poids|categoria di peso|階級|체급
noun|other|pommel horse|鞍馬|caballo con arcos|cheval d'arçons|cavallo con maniglie|あん馬|안마
noun|other|balance beam|平衡木|barra de equilibrio;viga|poutre|trave|平均台|평균대
noun|other|slam dunk|灌籃|mate;clavada|dunk|schiacciata|スラムダンク|슬램덩크
noun|people|contestant|參賽者|concursante|concurrent|concorrente|出場者|참가자
verb|actions|cheer|加油|animar|encourager|tifare|応援する|응원하다
noun|other|puzzle|謎題|rompecabezas|casse-tête|rompicapo|パズル|퍼즐
noun|objects|dice|骰子|dado|dé|dado|さいころ|주사위
noun|objects|deck of cards|一副撲克牌|baraja;mazo de cartas|jeu de cartes|mazzo di carte|トランプ一組|카드 한 벌
noun|other|poker|撲克|póquer;póker|poker|poker|ポーカー|포커
noun|other|mahjong|麻將|mahjong|mah-jong|mahjong|麻雀|마작
noun|objects|toy|玩具|juguete|jouet|giocattolo|おもちゃ|장난감
noun|objects|doll|洋娃娃;娃娃|muñeca|poupée|bambola|人形|인형
noun|objects|game console|遊戲主機|consola|console de jeux|console|ゲーム機|게임기
noun|other|lottery|彩券;樂透|lotería|loterie|lotteria|宝くじ|복권
noun|objects|roller coaster|雲霄飛車|montaña rusa|grand huit;montagnes russes|ottovolante;montagne russe|ジェットコースター|롤러코스터
noun|objects|Ferris wheel|摩天輪|noria;rueda de la fortuna|grande roue|ruota panoramica|観覧車|대관람차
noun|other|karaoke|卡拉OK;KTV|karaoke|karaoké|karaoke|カラオケ|노래방
noun|other|escape room|密室逃脫|escape room|escape game|escape room|脱出ゲーム|방탈출
verb|actions|bet|打賭|apostar|parier|scommettere|賭ける|내기하다
verb|actions|play cards|打牌|jugar a las cartas|jouer aux cartes|giocare a carte|トランプをする|카드놀이하다
verb|actions|play video games|打電動;玩電玩|jugar a videojuegos|jouer aux jeux vidéo|giocare ai videogiochi|テレビゲームをする|게임을 하다
verb|actions|go to the movies|看電影|ir al cine|aller au cinéma|andare al cinema|映画を見に行く|영화 보러 가다
verb|actions|go to the gym|去健身房|ir al gimnasio|aller à la salle de sport|andare in palestra|ジムに行く|헬스장에 가다
verb|actions|go swimming|去游泳|ir a nadar|aller nager|andare a nuotare|泳ぎに行く|수영하러 가다
verb|actions|go jogging|去慢跑|salir a correr|aller courir|andare a correre|ジョギングに行く|조깅하러 가다
verb|actions|go fishing|去釣魚|ir a pescar|aller à la pêche|andare a pescare|釣りに行く|낚시하러 가다
verb|actions|go hiking|去健行;去爬山|hacer senderismo|faire de la randonnée|fare escursioni|ハイキングに行く|하이킹 가다
verb|actions|listen to music|聽音樂|escuchar música|écouter de la musique|ascoltare musica|音楽を聴く|음악을 듣다
verb|actions|watch TV|看電視|ver la tele;ver la televisión|regarder la télé|guardare la tv|テレビを見る|텔레비전을 보다
noun|other|leisure|休閒|ocio|loisirs|svago|余暇|여가
verb|actions|knit|編織;織毛線|tejer|tricoter|lavorare a maglia|編む|뜨개질하다
noun|other|pottery|陶藝|alfarería;cerámica|poterie|ceramica|陶芸|도예
noun|other|origami|摺紙|origami|origami|origami|折り紙|종이접기
noun|other|calligraphy|書法|caligrafía|calligraphie|calligrafia|書道|서예
noun|other|watercolor|水彩|acuarela|aquarelle|acquerello|水彩画|수채화
noun|other|sculpture|雕塑|escultura|sculpture|scultura|彫刻|조각
adjective|other|handmade|手工的|hecho a mano|fait main|fatto a mano|手作りの|수공예의
noun|people|composer|作曲家|compositor;compositora|compositeur;compositrice|compositore;compositrice|作曲家|작곡가
noun|other|melody|旋律|melodía|mélodie|melodia|メロディー|선율
noun|other|lyrics|歌詞|letra|paroles|testo|歌詞|가사
noun|other|album|專輯|álbum|album|album|アルバム|앨범
noun|other|orchestra|管弦樂團|orquesta|orchestre|orchestra|オーケストラ|오케스트라
noun|other|jazz|爵士樂|jazz|jazz|jazz|ジャズ|재즈
noun|other|classical music|古典音樂|música clásica|musique classique|musica classica|クラシック音楽|클래식 음악
noun|other|rock music|搖滾樂|rock|rock|rock|ロック|록 음악
noun|other|pop music|流行音樂|música pop|musique pop|musica pop|ポップス|대중음악
noun|other|hip-hop|嘻哈|hip hop|hip-hop|hip hop|ヒップホップ|힙합
noun|objects|nightclub|夜店|discoteca;club nocturno|boîte de nuit|discoteca|ナイトクラブ|나이트클럽
noun|people|idol|偶像|ídolo|idole|idolo|アイドル|아이돌
noun|people|pop star|流行歌星|estrella del pop|star de la pop|star del pop|ポップスター|팝스타
noun|objects|sheet music|樂譜|partitura|partition|spartito|楽譜|악보
noun|objects|ukulele|烏克麗麗|ukelele;ukulele|ukulélé|ukulele|ウクレレ|우쿨렐레
noun|people|film director|導演|director de cine;directora de cine|réalisateur;réalisatrice|regista|映画監督|영화감독
noun|other|screenplay|劇本|guion|scénario|sceneggiatura|脚本|각본
noun|other|plot|劇情|trama;argumento|intrigue|trama|あらすじ|줄거리
noun|other|trailer|預告片|tráiler;avance|bande-annonce|trailer|予告編|예고편
noun|other|subtitles|字幕|subtítulos|sous-titres|sottotitoli|字幕（映画）|자막
noun|other|cartoon|卡通;動畫|dibujos animados|dessin animé|cartone animato|アニメ|만화 영화
noun|other|documentary|紀錄片|documental|documentaire|documentario|ドキュメンタリー|다큐멘터리
noun|other|comedy|喜劇|comedia|comédie|commedia|コメディー|코미디
noun|other|horror film|恐怖片|película de terror|film d'horreur|film horror|ホラー映画|공포 영화
noun|other|science fiction|科幻|ciencia ficción|science-fiction|fantascienza|SF|공상 과학
noun|other|stage play|舞台劇|obra de teatro|pièce de théâtre|spettacolo teatrale|舞台劇|연극
noun|other|musical|音樂劇|musical|comédie musicale|musical|ミュージカル|뮤지컬
noun|other|ballet|芭蕾舞|ballet|ballet|balletto|バレエ|발레
noun|objects|circus|馬戲團|circo|cirque|circo|サーカス|서커스
noun|people|movie star|電影明星|estrella de cine|star de cinéma|star del cinema|映画スター|영화배우
noun|other|sequel|續集|secuela|suite|sequel;seguito|続編|속편
noun|people|villain|反派|villano;villana|méchant;méchante|cattivo;cattiva|悪役|악당
noun|other|ending|結局|final|fin|finale|結末|결말
noun|people|poet|詩人|poeta;poetisa|poète|poeta|詩人|시인
noun|other|poetry|詩歌;詩|poesía|poésie|poesia|詩歌|시가
noun|people|author|作者|autor;autora|auteur|autore;autrice|著者|저자
noun|objects|book cover|封面|portada|couverture|copertina|表紙|표지
noun|other|fairy tale|童話|cuento de hadas|conte de fées|fiaba|童話|동화
noun|other|biography|傳記|biografía|biographie|biografia|伝記|전기
noun|objects|bestseller|暢銷書|superventas;bestseller|best-seller|bestseller|ベストセラー|베스트셀러
noun|other|illustration|插畫|ilustración|illustration|illustrazione|イラスト|삽화
noun|people|reader|讀者|lector;lectora|lecteur;lectrice|lettore;lettrice|読者|독자
noun|objects|disco ball|迪斯可球|bola de discoteca|boule à facettes|palla da discoteca|ミラーボール|미러볼
`;
