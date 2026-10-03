import "server-only";

/* =========================================================
   The built-in five-language dictionary — the data

   Chi's choice (2026-09-28): when every model is busy and the basic
   translation service is out too, a typed word should still get an answer
   in any of the app's five languages. CC-CEDICT, the other dictionary on
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

     pos|category|en|zh-TW|es|fr|it

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
adjective|other|good|好|bueno;buena|bon;bonne|buono;buona
adjective|other|bad|壞|malo;mala|mauvais;mauvaise|cattivo;cattiva
adjective|other|better|更好|mejor|meilleur;meilleure|migliore
adjective|other|worse|更糟|peor|pire|peggiore
adjective|other|big|大|grande|grand;grande|grande
adjective|other|small|小|pequeño;pequeña|petit;petite|piccolo;piccola
adjective|other|huge|巨大|enorme|énorme|enorme
adjective|other|long|長|largo;larga|long;longue|lungo;lunga
adjective|other|short|短|corto;corta|court;courte|corto;corta
adjective|other|tall|高|alto;alta|grand;grande|alto;alta
adjective|other|high|高|alto;alta|haut;haute|alto;alta
adjective|other|low|低|bajo;baja|bas;basse|basso;bassa
adjective|other|new|新|nuevo;nueva|nouveau;nouvelle|nuovo;nuova
adjective|other|old|舊|viejo;vieja|vieux;vieille|vecchio;vecchia
adjective|other|young|年輕|joven|jeune|giovane
adjective|other|hot|熱|caliente|chaud;chaude|caldo;calda
adjective|other|cold|冷|frío;fría|froid;froide|freddo;fredda
noun|other|cold|感冒|resfriado|rhume|raffreddore
adjective|other|warm|溫暖;暖和|cálido;cálida|chaud;chaude|caldo;calda
adjective|other|cool|涼快;涼爽|fresco;fresca|frais;fraîche|fresco;fresca
adjective|other|fast|快|rápido;rápida|rapide|veloce
adjective|other|slow|慢|lento;lenta|lent;lente|lento;lenta
adjective|other|quick|快速|rápido;rápida|rapide|rapido;rapida
adjective|other|easy|容易|fácil|facile|facile
adjective|other|difficult|難|difícil|difficile|difficile
adjective|other|simple|簡單|sencillo;sencilla|simple|semplice
adjective|other|complicated|複雜|complicado;complicada|compliqué;compliquée|complicato;complicata
adjective|other|cheap|便宜|barato;barata|bon marché|economico;economica
adjective|other|expensive|貴|caro;cara|cher;chère|caro;cara
adjective|other|rich|有錢|rico;rica|riche|ricco;ricca
adjective|other|poor|窮|pobre|pauvre|povero;povera
adjective|other|happy|快樂;開心|feliz|heureux;heureuse|felice
adjective|other|unhappy|不快樂;不開心|infeliz|malheureux;malheureuse|infelice
adjective|other|sad|難過|triste|triste|triste
adjective|other|angry|生氣|enojado;enojada;enfadado;enfadada|en colère|arrabbiato;arrabbiata
adjective|other|tired|累|cansado;cansada|fatigué;fatiguée|stanco;stanca
adjective|other|hungry|餓|hambriento;hambrienta|affamé;affamée|affamato;affamata
adjective|other|thirsty|渴;口渴|sediento;sedienta|assoiffé;assoiffée|assetato;assetata
adjective|other|sick|生病|enfermo;enferma|malade|malato;malata
adjective|other|healthy|健康|sano;sana|en bonne santé|sano;sana
adjective|other|busy|忙|ocupado;ocupada|occupé;occupée|occupato;occupata
adjective|other|free|有空|libre|libre|libero;libera
adjective|other|beautiful|美麗|hermoso;hermosa|beau;belle|bello;bella
adjective|other|cute|可愛|lindo;linda|mignon;mignonne|carino;carina
adjective|other|pretty|漂亮|bonito;bonita|joli;jolie|carino;carina
adjective|other|ugly|醜|feo;fea|laid;laide|brutto;brutta
adjective|other|handsome|帥|guapo;guapa|beau;belle|bello;bella
adjective|other|clean|乾淨|limpio;limpia|propre|pulito;pulita
verb|actions|clean|打掃|limpiar|nettoyer|pulire
adjective|other|dirty|髒|sucio;sucia|sale|sporco;sporca
adjective|other|full|滿|lleno;llena|plein;pleine|pieno;piena
adjective|other|empty|空|vacío;vacía|vide|vuoto;vuota
verb|actions|open|打開;開|abrir|ouvrir|aprire
adjective|other|open|開著|abierto;abierta|ouvert;ouverte|aperto;aperta
adjective|other|closed|關著|cerrado;cerrada|fermé;fermée|chiuso;chiusa
adjective|other|heavy|重|pesado;pesada|lourd;lourde|pesante
noun|objects|light|燈|luz|lumière|luce
adjective|other|light|輕|ligero;ligera;liviano;liviana|léger;légère|leggero;leggera
adjective|other|bright|亮;明亮|luminoso;luminosa|lumineux;lumineuse|luminoso;luminosa
adjective|other|dark|暗|oscuro;oscura|sombre|buio;buia
adjective|other|strong|強壯|fuerte|fort;forte|forte
adjective|other|loud|大聲|fuerte|fort;forte|forte
adjective|other|noisy|吵|ruidoso;ruidosa|bruyant;bruyante|rumoroso;rumorosa
adjective|other|quiet|安靜|silencioso;silenciosa|silencieux;silencieuse|silenzioso;silenziosa
adjective|other|weak|虛弱|débil|faible|debole
adjective|other|fat|胖|gordo;gorda|gros;grosse|grasso;grassa
adjective|other|thin|瘦|delgado;delgada|mince|magro;magra
adjective|other|thick|厚|grueso;gruesa|épais;épaisse|spesso;spessa
adjective|other|wide|寬|ancho;ancha|large|largo;larga
adjective|other|narrow|窄|estrecho;estrecha|étroit;étroite|stretto;stretta
adjective|other|deep|深|profundo;profunda|profond;profonde|profondo;profonda
adjective|other|shallow|淺|poco profundo;poco profunda|peu profond;peu profonde|poco profondo;poco profonda
adjective|other|near|近|cercano;cercana|proche|vicino;vicina
other|other|near|在…附近|cerca de|près de|vicino a
adjective|other|far|遠|lejano;lejana|lointain;lointaine|lontano;lontana
other|other|early|早|temprano|tôt|presto
other|other|late|晚|tarde|tard|tardi
adjective|other|right|對|correcto;correcta|juste|giusto;giusta
noun|other|right|右邊|derecha|droite|destra
adjective|other|wrong|錯|equivocado;equivocada|faux;fausse|sbagliato;sbagliata
adjective|other|correct|正確|correcto;correcta|correct;correcte|corretto;corretta
verb|actions|correct|改正|corregir|corriger|correggere
adjective|other|true|真的|verdadero;verdadera|vrai;vraie|vero;vera
adjective|other|false|假的|falso;falsa|faux;fausse|falso;falsa
adjective|other|real|真實|real|réel;réelle|reale
adjective|other|same|一樣|mismo;misma|même|stesso;stessa
adjective|other|different|不一樣;不同|diferente|différent;différente|diverso;diversa
adjective|other|similar|類似|similar|similaire|simile
adjective|other|important|重要|importante|important;importante|importante
adjective|other|interesting|有趣|interesante|intéressant;intéressante|interessante
adjective|other|boring|無聊|aburrido;aburrida|ennuyeux;ennuyeuse|noioso;noiosa
adjective|other|fun|好玩|divertido;divertida|amusant;amusante|divertente
adjective|other|funny|好笑|gracioso;graciosa|drôle|divertente
adjective|other|exciting|刺激|emocionante|passionnant;passionnante|emozionante
adjective|other|serious|嚴肅|serio;seria|sérieux;sérieuse|serio;seria
adjective|other|dangerous|危險|peligroso;peligrosa|dangereux;dangereuse|pericoloso;pericolosa
adjective|other|sure|確定|seguro;segura|sûr;sûre|sicuro;sicura
adjective|other|safe|安全|seguro;segura|sûr;sûre|sicuro;sicura
adjective|other|famous|有名|famoso;famosa|célèbre|famoso;famosa
adjective|other|popular|受歡迎|popular|populaire|popolare
adjective|other|common|常見|común|courant;courante|comune
adjective|other|rare|罕見|raro;rara|rare|raro;rara
adjective|other|possible|可能|posible|possible|possibile
adjective|other|impossible|不可能|imposible|impossible|impossibile
adjective|other|necessary|必要|necesario;necesaria|nécessaire|necessario;necessaria
adjective|other|useful|有用|útil|utile|utile
adjective|other|useless|沒用|inútil|inutile|inutile
adjective|other|special|特別|especial|spécial;spéciale|speciale
adjective|other|normal|正常|normal|normal;normale|normale
adjective|other|strange|奇怪|extraño;extraña|bizarre|strano;strana
adjective|other|typical|典型|típico;típica|typique|tipico;tipica
adjective|other|public|公共|público;pública|public;publique|pubblico;pubblica
adjective|other|private|私人|privado;privada|privé;privée|privato;privata
adjective|other|personal|個人|personal|personnel;personnelle|personale
adjective|other|hard|硬|duro;dura|dur;dure|duro;dura
adjective|other|soft|軟|blando;blanda|mou;molle|morbido;morbida
adjective|other|wet|濕|mojado;mojada|mouillé;mouillée|bagnato;bagnata
adjective|other|dry|乾|seco;seca|sec;sèche|secco;secca
adjective|other|sweet|甜|dulce|sucré;sucrée|dolce
adjective|other|sour|酸|ácido;ácida|acide|aspro;aspra
adjective|other|bitter|苦|amargo;amarga|amer;amère|amaro;amara
adjective|other|spicy|辣|picante|piquant;piquante|piccante
adjective|other|salty|鹹|salado;salada|salé;salée|salato;salata
adjective|other|delicious|好吃|delicioso;deliciosa|délicieux;délicieuse|delizioso;deliziosa
adjective|other|fresh|新鮮|fresco;fresca|frais;fraîche|fresco;fresca
adjective|other|raw|生|crudo;cruda|cru;crue|crudo;cruda
adjective|other|cooked|熟|cocido;cocida|cuit;cuite|cotto;cotta
adjective|other|ready|準備好|listo;lista|prêt;prête|pronto;pronta
adjective|other|clear|清楚|claro;clara|clair;claire|chiaro;chiara
adjective|other|kind|善良|amable|gentil;gentille|gentile
adjective|other|nice|親切|simpático;simpática|sympathique;sympa|simpatico;simpatica
adjective|other|friendly|友善|amigable|amical;amicale|amichevole
adjective|other|polite|有禮貌|educado;educada|poli;polie|educato;educata
adjective|other|rude|沒禮貌|grosero;grosera|impoli;impolie|maleducato;maleducata
adjective|other|shy|害羞|tímido;tímida|timide|timido;timida
adjective|other|brave|勇敢|valiente|courageux;courageuse|coraggioso;coraggiosa
adjective|other|smart|聰明|inteligente|intelligent;intelligente|intelligente
adjective|other|stupid|笨|tonto;tonta|bête|stupido;stupida
adjective|other|lazy|懶惰;懶|perezoso;perezosa|paresseux;paresseuse|pigro;pigra
adjective|other|hardworking|努力|trabajador;trabajadora|travailleur;travailleuse|diligente
adjective|other|honest|誠實|honesto;honesta|honnête|onesto;onesta
noun|people|patient|病人;病患|paciente|patient;patiente|paziente
adjective|other|patient|有耐心|paciente|patient;patiente|paziente
adjective|other|impatient|沒耐心|impaciente|impatient;impatiente|impaziente
adjective|other|calm|冷靜|tranquilo;tranquila|calme|calmo;calma
adjective|other|nervous|緊張|nervioso;nerviosa|nerveux;nerveuse|nervoso;nervosa
adjective|other|afraid|害怕|asustado;asustada|effrayé;effrayée|spaventato;spaventata
adjective|other|surprised|驚訝|sorprendido;sorprendida|surpris;surprise|sorpreso;sorpresa
adjective|other|excited|興奮|emocionado;emocionada|enthousiaste|emozionato;emozionata
adjective|other|worried|擔心|preocupado;preocupada|inquiet;inquiète|preoccupato;preoccupata
adjective|other|lonely|寂寞;孤單|solo;sola|seul;seule|solo;sola
adjective|other|proud|驕傲|orgulloso;orgullosa|fier;fière|orgoglioso;orgogliosa
adjective|other|jealous|嫉妒;忌妒|celoso;celosa|jaloux;jalouse|geloso;gelosa
adjective|other|lucky|幸運|afortunado;afortunada|chanceux;chanceuse|fortunato;fortunata
adjective|other|embarrassed|尷尬|avergonzado;avergonzada|gêné;gênée|imbarazzato;imbarazzata
adjective|other|confused|困惑|confundido;confundida|perplexe|confuso;confusa
adjective|other|disappointed|失望|decepcionado;decepcionada|déçu;déçue|deluso;delusa
adjective|other|satisfied|滿意|satisfecho;satisfecha|satisfait;satisfaite|soddisfatto;soddisfatta
adjective|other|relaxed|放鬆|relajado;relajada|détendu;détendue|rilassato;rilassata
adjective|other|grateful|感激|agradecido;agradecida|reconnaissant;reconnaissante|grato;grata
adjective|other|interested|有興趣|interesado;interesada|intéressé;intéressée|interessato;interessata
adjective|other|comfortable|舒服|cómodo;cómoda|confortable|comodo;comoda
adjective|other|uncomfortable|不舒服|incómodo;incómoda|inconfortable|scomodo;scomoda
adjective|other|convenient|方便|práctico;práctica|pratique|comodo;comoda
adjective|other|pleasant|愉快|agradable|agréable|piacevole
adjective|other|whole|整個|entero;entera|entier;entière|intero;intera
adjective|other|complete|完整|completo;completa|complet;complète|completo;completa
adjective|other|alive|活著|vivo;viva|vivant;vivante|vivo;viva
adjective|other|dead|死了|muerto;muerta|mort;morte|morto;morta
adjective|other|married|已婚|casado;casada|marié;mariée|sposato;sposata
adjective|other|single|單身|soltero;soltera|célibataire|single
adjective|other|foreign|外國|extranjero;extranjera|étranger;étrangère|straniero;straniera
adjective|other|local|當地|local|local;locale|locale
adjective|other|international|國際|internacional|international;internationale|internazionale
adjective|other|modern|現代|moderno;moderna|moderne|moderno;moderna
adjective|other|traditional|傳統|tradicional|traditionnel;traditionnelle|tradizionale
adjective|other|natural|自然|natural|naturel;naturelle|naturale
adjective|other|perfect|完美|perfecto;perfecta|parfait;parfaite|perfetto;perfetta
adjective|other|excellent|優秀|excelente|excellent;excellente|ottimo;ottima
adjective|other|great|棒|genial|génial;géniale|fantastico;fantastica
adjective|other|wonderful|美好|maravilloso;maravillosa|merveilleux;merveilleuse|meraviglioso;meravigliosa
adjective|other|amazing|驚人|increíble|incroyable|incredibile
adjective|other|terrible|糟糕|terrible|terrible|terribile
adjective|other|horrible|可怕|horrible|horrible|orribile
adjective|other|favorite;favourite|最喜歡|favorito;favorita|préféré;préférée|preferito;preferita
adjective|other|main|主要|principal|principal;principale|principale
adjective|other|final|最終|final|final;finale|finale
adjective|other|next|下一個|próximo;próxima|prochain;prochaine|prossimo;prossima
adjective|other|previous|上一個|anterior|précédent;précédente|precedente
adjective|other|last|最後|último;última|dernier;dernière|ultimo;ultima
adjective|other|first|第一|primero;primera|premier;première|primo;prima
adjective|other|recent|最近|reciente|récent;récente|recente
adjective|other|current|目前|actual|actuel;actuelle|attuale
adjective|other|usual|平常|habitual|habituel;habituelle|solito;solita
adjective|other|daily|日常|diario;diaria|quotidien;quotidienne|quotidiano;quotidiana
adjective|other|fair|公平|justo;justa|juste|giusto;giusta
adjective|other|unfair|不公平|injusto;injusta|injuste|ingiusto;ingiusta
adjective|other|generous|大方|generoso;generosa|généreux;généreuse|generoso;generosa
adjective|other|selfish|自私|egoísta|égoïste|egoista
adjective|other|careful|小心|cuidadoso;cuidadosa|prudent;prudente|attento;attenta
adjective|other|careless|粗心|descuidado;descuidada|étourdi;étourdie|sbadato;sbadata
adjective|other|crazy|瘋|loco;loca|fou;folle|pazzo;pazza
adjective|other|gentle|溫柔|dulce|doux;douce|dolce
adjective|other|strict|嚴格|estricto;estricta|strict;stricte|severo;severa
adjective|other|optimistic|樂觀|optimista|optimiste|ottimista
adjective|other|pessimistic|悲觀|pesimista|pessimiste|pessimista
adjective|other|independent|獨立|independiente|indépendant;indépendante|indipendente
adjective|other|responsible|負責|responsable|responsable|responsabile
adjective|other|romantic|浪漫|romántico;romántica|romantique|romantico;romantica
adjective|other|elegant|優雅|elegante|élégant;élégante|elegante
adjective|other|formal|正式|formal|formel;formelle|formale
adjective|other|lost|迷路|perdido;perdida|perdu;perdue|perso;persa
adjective|other|drunk|喝醉|borracho;borracha|ivre|ubriaco;ubriaca
adjective|other|injured|受傷|herido;herida|blessé;blessée|ferito;ferita
adjective|other|pregnant|懷孕|embarazada|enceinte|incinta
adjective|other|awake|醒著|despierto;despierta|réveillé;réveillée|sveglio;sveglia
adjective|other|asleep|睡著|dormido;dormida|endormi;endormie|addormentato;addormentata
adjective|other|broken|壞掉|roto;rota|cassé;cassée|rotto;rotta
adjective|other|round|圓|redondo;redonda|rond;ronde|rotondo;rotonda
adjective|other|flat|平|plano;plana|plat;plate|piatto;piatta
adjective|other|straight|直|recto;recta|droit;droite|dritto;dritta
adjective|other|sharp|鋒利|afilado;afilada|tranchant;tranchante|affilato;affilata
adjective|other|tight|緊|apretado;apretada|serré;serrée|stretto;stretta
adjective|other|crowded|擁擠;擠|abarrotado;abarrotada|bondé;bondée|affollato;affollata
adjective|other|tidy|整齊|ordenado;ordenada|rangé;rangée|ordinato;ordinata
adjective|other|messy|亂|desordenado;desordenada|en désordre|disordinato;disordinata
verb|actions|be|是|ser|être|essere
verb|actions|have|有|tener|avoir|avere
verb|actions|do|做|hacer|faire|fare
verb|actions|make|做|hacer|faire|fare
verb|actions|go|去|ir|aller|andare
verb|actions|come|來|venir|venir|venire
verb|actions|leave|離開|irse|partir|partire
verb|actions|arrive|到;到達|llegar|arriver|arrivare
verb|actions|return|回來|volver;regresar|revenir|tornare
verb|actions|go back|回去|volver|retourner|tornare
verb|actions|stay|留下|quedarse|rester|restare;rimanere
verb|actions|live|住|vivir|habiter|abitare
verb|actions|work|工作|trabajar|travailler|lavorare
verb|actions|study|讀書;念書|estudiar|étudier|studiare
verb|actions|learn|學習;學|aprender|apprendre|imparare
verb|actions|teach|教|enseñar|enseigner|insegnare
verb|actions|read|讀;閱讀|leer|lire|leggere
verb|actions|write|寫|escribir|écrire|scrivere
verb|actions|speak|說;講|hablar|parler|parlare
verb|actions|talk|說話;講話|hablar|parler|parlare
verb|actions|say|說|decir|dire|dire
verb|actions|tell|告訴|decir|dire|dire
verb|actions|ask|問|preguntar|demander|chiedere
verb|actions|answer|回答|responder;contestar|répondre|rispondere
verb|actions|call|打電話|llamar|appeler|chiamare
verb|actions|listen|聽|escuchar|écouter|ascoltare
verb|actions|hear|聽到|oír|entendre|sentire
verb|actions|see|看到;看見|ver|voir|vedere
verb|actions|look|看|mirar|regarder|guardare
verb|actions|watch|看|ver|regarder|guardare
verb|actions|show|展示|mostrar|montrer|mostrare
verb|actions|know|知道|saber|savoir|sapere
verb|actions|get to know|認識|conocer|connaître|conoscere
verb|actions|understand|懂;了解|entender;comprender|comprendre|capire
verb|actions|think|想|pensar|penser|pensare
verb|actions|believe|相信|creer|croire|credere
verb|actions|remember|記得|recordar;acordarse|se souvenir;se rappeler|ricordare;ricordarsi
verb|actions|forget|忘記|olvidar|oublier|dimenticare
verb|actions|want|想要;要|querer|vouloir|volere
verb|actions|need|需要|necesitar|avoir besoin de|avere bisogno di
verb|actions|like|喜歡|gustar|aimer|piacere
verb|actions|love|愛|amar|aimer|amare
verb|actions|hate|討厭|odiar|détester|odiare
verb|actions|prefer|比較喜歡|preferir|préférer|preferire
verb|actions|hope|希望|esperar|espérer|sperare
verb|actions|wait|等|esperar|attendre|aspettare
verb|actions|try|嘗試;試|intentar|essayer|provare
verb|actions|can|可以;能|poder|pouvoir|potere
verb|actions|must|必須|deber|devoir|dovere
verb|actions|should|應該|deber|devoir|dovere
verb|actions|use|用;使用|usar|utiliser|usare
verb|actions|take|拿|tomar|prendre|prendere
verb|actions|bring|帶|traer|apporter|portare
verb|actions|give|給|dar|donner|dare
verb|actions|send|寄|enviar;mandar|envoyer|mandare;inviare
verb|actions|receive|收到|recibir|recevoir|ricevere
verb|actions|get|得到|conseguir|obtenir|ottenere
verb|actions|find|找到|encontrar|trouver|trovare
verb|actions|lose|弄丟|perder|perdre|perdere
verb|actions|look for|找|buscar|chercher|cercare
verb|actions|search|搜尋|buscar|rechercher|cercare
verb|actions|close|關上;關|cerrar|fermer|chiudere
verb|actions|start;begin|開始|empezar;comenzar|commencer|cominciare;iniziare
verb|actions|finish|完成|terminar|finir|finire
verb|actions|end|結束|terminar|finir|finire
verb|actions|stop|停止;停|parar|arrêter|fermare
verb|actions|continue|繼續|continuar|continuer|continuare
verb|actions|change|改變|cambiar|changer|cambiare
verb|actions|help|幫忙;幫助|ayudar|aider|aiutare
phrase|other|help|救命|socorro|au secours|aiuto
verb|actions|meet|見面|encontrarse|se retrouver|incontrarsi
verb|actions|visit|參觀|visitar|visiter|visitare
verb|actions|travel|旅行;旅遊|viajar|voyager|viaggiare
verb|actions|walk|走路|caminar|marcher|camminare
verb|actions|run|跑;跑步|correr|courir|correre
verb|actions|drive|開車|conducir;manejar|conduire|guidare
verb|actions|ride a bike|騎腳踏車|andar en bicicleta;montar en bicicleta|faire du vélo|andare in bicicletta
verb|actions|ride a horse|騎馬|montar a caballo|monter à cheval|andare a cavallo;cavalcare
verb|actions|fly|飛|volar|voler|volare
verb|actions|swim|游泳|nadar|nager|nuotare
verb|actions|dance|跳舞|bailar|danser|ballare
verb|actions|sing|唱歌|cantar|chanter|cantare
verb|actions|play|玩|jugar|jouer|giocare
verb|actions|play an instrument|演奏樂器|tocar un instrumento|jouer d'un instrument|suonare uno strumento
verb|actions|play the piano|彈鋼琴|tocar el piano|jouer du piano|suonare il pianoforte;suonare il piano
verb|actions|play the guitar|彈吉他|tocar la guitarra|jouer de la guitare|suonare la chitarra
verb|actions|cook|做菜;煮飯|cocinar|cuisiner|cucinare
noun|people|cook|廚師|cocinero;cocinera|cuisinier;cuisinière|cuoco;cuoca
verb|actions|eat|吃|comer|manger|mangiare
verb|actions|drink|喝|beber|boire|bere
verb|actions|sleep|睡覺|dormir|dormir|dormire
verb|actions|wake up|醒來|despertarse|se réveiller|svegliarsi
verb|actions|get up|起床|levantarse|se lever|alzarsi
verb|actions|sit|坐|sentarse|s'asseoir|sedersi
verb|actions|sit down|坐下|sentarse|s'asseoir|sedersi
verb|actions|stand|站|estar de pie|être debout|stare in piedi
verb|actions|stand up|站起來|ponerse de pie|se lever|alzarsi
verb|actions|lie down|躺下|acostarse|s'allonger|sdraiarsi
verb|actions|go to bed|上床睡覺|acostarse|se coucher|andare a letto
verb|actions|fall asleep|睡著|dormirse|s'endormir|addormentarsi
verb|actions|wash|洗|lavar|laver|lavare
verb|actions|wear|穿|llevar|porter|indossare;portare
verb|actions|put on|穿上|ponerse|mettre|mettersi
verb|actions|take off|脫掉;脫|quitarse|enlever|togliersi
verb|actions|buy|買|comprar|acheter|comprare
verb|actions|sell|賣|vender|vendre|vendere
verb|actions|pay|付錢|pagar|payer|pagare
verb|actions|spend|花錢;花|gastar|dépenser|spendere
verb|actions|borrow|借|pedir prestado|emprunter|prendere in prestito
verb|actions|lend|借給|prestar|prêter|prestare
verb|actions|rent|租|alquilar|louer|affittare
noun|other|rent|房租|alquiler;renta|loyer|affitto
verb|actions|win|贏|ganar|gagner|vincere
verb|actions|fall down|跌倒;摔倒|caerse|tomber|cadere
verb|actions|hold|拿著|sostener|tenir|tenere
verb|actions|push|推|empujar|pousser|spingere
verb|actions|pull|拉|tirar;jalar|tirer|tirare
verb|actions|throw|丟|lanzar|lancer|lanciare
verb|actions|throw away|丟掉|tirar|jeter|buttare via
verb|actions|catch|抓住|atrapar|attraper|prendere
verb|actions|cut|切|cortar|couper|tagliare
verb|actions|break|打破|romper|casser|rompere
verb|actions|fix;repair|修理;修|arreglar;reparar|réparer|riparare;aggiustare
verb|actions|build|建造;蓋|construir|construire|costruire
verb|actions|draw|畫|dibujar|dessiner|disegnare
verb|actions|paint|畫|pintar|peindre|dipingere
verb|actions|choose|選擇;選|elegir;escoger|choisir|scegliere
verb|actions|decide|決定|decidir|décider|decidere
verb|actions|plan|計畫|planear|planifier|pianificare
verb|actions|prepare|準備|preparar|préparer|preparare
verb|actions|explain|解釋|explicar|expliquer|spiegare
verb|actions|describe|描述|describir|décrire|descrivere
verb|actions|repeat|重複|repetir|répéter|ripetere
verb|actions|translate|翻譯|traducir|traduire|tradurre
verb|actions|spell|拼|deletrear|épeler|fare lo spelling
verb|actions|pronounce|發音|pronunciar|prononcer|pronunciare
verb|actions|practice;practise|練習|practicar|s'entraîner|esercitarsi
verb|actions|improve|改善|mejorar|améliorer|migliorare
verb|actions|feel|覺得;感覺|sentirse|se sentir|sentirsi
verb|actions|laugh|笑|reír;reírse|rire|ridere
verb|actions|smile|微笑|sonreír|sourire|sorridere
verb|actions|cry|哭|llorar|pleurer|piangere
verb|actions|worry|擔心|preocuparse|s'inquiéter|preoccuparsi
verb|actions|rest|休息|descansar|se reposer|riposare;riposarsi
verb|actions|relax|放鬆|relajarse|se détendre|rilassarsi
verb|actions|enjoy|享受|disfrutar|profiter|godersi
verb|actions|get married;marry|結婚|casarse|se marier|sposarsi
verb|actions|die|死|morir|mourir|morire
verb|actions|be born|出生|nacer|naître|nascere
verb|actions|grow up|長大|crecer|grandir|crescere
noun|objects|plant|植物|planta|plante|pianta
verb|actions|plant|種|plantar|planter|piantare
verb|actions|move house|搬家|mudarse|déménager|traslocare
verb|actions|move|動|moverse|bouger|muoversi
verb|actions|agree|同意|estar de acuerdo|être d'accord|essere d'accordo
verb|actions|disagree|不同意|no estar de acuerdo|ne pas être d'accord|non essere d'accordo
verb|actions|allow|允許|permitir|permettre|permettere
verb|actions|forbid|禁止|prohibir|interdire|vietare
verb|actions|invite|邀請|invitar|inviter|invitare
verb|actions|thank|感謝|agradecer|remercier|ringraziare
verb|actions|apologize;apologise|道歉|disculparse;pedir perdón|s'excuser|scusarsi
verb|actions|promise|答應|prometer|promettre|promettere
verb|actions|share|分享|compartir|partager|condividere
verb|actions|follow|跟著;跟隨|seguir|suivre|seguire
verb|actions|join|加入|unirse|rejoindre|unirsi
verb|actions|take part|參加|participar|participer|partecipare
verb|actions|hide|藏|esconder|cacher|nascondere
verb|actions|check|檢查|revisar|vérifier|controllare
verb|actions|count|數|contar|compter|contare
verb|actions|measure|量;測量|medir|mesurer|misurare
verb|actions|compare|比較|comparar|comparer|confrontare
verb|actions|happen|發生|pasar;ocurrir|se passer|succedere
verb|actions|seem|好像;似乎|parecer|sembler|sembrare
verb|actions|become|成為|convertirse en|devenir|diventare
verb|actions|keep|保留|guardar|garder|tenere
verb|actions|let|讓|dejar|laisser|lasciare
verb|actions|put|放|poner|mettre|mettere
verb|actions|turn on|打開;開|encender;prender|allumer|accendere
verb|actions|turn off|關掉;關|apagar|éteindre|spegnere
verb|actions|knock on the door|敲門|llamar a la puerta;tocar la puerta|frapper à la porte|bussare alla porta
verb|actions|kiss|親吻;親|besar|embrasser|baciare
verb|actions|hug|擁抱;抱|abrazar|serrer dans ses bras|abbracciare
verb|actions|climb|爬|escalar|grimper|arrampicarsi
verb|actions|go up|上去|subir|monter|salire
verb|actions|go down|下去|bajar|descendre|scendere
verb|actions|jump|跳|saltar|sauter|saltare
verb|actions|shout|大叫;大喊|gritar|crier|gridare;urlare
verb|actions|whisper|小聲說|susurrar|chuchoter|sussurrare
verb|actions|smell|聞|oler|sentir|annusare
verb|actions|taste|嚐;嘗|probar|goûter|assaggiare
verb|actions|touch|摸|tocar|toucher|toccare
verb|actions|order|點餐;點|pedir|commander|ordinare
verb|actions|book;reserve|預訂;訂|reservar|réserver|prenotare
verb|actions|cancel|取消|cancelar|annuler|annullare
verb|actions|be late|遲到|llegar tarde|être en retard|essere in ritardo
verb|actions|go out|出去|salir|sortir|uscire
verb|actions|enter|進入|entrar|entrer|entrare
verb|actions|come in|進來|entrar|entrer|entrare
verb|actions|get on|上車|subir;subirse|monter|salire
verb|actions|get off|下車|bajar;bajarse|descendre|scendere
verb|actions|take the bus|搭公車;坐公車|tomar el autobús|prendre le bus|prendere l'autobus
verb|actions|cross the street|過馬路|cruzar la calle|traverser la rue|attraversare la strada
verb|actions|turn|轉|girar;doblar|tourner|girare
noun|objects|park|公園|parque|parc|parco
verb|actions|park|停車|estacionar;aparcar|se garer|parcheggiare
verb|actions|lock|鎖|cerrar con llave|fermer à clé|chiudere a chiave
verb|actions|be called|叫|llamarse|s'appeler|chiamarsi
verb|actions|go home|回家|volver a casa|rentrer à la maison|tornare a casa
verb|actions|give back|還|devolver|rendre|restituire
verb|actions|give a gift|送禮物|hacer un regalo|faire un cadeau|fare un regalo
verb|actions|take care of|照顧|cuidar|s'occuper de|prendersi cura di
verb|actions|dream|做夢|soñar|rêver|sognare
verb|actions|guess|猜|adivinar|deviner|indovinare
verb|actions|imagine|想像|imaginar|imaginer|immaginare
verb|actions|remind|提醒|recordar|rappeler|ricordare
verb|actions|recognize;recognise|認出|reconocer|reconnaître|riconoscere
verb|actions|discover|發現|descubrir|découvrir|scoprire
verb|actions|notice|注意到|notar|remarquer|notare
verb|actions|realize;realise|意識到|darse cuenta|se rendre compte|rendersi conto
verb|actions|pay attention|注意|prestar atención|faire attention|fare attenzione
verb|actions|make a mistake|犯錯|equivocarse|se tromper|sbagliare;sbagliarsi
verb|actions|write down|寫下來;記下來|anotar;apuntar|noter|annotare
verb|actions|review|複習|repasar|réviser|ripassare
verb|actions|memorize;memorise|背|memorizar|mémoriser|memorizzare
verb|actions|do homework|寫功課;寫作業|hacer los deberes;hacer la tarea|faire ses devoirs|fare i compiti
verb|actions|take an exam|考試|hacer un examen|passer un examen|fare un esame;sostenere un esame
verb|actions|pass an exam|通過考試|aprobar un examen|réussir un examen|superare un esame;passare un esame
verb|actions|take a photo|拍照|sacar una foto;tomar una foto|prendre une photo|fare una foto;scattare una foto
verb|actions|take a shower|洗澡;沖澡|ducharse|se doucher;prendre une douche|farsi la doccia
verb|actions|take a bath|泡澡|bañarse|prendre un bain|fare il bagno
verb|actions|brush your teeth|刷牙|cepillarse los dientes;lavarse los dientes|se brosser les dents|lavarsi i denti
verb|actions|wash your hands|洗手|lavarse las manos|se laver les mains|lavarsi le mani
verb|actions|shave|刮鬍子|afeitarse|se raser|radersi;farsi la barba
verb|actions|get dressed|穿衣服|vestirse|s'habiller|vestirsi
verb|actions|change clothes|換衣服|cambiarse de ropa;cambiarse|se changer|cambiarsi
verb|actions|try on|試穿|probarse|essayer|provare
verb|actions|have breakfast|吃早餐|desayunar|prendre le petit déjeuner|fare colazione
verb|actions|have lunch|吃午餐;吃午飯|almorzar|déjeuner|pranzare
verb|actions|have dinner|吃晚餐;吃晚飯|cenar|dîner|cenare
verb|actions|go shopping|逛街|ir de compras|faire du shopping|fare shopping
verb|actions|do the dishes;wash the dishes|洗碗|lavar los platos;fregar los platos|faire la vaisselle|lavare i piatti
verb|actions|do the laundry|洗衣服|lavar la ropa|faire la lessive|fare il bucato
verb|actions|tidy up|整理;收拾|ordenar|ranger|riordinare;mettere in ordine
verb|actions|iron|燙衣服|planchar|repasser|stirare
verb|actions|sew|縫|coser|coudre|cucire
verb|actions|exercise|運動|hacer ejercicio|faire du sport|fare sport
verb|actions|go for a walk|散步|dar un paseo;pasear|se promener|fare una passeggiata;passeggiare
verb|actions|hike|爬山;健行|hacer senderismo|faire de la randonnée|fare escursioni;fare trekking
verb|actions|ski|滑雪|esquiar|skier|sciare
verb|actions|fish|釣魚|pescar|pêcher|pescare
verb|actions|take a nap|睡午覺|dormir la siesta;echarse la siesta|faire la sieste|fare un pisolino
verb|actions|get lost|迷路|perderse|se perdre|perdersi
verb|actions|pack|打包行李;收拾行李|hacer la maleta|faire sa valise;faire ses bagages|fare la valigia
verb|actions|breathe|呼吸|respirar|respirer|respirare
noun|other|cough|咳嗽|tos|toux|tosse
verb|actions|cough|咳嗽|toser|tousser|tossire
verb|actions|sneeze|打噴嚏|estornudar|éternuer|starnutire
verb|actions|get sick|生病|enfermarse;ponerse enfermo|tomber malade|ammalarsi
verb|actions|hurt|痛|doler|faire mal|fare male
verb|actions|get hurt|受傷|lastimarse;hacerse daño|se blesser|farsi male
verb|actions|see a doctor|看醫生|ir al médico|aller chez le médecin|andare dal medico
verb|actions|smoke|抽菸|fumar|fumer|fumare
verb|actions|earn|賺;賺錢|ganar|gagner|guadagnare
verb|actions|spend time|花時間|pasar tiempo|passer du temps|passare del tempo
verb|actions|save money|存錢|ahorrar|économiser|risparmiare
verb|actions|calculate|計算;算|calcular|calculer|calcolare
verb|actions|solve|解決|resolver|résoudre|risolvere
verb|actions|succeed|成功|tener éxito|réussir|avere successo
verb|actions|fail|失敗|fracasar|échouer|fallire
verb|actions|create|創造|crear|créer|creare
verb|actions|exchange|交換|intercambiar|échanger|scambiare
verb|actions|look like|看起來像;像|parecerse a|ressembler à|assomigliare a
verb|actions|shake hands|握手|dar la mano;estrechar la mano|serrer la main|stringere la mano
verb|actions|clap|拍手;鼓掌|aplaudir|applaudir|applaudire
noun|other|rain|雨|lluvia|pluie|pioggia
verb|actions|rain|下雨|llover|pleuvoir|piovere
noun|other|snow|雪|nieve|neige|neve
verb|actions|snow|下雪|nevar|neiger|nevicare
verb|actions|forgive|原諒|perdonar|pardonner|perdonare
verb|actions|trust|信任|confiar|faire confiance|fidarsi
verb|actions|be afraid|害怕;怕|tener miedo|avoir peur|avere paura
verb|actions|get angry|生氣|enojarse;enfadarse|se fâcher;se mettre en colère|arrabbiarsi
verb|actions|calm down|冷靜下來;冷靜|calmarse|se calmer|calmarsi
verb|actions|get bored|覺得無聊|aburrirse|s'ennuyer|annoiarsi
verb|actions|have fun|玩得開心|divertirse|s'amuser|divertirsi
verb|actions|fall in love|愛上|enamorarse|tomber amoureux;tomber amoureuse|innamorarsi
verb|actions|break up|分手|romper|rompre|lasciarsi
verb|actions|get divorced|離婚|divorciarse|divorcer|divorziare
phrase|other|welcome|歡迎|bienvenido;bienvenida|bienvenue|benvenuto;benvenuta
verb|actions|welcome|歡迎|dar la bienvenida|accueillir|accogliere
verb|actions|celebrate|慶祝|celebrar;festejar|fêter;célébrer|festeggiare
verb|actions|greet|打招呼|saludar|saluer|salutare
verb|actions|say goodbye|說再見;道別|despedirse|dire au revoir|salutare
verb|actions|introduce|介紹|presentar|présenter|presentare
verb|actions|discuss|討論|discutir|discuter|discutere
verb|actions|argue|吵架|discutir|se disputer|litigare
verb|actions|complain|抱怨|quejarse|se plaindre|lamentarsi
verb|actions|joke|開玩笑|bromear|plaisanter|scherzare
verb|actions|lie|說謊|mentir|mentir|mentire
verb|actions|suggest|建議|sugerir|suggérer|suggerire
verb|actions|recommend|推薦|recomendar|recommander|consigliare
verb|actions|accept|接受|aceptar|accepter|accettare
verb|actions|refuse|拒絕|rechazar|refuser|rifiutare
verb|actions|offer|提供|ofrecer|offrir|offrire
verb|actions|support|支持|apoyar|soutenir|sostenere
verb|actions|protect|保護|proteger|protéger|proteggere
verb|actions|contact|聯絡|contactar|contacter|contattare
verb|actions|avoid|避免|evitar|éviter|evitare
verb|actions|mention|提到|mencionar|mentionner|menzionare
verb|actions|steal|偷|robar|voler|rubare
verb|actions|kill|殺|matar|tuer|uccidere
verb|actions|hit|打|golpear;pegar|frapper|colpire
verb|actions|kick|踢|dar una patada;patear|donner un coup de pied|dare un calcio;calciare
verb|actions|bite|咬|morder|mordre|mordere
verb|actions|appear|出現|aparecer|apparaître|apparire
verb|actions|disappear|消失|desaparecer|disparaître|sparire;scomparire
verb|actions|exist|存在|existir|exister|esistere
verb|actions|include|包括|incluir|inclure|includere
verb|actions|add|加|añadir;agregar|ajouter|aggiungere
verb|actions|mix|混合|mezclar|mélanger|mescolare
verb|actions|fill|裝滿|llenar|remplir|riempire
verb|actions|fold|摺|doblar|plier|piegare
verb|actions|hang|掛|colgar|accrocher|appendere
verb|actions|raise|舉起|levantar|lever|alzare
verb|actions|burn|燒|quemar|brûler|bruciare
verb|actions|feed|餵|dar de comer|nourrir|dare da mangiare
verb|actions|collect|收集|coleccionar|collectionner|collezionare
verb|actions|retire|退休|jubilarse|prendre sa retraite|andare in pensione
verb|actions|download|下載|descargar|télécharger|scaricare
verb|actions|delete|刪除|borrar;eliminar|supprimer;effacer|cancellare;eliminare
verb|actions|log in|登入|iniciar sesión|se connecter|accedere
verb|actions|click|點擊;點選|hacer clic|cliquer|cliccare
verb|actions|print|列印;印|imprimir|imprimer|stampare
verb|actions|send a message|傳訊息|enviar un mensaje;mandar un mensaje|envoyer un message|mandare un messaggio;inviare un messaggio
verb|actions|chat|聊天|charlar;platicar|bavarder|chiacchierare
verb|actions|sign|簽名;簽|firmar|signer|firmare
phrase|other|hello|你好|hola|bonjour|ciao
phrase|other|hi|嗨|hola|salut|ciao
phrase|other|goodbye|再見|adiós|au revoir|arrivederci
phrase|other|please|請|por favor|s'il vous plaît|per favore
phrase|other|thank you|謝謝|gracias|merci|grazie
phrase|other|thank you very much|非常感謝|muchas gracias|merci beaucoup|grazie mille
phrase|other|you're welcome|不客氣|de nada|de rien|prego
phrase|other|sorry|對不起|lo siento|désolé;désolée|scusa
phrase|other|excuse me|不好意思|disculpe|excusez-moi|mi scusi
phrase|other|good morning|早安|buenos días|bonjour|buongiorno
phrase|other|good afternoon|午安|buenas tardes|bonjour|buon pomeriggio
phrase|other|good evening|晚安|buenas noches|bonsoir|buonasera
phrase|other|good night|晚安|buenas noches|bonne nuit|buonanotte
phrase|other|see you later|待會見|hasta luego|à plus tard|a dopo
phrase|other|see you tomorrow|明天見|hasta mañana|à demain|a domani
phrase|other|see you next time|下次見|hasta la próxima|à la prochaine|alla prossima
phrase|other|nice to meet you|很高興認識你|mucho gusto|enchanté;enchantée|piacere
phrase|other|how are you|你好嗎|cómo estás|comment ça va|come stai
phrase|other|I'm fine|我很好|estoy bien|je vais bien|sto bene
phrase|other|and you|你呢|y tú|et toi|e tu
other|other|yes|是|sí|oui|sì
other|other|no|不|no|non|no
other|other|okay;ok|好;好的|está bien|d'accord|va bene
phrase|other|of course|當然|por supuesto|bien sûr|certo
phrase|other|no problem|沒問題|no hay problema|pas de problème|nessun problema
phrase|other|cheers|乾杯|salud|santé|cin cin
phrase|other|enjoy your meal|請慢用|buen provecho|bon appétit|buon appetito
phrase|other|happy birthday|生日快樂|feliz cumpleaños|joyeux anniversaire|buon compleanno
phrase|other|congratulations|恭喜|felicidades|félicitations|congratulazioni
phrase|other|I don't understand|我不懂|no entiendo|je ne comprends pas|non capisco
phrase|other|I don't know|我不知道|no sé|je ne sais pas|non lo so
phrase|other|how much is it|多少錢|cuánto cuesta|combien ça coûte|quanto costa
phrase|other|where is the bathroom|廁所在哪裡|dónde está el baño|où sont les toilettes|dov'è il bagno
phrase|other|the bill, please;the check, please|麻煩結帳|la cuenta, por favor|l'addition, s'il vous plaît|il conto, per favore
phrase|other|do you speak English|你會說英文嗎|habla inglés|parlez-vous anglais|parla inglese
phrase|other|can you help me|你可以幫我嗎|puede ayudarme|pouvez-vous m'aider|può aiutarmi
phrase|other|I'm lost|我迷路了|estoy perdido;estoy perdida|je suis perdu;je suis perdue|mi sono perso;mi sono persa
phrase|other|what's your name|你叫什麼名字|cómo te llamas|comment tu t'appelles|come ti chiami
phrase|other|my name is|我叫|me llamo|je m'appelle|mi chiamo
phrase|other|where are you from|你是哪裡人|de dónde eres|d'où viens-tu|di dove sei
phrase|other|I'm from|我來自|soy de|je viens de|vengo da
phrase|other|just a moment|等一下|un momento|un instant|un momento
phrase|other|no, thank you|不用，謝謝|no, gracias|non merci|no, grazie
phrase|other|good luck|祝你好運|buena suerte|bonne chance|buona fortuna
phrase|other|happy new year|新年快樂|feliz año nuevo|bonne année|buon anno
phrase|other|merry Christmas|聖誕快樂|feliz Navidad|joyeux Noël|buon Natale
phrase|other|have a good weekend|週末愉快|buen fin de semana|bon week-end|buon fine settimana
phrase|other|have a good trip|旅途愉快;一路順風|buen viaje|bon voyage|buon viaggio
phrase|other|get well soon|早日康復|que te mejores|bon rétablissement|buona guarigione
phrase|other|long time no see|好久不見|cuánto tiempo sin verte|ça fait longtemps|da quanto tempo
phrase|other|take care|保重|cuídate|prends soin de toi|abbi cura di te
phrase|other|don't worry|別擔心|no te preocupes|ne t'inquiète pas|non preoccuparti
phrase|other|it doesn't matter|沒關係|no importa|ce n'est pas grave|non importa
phrase|other|me too|我也是|yo también|moi aussi|anch'io
phrase|other|let's go|走吧|vamos|allons-y|andiamo
phrase|other|be careful|小心|ten cuidado|fais attention|stai attento;stai attenta
phrase|other|well done|做得好|bien hecho|bien joué|ben fatto
phrase|other|what time is it|現在幾點|qué hora es|quelle heure est-il|che ore sono
phrase|other|how old are you|你幾歲|cuántos años tienes|quel âge as-tu|quanti anni hai
phrase|other|where do you live|你住在哪裡|dónde vives|où habites-tu|dove abiti
phrase|other|where are you|你在哪裡|dónde estás|où es-tu|dove sei
phrase|other|what is this|這是什麼|qué es esto|qu'est-ce que c'est|cos'è questo
phrase|other|do you understand|你懂嗎|entiendes|tu comprends|capisci
phrase|other|I understand|我懂了|entiendo|je comprends|capisco
phrase|other|how do you say|怎麼說|cómo se dice|comment dit-on|come si dice
phrase|other|what does it mean|這是什麼意思|qué significa|qu'est-ce que ça veut dire|cosa vuol dire
phrase|other|can you repeat that|可以再說一次嗎|puede repetir|pouvez-vous répéter|può ripetere
phrase|other|more slowly, please|請慢一點|más despacio, por favor|plus lentement, s'il vous plaît|più piano, per favore
phrase|other|can you write it down|可以寫下來嗎|puede escribirlo|pouvez-vous l'écrire|può scriverlo
phrase|other|I have a question|我有一個問題|tengo una pregunta|j'ai une question|ho una domanda
phrase|other|I speak a little|我會說一點|hablo un poco|je parle un peu|parlo un po'
phrase|other|I would like|我想要|quisiera|je voudrais|vorrei
phrase|other|where is|在哪裡|dónde está|où est|dov'è
phrase|other|it's delicious|很好吃|está delicioso|c'est délicieux|è delizioso
phrase|other|it's too expensive|太貴了|es demasiado caro|c'est trop cher|è troppo caro
phrase|other|can I pay by card|可以刷卡嗎|puedo pagar con tarjeta|je peux payer par carte|posso pagare con la carta
phrase|other|I'm hungry|我餓了|tengo hambre|j'ai faim|ho fame
phrase|other|I'm thirsty|我口渴了|tengo sed|j'ai soif|ho sete
phrase|other|I'm tired|我累了|estoy cansado;estoy cansada|je suis fatigué;je suis fatiguée|sono stanco;sono stanca
phrase|other|I'm vegetarian|我吃素|soy vegetariano;soy vegetariana|je suis végétarien;je suis végétarienne|sono vegetariano;sono vegetariana
phrase|other|I need a doctor|我需要看醫生|necesito un médico|j'ai besoin d'un médecin|ho bisogno di un medico
phrase|other|call the police|快報警|llame a la policía|appelez la police|chiami la polizia
phrase|other|on the left|在左邊|a la izquierda|à gauche|a sinistra
phrase|other|on the right|在右邊|a la derecha|à droite|a destra
other|other|what|什麼|qué|quoi|cosa;che cosa
other|other|who|誰|quién|qui|chi
other|other|where|哪裡|dónde|où|dove
other|other|when|什麼時候|cuándo|quand|quando
other|other|why|為什麼|por qué|pourquoi|perché
other|other|how|怎麼|cómo|comment|come
other|other|which|哪個|cuál|quel;quelle|quale
phrase|other|how much|多少|cuánto;cuánta|combien|quanto;quanta
phrase|other|how many|多少|cuántos;cuántas|combien|quanti;quante
phrase|other|how long|多久|cuánto tiempo|combien de temps|quanto tempo
other|other|I|我|yo|je|io
other|other|you|你;妳|tú|tu|tu
other|other|he|他|él|il|lui
other|other|she|她|ella|elle|lei
other|other|we|我們|nosotros;nosotras|nous|noi
other|other|they|他們;她們|ellos;ellas|ils;elles|loro
other|other|my|我的|mi|mon;ma|mio;mia
other|other|your|你的;妳的|tu|ton;ta|tuo;tua
other|other|his|他的|su|son;sa|suo;sua
other|other|her|她的|su|son;sa|suo;sua
other|other|our|我們的|nuestro;nuestra|notre|nostro;nostra
other|other|their|他們的;她們的|su|leur|loro
other|other|this|這個|este;esta|ce;cette|questo;questa
other|other|that|那個|ese;esa|ce;cette|quello;quella
other|other|these|這些|estos;estas|ces|questi;queste
other|other|those|那些|esos;esas|ces|quelli;quelle
other|other|all|所有;全部|todo;toda|tout;toute|tutto;tutta
other|other|some|一些|algunos;algunas|quelques|alcuni;alcune
other|other|many|很多;許多|muchos;muchas|beaucoup de|molti;molte
other|other|much|很多|mucho;mucha|beaucoup de|molto;molta
other|other|few|很少|pocos;pocas|peu de|pochi;poche
other|other|several|好幾個|varios;varias|plusieurs|diversi;diverse
other|other|every|每個;每|cada|chaque|ogni
other|other|each|每個|cada|chaque|ciascuno;ciascuna
other|other|nothing|什麼都沒有|nada|rien|niente
other|other|something|某樣東西|algo|quelque chose|qualcosa
other|other|everything|一切|todo|tout|tutto
other|other|someone|某人|alguien|quelqu'un|qualcuno
other|other|nobody|沒有人|nadie|personne|nessuno
other|other|everyone|每個人;大家|todos|tout le monde|tutti
other|other|somewhere|某個地方|en algún lugar|quelque part|da qualche parte
other|other|other|其他;別的|otro;otra|autre|altro;altra
other|other|another|另一個|otro;otra|un autre;une autre|un altro;un'altra
other|other|more|更多|más|plus|più
other|other|less|更少|menos|moins|meno
other|other|enough|足夠;夠|suficiente|assez|abbastanza
other|other|too|太|demasiado|trop|troppo
other|other|very|很|muy|très|molto
other|other|in|在…裡面|en|dans|in
other|other|on|在…上面|sobre|sur|su
other|other|under|在…下面|debajo de|sous|sotto
other|other|with|跟;和|con|avec|con
other|other|without|沒有|sin|sans|senza
other|other|for|給|para|pour|per
other|other|from|從|de|de|da
other|other|to|到|a|à|a
other|other|at|在|en|à|a
other|other|between|在…之間|entre|entre|tra;fra
other|other|behind|在…後面|detrás de|derrière|dietro
phrase|other|in front of|在…前面|delante de|devant|davanti a
phrase|other|next to|在…旁邊|al lado de|à côté de|accanto a
phrase|other|far from|離…很遠|lejos de|loin de|lontano da
other|other|before|在…之前|antes de|avant|prima di
other|other|after|在…之後|después de|après|dopo
other|other|during|在…期間|durante|pendant|durante
other|other|until|直到|hasta|jusqu'à|fino a
other|other|since|自從|desde|depuis|da
other|other|about|關於|sobre|sur|su
other|other|against|反對|contra|contre|contro
other|other|through|穿過|a través de|à travers|attraverso
other|other|inside|裡面|dentro;adentro|à l'intérieur|dentro
other|other|outside|外面|fuera;afuera|dehors|fuori
other|other|above|在…上方|encima de|au-dessus de|sopra
other|other|below|在…下方|debajo de|en dessous de|sotto
other|other|around|在…周圍|alrededor de|autour de|intorno a
other|other|among|在…之中|entre|parmi|tra;fra
other|other|toward;towards|往|hacia|vers|verso
other|other|except|除了|excepto|sauf|tranne
other|other|despite|儘管|a pesar de|malgré|nonostante
other|other|and|和|y|et|e
other|other|or|或是;或者;或|o|ou|o
other|other|but|但是;可是|pero|mais|ma
other|other|because|因為|porque|parce que|perché
other|other|so|所以|así que|donc|quindi
other|other|if|如果|si|si|se
other|other|although|雖然|aunque|bien que|anche se
other|other|while|當…的時候|mientras|pendant que|mentre
other|other|then|然後|luego|puis|poi
other|other|also|也|también|aussi|anche
other|other|only|只;只有|solo|seulement|solo
other|other|even|甚至|incluso|même|perfino
other|other|however|不過|sin embargo|cependant|però
phrase|other|as soon as|一…就|en cuanto|dès que|appena
other|other|otherwise|不然;否則|si no|sinon|altrimenti
other|other|anyway|反正|de todos modos|de toute façon|comunque
other|other|actually|其實|en realidad|en fait|in realtà
other|other|especially|尤其|especialmente|surtout|soprattutto
other|other|now|現在|ahora|maintenant|adesso
other|other|today|今天|hoy|aujourd'hui|oggi
other|other|tomorrow|明天|mañana|demain|domani
other|other|yesterday|昨天|ayer|hier|ieri
other|other|tonight|今晚;今天晚上|esta noche|ce soir|stasera
phrase|other|this morning|今天早上|esta mañana|ce matin|stamattina
phrase|other|this afternoon|今天下午|esta tarde|cet après-midi|oggi pomeriggio
phrase|other|last night|昨晚;昨天晚上|anoche|hier soir|ieri sera
phrase|other|the day after tomorrow|後天|pasado mañana|après-demain|dopodomani
phrase|other|the day before yesterday|前天|anteayer|avant-hier|l'altro ieri
other|other|already|已經|ya|déjà|già
other|other|still|還|todavía|encore|ancora
other|other|soon|很快|pronto|bientôt|presto
other|other|later|待會;等一下|más tarde|plus tard|più tardi
other|other|often|常常;經常|a menudo|souvent|spesso
other|other|sometimes|有時候;有時|a veces|parfois|a volte
other|other|never|從來不|nunca|jamais|mai
other|other|always|總是|siempre|toujours|sempre
other|other|usually|通常|normalmente|d'habitude|di solito
other|other|again|再|otra vez|encore|di nuovo
other|other|here|這裡;這邊|aquí;acá|ici|qui;qua
other|other|there|那裡;那邊|allí|là|lì;là
other|other|everywhere|到處|en todas partes|partout|dappertutto
other|other|quickly|快速地|rápidamente|vite|velocemente
other|other|slowly|慢慢地;慢慢|despacio|lentement|lentamente
other|other|well|好|bien|bien|bene
other|other|badly|不好|mal|mal|male
other|other|together|一起|juntos;juntas|ensemble|insieme
other|other|maybe|也許;或許|quizás;quizá|peut-être|forse
other|other|really|真的|de verdad|vraiment|davvero
other|other|almost|幾乎|casi|presque|quasi
phrase|other|a lot|很多|mucho|beaucoup|molto
phrase|other|a little|一點;一點點|un poco|un peu|un po'
other|other|probably|大概|probablemente|probablement|probabilmente
phrase|other|right away|馬上;立刻|enseguida|tout de suite|subito
other|other|recently|最近|recientemente|récemment|recentemente
other|other|once|一次|una vez|une fois|una volta
phrase|other|not yet|還沒;還沒有|todavía no|pas encore|non ancora
phrase|other|every day|每天|todos los días|tous les jours|ogni giorno;tutti i giorni
other|other|upstairs|樓上|arriba|en haut|di sopra
other|other|downstairs|樓下|abajo|en bas|di sotto
noun|people|person|人|persona|personne|persona
noun|people|people|人們|gente|gens|gente
noun|people|man|男人|hombre|homme|uomo
noun|people|woman|女人|mujer|femme|donna
noun|people|boy|男孩;男孩子|chico|garçon|ragazzo
noun|people|girl|女孩;女孩子|chica|fille|ragazza
noun|people|child|孩子;小孩|niño;niña|enfant|bambino;bambina
noun|people|baby|嬰兒|bebé|bébé|bebè
noun|people|adult|大人;成人|adulto;adulta|adulte|adulto;adulta
noun|people|teenager|青少年|adolescente|adolescent;adolescente|adolescente
noun|people|elderly person|老人|persona mayor|personne âgée|anziano;anziana
noun|people|friend|朋友|amigo;amiga|ami;amie|amico;amica
noun|people|best friend|最好的朋友|mejor amigo;mejor amiga|meilleur ami;meilleure amie|migliore amico;migliore amica
noun|people|neighbor;neighbour|鄰居|vecino;vecina|voisin;voisine|vicino di casa;vicina di casa
noun|people|guest|客人|invitado;invitada|invité;invitée|ospite
noun|people|visitor|訪客|visitante|visiteur;visiteuse|visitatore;visitatrice
noun|people|stranger|陌生人|desconocido;desconocida|inconnu;inconnue|sconosciuto;sconosciuta
noun|people|foreigner|外國人|extranjero;extranjera|étranger;étrangère|straniero;straniera
noun|people|boss|老闆|jefe;jefa|patron;patronne|capo
noun|people|colleague|同事|compañero de trabajo;compañera de trabajo|collègue|collega
noun|people|employee|員工|empleado;empleada|employé;employée|dipendente
noun|people|classmate|同學|compañero de clase;compañera de clase|camarade de classe|compagno di classe;compagna di classe
noun|people|roommate|室友|compañero de cuarto;compañera de cuarto;compañero de piso;compañera de piso|colocataire|coinquilino;coinquilina
noun|people|boyfriend|男朋友;男友|novio|petit ami|ragazzo
noun|people|girlfriend|女朋友;女友|novia|petite amie|ragazza
noun|people|husband|丈夫;老公|esposo|mari|marito
noun|people|wife|妻子;老婆|esposa|femme|moglie
noun|people|partner|伴侶|pareja|compagnon;compagne|compagno;compagna
noun|people|couple|情侶|pareja|couple|coppia
noun|people|customer|顧客;客人|cliente|client;cliente|cliente
noun|people|tourist|觀光客;遊客|turista|touriste|turista
noun|people|passenger|乘客|pasajero;pasajera|passager;passagère|passeggero;passeggera
noun|people|owner|主人|dueño;dueña|propriétaire|proprietario;proprietaria
noun|people|volunteer|志工|voluntario;voluntaria|bénévole|volontario;volontaria
noun|people|member|成員|miembro|membre|membro
noun|people|enemy|敵人|enemigo;enemiga|ennemi;ennemie|nemico;nemica
noun|people|crowd|人群|multitud|foule|folla
noun|people|twins|雙胞胎|gemelos|jumeaux|gemelli
noun|people|family|家人|familia|famille|famiglia
noun|people|mother|媽媽;母親|madre|mère|madre
noun|people|father|爸爸;父親|padre|père|padre
noun|people|mom;mum|媽媽|mamá|maman|mamma
noun|people|dad|爸爸|papá|papa|papà
noun|people|parents|父母;爸媽|padres|parents|genitori
noun|people|son|兒子|hijo|fils|figlio
noun|people|daughter|女兒|hija|fille|figlia
noun|people|brother|兄弟|hermano|frère|fratello
noun|people|sister|姊妹;姐妹|hermana|sœur|sorella
noun|people|older brother|哥哥|hermano mayor|grand frère|fratello maggiore
noun|people|older sister|姊姊;姐姐|hermana mayor|grande sœur|sorella maggiore
noun|people|younger brother|弟弟|hermano menor|petit frère|fratello minore
noun|people|younger sister|妹妹|hermana menor|petite sœur|sorella minore
noun|people|siblings|兄弟姊妹;兄弟姐妹|hermanos|frères et sœurs|fratelli
noun|people|grandfather|爺爺;外公;阿公|abuelo|grand-père|nonno
noun|people|grandmother|奶奶;外婆;阿嬤|abuela|grand-mère|nonna
noun|people|grandparents|祖父母|abuelos|grands-parents|nonni
noun|people|grandson|孫子;外孫|nieto|petit-fils|nipote
noun|people|granddaughter|孫女;外孫女|nieta|petite-fille|nipote
noun|people|uncle|叔叔;伯伯;舅舅;姑丈;姨丈|tío|oncle|zio
noun|people|aunt|阿姨;姑姑;嬸嬸;伯母;舅媽|tía|tante|zia
noun|people|cousin|表兄弟姊妹;堂兄弟姊妹|primo;prima|cousin;cousine|cugino;cugina
noun|people|nephew|姪子;外甥|sobrino|neveu|nipote
noun|people|niece|姪女;外甥女|sobrina|nièce|nipote
noun|people|relative|親戚|pariente|parent;parente|parente
noun|people|teacher|老師|profesor;profesora|professeur;professeure|insegnante
noun|people|student|學生|estudiante|étudiant;étudiante|studente;studentessa
noun|people|doctor|醫生;醫師|médico;médica|médecin|medico
noun|people|nurse|護理師;護士|enfermero;enfermera|infirmier;infirmière|infermiere;infermiera
noun|people|engineer|工程師|ingeniero;ingeniera|ingénieur;ingénieure|ingegnere
noun|people|lawyer|律師|abogado;abogada|avocat;avocate|avvocato;avvocata
noun|people|chef|主廚|chef|chef|chef
noun|people|waiter|服務生|camarero;camarera|serveur;serveuse|cameriere;cameriera
noun|people|driver|司機|conductor;conductora|chauffeur|autista
noun|people|taxi driver|計程車司機|taxista|chauffeur de taxi|tassista
noun|people|police officer|警察|policía|policier;policière|poliziotto;poliziotta
noun|people|firefighter|消防員|bombero;bombera|pompier|pompiere
noun|people|farmer|農夫|agricultor;agricultora|agriculteur;agricultrice|agricoltore;agricoltrice
noun|people|artist|藝術家|artista|artiste|artista
noun|people|singer|歌手|cantante|chanteur;chanteuse|cantante
noun|people|writer|作家|escritor;escritora|écrivain;écrivaine|scrittore;scrittrice
noun|people|journalist|記者|periodista|journaliste|giornalista
noun|people|designer|設計師|diseñador;diseñadora|designer|designer
noun|people|fashion designer|服裝設計師|diseñador de moda;diseñadora de moda|styliste|stilista
noun|people|programmer|程式設計師|programador;programadora|programmeur;programmeuse|programmatore;programmatrice
noun|people|salesperson|銷售員|vendedor;vendedora|vendeur;vendeuse|venditore;venditrice
noun|people|shop assistant|店員|dependiente;dependienta|vendeur;vendeuse|commesso;commessa
noun|people|cashier|收銀員|cajero;cajera|caissier;caissière|cassiere;cassiera
noun|people|manager|經理|gerente|gérant;gérante|direttore;direttrice
noun|people|secretary|秘書;祕書|secretario;secretaria|secrétaire|segretario;segretaria
noun|people|scientist|科學家|científico;científica|scientifique|scienziato;scienziata
noun|people|pilot|機師;飛行員|piloto|pilote|pilota
noun|people|flight attendant|空服員|auxiliar de vuelo|steward;hôtesse de l'air|assistente di volo
noun|people|soldier|軍人|soldado|soldat|soldato
noun|people|dentist|牙醫|dentista|dentiste|dentista
noun|people|pharmacist|藥師;藥劑師|farmacéutico;farmacéutica|pharmacien;pharmacienne|farmacista
noun|people|architect|建築師|arquitecto;arquitecta|architecte|architetto
noun|people|photographer|攝影師|fotógrafo;fotógrafa|photographe|fotografo;fotografa
noun|people|actor|演員|actor;actriz|acteur;actrice|attore;attrice
noun|people|musician|音樂家|músico|musicien;musicienne|musicista
noun|people|mechanic|修車師傅|mecánico;mecánica|mécanicien;mécanicienne|meccanico
noun|people|cleaner|清潔人員;清潔工|limpiador;limpiadora|agent d'entretien|addetto alle pulizie;addetta alle pulizie
noun|people|receptionist|櫃檯人員;接待員|recepcionista|réceptionniste|receptionist
noun|people|worker|工人|obrero;obrera|ouvrier;ouvrière|operaio;operaia
noun|people|office worker|上班族|oficinista|employé de bureau;employée de bureau|impiegato;impiegata
noun|people|businessman|商人|empresario;empresaria|homme d'affaires;femme d'affaires|uomo d'affari;donna d'affari
noun|people|civil servant|公務員|funcionario;funcionaria|fonctionnaire|dipendente pubblico;dipendente pubblica
noun|people|tour guide|導遊|guía turístico;guía turística|guide|guida turistica
noun|people|hairdresser|美髮師|peluquero;peluquera|coiffeur;coiffeuse|parrucchiere;parrucchiera
noun|people|baker|麵包師傅|panadero;panadera|boulanger;boulangère|fornaio;fornaia
noun|people|butcher|肉販|carnicero;carnicera|boucher;bouchère|macellaio;macellaia
noun|people|accountant|會計師|contador;contadora|comptable|contabile
noun|people|judge|法官|juez;jueza|juge|giudice
noun|people|veterinarian|獸醫|veterinario;veterinaria|vétérinaire|veterinario;veterinaria
noun|people|postman|郵差|cartero;cartera|facteur;factrice|postino;postina
noun|people|security guard|警衛;保全|guardia de seguridad|agent de sécurité|guardia giurata
noun|people|delivery person|外送員|repartidor;repartidora|livreur;livreuse|fattorino;fattorina
noun|people|housewife|家庭主婦|ama de casa|femme au foyer|casalinga
noun|people|coach|教練|entrenador;entrenadora|entraîneur;entraîneuse|allenatore;allenatrice
noun|people|athlete|運動員|atleta|athlète|atleta
noun|people|dancer|舞者|bailarín;bailarina|danseur;danseuse|ballerino;ballerina
noun|people|painter|畫家|pintor;pintora|peintre|pittore;pittrice
noun|people|translator|翻譯;譯者|traductor;traductora|traducteur;traductrice|traduttore;traduttrice
noun|people|model|模特兒|modelo|mannequin|modello;modella
noun|people|gardener|園丁|jardinero;jardinera|jardinier;jardinière|giardiniere;giardiniera
noun|people|fisherman|漁夫|pescador;pescadora|pêcheur;pêcheuse|pescatore;pescatrice
noun|people|babysitter|保母;保姆|niñero;niñera|baby-sitter|babysitter
noun|people|principal|校長|director;directora|directeur;directrice|preside
noun|objects|body|身體|cuerpo|corps|corpo
noun|objects|head|頭|cabeza|tête|testa
noun|objects|hair|頭髮|pelo|cheveux|capelli
noun|objects|face|臉|cara|visage|viso
noun|objects|forehead|額頭|frente|front|fronte
noun|objects|eyebrow|眉毛|ceja|sourcil|sopracciglio
noun|objects|eyelash|睫毛|pestaña|cil|ciglio
noun|objects|eye|眼睛|ojo|œil|occhio
noun|objects|ear|耳朵|oreja|oreille|orecchio
noun|objects|nose|鼻子|nariz|nez|naso
noun|objects|mouth|嘴巴|boca|bouche|bocca
noun|objects|lip|嘴唇|labio|lèvre|labbro
noun|objects|tooth|牙齒|diente|dent|dente
noun|objects|tongue|舌頭|lengua|langue|lingua
noun|objects|cheek|臉頰|mejilla|joue|guancia
noun|objects|chin|下巴|barbilla|menton|mento
noun|objects|beard|鬍子|barba|barbe|barba
noun|objects|neck|脖子|cuello|cou|collo
noun|objects|throat|喉嚨|garganta|gorge|gola
noun|objects|shoulder|肩膀|hombro|épaule|spalla
noun|objects|arm|手臂|brazo|bras|braccio
noun|objects|elbow|手肘|codo|coude|gomito
noun|objects|wrist|手腕|muñeca|poignet|polso
noun|objects|hand|手|mano|main|mano
noun|objects|finger|手指|dedo|doigt|dito
noun|objects|thumb|大拇指;拇指|pulgar|pouce|pollice
noun|objects|fingernail|指甲|uña|ongle|unghia
noun|objects|chest|胸部|pecho|poitrine|petto
noun|objects|back|背部;背|espalda|dos|schiena
noun|objects|waist|腰|cintura|taille|vita
noun|objects|belly|肚子|barriga|ventre|pancia
noun|objects|stomach|胃|estómago|estomac|stomaco
noun|objects|leg|腿|pierna|jambe|gamba
noun|objects|knee|膝蓋|rodilla|genou|ginocchio
noun|objects|ankle|腳踝|tobillo|cheville|caviglia
noun|objects|foot|腳|pie|pied|piede
noun|objects|heel|腳跟|talón|talon|tallone
noun|objects|toe|腳趾|dedo del pie|orteil|dito del piede
noun|objects|skin|皮膚|piel|peau|pelle
noun|objects|bone|骨頭|hueso|os|osso
noun|objects|muscle|肌肉|músculo|muscle|muscolo
noun|objects|heart|心臟|corazón|cœur|cuore
noun|objects|blood|血;血液|sangre|sang|sangue
noun|objects|brain|大腦;腦|cerebro|cerveau|cervello
noun|objects|lung|肺|pulmón|poumon|polmone
noun|objects|liver|肝;肝臟|hígado|foie|fegato
noun|other|health|健康|salud|santé|salute
noun|other|illness|疾病;病|enfermedad|maladie|malattia
noun|other|pain|疼痛;痛|dolor|douleur|dolore
noun|other|headache|頭痛|dolor de cabeza|mal de tête|mal di testa
noun|other|toothache|牙痛|dolor de muelas|mal de dents|mal di denti
noun|other|stomachache;stomach ache|肚子痛|dolor de estómago|mal de ventre|mal di pancia
noun|other|sore throat|喉嚨痛|dolor de garganta|mal de gorge|mal di gola
noun|other|fever|發燒|fiebre|fièvre|febbre
noun|other|flu|流感|gripe|grippe|influenza
noun|other|allergy|過敏|alergia|allergie|allergia
noun|other|injury|傷|herida|blessure|ferita
noun|other|symptom|症狀|síntoma|symptôme|sintomo
noun|objects|medicine|藥|medicina|médicament|medicina
noun|objects|pill|藥丸|pastilla|comprimé|pastiglia
noun|objects|vaccine|疫苗|vacuna|vaccin|vaccino
noun|objects|hospital|醫院|hospital|hôpital|ospedale
noun|objects|clinic|診所|clínica|centre médical|ambulatorio
noun|objects|doctor's office|診所|consultorio|cabinet médical|studio medico
noun|objects|pharmacy|藥局;藥房|farmacia|pharmacie|farmacia
noun|objects|emergency room|急診室|urgencias|urgences|pronto soccorso
noun|objects|prescription|處方箋;處方|receta|ordonnance|ricetta
noun|other|appointment|預約|cita|rendez-vous|appuntamento
noun|other|surgery|手術|operación|opération|operazione
noun|other|checkup;check-up|健康檢查|chequeo médico|bilan de santé|check-up
noun|other|weight|重量|peso|poids|peso
noun|other|weight|體重|peso|poids|peso
noun|other|height|高度|altura|hauteur|altezza
noun|other|height|身高|estatura|taille|altezza
noun|other|birth|出生|nacimiento|naissance|nascita
noun|other|life|人生|vida|vie|vita
noun|other|death|死亡|muerte|mort|morte
noun|other|wedding|婚禮|boda|mariage|matrimonio
noun|other|marriage|婚姻|matrimonio|mariage|matrimonio
noun|other|divorce|離婚|divorcio|divorce|divorzio
noun|other|funeral|葬禮;喪禮|funeral|enterrement|funerale
noun|other|birthday|生日|cumpleaños|anniversaire|compleanno
noun|other|age|年紀;年齡|edad|âge|età
noun|other|childhood|童年|infancia|enfance|infanzia
noun|other|youth|青春|juventud|jeunesse|giovinezza
noun|other|old age|老年|vejez|vieillesse|vecchiaia
noun|other|retirement|退休|jubilación|retraite|pensione
noun|other|honeymoon|蜜月|luna de miel|lune de miel|luna di miele
noun|other|generation|世代|generación|génération|generazione
noun|other|name|名字|nombre|nom|nome
noun|other|last name|姓氏;姓|apellido|nom de famille|cognome
noun|objects|food|食物|comida|nourriture|cibo
noun|objects|rice|米飯;飯;白飯|arroz|riz|riso
noun|objects|noodles|麵;麵條|fideos|nouilles|noodles
noun|objects|instant noodles|泡麵;速食麵|fideos instantáneos|nouilles instantanées|noodles istantanei
noun|objects|meat|肉|carne|viande|carne
noun|objects|beef|牛肉|carne de res;carne de vaca;ternera|bœuf|manzo
noun|objects|pork|豬肉|carne de cerdo;cerdo|porc|carne di maiale;maiale
noun|objects|chicken|雞肉|pollo|poulet|pollo
noun|objects|lamb|羊肉|cordero|agneau|agnello
noun|objects|steak|牛排|bistec|steak;bifteck|bistecca
noun|objects|pork chop|豬排|chuleta de cerdo|côtelette de porc;côte de porc|braciola di maiale
noun|objects|ham|火腿|jamón|jambon|prosciutto
noun|objects|sausage|香腸|salchicha|saucisse|salsiccia
noun|objects|bacon|培根|tocino;beicon|bacon|pancetta;bacon
noun|objects|meatball|肉丸|albóndiga|boulette de viande|polpetta
noun|objects|seafood|海鮮|mariscos;marisco|fruits de mer|frutti di mare
noun|objects|shrimp|蝦子;蝦|camarón;gamba|crevette|gambero
noun|objects|salmon|鮭魚|salmón|saumon|salmone
noun|objects|tuna|鮪魚|atún|thon|tonno
noun|objects|oyster|牡蠣;蚵仔|ostra|huître|ostrica
noun|objects|squid|魷魚|calamar|calmar;encornet|calamaro
noun|objects|clam|蛤蜊|almeja|palourde|vongola
noun|objects|egg|蛋;雞蛋|huevo|œuf|uovo
noun|objects|fried egg|荷包蛋;煎蛋|huevo frito;huevo estrellado|œuf au plat|uovo fritto;uovo al tegamino
noun|objects|tofu|豆腐|tofu|tofu|tofu
noun|objects|stinky tofu|臭豆腐|tofu apestoso|tofu puant|tofu puzzolente
noun|objects|cheese|起司;乳酪|queso|fromage|formaggio
noun|objects|butter|奶油|mantequilla|beurre|burro
noun|objects|milk|牛奶;鮮奶|leche|lait|latte
noun|objects|yogurt;yoghurt|優格|yogur;yogurt|yaourt|yogurt
noun|objects|cream|鮮奶油|nata;crema|crème|panna
noun|objects|sugar|糖|azúcar|sucre|zucchero
noun|objects|salt|鹽;鹽巴|sal|sel|sale
noun|objects|pepper|胡椒;胡椒粉|pimienta|poivre|pepe
noun|objects|oil|油|aceite|huile|olio
noun|objects|olive oil|橄欖油|aceite de oliva|huile d'olive|olio d'oliva
noun|objects|vinegar|醋|vinagre|vinaigre|aceto
noun|objects|soy sauce|醬油|salsa de soja;salsa de soya|sauce soja;sauce soya|salsa di soia
noun|objects|flour|麵粉|harina|farine|farina
noun|objects|sauce|醬汁;醬|salsa|sauce|salsa
noun|objects|ketchup|番茄醬|kétchup|ketchup|ketchup
noun|objects|mayonnaise|美乃滋|mayonesa|mayonnaise|maionese
noun|objects|mustard|黃芥末|mostaza|moutarde|senape
noun|objects|spice|香料|especia|épice|spezia
noun|objects|cinnamon|肉桂|canela|cannelle|cannella
noun|objects|honey|蜂蜜|miel|miel|miele
noun|objects|jam|果醬|mermelada|confiture|marmellata
noun|objects|ingredient|食材;材料|ingrediente|ingrédient|ingrediente
noun|objects|dumpling|餃子;水餃|dumpling;empanadilla china|ravioli chinois;dumpling|raviolo cinese;dumpling
noun|objects|fried rice|炒飯|arroz frito|riz frit;riz cantonais|riso fritto;riso alla cantonese
noun|objects|French fries;fries|薯條|papas fritas;patatas fritas|frites|patatine fritte;patatine
noun|objects|sandwich|三明治|sándwich|sandwich|panino;sandwich
noun|objects|salad|沙拉|ensalada|salade|insalata
noun|objects|sushi|壽司|sushi|sushi|sushi
noun|objects|curry|咖哩|curry;curri|curry|curry
noun|objects|hot pot|火鍋|hot pot;fondue china|fondue chinoise|hot pot
noun|objects|toast|烤吐司;吐司|pan tostado;tostada|pain grillé|pane tostato
noun|objects|cereal|麥片;穀片|cereal;cereales|céréales|cereali
noun|objects|croissant|可頌;牛角麵包|croissant;cruasán;medialuna|croissant|cornetto;brioche
noun|objects|waffle|格子鬆餅;鬆餅|gofre;waffle|gaufre|waffle
noun|objects|donut;doughnut|甜甜圈|dona;dónut|donut;doughnut|ciambella
noun|objects|cake|蛋糕|pastel;tarta;torta|gâteau|torta
noun|objects|cookie|餅乾|galleta|biscuit;cookie|biscotto
noun|objects|chocolate|巧克力|chocolate|chocolat|cioccolato;cioccolata
noun|objects|candy;sweets|糖果|caramelo;dulce;golosina|bonbon|caramella
noun|objects|chewing gum;gum|口香糖|chicle|chewing-gum|gomma da masticare;chewing gum
noun|objects|popcorn|爆米花|palomitas;palomitas de maíz|pop-corn;popcorn|popcorn
noun|objects|peanut|花生|cacahuete;cacahuate;maní|cacahuète;arachide|arachide;nocciolina
noun|objects|almond|杏仁|almendra|amande|mandorla
noun|objects|dessert|甜點|postre|dessert|dolce;dessert
noun|objects|snack|點心;零食|snack;tentempié|en-cas;snack|spuntino
noun|objects|frozen food|冷凍食品|comida congelada;congelados|surgelés;produits surgelés|surgelati;cibi surgelati
noun|objects|fruit|水果|fruta|fruit|frutta
noun|objects|grape|葡萄|uva|raisin|uva
noun|objects|watermelon|西瓜|sandía|pastèque|anguria;cocomero
noun|objects|peach|桃子|durazno;melocotón|pêche|pesca
noun|objects|pear|梨子;水梨|pera|poire|pera
noun|objects|mango|芒果|mango|mangue|mango
noun|objects|cherry|櫻桃|cereza|cerise|ciliegia
noun|objects|kiwi|奇異果|kiwi|kiwi|kiwi
noun|objects|guava|芭樂|guayaba|goyave|guava;guaiava
noun|objects|papaya|木瓜|papaya|papaye|papaya
noun|objects|lychee;litchi|荔枝|lichi|litchi|litchi
noun|objects|coconut|椰子|coco|noix de coco|cocco;noce di cocco
noun|objects|avocado|酪梨|aguacate;palta|avocat|avocado
noun|objects|plum|李子|ciruela|prune|susina;prugna
noun|objects|blueberry|藍莓|arándano|myrtille|mirtillo
noun|objects|grapefruit|葡萄柚|pomelo;toronja|pamplemousse|pompelmo
noun|objects|dragon fruit|火龍果|pitahaya;pitaya|fruit du dragon;pitaya|pitaya;frutto del drago
noun|objects|tangerine|橘子|mandarina|mandarine|mandarino
noun|objects|olive|橄欖|aceituna;oliva|olive|oliva
noun|objects|vegetable|蔬菜;青菜|verdura|légume|verdura
noun|objects|onion|洋蔥|cebolla|oignon|cipolla
noun|objects|garlic|大蒜;蒜頭|ajo|ail|aglio
noun|objects|ginger|薑|jengibre|gingembre|zenzero
noun|objects|green onion;scallion;spring onion|蔥;青蔥|cebolleta;cebollín;cebolla de verdeo|oignon vert;ciboule|cipollotto
noun|objects|chili pepper;chili;chilli|辣椒|chile;ají;guindilla|piment|peperoncino
noun|objects|potato|馬鈴薯;洋芋|papa;patata|pomme de terre|patata
noun|objects|sweet potato|地瓜;番薯|batata;camote;boniato|patate douce|patata dolce;patata americana
noun|objects|tomato|番茄;蕃茄|tomate;jitomate|tomate|pomodoro
noun|objects|carrot|紅蘿蔔;胡蘿蔔|zanahoria|carotte|carota
noun|objects|bean|豆子|frijol;alubia;judía;poroto|haricot|fagiolo
noun|objects|pea|豌豆;青豆|guisante;arveja;chícharo|petit pois|pisello
noun|objects|bean sprouts|豆芽;豆芽菜|brotes de soja;brotes de soya|pousses de soja;germes de soja|germogli di soia
noun|objects|lettuce|生菜;萵苣|lechuga|laitue|lattuga
noun|objects|spinach|菠菜|espinaca;espinacas|épinards;épinard|spinaci
noun|objects|eggplant;aubergine|茄子|berenjena|aubergine|melanzana
noun|objects|celery|芹菜|apio|céleri|sedano
noun|objects|asparagus|蘆筍|espárrago|asperge|asparago
noun|other|breakfast|早餐|desayuno|petit-déjeuner;petit déjeuner|colazione
noun|other|lunch|午餐;午飯|almuerzo;comida|déjeuner|pranzo
noun|other|dinner|晚餐;晚飯|cena|dîner|cena
noun|other|brunch|早午餐|brunch|brunch|brunch
noun|other|meal|一餐;一頓飯|comida|repas|pasto
noun|objects|dish|菜;料理|plato|plat|piatto
noun|other|recipe|食譜|receta|recette|ricetta
noun|objects|appetizer;starter|開胃菜;前菜|entrante;entrada|entrée|antipasto
noun|objects|main course|主菜|plato principal;plato fuerte|plat principal|piatto principale;secondo
noun|objects|side dish|配菜|guarnición;acompañamiento|accompagnement|contorno
noun|objects|leftovers|剩菜|sobras|restes|avanzi;resti
noun|objects|street food|小吃|comida callejera|cuisine de rue;street food|cibo di strada;street food
noun|objects|fast food|速食|comida rápida|fast-food;restauration rapide|fast food
noun|objects|vegetarian food|素食|comida vegetariana|nourriture végétarienne;cuisine végétarienne|cibo vegetariano
noun|other|flavor;flavour|口味;味道|sabor|goût;saveur|gusto;sapore
noun|other|picnic|野餐|pícnic|pique-nique|picnic
noun|other|barbecue|烤肉|barbacoa;asado;parrillada|barbecue|grigliata;barbecue
noun|objects|water|水|agua|eau|acqua
noun|objects|hot water|熱水|agua caliente|eau chaude|acqua calda
noun|objects|mineral water|礦泉水|agua mineral|eau minérale|acqua minerale
noun|objects|sparkling water|氣泡水|agua con gas|eau gazeuse|acqua frizzante;acqua gassata
noun|objects|ice cube|冰塊|cubito de hielo;cubo de hielo|glaçon|cubetto di ghiaccio
noun|objects|beverage|飲料|bebida|boisson|bevanda;bibita
noun|objects|tea|茶|té|thé|tè
noun|objects|green tea|綠茶|té verde|thé vert|tè verde
noun|objects|black tea|紅茶|té negro|thé noir|tè nero
noun|objects|iced tea|冰紅茶|té helado;té frío|thé glacé|tè freddo
noun|objects|milk tea|奶茶|té con leche|thé au lait|tè al latte
noun|objects|bubble tea|珍珠奶茶;珍奶|té de burbujas;té con perlas;bubble tea|thé aux perles;bubble tea|bubble tea
noun|objects|latte|拿鐵|café con leche;latte|café au lait;café latte|caffellatte;caffè latte
noun|objects|hot chocolate|熱可可;熱巧克力|chocolate caliente|chocolat chaud|cioccolata calda
noun|objects|juice|果汁|jugo;zumo|jus|succo
noun|objects|orange juice|柳橙汁|jugo de naranja;zumo de naranja|jus d'orange|succo d'arancia
noun|objects|soy milk|豆漿|leche de soja;leche de soya|lait de soja|latte di soia
noun|objects|milkshake|奶昔|batido;malteada|milk-shake|frappè;milkshake
noun|objects|soda|汽水|refresco;gaseosa|soda|bibita;bibita gassata
noun|objects|beer|啤酒|cerveza|bière|birra
noun|objects|wine|葡萄酒|vino|vin|vino
noun|objects|alcohol|酒|alcohol|alcool|alcol
noun|objects|cocktail|雞尾酒|cóctel|cocktail|cocktail
noun|objects|whisky;whiskey|威士忌|whisky;güisqui|whisky|whisky
noun|objects|straw|吸管|pajita;popote;pitillo;sorbete|paille|cannuccia
phrase|other|no ice|去冰|sin hielo|sans glaçons|senza ghiaccio
phrase|other|less ice|少冰|con poco hielo|avec peu de glaçons|con poco ghiaccio
phrase|other|no sugar|無糖|sin azúcar|sans sucre|senza zucchero
phrase|other|to go;takeaway|外帶|para llevar|à emporter|da asporto;da portare via
phrase|other|for here|內用|para comer aquí|sur place|da mangiare qui
noun|objects|bar|酒吧|bar|bar|bar
noun|objects|food court|美食街|patio de comidas;zona de comidas|aire de restauration|food court;area ristorazione
noun|objects|buffet|自助餐|bufé;buffet|buffet|buffet
noun|objects|stall|攤位;攤子|puesto|stand|bancarella
noun|objects|fork|叉子|tenedor|fourchette|forchetta
noun|objects|chopsticks|筷子|palillos;palitos|baguettes|bacchette;bastoncini
noun|objects|teaspoon|小湯匙;茶匙|cucharita;cucharilla|petite cuillère;cuillère à café|cucchiaino
noun|objects|napkin|餐巾紙;餐巾|servilleta|serviette|tovagliolo
noun|objects|toothpick|牙籤|palillo;mondadientes|cure-dent|stuzzicadenti
noun|objects|bill|帳單|cuenta|addition|conto
noun|other|tip|小費|propina|pourboire|mancia
noun|other|service charge|服務費|cargo por servicio|frais de service;service|servizio;costo del servizio
noun|other|portion|一份;份量|porción;ración|portion;part|porzione
noun|other|delivery|外送|entrega a domicilio;servicio a domicilio|livraison|consegna a domicilio
noun|objects|cutting board|砧板;切菜板|tabla de cortar|planche à découper|tagliere
noun|objects|lid|蓋子|tapa|couvercle|coperchio
noun|objects|kettle|熱水壺;快煮壺|hervidor|bouilloire|bollitore
noun|objects|rice cooker|電鍋;電子鍋|arrocera;olla arrocera|cuiseur à riz|cuociriso
noun|objects|blender|果汁機|licuadora;batidora|mixeur;blender|frullatore
noun|objects|bottle opener|開瓶器|abrebotellas;destapador|décapsuleur;ouvre-bouteille|apribottiglie
noun|objects|thermos|保溫瓶|termo|thermos|thermos
noun|objects|convenience store|便利商店;超商|tienda de conveniencia|supérette;dépanneur|minimarket
noun|objects|clothing store|服飾店;服裝店|tienda de ropa|magasin de vêtements|negozio di abbigliamento
noun|objects|online store|網路商店;網店|tienda en línea;tienda online|boutique en ligne|negozio online
noun|objects|flea market|跳蚤市場|mercadillo;mercado de pulgas|marché aux puces|mercatino delle pulci
noun|objects|shop window|櫥窗|escaparate;vitrina;aparador|vitrine|vetrina
noun|objects|fitting room|試衣間|probador|cabine d'essayage|camerino
noun|objects|checkout|結帳櫃台;收銀台|caja|caisse|cassa
noun|other|queue|隊伍|fila;cola|queue;file d'attente|fila;coda
noun|other|price|價格;價錢|precio|prix|prezzo
noun|objects|price tag|價格標籤|etiqueta de precio;etiqueta|étiquette|cartellino del prezzo;cartellino
noun|other|discount|折扣|descuento|réduction;remise|sconto
noun|other|sale|特賣;大拍賣|rebajas;ofertas|soldes|saldi
noun|objects|coupon|優惠券;折價券|cupón|bon de réduction;coupon|buono sconto;coupon
noun|objects|receipt|收據;發票|recibo;ticket|reçu;ticket de caisse|scontrino;ricevuta
noun|other|refund|退款;退費|reembolso|remboursement|rimborso
noun|other|tax|稅;稅金|impuesto|taxe|tassa;imposta
noun|objects|bag|袋子|bolsa|sac|sacchetto;busta
noun|objects|shopping bag|購物袋|bolsa de compras;bolsa de la compra|sac de courses|borsa della spesa
noun|objects|shopping list|購物清單|lista de la compra;lista de compras|liste de courses|lista della spesa
noun|other|online shopping|網購;網路購物|compras en línea;compras por internet|achats en ligne|acquisti online;shopping online
noun|objects|package|包裹|paquete|colis|pacco
noun|objects|product|產品;商品|producto|produit|prodotto
noun|other|brand|品牌;牌子|marca|marque|marca
noun|other|quality|品質|calidad|qualité|qualità
noun|objects|gift|禮物|regalo|cadeau|regalo
noun|other|opening hours|營業時間|horario de apertura;horario|horaires d'ouverture|orario di apertura
noun|objects|money|錢|dinero|argent|soldi;denaro
noun|objects|cash|現金|efectivo|espèces;liquide|contanti
noun|objects|coin|硬幣;銅板|moneda|pièce;pièce de monnaie|moneta
noun|objects|banknote|鈔票;紙鈔|billete|billet|banconota
noun|objects|small change|零錢|cambio;suelto;sencillo|monnaie;petite monnaie|spiccioli
noun|objects|coin purse|零錢包|monedero|porte-monnaie|portamonete;borsellino
noun|objects|credit card|信用卡|tarjeta de crédito|carte de crédit|carta di credito
noun|other|mobile payment|行動支付|pago móvil|paiement mobile|pagamento mobile
noun|other|payment|付款;支付|pago|paiement|pagamento
noun|objects|bank|銀行|banco|banque|banca
noun|other|bank account|銀行帳戶;帳戶|cuenta bancaria;cuenta de banco|compte bancaire;compte en banque|conto in banca;conto bancario
noun|objects|red envelope|紅包|sobre rojo|enveloppe rouge|busta rossa
noun|other|currency|貨幣|moneda;divisa|monnaie;devise|valuta
noun|other|exchange rate|匯率|tipo de cambio;tasa de cambio|taux de change|tasso di cambio
noun|other|dollar|美元;美金|dólar|dollar|dollaro
noun|other|euro|歐元|euro|euro|euro
noun|other|New Taiwan dollar;NT dollar|新台幣;台幣;新臺幣|dólar taiwanés|dollar taïwanais|dollaro taiwanese
noun|other|salary|薪水;薪資|sueldo;salario|salaire|stipendio
noun|other|income|收入|ingresos|revenu;revenus|reddito
noun|other|expense|花費;開銷|gasto|dépense|spesa
noun|other|budget|預算|presupuesto|budget|budget
noun|other|savings|存款;積蓄|ahorros|économies|risparmi
noun|other|loan|貸款|préstamo|prêt|prestito
noun|other|debt|債務;欠款|deuda|dette|debito
noun|other|interest rate|利率|tasa de interés;tipo de interés|taux d'intérêt|tasso d'interesse
noun|objects|house|房子|casa|maison|casa
noun|objects|home|家|casa|maison|casa
noun|objects|apartment;flat|公寓|apartamento;piso;departamento|appartement|appartamento
noun|objects|room|房間|habitación;cuarto|pièce|stanza
noun|objects|bedroom|臥室|dormitorio|chambre|camera da letto
noun|objects|living room|客廳|sala de estar;salón|salon|soggiorno;salotto
noun|objects|bathroom|浴室|baño|salle de bain;salle de bains|bagno
noun|objects|kitchen|廚房|cocina|cuisine|cucina
noun|objects|dining room|餐廳|comedor|salle à manger|sala da pranzo
noun|objects|floor|地板|suelo;piso|sol|pavimento
noun|objects|wall|牆壁;牆|pared|mur|parete
noun|objects|ceiling|天花板|techo|plafond|soffitto
noun|objects|roof|屋頂|tejado;techo|toit|tetto
noun|objects|stairs|樓梯|escaleras;escalera|escalier;escaliers|scale
noun|objects|elevator;lift|電梯|ascensor|ascenseur|ascensore
noun|objects|escalator|手扶梯;電扶梯|escalera mecánica|escalator|scala mobile
noun|objects|garden|花園|jardín|jardin|giardino
noun|objects|balcony|陽台|balcón|balcon|balcone
noun|objects|key|鑰匙|llave|clé;clef|chiave
noun|objects|light bulb|燈泡|bombilla;foco|ampoule|lampadina
noun|objects|furniture|家具;傢俱|muebles|meubles|mobili
noun|objects|shelf|架子|estante|étagère|mensola
noun|objects|mirror|鏡子|espejo|miroir|specchio
noun|objects|curtain|窗簾|cortina|rideau|tenda
noun|objects|carpet|地毯|alfombra|tapis|tappeto
noun|objects|drawer|抽屜|cajón|tiroir|cassetto
noun|objects|mattress|床墊|colchón|matelas|materasso
noun|objects|armchair|扶手椅|sillón|fauteuil|poltrona
noun|objects|faucet;tap|水龍頭|grifo|robinet|rubinetto
noun|objects|hallway|走廊|pasillo|couloir|corridoio
noun|objects|entrance|入口|entrada|entrée|ingresso;entrata
noun|objects|exit|出口|salida|sortie|uscita
noun|objects|garage|車庫|garaje|garage|garage
noun|objects|doorbell|門鈴|timbre|sonnette|campanello
noun|objects|oven|烤箱|horno|four|forno
noun|objects|air conditioner|冷氣|aire acondicionado|climatiseur|condizionatore
noun|other|address|地址|dirección|adresse|indirizzo
noun|people|landlord|房東|casero;casera|propriétaire|padrone di casa;padrona di casa
noun|other|housework|家事|tareas domésticas|tâches ménagères|faccende domestiche
noun|objects|bed sheet|床單|sábana|drap|lenzuolo
noun|objects|blanket|毯子|manta;cobija|couverture|coperta
noun|objects|soap|肥皂|jabón|savon|sapone
noun|objects|shampoo|洗髮精|champú|shampooing;shampoing|shampoo
noun|objects|toothbrush|牙刷|cepillo de dientes|brosse à dents|spazzolino
noun|objects|toothpaste|牙膏|pasta de dientes|dentifrice|dentifricio
noun|objects|comb|梳子|peine|peigne|pettine
noun|objects|trash;garbage|垃圾|basura|ordures;déchets|spazzatura;immondizia
noun|objects|trash bag;garbage bag|垃圾袋|bolsa de basura|sac-poubelle|sacchetto della spazzatura
noun|other|recycling|資源回收|reciclaje|recyclage|riciclo
noun|objects|laundry detergent|洗衣精|detergente|lessive|detersivo
noun|objects|hanger|衣架|percha|cintre|gruccia
verb|actions|sweep|掃地|barrer|balayer|spazzare
phrase|other|make the bed|鋪床|hacer la cama|faire le lit|fare il letto
phrase|other|take out the trash|倒垃圾|sacar la basura|sortir la poubelle|portare fuori la spazzatura
phrase|other|fold clothes|摺衣服;折衣服|doblar la ropa|plier les vêtements|piegare i vestiti
phrase|other|hang up the laundry|晾衣服;曬衣服|tender la ropa|étendre le linge|stendere i panni
noun|objects|clothes|衣服|ropa|vêtements|vestiti
noun|objects|shirt|襯衫|camisa|chemise|camicia
noun|objects|pants;trousers|褲子|pantalones;pantalón|pantalon|pantaloni
noun|objects|shorts|短褲|pantalones cortos|short|pantaloncini
noun|objects|jacket|外套;夾克|chaqueta|veste|giacca
noun|objects|hoodie|帽T|sudadera con capucha|sweat à capuche|felpa con cappuccio
noun|objects|cap|鴨舌帽;棒球帽|gorra|casquette|cappellino
noun|objects|belt|皮帶|cinturón|ceinture|cintura
noun|objects|pocket|口袋|bolsillo|poche|tasca
noun|objects|button|扣子;釦子;鈕扣|botón|bouton|bottone
noun|objects|zipper;zip|拉鍊|cremallera;cierre|fermeture éclair|cerniera;zip
noun|objects|sleeve|袖子|manga|manche|manica
noun|objects|glasses|眼鏡|gafas;lentes|lunettes|occhiali
noun|objects|ring|戒指|anillo|bague|anello
noun|objects|earring|耳環|pendiente;arete|boucle d'oreille|orecchino
noun|objects|bracelet|手鍊|pulsera|bracelet|braccialetto
noun|objects|jewelry;jewellery|首飾|joyas|bijoux|gioielli
noun|objects|underwear|內衣褲|ropa interior|sous-vêtements|biancheria intima
noun|objects|uniform|制服|uniforme|uniforme|uniforme
noun|objects|slippers|拖鞋|pantuflas|chaussons;pantoufles|pantofole;ciabatte
noun|objects|flip-flops|夾腳拖|chanclas|tongs|infradito
noun|objects|raincoat|雨衣|impermeable|imperméable|impermeabile
noun|other|size|大小|tamaño|taille|dimensione
noun|other|size|尺寸;尺碼|talla|taille|taglia
noun|objects|city|城市|ciudad|ville|città
noun|objects|town|小鎮|pueblo|ville|cittadina
noun|objects|village|村莊;村子|pueblo|village|villaggio
noun|objects|country|國家|país|pays|paese
noun|objects|countryside|鄉下;鄉村|campo|campagne|campagna
noun|objects|capital|首都|capital|capitale|capitale
noun|objects|street|街;街道|calle|rue|strada;via
noun|objects|road|路;道路|carretera|route|strada
noun|objects|avenue|大道|avenida|avenue|viale;corso
noun|objects|alley|巷子|callejón|ruelle|vicolo
noun|objects|square|廣場|plaza|place|piazza
noun|other|square|正方形|cuadrado|carré|quadrato
noun|objects|corner|轉角;街角|esquina|coin|angolo
noun|objects|intersection|路口;十字路口|cruce|carrefour|incrocio
noun|objects|sidewalk|人行道|acera|trottoir|marciapiede
noun|objects|crosswalk;zebra crossing|斑馬線|paso de peatones;paso de cebra|passage piéton|strisce pedonali
noun|objects|school|學校|escuela|école|scuola
noun|objects|university|大學|universidad|université|università
noun|objects|museum|博物館|museo|musée|museo
noun|objects|art museum|美術館|museo de arte|musée d'art|museo d'arte
noun|objects|aquarium|水族館|acuario|aquarium|acquario
noun|objects|zoo|動物園|zoológico;zoo|zoo|zoo
noun|objects|temple|寺廟;廟|templo|temple|tempio
noun|objects|post office|郵局|oficina de correos;correos|poste;bureau de poste|ufficio postale;posta
noun|objects|police station|警察局;派出所|comisaría|commissariat|commissariato
noun|objects|fire station|消防局;消防隊|estación de bomberos;parque de bomberos|caserne de pompiers|caserma dei vigili del fuoco
noun|objects|city hall|市政府|ayuntamiento;alcaldía|mairie;hôtel de ville|municipio;comune
noun|objects|embassy|大使館|embajada|ambassade|ambasciata
noun|objects|hotel|飯店|hotel|hôtel|hotel;albergo
noun|objects|hostel|青年旅館|albergue juvenil;albergue|auberge de jeunesse|ostello
noun|objects|airport|機場|aeropuerto|aéroport|aeroporto
noun|objects|station|車站|estación|gare|stazione
noun|objects|train station|火車站|estación de tren|gare|stazione
noun|objects|bus stop|公車站|parada de autobús|arrêt de bus|fermata dell'autobus
noun|objects|metro station;subway station|捷運站|estación de metro|station de métro|stazione della metropolitana;fermata della metro
noun|objects|parking lot;car park|停車場|estacionamiento;aparcamiento|parking|parcheggio
noun|objects|gas station;petrol station|加油站|gasolinera|station-service|distributore di benzina
noun|objects|office|辦公室|oficina|bureau|ufficio
noun|objects|factory|工廠|fábrica|usine|fabbrica
noun|objects|farm|農場|granja|ferme|fattoria
noun|objects|building|建築物;大樓|edificio|bâtiment|edificio
noun|objects|skyscraper|摩天大樓|rascacielos|gratte-ciel|grattacielo
noun|objects|tower|塔|torre|tour|torre
noun|objects|statue|雕像|estatua|statue|statua
noun|objects|downtown;city center|市中心|centro|centre-ville|centro
noun|objects|neighborhood;neighbourhood|社區|barrio|quartier|quartiere
noun|objects|store;shop|商店|tienda|magasin|negozio
noun|objects|shopping mall;mall|購物中心|centro comercial|centre commercial|centro commerciale
noun|objects|department store|百貨公司|grandes almacenes|grand magasin|grande magazzino
noun|objects|market|市場|mercado|marché|mercato
noun|objects|night market|夜市|mercado nocturno|marché de nuit;marché nocturne|mercato notturno
noun|objects|cafe;café|咖啡廳;咖啡店|cafetería;café|café|caffè
noun|objects|hair salon|美髮店;髮廊|peluquería|salon de coiffure|parrucchiere
noun|objects|gym|健身房|gimnasio|salle de sport|palestra
noun|objects|swimming pool|游泳池|piscina|piscine|piscina
noun|objects|stadium|體育場|estadio|stade|stadio
noun|objects|theater;theatre|劇院|teatro|théâtre|teatro
noun|objects|amusement park|遊樂園|parque de atracciones;parque de diversiones|parc d'attractions|parco divertimenti
noun|objects|restroom|洗手間;廁所|baño|toilettes|bagno
noun|objects|front desk|櫃檯|recepción|réception|reception
noun|objects|port|港口|puerto|port|porto
noun|objects|map|地圖|mapa|carte|mappa;cartina
noun|other|direction|方向|dirección|direction|direzione
noun|other|left|左邊|izquierda|gauche|sinistra
noun|other|north|北|norte|nord|nord
noun|other|south|南|sur|sud|sud
noun|other|east|東|este|est|est
noun|other|west|西|oeste|ouest|ovest
phrase|other|turn left|左轉|girar a la izquierda;doblar a la izquierda|tourner à gauche|girare a sinistra
phrase|other|turn right|右轉|girar a la derecha;doblar a la derecha|tourner à droite|girare a destra
phrase|other|go straight|直走|seguir recto;seguir derecho|aller tout droit|andare dritto;andare diritto
other|other|across from|對面|enfrente de|en face de|di fronte a
noun|objects|metro;subway|捷運|metro|métro|metropolitana;metro
noun|objects|motorcycle|機車;摩托車|moto;motocicleta|moto|moto;motocicletta
noun|objects|boat|船|barco|bateau|barca
noun|objects|ferry|渡輪|ferry|ferry|traghetto
noun|objects|helicopter|直升機|helicóptero|hélicoptère|elicottero
noun|objects|high-speed rail;high-speed train|高鐵|tren de alta velocidad|train à grande vitesse|treno ad alta velocità
noun|objects|cable car|纜車|teleférico|téléphérique|funivia
noun|objects|ticket|票|billete;boleto|billet;ticket|biglietto
noun|objects|one-way ticket|單程票|billete de ida;boleto de ida|aller simple|biglietto di sola andata
noun|objects|round-trip ticket;return ticket|來回票|billete de ida y vuelta;boleto de ida y vuelta|aller-retour|biglietto di andata e ritorno
noun|objects|ticket office|售票處|taquilla;boletería|guichet|biglietteria
noun|objects|platform|月台|andén|quai|binario
noun|objects|train car;carriage|車廂|vagón|wagon|carrozza;vagone
noun|objects|seat|座位;位子|asiento|place;siège|posto;sedile
noun|objects|window seat|靠窗座位|asiento de ventanilla|place côté fenêtre|posto finestrino
noun|objects|aisle seat|靠走道座位|asiento de pasillo|place côté couloir|posto corridoio
noun|objects|boarding pass|登機證|tarjeta de embarque;pase de abordar|carte d'embarquement|carta d'imbarco
noun|objects|boarding gate|登機門|puerta de embarque|porte d'embarquement|uscita d'imbarco
noun|other|flight|班機;航班|vuelo|vol|volo
noun|other|traffic|交通|tráfico|circulation|traffico
noun|other|traffic jam|塞車|atasco;embotellamiento|embouteillage;bouchon|ingorgo
noun|other|rush hour|尖峰時間|hora punta;hora pico|heure de pointe|ora di punta
noun|objects|highway;freeway|高速公路|autopista|autoroute|autostrada
noun|objects|tunnel|隧道|túnel|tunnel|tunnel;galleria
noun|objects|gasoline;petrol|汽油|gasolina|essence|benzina
noun|objects|driver's license|駕照|licencia de conducir;carné de conducir|permis de conduire|patente
noun|other|delay|延誤;誤點|retraso|retard|ritardo
noun|objects|timetable|時刻表|horario|horaire|orario
noun|people|traveler;traveller|旅客|viajero;viajera|voyageur;voyageuse|viaggiatore;viaggiatrice
phrase|other|next stop|下一站|próxima parada|prochain arrêt|prossima fermata
phrase|other|last train|末班車|último tren|dernier train|ultimo treno
phrase|other|change trains|轉車;換車|cambiar de tren|changer de train|cambiare treno
phrase|other|take the metro|搭捷運;坐捷運|tomar el metro|prendre le métro|prendere la metro;prendere la metropolitana
phrase|other|take a taxi|搭計程車;坐計程車|tomar un taxi|prendre un taxi|prendere un taxi
phrase|other|take the train|搭火車;坐火車|tomar el tren|prendre le train|prendere il treno
other|other|on foot|走路;步行|a pie|à pied|a piedi
noun|other|trip|旅行|viaje|voyage|viaggio
noun|other|vacation;holiday|假期|vacaciones|vacances|vacanza;vacanze
phrase|other|go on vacation|去度假|ir de vacaciones|partir en vacances|andare in vacanza
noun|other|business trip|出差|viaje de negocios|voyage d'affaires|viaggio di lavoro
noun|objects|passport|護照|pasaporte|passeport|passaporto
noun|objects|visa|簽證|visa;visado|visa|visto
noun|objects|luggage;baggage|行李|equipaje|bagages|bagagli;bagaglio
noun|objects|suitcase|行李箱|maleta|valise|valigia
noun|other|reservation|預訂|reserva;reservación|réservation|prenotazione
verb|actions|reserve|預訂|reservar|réserver|prenotare
phrase|other|check in|辦理入住|registrarse;hacer el check-in|s'enregistrer|fare il check-in
phrase|other|check out|退房|dejar la habitación;hacer el check-out|libérer la chambre|lasciare la camera;fare il check-out
noun|objects|tourist attraction|景點;觀光景點|atracción turística;lugar turístico|site touristique|attrazione turistica
noun|other|guided tour|導覽|visita guiada|visite guidée|visita guidata
noun|people|guide|導遊|guía|guide|guida
noun|objects|souvenir|紀念品|recuerdo;souvenir|souvenir|souvenir
phrase|other|go sightseeing|去觀光|hacer turismo|faire du tourisme|fare un giro turistico
noun|other|itinerary|行程|itinerario|itinéraire|itinerario
noun|objects|travel agency|旅行社|agencia de viajes|agence de voyages|agenzia di viaggi;agenzia viaggi
noun|other|customs|海關|aduana|douane|dogana
noun|other|security check|安檢|control de seguridad|contrôle de sécurité|controllo di sicurezza
noun|other|jet lag|時差|jet lag;desfase horario|décalage horaire|jet lag
phrase|other|go abroad|出國|ir al extranjero|partir à l'étranger;aller à l'étranger|andare all'estero
phrase|other|exchange money|換錢|cambiar dinero|changer de l'argent|cambiare soldi
phrase|other|rent a car|租車|alquilar un coche;alquilar un auto|louer une voiture|noleggiare un'auto;noleggiare una macchina
noun|other|nature|大自然;自然|naturaleza|nature|natura
noun|objects|sky|天空|cielo|ciel|cielo
noun|objects|sun|太陽|sol|soleil|sole
noun|objects|moon|月亮|luna|lune|luna
noun|objects|star|星星|estrella|étoile|stella
noun|objects|cloud|雲|nube|nuage|nuvola
noun|other|wind|風|viento|vent|vento
noun|other|storm|暴風雨|tormenta|tempête|tempesta
noun|other|typhoon|颱風|tifón|typhon|tifone
noun|other|hurricane|颶風|huracán|ouragan|uragano
noun|other|earthquake|地震|terremoto;sismo|tremblement de terre;séisme|terremoto
noun|other|fog|霧|niebla|brouillard|nebbia
noun|other|thunder|雷;雷聲|trueno|tonnerre|tuono
noun|other|lightning|閃電|relámpago|éclair|fulmine
noun|objects|rainbow|彩虹|arcoíris;arco iris|arc-en-ciel|arcobaleno
noun|objects|sea|海;大海|mar|mer|mare
noun|objects|ocean|海洋|océano|océan|oceano
noun|objects|river|河;河流|río|rivière|fiume
noun|objects|island|島|isla|île|isola
noun|objects|forest|森林|bosque|forêt|foresta
noun|objects|jungle|叢林|selva;jungla|jungle|giungla
noun|objects|desert|沙漠|desierto|désert|deserto
noun|objects|hill|山丘;小山|colina|colline|collina
noun|objects|cave|山洞;洞穴|cueva|grotte|grotta
noun|objects|waterfall|瀑布|cascada|cascade;chute d'eau|cascata
noun|objects|pond|池塘|estanque|étang|stagno
noun|objects|coast|海岸|costa|côte|costa
noun|objects|wave|海浪;浪|ola|vague|onda
noun|objects|tree|樹|árbol|arbre|albero
noun|objects|flower|花|flor|fleur|fiore
noun|objects|grass|草|hierba;pasto|herbe|erba
noun|objects|leaf|葉子|hoja|feuille|foglia
noun|objects|branch|樹枝|rama|branche|ramo
noun|objects|root|根|raíz|racine|radice
noun|objects|seed|種子|semilla|graine|seme
noun|objects|animal|動物|animal|animal|animale
noun|objects|stone|石頭|piedra|pierre|pietra
noun|objects|sand|沙子;沙|arena|sable|sabbia
noun|objects|soil|泥土;土|tierra|terre|terra
noun|objects|mud|泥巴|barro;lodo|boue|fango
noun|objects|dust|灰塵|polvo|poussière|polvere
noun|objects|ground|地面|suelo|sol|terreno
noun|objects|Earth|地球|Tierra|Terre|Terra
noun|objects|planet|行星;星球|planeta|planète|pianeta
noun|other|world|世界|mundo|monde|mondo
noun|objects|fire|火|fuego|feu|fuoco
noun|objects|ice|冰|hielo|glace|ghiaccio
noun|other|air|空氣|aire|air|aria
noun|other|environment|環境|medio ambiente|environnement|ambiente
noun|other|sunlight|陽光|luz del sol|lumière du soleil|luce del sole
noun|other|shadow|影子|sombra|ombre|ombra
noun|other|sunrise|日出|amanecer;salida del sol|lever du soleil|alba
noun|other|sunset|日落|puesta de sol|coucher de soleil|tramonto
noun|other|weather|天氣|tiempo|temps|tempo
noun|other|weather forecast|天氣預報|pronóstico del tiempo|prévisions météo;météo|previsioni del tempo;meteo
noun|other|climate|氣候|clima|climat|clima
noun|other|temperature|溫度|temperatura|température|temperatura
noun|other|degree|度|grado|degré|grado
noun|other|humidity|濕度|humedad|humidité|umidità
adjective|other|sunny|晴朗|soleado;soleada|ensoleillé;ensoleillée|soleggiato;soleggiata
adjective|other|rainy|多雨|lluvioso;lluviosa|pluvieux;pluvieuse|piovoso;piovosa
adjective|other|cloudy|多雲|nublado;nublada|nuageux;nuageuse|nuvoloso;nuvolosa
adjective|other|windy|多風|ventoso;ventosa|venteux;venteuse|ventoso;ventosa
adjective|other|humid|潮濕|húmedo;húmeda|humide|umido;umida
noun|other|season|季節|estación|saison|stagione
noun|other|spring|春天|primavera|printemps|primavera
noun|other|summer|夏天|verano|été|estate
noun|other|autumn;fall|秋天|otoño|automne|autunno
noun|other|winter|冬天|invierno|hiver|inverno
noun|other|time|時間|tiempo|temps|tempo
noun|other|hour|小時;鐘頭|hora|heure|ora
noun|other|minute|分鐘|minuto|minute|minuto
other|other|second|第二|segundo;segunda|deuxième|secondo;seconda
noun|other|second|秒|segundo|seconde|secondo
noun|other|day|天|día|jour|giorno
noun|other|week|星期;禮拜;週|semana|semaine|settimana
noun|other|month|月|mes|mois|mese
noun|other|year|年|año|année;an|anno
noun|other|decade|十年|década|décennie|decennio
noun|other|century|世紀|siglo|siècle|secolo
noun|other|morning|早上|mañana|matin|mattina
noun|other|noon|中午|mediodía|midi|mezzogiorno
noun|other|afternoon|下午|tarde|après-midi|pomeriggio
noun|other|evening|晚上|noche|soir|sera
noun|other|night|夜晚;晚上|noche|nuit|notte
noun|other|midnight|午夜|medianoche|minuit|mezzanotte
noun|other|weekend|週末|fin de semana|week-end;weekend|fine settimana;weekend
noun|other|holiday|假日|día festivo;feriado|jour férié|giorno festivo
noun|other|date|日期|fecha|date|data
noun|objects|calendar|日曆|calendario|calendrier|calendario
noun|other|past|過去|pasado|passé|passato
noun|other|present|現在|presente|présent|presente
noun|other|future|未來;將來|futuro|avenir|futuro
noun|other|moment|時刻|momento|moment|momento
noun|other|New Year|新年|Año Nuevo|Nouvel An|Capodanno
noun|other|Chinese New Year;Lunar New Year|農曆新年;春節|Año Nuevo chino|Nouvel An chinois|Capodanno cinese
noun|other|Christmas|聖誕節|Navidad|Noël|Natale
phrase|other|half an hour|半小時;半個小時|media hora|demi-heure|mezz'ora
noun|other|Monday|星期一;禮拜一|lunes|lundi|lunedì
noun|other|Tuesday|星期二;禮拜二|martes|mardi|martedì
noun|other|Wednesday|星期三;禮拜三|miércoles|mercredi|mercoledì
noun|other|Thursday|星期四;禮拜四|jueves|jeudi|giovedì
noun|other|Friday|星期五;禮拜五|viernes|vendredi|venerdì
noun|other|Saturday|星期六;禮拜六|sábado|samedi|sabato
noun|other|Sunday|星期日;星期天;禮拜天|domingo|dimanche|domenica
noun|other|January|一月|enero|janvier|gennaio
noun|other|February|二月|febrero|février|febbraio
noun|other|March|三月|marzo|mars|marzo
noun|other|April|四月|abril|avril|aprile
noun|other|May|五月|mayo|mai|maggio
noun|other|June|六月|junio|juin|giugno
noun|other|July|七月|julio|juillet|luglio
noun|other|August|八月|agosto|août|agosto
noun|other|September|九月|septiembre;setiembre|septembre|settembre
noun|other|October|十月|octubre|octobre|ottobre
noun|other|November|十一月|noviembre|novembre|novembre
noun|other|December|十二月|diciembre|décembre|dicembre
other|other|zero|零|cero|zéro|zero
other|other|one|一|uno;una|un;une|uno;una
other|other|two|二;兩|dos|deux|due
other|other|three|三|tres|trois|tre
other|other|four|四|cuatro|quatre|quattro
other|other|five|五|cinco|cinq|cinque
other|other|six|六|seis|six|sei
other|other|seven|七|siete|sept|sette
other|other|eight|八|ocho|huit|otto
other|other|nine|九|nueve|neuf|nove
other|other|ten|十|diez|dix|dieci
other|other|eleven|十一|once|onze|undici
other|other|twelve|十二|doce|douze|dodici
other|other|thirteen|十三|trece|treize|tredici
other|other|fourteen|十四|catorce|quatorze|quattordici
other|other|fifteen|十五|quince|quinze|quindici
other|other|sixteen|十六|dieciséis|seize|sedici
other|other|seventeen|十七|diecisiete|dix-sept|diciassette
other|other|eighteen|十八|dieciocho|dix-huit|diciotto
other|other|nineteen|十九|diecinueve|dix-neuf|diciannove
other|other|twenty|二十|veinte|vingt|venti
other|other|thirty|三十|treinta|trente|trenta
other|other|forty|四十|cuarenta|quarante|quaranta
other|other|fifty|五十|cincuenta|cinquante|cinquanta
other|other|sixty|六十|sesenta|soixante|sessanta
other|other|seventy|七十|setenta|soixante-dix|settanta
other|other|eighty|八十|ochenta|quatre-vingts|ottanta
other|other|ninety|九十|noventa|quatre-vingt-dix|novanta
other|other|hundred|一百|cien|cent|cento
other|other|thousand|一千|mil|mille|mille
other|other|ten thousand|一萬|diez mil|dix mille|diecimila
other|other|million|一百萬|millón|million|milione
other|other|billion|十億|mil millones|milliard|miliardo
other|other|third|第三|tercero;tercera|troisième|terzo;terza
other|other|fourth|第四|cuarto;cuarta|quatrième|quarto;quarta
other|other|fifth|第五|quinto;quinta|cinquième|quinto;quinta
other|other|half|一半|mitad|moitié|metà
other|other|double|雙倍;兩倍|doble|double|doppio
other|other|dozen|一打|docena|douzaine|dozzina
noun|other|number|數字|número|nombre|numero
noun|other|color;colour|顏色|color|couleur|colore
adjective|other|red|紅色|rojo;roja|rouge|rosso;rossa
adjective|other|yellow|黃色|amarillo;amarilla|jaune|giallo;gialla
adjective|other|green|綠色|verde|vert;verte|verde
adjective|other|blue|藍色|azul|bleu;bleue|blu
adjective|other|purple|紫色|morado;morada|violet;violette|viola
adjective|other|pink|粉紅色|rosa;rosado;rosada|rose|rosa
adjective|other|brown|咖啡色;棕色|marrón|marron|marrone
adjective|other|black|黑色|negro;negra|noir;noire|nero;nera
adjective|other|white|白色|blanco;blanca|blanc;blanche|bianco;bianca
adjective|other|gray;grey|灰色|gris|gris;grise|grigio;grigia
adjective|other|gold|金色|dorado;dorada|doré;dorée|dorato;dorata
adjective|other|silver|銀色|plateado;plateada|argenté;argentée|argentato;argentata
adjective|other|beige|米色|beige|beige|beige
adjective|other|transparent|透明|transparente|transparent;transparente|trasparente
noun|other|circle|圓形|círculo|cercle|cerchio
noun|other|rectangle|長方形|rectángulo|rectangle|rettangolo
noun|other|triangle|三角形|triángulo|triangle|triangolo
noun|other|oval|橢圓形|óvalo|ovale|ovale
noun|other|line|線|línea|ligne|linea
noun|other|point|點|punto|point|punto
noun|other|shape|形狀|forma|forme|forma
noun|other|length|長度|longitud|longueur|lunghezza
noun|other|width|寬度|ancho;anchura|largeur|larghezza
noun|other|meter;metre|公尺|metro|mètre|metro
noun|other|kilometer;kilometre|公里|kilómetro|kilomètre|chilometro
noun|other|centimeter;centimetre|公分|centímetro|centimètre|centimetro
noun|other|kilogram;kilo|公斤|kilogramo;kilo|kilogramme;kilo|chilogrammo;chilo
noun|other|gram;gramme|公克;克|gramo|gramme|grammo
noun|objects|wood|木頭|madera|bois|legno
noun|objects|metal|金屬|metal|métal|metallo
noun|objects|plastic|塑膠|plástico|plastique|plastica
noun|objects|paper|紙|papel|papier|carta
noun|objects|cotton|棉|algodón|coton|cotone
noun|objects|leather|皮革|cuero|cuir|pelle
noun|objects|steel|鋼|acero|acier|acciaio
noun|objects|rubber|橡膠|goma|caoutchouc|gomma
noun|objects|wool|羊毛|lana|laine|lana
noun|objects|silk|絲綢|seda|soie|seta
noun|objects|fabric|布;布料|tela|tissu|tessuto;stoffa
noun|objects|brick|磚塊;磚頭|ladrillo|brique|mattone
noun|objects|cardboard|紙板|cartón|carton|cartone
noun|objects|ceramic|陶瓷|cerámica|céramique|ceramica
noun|other|class|課|clase|cours|lezione
noun|objects|classroom|教室|aula|salle de classe|aula
noun|other|lesson|課|lección|leçon|lezione
noun|other|course|課程|curso|cours|corso
noun|other|homework|作業;功課|deberes;tarea|devoirs|compiti
noun|other|exam|考試|examen|examen|esame
noun|other|test|測驗|prueba|test|test
noun|other|grade|成績|nota|note|voto
noun|other|score|分數|puntuación;puntaje|score|punteggio
noun|other|question|問題|pregunta|question|domanda
noun|other|word|單字;詞|palabra|mot|parola
noun|other|sentence|句子|frase;oración|phrase|frase
noun|other|language|語言|idioma;lengua|langue|lingua
noun|other|grammar|文法|gramática|grammaire|grammatica
noun|other|vocabulary|詞彙;字彙|vocabulario|vocabulaire|vocabolario
noun|objects|dictionary|字典;辭典|diccionario|dictionnaire|dizionario
noun|other|pronunciation|發音|pronunciación|prononciation|pronuncia
noun|other|mistake|錯誤|error|erreur;faute|errore;sbaglio
noun|other|example|例子|ejemplo|exemple|esempio
noun|other|meaning|意思|significado|sens|significato
noun|objects|page|頁|página|page|pagina
noun|objects|notebook|筆記本|cuaderno|cahier|quaderno
noun|objects|textbook|課本;教科書|libro de texto|manuel|libro di testo
noun|other|subject|科目|asignatura;materia|matière|materia
noun|other|math;maths|數學|matemáticas|mathématiques;maths|matematica
noun|other|history|歷史|historia|histoire|storia
noun|other|science|科學|ciencia|science|scienza
noun|other|geography|地理|geografía|géographie|geografia
noun|other|physics|物理|física|physique|fisica
noun|other|chemistry|化學|química|chimie|chimica
noun|other|biology|生物|biología|biologie|biologia
noun|other|physical education;PE|體育|educación física|éducation physique|educazione fisica
noun|other|accent|口音|acento|accent|accento
noun|other|level|程度|nivel|niveau|livello
noun|other|translation|翻譯|traducción|traduction|traduzione
noun|other|foreign language|外語;外文|lengua extranjera;idioma extranjero|langue étrangère|lingua straniera
noun|other|native language;mother tongue|母語|lengua materna|langue maternelle|lingua madre;madrelingua
noun|other|verb|動詞|verbo|verbe|verbo
noun|other|noun|名詞|sustantivo|nom|nome;sostantivo
noun|other|adjective|形容詞|adjetivo|adjectif|aggettivo
noun|other|knowledge|知識|conocimiento|connaissances|conoscenza
noun|people|beginner|初學者|principiante|débutant;débutante|principiante
noun|other|English|英文;英語|inglés|anglais|inglese
noun|other|Chinese|中文|chino|chinois|cinese
noun|other|Spanish|西班牙文;西班牙語|español|espagnol|spagnolo
noun|other|French|法文;法語|francés|français|francese
noun|other|Italian|義大利文;義大利語|italiano|italien|italiano
noun|other|Japanese|日文;日語|japonés|japonais|giapponese
noun|other|Korean|韓文;韓語|coreano|coréen|coreano
noun|other|German|德文;德語|alemán|allemand|tedesco
noun|other|job|工作|trabajo;empleo|travail;emploi|lavoro
noun|other|company|公司|empresa|entreprise|azienda
noun|other|meeting|會議|reunión|réunion|riunione
noun|other|project|專案|proyecto|projet|progetto
noun|other|interview|面試|entrevista|entretien|colloquio
noun|other|contract|合約;契約|contrato|contrat|contratto
noun|other|business|生意|negocios|affaires|affari
noun|other|team|團隊|equipo|équipe|squadra
noun|other|idea|主意;點子|idea|idée|idea
noun|other|problem|問題|problema|problème|problema
noun|other|solution|解決辦法;解決方法|solución|solution|soluzione
noun|other|result|結果|resultado|résultat|risultato
noun|other|goal|目標|objetivo;meta|objectif|obiettivo
noun|other|report|報告|informe;reporte|rapport|relazione;rapporto
noun|other|email;e-mail|電子郵件|correo electrónico;email|e-mail;mail;courriel|email;e-mail;mail
noun|objects|document|文件|documento|document|documento
noun|other|schedule|時間表|horario|emploi du temps|orario
noun|other|deadline|截止日期|fecha límite|date limite|scadenza
noun|other|presentation|簡報|presentación|présentation|presentazione
noun|people|client|客戶|cliente|client;cliente|cliente
noun|other|skill|技能|habilidad|compétence|competenza
noun|objects|résumé;resume;CV|履歷;履歷表|currículum|CV|curriculum
noun|other|internship|實習|prácticas;pasantía|stage|tirocinio;stage
noun|other|responsibility|責任|responsabilidad|responsabilité|responsabilità
noun|objects|phone|電話|teléfono|téléphone|telefono
noun|objects|smartphone|智慧型手機|smartphone;teléfono inteligente|smartphone|smartphone
noun|other|internet|網路|internet|internet|internet
noun|other|website|網站|sitio web;página web|site web;site internet|sito web;sito internet
noun|other|app|應用程式;App|aplicación;app|application;appli|app;applicazione
noun|other|password|密碼|contraseña|mot de passe|password
noun|other|message|訊息|mensaje|message|messaggio
noun|objects|photo|照片;相片|foto|photo|foto
noun|other|video|影片|vídeo;video|vidéo|video
noun|objects|screen|螢幕|pantalla|écran|schermo
noun|objects|battery|電池|batería|batterie|batteria
noun|objects|charger|充電器|cargador|chargeur|caricabatterie;caricatore
noun|other|Wi-Fi;wifi|無線網路;Wi-Fi|wifi|wifi;wi-fi|wi-fi;wifi
noun|other|account|帳號|cuenta|compte|account
noun|other|software|軟體|software|logiciel|software
noun|other|data|資料|datos|données|dati
noun|other|information|資訊|información|information;informations|informazione;informazioni
noun|other|social media|社群媒體|redes sociales|réseaux sociaux|social media;social
noun|other|file|檔案|archivo;fichero|fichier|file
noun|other|link|連結|enlace|lien|link;collegamento
noun|other|video call|視訊通話;視訊|videollamada|appel vidéo|videochiamata
noun|other|phone call|電話|llamada|appel|telefonata;chiamata
noun|objects|selfie|自拍照;自拍|selfie;selfi|selfie|selfie
noun|other|artificial intelligence;AI|人工智慧|inteligencia artificial|intelligence artificielle|intelligenza artificiale
noun|other|technology|科技|tecnología|technologie|tecnologia
noun|other|video game|電玩;電動|videojuego|jeu vidéo|videogioco;videogame
noun|objects|headphones|耳機|auriculares;audífonos|casque|cuffie
noun|objects|tablet|平板電腦;平板|tableta;tablet|tablette|tablet
noun|other|notification|通知|notificación|notification|notifica
noun|other|comment|留言|comentario|commentaire|commento
noun|other|conversation|對話|conversación|conversation|conversazione
noun|other|news|新聞|noticias|actualités|notizie
noun|other|story|故事|historia|histoire|storia
noun|objects|letter|信;信件|carta|lettre|lettera
noun|other|voice|聲音|voz|voix|voce
noun|other|sound|聲音|sonido|son|suono
noun|other|noise|噪音|ruido|bruit|rumore
noun|other|speech|演講|discurso|discours|discorso
noun|other|advice|建議|consejo|conseil|consiglio
noun|other|discussion|討論|discusión|discussion|discussione
noun|objects|newspaper|報紙|periódico;diario|journal|giornale
noun|objects|magazine|雜誌|revista|magazine|rivista
noun|other|language exchange|語言交換|intercambio de idiomas|échange linguistique|scambio linguistico
noun|other|topic|話題|tema|sujet|argomento
noun|other|feeling|感覺|sensación|sensation|sensazione
noun|other|emotion|情緒;情感|emoción|émotion|emozione
noun|other|happiness|幸福|felicidad|bonheur|felicità
noun|other|sadness|悲傷|tristeza|tristesse|tristezza
noun|other|fear|恐懼|miedo|peur|paura
noun|other|anger|憤怒|enojo;enfado|colère|rabbia
noun|other|stress|壓力|estrés|stress|stress
noun|other|surprise|驚喜|sorpresa|surprise|sorpresa
noun|other|joy|喜悅|alegría|joie|gioia
noun|other|luck|運氣|suerte|chance|fortuna
noun|other|memory|回憶|recuerdo|souvenir|ricordo
noun|other|experience|經驗|experiencia|expérience|esperienza
noun|other|opinion|意見;看法|opinión|avis;opinion|opinione
noun|other|reason|原因|razón;motivo|raison|motivo;ragione
noun|other|truth|真相|verdad|vérité|verità
noun|other|secret|秘密;祕密|secreto|secret|segreto
noun|other|chance|機會|oportunidad|occasion|occasione
noun|other|choice|選擇|elección|choix|scelta
noun|other|decision|決定|decisión|décision|decisione
noun|other|habit|習慣|hábito;costumbre|habitude|abitudine
noun|other|mood|心情|humor|humeur|umore
noun|other|courage|勇氣|valentía;valor|courage|coraggio
noun|other|patience|耐心|paciencia|patience|pazienza
noun|other|interest|興趣|interés|intérêt|interesse
noun|other|thought|想法|pensamiento|pensée|pensiero
noun|other|respect|尊重|respeto|respect|rispetto
noun|other|friendship|友誼;友情|amistad|amitié|amicizia
noun|other|relationship|關係|relación|relation|rapporto
noun|other|success|成功|éxito|succès;réussite|successo
noun|other|failure|失敗|fracaso|échec|fallimento
noun|other|effort|努力|esfuerzo|effort|sforzo
noun|other|fact|事實|hecho|fait|fatto
noun|other|difference|差別;差異|diferencia|différence|differenza
noun|other|situation|情況;狀況|situación|situation|situazione
noun|other|method|方法|método|méthode|metodo
noun|other|advantage|優點|ventaja|avantage|vantaggio
noun|other|disadvantage|缺點|desventaja|inconvénient|svantaggio
noun|other|progress|進步|progreso|progrès|progresso
noun|other|talent|天分;天賦|talento|talent|talento
noun|other|culture|文化|cultura|culture|cultura
noun|other|art|藝術|arte|art|arte
noun|other|music|音樂|música|musique|musica
noun|other|movie;film|電影|película|film|film
noun|other|song|歌;歌曲|canción|chanson|canzone
noun|other|game|遊戲|juego|jeu|gioco
noun|other|sport|運動|deporte|sport|sport
noun|other|party|派對|fiesta|fête|festa
noun|other|festival|節慶|festival|festival|festival
noun|other|tradition|傳統|tradición|tradition|tradizione
noun|other|politics|政治|política|politique|politica
noun|other|economy|經濟|economía|économie|economia
noun|other|society|社會|sociedad|société|società
noun|other|government|政府|gobierno|gouvernement|governo
noun|other|law|法律|ley|loi|legge
noun|other|rule|規則;規定|regla;norma|règle|regola
noun|other|freedom|自由|libertad|liberté|libertà
noun|other|peace|和平|paz|paix|pace
noun|other|war|戰爭|guerra|guerre|guerra
noun|other|education|教育|educación|éducation|istruzione
noun|other|religion|宗教|religión|religion|religione
noun|other|literature|文學|literatura|littérature|letteratura
noun|other|poem|詩|poema|poème|poesia
noun|other|novel|小說|novela|roman|romanzo
noun|other|character|角色|personaje|personnage|personaggio
noun|other|series|影集|serie|série|serie
noun|other|TV show|電視節目|programa de televisión|émission de télévision|programma televisivo
noun|other|hobby|興趣;嗜好|pasatiempo;afición|passe-temps;loisir|hobby;passatempo
noun|other|reading|閱讀|lectura|lecture|lettura
noun|other|soccer;football|足球|fútbol;futbol|football;foot|calcio
noun|other|tennis|網球|tenis|tennis|tennis
noun|other|swimming|游泳|natación|natation|nuoto
noun|other|running|跑步|correr|course à pied|corsa
noun|other|yoga|瑜伽;瑜珈|yoga|yoga|yoga
noun|other|competition|比賽|competición;competencia|compétition|gara;competizione
noun|people|player|選手|jugador;jugadora|joueur;joueuse|giocatore;giocatrice
noun|people|champion|冠軍|campeón;campeona|champion;championne|campione;campionessa
noun|other|badminton|羽球;羽毛球|bádminton|badminton|badminton
noun|other|table tennis;ping-pong|桌球;乒乓球|tenis de mesa;ping-pong|tennis de table;ping-pong|ping-pong;tennis da tavolo
noun|other|golf|高爾夫球;高爾夫|golf|golf|golf
noun|other|hiking|健行|senderismo|randonnée|escursionismo;trekking
noun|other|cooking|烹飪|cocina|cuisine|cucina
noun|other|gardening|園藝|jardinería|jardinage|giardinaggio
noun|other|fishing|釣魚|pesca|pêche|pesca
noun|other|chess|西洋棋|ajedrez|échecs|scacchi
noun|other|board game|桌遊|juego de mesa|jeu de société|gioco da tavolo
noun|other|Olympics;Olympic Games|奧運|Juegos Olímpicos|Jeux olympiques|Olimpiadi
noun|other|concert|演唱會|concierto|concert|concerto
noun|other|exhibition|展覽|exposición|exposition|mostra
noun|other|painting|繪畫|pintura|peinture|pittura
noun|objects|drawing|畫;圖畫|dibujo|dessin|disegno
noun|other|photography|攝影|fotografía|photographie|fotografia
noun|other|opera|歌劇|ópera|opéra|opera
noun|objects|instrument|樂器|instrumento|instrument|strumento
noun|other|band|樂團|grupo;banda|groupe|gruppo;band
phrase|other|even if|即使|aunque|même si|anche se
phrase|other|for example|例如|por ejemplo|par exemple|per esempio
phrase|other|in fact|事實上|de hecho|en fait|infatti
phrase|other|at least|至少|al menos|au moins|almeno
phrase|other|at first|一開始|al principio|au début|all'inizio
phrase|other|so far|到目前為止|hasta ahora|jusqu'à présent|finora
other|other|ago|…前|hace|il y a|fa
other|other|forever|永遠|para siempre|pour toujours|per sempre
other|other|finally|終於|por fin|enfin|finalmente
other|other|suddenly|突然|de repente|soudain|all'improvviso
other|other|perhaps|也許;或許|quizás;tal vez|peut-être|forse
other|other|exactly|正好|exactamente|exactement|esattamente
other|other|immediately|立即|inmediatamente|immédiatement|immediatamente
other|other|completely|完全|completamente|complètement|completamente
other|other|absolutely|絕對|absolutamente|absolument|assolutamente
other|other|obviously|顯然|obviamente|évidemment|ovviamente
other|other|clearly|清楚地|claramente|clairement|chiaramente
other|other|currently|目前|actualmente|actuellement|attualmente
other|other|directly|直接|directamente|directement|direttamente
other|other|eventually|最終|al final|finalement|alla fine
other|other|nearly|幾乎|casi|presque|quasi
other|other|quite|相當|bastante|assez|abbastanza
other|other|simply|單純|simplemente|simplement|semplicemente
other|other|mainly|主要|principalmente|principalement|principalmente
other|other|gradually|逐漸|gradualmente|progressivement|gradualmente
other|other|slightly|稍微|ligeramente|légèrement|leggermente
other|other|relatively|相對地|relativamente|relativement|relativamente
other|other|apparently|看來|al parecer|apparemment|a quanto pare
other|other|seriously|認真地|en serio|sérieusement|seriamente
other|other|hardly|幾乎不|apenas|à peine|a malapena
other|other|therefore|因此|por lo tanto|donc|quindi
other|other|unless|除非|a menos que|à moins que|a meno che
other|other|whether|是否|si|si|se
other|other|whereas|而|mientras que|alors que|mentre
other|other|meanwhile|與此同時|mientras tanto|pendant ce temps|nel frattempo
other|other|nevertheless|儘管如此|no obstante|néanmoins|ciononostante
phrase|other|instead of|而不是|en lugar de|au lieu de|invece di
phrase|other|because of|因為|a causa de|à cause de|a causa di
phrase|other|according to|根據|según|selon|secondo
phrase|other|thanks to|多虧|gracias a|grâce à|grazie a
other|other|unlike|不像|a diferencia de|contrairement à|a differenza di
other|other|beyond|超出|más allá de|au-delà de|oltre
other|other|along|沿著|a lo largo de|le long de|lungo
phrase|other|as well as|以及|así como|ainsi que|così come
phrase|other|so that|以便|para que|pour que|affinché
phrase|other|in order to|為了|con el fin de|afin de|al fine di
phrase|other|such as|像是|como|comme|come
phrase|other|as if|好像|como si|comme si|come se
phrase|other|as long as|只要|siempre que|tant que|purché
phrase|other|now that|既然|ahora que|maintenant que|ora che
phrase|other|in addition|此外|además|en plus|inoltre
phrase|other|on the other hand|另一方面|por otro lado|d'un autre côté|d'altra parte
phrase|other|in other words|換句話說|en otras palabras|autrement dit|in altre parole
phrase|other|after all|畢竟|después de todo|après tout|dopotutto
phrase|other|at the same time|同時|al mismo tiempo|en même temps|allo stesso tempo
phrase|other|at the moment|目前;現在|en este momento|en ce moment|in questo momento
phrase|other|from now on|從現在起|de ahora en adelante|à partir de maintenant|d'ora in poi
phrase|other|from today on|從今天起|a partir de hoy|à partir d'aujourd'hui|da oggi in poi
phrase|other|once more|再一次|una vez más|encore une fois|ancora una volta
phrase|other|more or less|大致上|más o menos|plus ou moins|più o meno
phrase|other|every time|每次|cada vez|chaque fois|ogni volta
phrase|other|like this|像這樣|así|comme ça|così
phrase|other|on time|準時|a tiempo|à l'heure|in orario
phrase|other|in advance|提前|con antelación|à l'avance|in anticipo
phrase|other|in a hurry|趕時間|con prisa|pressé;pressée|di fretta
phrase|other|for a while|一陣子|durante un rato|pendant un moment|per un po'
phrase|other|as usual|照常|como siempre|comme d'habitude|come al solito
phrase|other|by heart|背起來|de memoria|par cœur|a memoria
phrase|other|by mistake|不小心|por error|par erreur|per errore
phrase|other|on purpose|故意|a propósito;adrede|exprès|apposta
phrase|other|by the way|順帶一提;順便一提|por cierto|au fait|a proposito
phrase|other|as soon as possible|盡快|lo antes posible|dès que possible|il prima possibile
phrase|other|it depends|看情況|depende|ça dépend|dipende
phrase|other|never mind|算了|olvídalo|laisse tomber|lascia stare
phrase|other|not at all|一點也不|para nada|pas du tout|per niente
phrase|other|not bad|不錯|nada mal|pas mal|niente male
phrase|other|take your time|慢慢來|tómate tu tiempo|prends ton temps|prenditi il tuo tempo
phrase|other|no doubt|毫無疑問|sin duda|sans aucun doute|senza dubbio
phrase|other|no wonder|難怪|con razón|pas étonnant|non c'è da stupirsi
phrase|other|out of order|故障|fuera de servicio|en panne|fuori servizio
phrase|other|just in case|以防萬一|por si acaso|au cas où|per ogni evenienza
phrase|other|up to you|由你決定|tú decides|c'est à toi de voir|decidi tu
phrase|other|that's all|就這樣|eso es todo|c'est tout|è tutto
phrase|other|that's right|沒錯|así es|c'est ça|esatto
phrase|other|that makes sense|有道理|tiene sentido|c'est logique|ha senso
phrase|other|you're right|你說得對|tienes razón|tu as raison|hai ragione
phrase|other|I agree|我同意|estoy de acuerdo|je suis d'accord|sono d'accordo
phrase|other|good idea|好主意|buena idea|bonne idée|buona idea
phrase|other|what happened|發生什麼事了|qué pasó|que s'est-il passé|cosa è successo
phrase|other|what's wrong|怎麼了|qué pasa|qu'est-ce qu'il y a|che c'è
phrase|other|what a pity|真可惜|qué lástima|quel dommage|che peccato
phrase|other|I'm sorry|我很抱歉|lo siento|je suis désolé;je suis désolée|mi dispiace
phrase|other|I think so|我想是吧|creo que sí|je pense que oui|penso di sì
phrase|other|I hope so|希望如此|eso espero|je l'espère|spero di sì
phrase|other|I don't think so|我不覺得|no lo creo|je ne pense pas|non credo
phrase|other|give me|給我|dame|donne-moi|dammi
phrase|other|I love you|我愛你|te quiero;te amo|je t'aime|ti amo
phrase|other|I miss you|我想你|te extraño;te echo de menos|tu me manques|mi manchi
phrase|other|look at me|看我|mírame|regarde-moi|guardami
phrase|other|keep me posted|隨時讓我知道|mantenme al tanto|tiens-moi au courant|tienimi aggiornato
other|other|both|兩者都|ambos;ambas|les deux|entrambi;entrambe
other|other|most|大部分|la mayoría|la plupart|la maggior parte
other|other|none|一個也沒有|ninguno;ninguna|aucun;aucune|nessuno;nessuna
other|other|any|任何|cualquier|n'importe quel;n'importe quelle|qualsiasi
other|other|such|這樣的|tal|tel;telle|tale
phrase|other|each other|互相|el uno al otro|l'un l'autre|a vicenda
other|other|anyone|任何人|cualquiera|n'importe qui|chiunque
other|other|anything|任何東西|cualquier cosa|n'importe quoi|qualsiasi cosa
other|other|anywhere|任何地方|en cualquier lugar|n'importe où|ovunque
other|other|nowhere|哪裡都沒有|en ninguna parte|nulle part|da nessuna parte
other|other|twice|兩次|dos veces|deux fois|due volte
phrase|other|a bit of|一些|un poco de|un peu de|un po' di
noun|other|percentage|百分比|porcentaje|pourcentage|percentuale
noun|other|amount|數量|cantidad|quantité|quantità
noun|other|average|平均|promedio;media|moyenne|media
noun|other|maximum|最大值|máximo|maximum|massimo
noun|other|minimum|最小值|mínimo|minimum|minimo
noun|other|quarter|四分之一|cuarto|quart|quarto
noun|other|pair|一對|par|paire|paio
verb|actions|consider|考慮|considerar|considérer|considerare
verb|actions|attract|吸引|atraer|attirer|attrarre
verb|actions|assume|假設|suponer|supposer|supporre
verb|actions|achieve|達成|lograr|atteindre|raggiungere
verb|actions|deserve|應得|merecer|mériter|meritare
verb|actions|detect|偵測|detectar|détecter|rilevare
verb|actions|increase|增加|aumentar|augmenter|aumentare
verb|actions|reduce|降低|reducir|réduire|ridurre
verb|actions|decrease|減少|disminuir|diminuer|diminuire
verb|actions|reveal|透露|revelar|révéler|rivelare
verb|actions|prevent|防止|prevenir|empêcher|prevenire
verb|actions|replace|取代|reemplazar|remplacer|sostituire
verb|actions|identify|辨識|identificar|identifier|identificare
verb|actions|affect|影響|afectar|affecter|influenzare
verb|actions|appreciate|欣賞|apreciar|apprécier|apprezzare
verb|actions|arrange|安排|organizar|organiser|organizzare
verb|actions|attend|出席|asistir a|assister à|partecipare a
verb|actions|belong|屬於|pertenecer|appartenir|appartenere
verb|actions|cause|造成|causar|causer|causare
verb|actions|combine|結合|combinar|combiner|combinare
verb|actions|connect|連接|conectar|connecter|collegare
verb|actions|contain|含有|contener|contenir|contenere
verb|actions|convince|說服|convencer|convaincre|convincere
verb|actions|cover|覆蓋|cubrir|couvrir|coprire
verb|actions|depend|取決於|depender|dépendre|dipendere
verb|actions|deliver|送達|entregar|livrer|consegnare
verb|actions|develop|發展|desarrollar|développer|sviluppare
verb|actions|disturb|打擾|molestar|déranger|disturbare
verb|actions|doubt|懷疑|dudar|douter|dubitare
verb|actions|encourage|鼓勵|animar|encourager|incoraggiare
verb|actions|ensure|確保|garantizar|garantir|garantire
verb|actions|make sure|確認|asegurarse|s'assurer|assicurarsi
verb|actions|expect|預期|esperar|s'attendre à|aspettarsi
verb|actions|express|表達|expresar|exprimer|esprimere
verb|actions|focus|專注|concentrarse|se concentrer|concentrarsi
verb|actions|handle|處理|manejar|gérer|gestire
verb|actions|ignore|忽略|ignorar|ignorer|ignorare
verb|actions|insist|堅持|insistir|insister|insistere
verb|actions|own|擁有|poseer|posséder|possedere
verb|actions|pretend|假裝|fingir|faire semblant|fingere
verb|actions|produce|生產|producir|produire|produrre
verb|actions|provide|提供|proporcionar|fournir|fornire
verb|actions|separate|分開|separar|séparer|separare
verb|actions|survive|存活|sobrevivir|survivre|sopravvivere
verb|actions|treat|對待|tratar|traiter|trattare
verb|actions|wonder|想知道|preguntarse|se demander|chiedersi
verb|actions|overcome|克服|superar|surmonter|superare
verb|actions|afford|負擔得起|permitirse|se permettre|permettersi
verb|actions|prove|證明|demostrar|prouver|dimostrare
verb|actions|admit|承認|admitir|admettre|ammettere
verb|actions|remove|移除|quitar|enlever|rimuovere
verb|actions|escape|逃脫|escapar|s'échapper|scappare
verb|actions|exceed|超過|exceder|dépasser|superare
verb|actions|mislead|誤導|inducir a error|induire en erreur|fuorviare
verb|actions|neglect|忽視|descuidar|négliger|trascurare
verb|actions|manipulate|操縱|manipular|manipuler|manipolare
verb|actions|prioritize|優先考慮|priorizar|prioriser|dare priorità
verb|actions|retrieve|取回|recuperar|récupérer|recuperare
verb|actions|strive|努力|esforzarse|s'efforcer|sforzarsi
verb|actions|tackle|應對|abordar|s'attaquer à|affrontare
verb|actions|unfold|展開|desarrollarse|se dérouler|svolgersi
verb|actions|coordinate|協調|coordinar|coordonner|coordinare
verb|actions|reverse|逆轉|invertir|inverser|invertire
verb|actions|spread|擴散|propagarse|se propager|diffondersi
verb|actions|give up|放棄|rendirse|abandonner|arrendersi
verb|actions|look forward to|期待|esperar con ansias;esperar con ilusión|avoir hâte de|non vedere l'ora di
verb|actions|get used to|習慣|acostumbrarse|s'habituer|abituarsi
verb|actions|hurry up|趕快|darse prisa;apurarse|se dépêcher|sbrigarsi
verb|actions|take place|舉行|tener lugar|avoir lieu|avere luogo
verb|actions|run out of|用完|quedarse sin|être à court de|rimanere senza
verb|actions|keep in touch|保持聯絡|mantenerse en contacto|rester en contact|restare in contatto
verb|actions|take the initiative|採取主動|tomar la iniciativa|prendre l'initiative|prendere l'iniziativa
verb|actions|go all out|全力以赴|darlo todo|tout donner|dare tutto
verb|actions|pick up|撿起來|recoger|ramasser|raccogliere
adjective|other|accurate|準確|preciso;precisa|précis;précise|accurato;accurata
adjective|other|enormous|龐大|enorme|énorme|enorme
adjective|other|critical|關鍵|crítico;crítica|critique|critico;critica
adjective|other|obvious|明顯|obvio;obvia|évident;évidente|ovvio;ovvia
adjective|other|unusual|不尋常|inusual|inhabituel;inhabituelle|insolito;insolita
adjective|other|available|可用|disponible|disponible|disponibile
adjective|other|essential|不可或缺|esencial|essentiel;essentielle|essenziale
adjective|other|excessive|過度|excesivo;excesiva|excessif;excessive|eccessivo;eccessiva
adjective|other|exclusive|專屬|exclusivo;exclusiva|exclusif;exclusive|esclusivo;esclusiva
adjective|other|extensive|廣泛|extenso;extensa|étendu;étendue|esteso;estesa
adjective|other|instant|即時|instantáneo;instantánea|instantané;instantanée|istantaneo;istantanea
adjective|other|intense|強烈|intenso;intensa|intense|intenso;intensa
adjective|other|relevant|相關|relevante|pertinent;pertinente|rilevante
adjective|other|severe|嚴重|grave|grave|grave
adjective|other|successful|成功|exitoso;exitosa|réussi;réussie|riuscito;riuscita
adjective|other|temporary|暫時|temporal|temporaire|temporaneo;temporanea
adjective|other|positive|正面|positivo;positiva|positif;positive|positivo;positiva
adjective|other|compatible|相容|compatible|compatible|compatibile
adjective|other|inevitable|不可避免|inevitable|inévitable|inevitabile
adjective|other|preliminary|初步|preliminar|préliminaire|preliminare
adjective|other|deliberate|故意|deliberado;deliberada|délibéré;délibérée|deliberato;deliberata
adjective|other|urgent|緊急|urgente|urgent;urgente|urgente
adjective|other|harmless|無害|inofensivo;inofensiva|inoffensif;inoffensive|innocuo;innocua
adjective|other|lasting|持久|duradero;duradera|durable|duraturo;duratura
adjective|other|accidental|意外|accidental|accidentel;accidentelle|accidentale
adjective|other|professional|專業|profesional|professionnel;professionnelle|professionale
adjective|other|fundamental|根本|fundamental|fondamental;fondamentale|fondamentale
noun|other|thing|東西|cosa|chose|cosa
noun|other|way|方式|manera|façon|modo
noun|other|purpose|目的|propósito|but|scopo
noun|other|condition|條件|condición|condition|condizione
noun|other|factor|因素|factor|facteur|fattore
noun|other|effect|效果|efecto|effet|effetto
noun|other|attitude|態度|actitud|attitude|atteggiamento
noun|other|challenge|挑戰|desafío;reto|défi|sfida
noun|other|circumstance|情況;情形|circunstancia|circonstance|circostanza
noun|other|connection|關聯|conexión|lien|connessione
noun|other|consequence|後果|consecuencia|conséquence|conseguenza
noun|other|detail|細節|detalle|détail|dettaglio
noun|other|function|功能|función|fonction|funzione
noun|other|priority|優先事項|prioridad|priorité|priorità
noun|other|phenomenon|現象|fenómeno|phénomène|fenomeno
noun|other|barrier|障礙|barrera|barrière|barriera
noun|other|obstacle|阻礙|obstáculo|obstacle|ostacolo
noun|other|alternative|替代方案|alternativa|alternative|alternativa
noun|other|approach|做法|enfoque|approche|approccio
noun|other|technique|技巧|técnica|technique|tecnica
noun|other|benefit|好處|beneficio|avantage|beneficio
noun|other|risk|風險|riesgo|risque|rischio
noun|other|role|角色|papel;rol|rôle|ruolo
noun|other|source|來源|fuente|source|fonte
noun|other|scene|場景|escena|scène|scena
noun|other|mystery|謎團|misterio|mystère|mistero
noun|other|origin|起源|origen|origine|origine
noun|other|efficiency|效率|eficiencia|efficacité|efficienza
noun|other|routine|例行公事|rutina|routine|routine
noun|other|to-do list|待辦事項|lista de tareas|liste de tâches|lista di cose da fare
noun|other|survey|問卷調查|encuesta|enquête|sondaggio
noun|other|rhythm|節奏|ritmo|rythme|ritmo
noun|other|spirit|精神|espíritu|esprit|spirito
noun|other|discipline|紀律|disciplina|discipline|disciplina
noun|other|clue|線索|pista|indice|indizio
noun|other|guideline|指引|directriz|directive|linea guida
noun|other|preposition|介系詞;介詞|preposición|préposition|preposizione
noun|other|note|筆記|nota|note|nota
noun|other|assumption|假設|suposición|supposition|supposizione
noun|other|component|元件|componente|composant|componente
noun|people|employer|雇主|empleador;empleadora|employeur|datore di lavoro;datrice di lavoro
noun|other|career|職涯|carrera profesional;carrera|carrière|carriera
noun|other|profession|職業|profesión|profession|professione
noun|other|unemployment|失業|desempleo;paro|chômage|disoccupazione
noun|other|promotion|升遷;升職|ascenso|promotion|promozione
noun|other|bonus|獎金|bono;bonificación|prime;bonus|bonus
noun|other|wage|工資;薪資|salario;sueldo|salaire|paga;salario
noun|other|minimum wage|最低工資;基本工資|salario mínimo|salaire minimum|salario minimo
noun|other|overtime|加班|horas extra;horas extras|heures supplémentaires|straordinario
phrase|other|work overtime|加班|hacer horas extra|faire des heures supplémentaires|fare gli straordinari
adjective|other|full-time|全職|a tiempo completo|à temps plein|a tempo pieno
adjective|other|part-time|兼職|a tiempo parcial|à temps partiel|part-time;a tempo parziale
verb|actions|hire|僱用;雇用|contratar|embaucher|assumere
verb|actions|recruit|招募|reclutar|recruter|reclutare
verb|actions|lay off|裁員|despedir|licencier|licenziare
phrase|other|get fired|被解僱;被開除|ser despedido;ser despedida|être licencié;être licenciée|essere licenziato;essere licenziata
noun|other|job opening|職缺|oferta de empleo;vacante|offre d'emploi|offerta di lavoro
noun|other|job interview|面試|entrevista de trabajo|entretien d'embauche|colloquio di lavoro
noun|other|cover letter|求職信|carta de presentación|lettre de motivation|lettera di presentazione
phrase|other|apply for a job|應徵工作|solicitar un empleo|postuler à un emploi|candidarsi per un posto
noun|other|work experience|工作經驗|experiencia laboral|expérience professionnelle|esperienza lavorativa
noun|other|workplace|職場|lugar de trabajo|lieu de travail|luogo di lavoro
noun|other|working hours|工作時間;工時|horario laboral;horario de trabajo|horaires de travail;heures de travail|orario di lavoro
noun|other|day off|休假|día libre|jour de congé|giorno libero
noun|other|sick leave|病假|baja por enfermedad;baja médica|congé maladie|congedo per malattia
noun|other|maternity leave|產假|baja por maternidad;licencia por maternidad|congé maternité|congedo di maternità
noun|other|lunch break|午休|pausa para comer;pausa del almuerzo|pause déjeuner|pausa pranzo
noun|other|night shift|夜班|turno de noche|équipe de nuit|turno di notte
noun|other|commute|通勤|trayecto al trabajo;desplazamiento al trabajo|trajet domicile-travail|tragitto casa-lavoro
phrase|other|work from home|在家工作|trabajar desde casa|télétravailler|lavorare da casa
noun|other|remote work|遠距工作|teletrabajo|télétravail|smart working;lavoro da remoto
noun|other|training|培訓|formación;capacitación|formation|formazione
noun|people|intern|實習生|becario;becaria;pasante|stagiaire|stagista;tirocinante
noun|people|apprentice|學徒|aprendiz;aprendiza|apprenti;apprentie|apprendista
noun|people|freelancer|自由工作者|autónomo;autónoma;freelance|indépendant;indépendante;freelance|libero professionista;libera professionista;freelance
noun|people|consultant|顧問|consultor;consultora|consultant;consultante|consulente
noun|people|assistant|助理|asistente|assistant;assistante|assistente
noun|people|expert|專家|experto;experta|expert;experte|esperto;esperta
noun|people|entrepreneur|創業家;企業家|emprendedor;emprendedora|entrepreneur;entrepreneuse|imprenditore;imprenditrice
noun|people|contractor|承包商|contratista|entrepreneur|appaltatore;appaltatrice
noun|people|supplier|供應商|proveedor;proveedora|fournisseur|fornitore;fornitrice
noun|people|investor|投資人;投資者|inversor;inversora;inversionista|investisseur;investisseuse|investitore;investitrice
noun|people|shareholder|股東|accionista|actionnaire|azionista
noun|people|founder|創辦人|fundador;fundadora|fondateur;fondatrice|fondatore;fondatrice
noun|people|buyer|買家|comprador;compradora|acheteur;acheteuse|compratore;compratrice;acquirente
noun|people|seller|賣家|vendedor;vendedora|vendeur;vendeuse|venditore;venditrice
noun|people|competitor|競爭對手|competidor;competidora|concurrent;concurrente|concorrente
noun|people|consumer|消費者|consumidor;consumidora|consommateur;consommatrice|consumatore;consumatrice
noun|other|profit|利潤|beneficio;ganancia|bénéfice|profitto;utile
noun|other|loss|虧損|pérdida|perte|perdita
noun|other|investment|投資|inversión|investissement|investimento
verb|actions|invest|投資|invertir|investir|investire
noun|other|stock market|股市|bolsa de valores;bolsa|bourse|borsa
noun|other|fund|基金|fondo|fonds|fondo
noun|other|bankruptcy|破產|quiebra;bancarrota|faillite|fallimento
noun|other|turnover|營業額|facturación|chiffre d'affaires|fatturato
noun|other|earnings|收益|ganancias|revenus;gains|guadagni
noun|other|market share|市佔率;市占率|cuota de mercado|part de marché|quota di mercato
noun|other|growth|成長|crecimiento|croissance|crescita
noun|other|recession|經濟衰退|recesión|récession|recessione
noun|other|inflation|通貨膨脹;通膨|inflación|inflation|inflazione
noun|other|deficit|赤字|déficit|déficit|deficit
noun|other|surplus|盈餘;剩餘|excedente;superávit|excédent|eccedenza;surplus
noun|other|demand|需求|demanda|demande|domanda
phrase|other|supply and demand|供需|oferta y demanda|offre et demande|domanda e offerta
noun|other|monopoly|壟斷|monopolio|monopole|monopolio
noun|other|trade|貿易|comercio|commerce|commercio
noun|other|export|出口|exportación|exportation;export|esportazione;export
noun|other|import|進口|importación|importation;import|importazione;import
noun|other|tariff|關稅|arancel|droit de douane|dazio
noun|other|industry|產業|industria|industrie|industria
adjective|other|economic|經濟的|económico;económica|économique|economico;economica
adjective|other|financial|財務的|financiero;financiera|financier;financière|finanziario;finanziaria
noun|other|wealth|財富|riqueza|richesse|ricchezza
noun|other|cost of living|生活成本|costo de vida;coste de la vida|coût de la vie|costo della vita
noun|other|price increase|漲價|subida de precios;aumento de precios|hausse des prix|aumento dei prezzi
noun|other|cost|成本|costo;coste|coût|costo
noun|other|fee|費用|tarifa;cuota|frais|tariffa;quota
noun|other|value|價值|valor|valeur|valore
noun|other|total|總額;總計|total|total|totale
noun|other|balance|餘額|saldo|solde|saldo
noun|other|bank statement|銀行對帳單|extracto bancario|relevé bancaire|estratto conto
noun|other|account number|帳號|número de cuenta|numéro de compte|numero di conto
noun|other|bank transfer|轉帳;匯款|transferencia bancaria|virement bancaire|bonifico bancario
noun|other|savings account|儲蓄帳戶|cuenta de ahorros;cuenta de ahorro|compte d'épargne|conto di risparmio
noun|other|current account|活期帳戶|cuenta corriente|compte courant|conto corrente
noun|objects|debit card|金融卡;簽帳金融卡|tarjeta de débito|carte de débit|carta di debito
noun|objects|cheque|支票|cheque|chèque|assegno
verb|actions|deposit|存錢|depositar;ingresar|déposer|versare;depositare
verb|actions|withdraw|領錢;提款|retirar|retirer|prelevare
noun|other|security deposit|押金|fianza;depósito|caution;dépôt de garantie|cauzione
noun|other|mortgage|房貸|hipoteca|prêt immobilier|mutuo
noun|other|insurance|保險|seguro|assurance|assicurazione
noun|other|pension|退休金|pensión;jubilación|retraite|pensione
noun|other|income tax|所得稅|impuesto sobre la renta|impôt sur le revenu|imposta sul reddito
noun|other|tax return|報稅|declaración de impuestos;declaración de la renta|déclaration d'impôts;déclaration de revenus|dichiarazione dei redditi
noun|other|invoice|發票|factura|facture|fattura
noun|other|payslip;pay slip|薪資單|nómina|fiche de paie|busta paga
noun|other|price quote|報價|presupuesto|devis|preventivo
noun|other|agreement|協議|acuerdo|accord|accordo
noun|other|clause|條款|cláusula|clause|clausola
noun|other|lease|租約|contrato de alquiler|bail|contratto d'affitto
noun|people|tenant|房客|inquilino;inquilina|locataire|inquilino;inquilina
phrase|other|on sale|特價|en oferta|en promotion|in offerta
noun|other|bargain|便宜貨|ganga|bonne affaire|affare
verb|actions|haggle|討價還價|regatear|marchander|contrattare
adjective|other|affordable|平價的|asequible|abordable|accessibile
adjective|other|second-hand|二手的|de segunda mano|d'occasion|usato;usata;di seconda mano
noun|other|luxury|奢華|lujo|luxe|lusso
noun|objects|loyalty card|會員卡|tarjeta de fidelidad;tarjeta de cliente|carte de fidélité|carta fedeltà
noun|objects|gift card|禮券;禮物卡|tarjeta de regalo|carte cadeau|buono regalo
noun|other|subscription|訂閱|suscripción|abonnement|abbonamento
noun|other|warranty|保固|garantía|garantie|garanzia
noun|other|complaint|投訴|queja;reclamación|réclamation|reclamo;lamentela
noun|other|customer service|客服|atención al cliente;servicio al cliente|service client|assistenza clienti;servizio clienti
noun|other|advertisement|廣告|anuncio;publicidad|publicité;pub|pubblicità;annuncio
noun|other|marketing|行銷|marketing;mercadotecnia|marketing|marketing
noun|objects|chain store|連鎖店|cadena de tiendas|chaîne de magasins|catena di negozi
noun|objects|grocery store|雜貨店|tienda de abarrotes;tienda de comestibles;tienda de alimentación|épicerie|negozio di alimentari
noun|objects|hardware store|五金行|ferretería|quincaillerie|ferramenta
noun|objects|shoe store|鞋店|zapatería|magasin de chaussures|negozio di scarpe
noun|objects|paper bag|紙袋|bolsa de papel|sac en papier|sacchetto di carta
noun|objects|stationery|文具|papelería|papeterie|cancelleria
noun|objects|stapler|釘書機;訂書機|grapadora;engrapadora|agrafeuse|cucitrice;pinzatrice
noun|objects|paperclip|迴紋針|clip;sujetapapeles|trombone|graffetta;fermaglio
noun|objects|calculator|計算機|calculadora|calculatrice|calcolatrice
noun|objects|photocopier|影印機|fotocopiadora|photocopieuse|fotocopiatrice
noun|objects|sticky note|便利貼|nota adhesiva;post-it|post-it|post-it
noun|objects|business card|名片|tarjeta de visita;tarjeta de presentación|carte de visite|biglietto da visita
noun|other|email address|電子郵件地址;電子信箱|dirección de correo electrónico;dirección de email|adresse e-mail;adresse mail|indirizzo email;indirizzo e-mail
noun|other|attachment|附件|archivo adjunto;adjunto|pièce jointe|allegato
noun|other|inbox|收件匣|bandeja de entrada|boîte de réception|posta in arrivo
verb|actions|attach|附上|adjuntar|joindre|allegare
verb|actions|forward|轉寄|reenviar|transférer|inoltrare
noun|people|sender|寄件人;寄件者|remitente|expéditeur;expéditrice|mittente
noun|people|recipient|收件人;收件者|destinatario;destinataria|destinataire|destinatario;destinataria
noun|other|signature|簽名|firma|signature|firma
noun|other|voicemail|語音信箱|buzón de voz|messagerie vocale|segreteria telefonica
noun|other|form|表格|formulario|formulaire|modulo
noun|objects|spreadsheet|試算表|hoja de cálculo|tableur;feuille de calcul|foglio di calcolo
noun|other|chart|圖表|gráfico;gráfica|graphique|grafico
noun|objects|catalog;catalogue|型錄|catálogo|catalogue|catalogo
phrase|other|free shipping|免運費|envío gratuito;envío gratis|livraison gratuite|spedizione gratuita
noun|other|shipping cost|運費|gastos de envío|frais de livraison;frais de port|spese di spedizione
phrase|other|in stock|有現貨|en stock;disponible|en stock|disponibile
phrase|other|out of stock|缺貨|agotado|en rupture de stock|esaurito
noun|other|original price|原價|precio original|prix d'origine;prix initial|prezzo originale
phrase|other|cash only|只收現金|solo efectivo|uniquement en espèces|solo contanti
phrase|other|pay in cash|付現|pagar en efectivo|payer en espèces|pagare in contanti
phrase|other|pay by card|刷卡|pagar con tarjeta|payer par carte|pagare con la carta
phrase|other|keep the change|不用找了|quédese con el cambio|gardez la monnaie|tenga il resto
noun|other|pocket money|零用錢|dinero de bolsillo;paga;mesada|argent de poche|paghetta
noun|other|cryptocurrency|加密貨幣|criptomoneda|cryptomonnaie|criptovaluta
noun|other|foreign currency|外幣|moneda extranjera;divisa|devise étrangère|valuta estera;valuta straniera
noun|other|yen|日圓;日幣|yen|yen|yen
noun|other|pound sterling|英鎊|libra esterlina|livre sterling|sterlina
noun|other|cent|美分|centavo;céntimo|cent;centime|cent;centesimo
noun|other|online banking|網路銀行|banca en línea;banca online|banque en ligne|banca online;home banking
verb|actions|waste|浪費|desperdiciar;malgastar|gaspiller|sprecare
verb|actions|owe|欠|deber|devoir|dovere
verb|actions|pay back|還錢|devolver|rembourser|restituire
noun|people|sponsor|贊助商|patrocinador;patrocinadora|sponsor|sponsor
noun|other|auction|拍賣|subasta|vente aux enchères|asta
noun|people|bidder|競標者;出價者|postor;postora|enchérisseur;enchérisseuse|offerente
noun|other|consultancy|顧問公司;顧問服務|consultoría|consultance;conseil|consulenza
noun|other|franchise|加盟店|franquicia|franchise|franchising;franchise
adjective|other|frugal|節儉的|frugal|frugal;frugale|frugale
noun|other|windfall|意外之財|ganancia inesperada|aubaine|guadagno inaspettato
noun|other|labor;labour|勞動力|mano de obra|main-d'œuvre|manodopera
noun|other|startup|新創公司|startup;empresa emergente|start-up|startup
noun|other|small business|小型企業|pequeña empresa|petite entreprise|piccola impresa
noun|people|shopkeeper|店主|tendero;tendera|commerçant;commerçante|negoziante
noun|people|street vendor|攤販|vendedor ambulante;vendedora ambulante|vendeur ambulant;vendeuse ambulante|venditore ambulante;venditrice ambulante
noun|people|banker|銀行家|banquero;banquera|banquier;banquière|banchiere;banchiera
noun|people|economist|經濟學家|economista|économiste|economista
noun|people|analyst|分析師|analista|analyste|analista
noun|people|technician|技術人員;技師|técnico;técnica|technicien;technicienne|tecnico;tecnica
noun|people|electrician|電工|electricista|électricien;électricienne|elettricista
noun|people|plumber|水電工;水管工|fontanero;plomero|plombier|idraulico
noun|people|carpenter|木工|carpintero;carpintera|menuisier;menuisière|falegname
noun|people|construction worker|建築工人|obrero de la construcción|ouvrier du bâtiment|operaio edile
noun|people|business partner|合夥人|socio;socia|associé;associée|socio;socia
noun|people|staff|工作人員|personal|personnel|personale
noun|other|headquarters|總部|sede central;sede|siège;siège social|sede centrale;sede
noun|other|branch office|分公司|sucursal|succursale|filiale
noun|other|department|部門|departamento|service;département|reparto;dipartimento
noun|other|human resources|人力資源;人資|recursos humanos|ressources humaines|risorse umane
noun|other|accounting|會計|contabilidad|comptabilité|contabilità
noun|objects|meeting room|會議室|sala de reuniones|salle de réunion|sala riunioni
noun|other|conference|研討會|conferencia;congreso|conférence|conferenza;convegno
noun|other|agenda|議程|orden del día|ordre du jour|ordine del giorno
noun|other|task|任務|tarea|tâche|compito
noun|other|target|目標|objetivo|objectif|obiettivo
noun|other|workload|工作量|carga de trabajo|charge de travail|carico di lavoro
noun|other|teamwork|團隊合作|trabajo en equipo|travail d'équipe|lavoro di squadra
noun|other|productivity|生產力|productividad|productivité|produttività
verb|actions|postpone|延後;延期|aplazar;posponer|reporter|rimandare;rinviare
verb|actions|approve|批准;核准|aprobar|approuver|approvare
verb|actions|hand in|繳交|entregar|remettre|consegnare
verb|actions|fill in|填寫|rellenar;llenar|remplir|compilare
verb|actions|launch|推出|lanzar|lancer|lanciare
verb|actions|manage|管理|gestionar;administrar|gérer|gestire
noun|other|management|管理|gestión;administración|gestion|gestione
noun|other|production|生產|producción|production|produzione
noun|objects|equipment|設備|equipo;equipamiento|équipement|attrezzatura
noun|objects|machine|機器|máquina|machine|macchina
noun|objects|goods|商品|mercancía|marchandise|merce
noun|objects|item|物品|artículo|article|articolo
noun|objects|sample|樣品|muestra|échantillon|campione
noun|objects|packaging|包裝|embalaje;empaque|emballage|imballaggio
noun|objects|warehouse|倉庫|almacén|entrepôt|magazzino
noun|objects|inventory|庫存|existencias;inventario|stock;inventaire|scorte;inventario
noun|other|strategy|策略;戰略|estrategia|stratégie|strategia
noun|other|tactic|戰術|táctica|tactique|tattica
noun|other|quantity|數量|cantidad|quantité|quantità
noun|other|service|服務|servicio|service|servizio
noun|other|employment|就業|empleo|emploi|occupazione
adjective|other|unemployed|失業的|desempleado;desempleada|au chômage|disoccupato;disoccupata
noun|objects|construction site|工地|obra|chantier|cantiere
noun|other|proposal|提案|propuesta|proposition|proposta
noun|other|online meeting|線上會議|reunión en línea;reunión virtual|réunion en ligne|riunione online
noun|other|retail|零售|venta minorista;comercio minorista|vente au détail;commerce de détail|vendita al dettaglio
noun|other|wholesale|批發|venta mayorista;venta al por mayor|vente en gros|vendita all'ingrosso
noun|other|pay raise|加薪|aumento de sueldo;aumento de salario|augmentation de salaire|aumento di stipendio
noun|other|monthly salary|月薪|sueldo mensual|salaire mensuel|stipendio mensile
noun|other|hourly wage|時薪|salario por hora|salaire horaire|paga oraria
noun|other|working day|工作日|día laborable;día hábil|jour ouvrable;jour ouvré|giorno lavorativo
noun|objects|office supplies|辦公用品|material de oficina|fournitures de bureau|articoli per ufficio
noun|other|payment method|付款方式|método de pago;forma de pago|mode de paiement|metodo di pagamento
noun|other|installment;instalment|分期付款|cuota;plazo|versement|rata
noun|other|price range|價位|rango de precios;gama de precios|gamme de prix|fascia di prezzo
noun|other|promo code;discount code|優惠碼|código promocional;código de descuento|code promo|codice sconto
noun|other|supply chain|供應鏈|cadena de suministro|chaîne d'approvisionnement|catena di approvvigionamento
noun|objects|raw material|原料;原物料|materia prima|matière première|materia prima
noun|objects|assembly line|生產線;裝配線|línea de ensamblaje;cadena de montaje|chaîne de montage|catena di montaggio
noun|people|manufacturer|製造商|fabricante|fabricant|produttore
noun|other|dividend|股息;股利|dividendo|dividende|dividendo
noun|other|cash flow|現金流|flujo de caja|flux de trésorerie|flusso di cassa
adjective|other|commercial|商業的|comercial|commercial;commerciale|commerciale
adjective|other|industrial|工業的|industrial|industriel;industrielle|industriale
adjective|other|competitive|有競爭力的|competitivo;competitiva|compétitif;compétitive|competitivo;competitiva
adjective|other|profitable|賺錢的;有利可圖的|rentable|rentable|redditizio;redditizia
adjective|other|punctual|準時的|puntual|ponctuel;ponctuelle|puntuale
adjective|other|reliable|可靠的|fiable;confiable|fiable|affidabile
adjective|other|valuable|貴重的;有價值的|valioso;valiosa|précieux;précieuse|prezioso;preziosa
noun|objects|briefcase|公事包|maletín|mallette|valigetta;ventiquattrore
noun|objects|badge|識別證|credencial;tarjeta de identificación|badge|badge;tesserino
noun|objects|office chair|辦公椅|silla de oficina|chaise de bureau|sedia da ufficio
noun|objects|counter|櫃檯;櫃台|mostrador|comptoir|bancone
adjective|other|proactive|主動的|proactivo;proactiva|proactif;proactive|proattivo;proattiva
noun|other|purchase|購買|compra|achat|acquisto
noun|other|e-commerce|電子商務;電商|comercio electrónico|commerce électronique;e-commerce|e-commerce;commercio elettronico
noun|other|payday|發薪日|día de pago;día de cobro|jour de paie|giorno di paga
noun|people|president|總統|presidente;presidenta|président;présidente|presidente
noun|other|election|選舉|elección|élection|elezione
verb|actions|vote|投票|votar|voter|votare
noun|people|police|警察|policía|police|polizia
noun|other|crime|犯罪|delito|crime|reato
noun|other|crisis|危機|crisis|crise|crisi
noun|other|policy|政策|política|politique|politica
noun|people|minister|部長|ministro;ministra|ministre|ministro;ministra
noun|people|prime minister|首相;總理|primer ministro;primera ministra|premier ministre;première ministre|primo ministro
noun|other|army|軍隊|ejército|armée|esercito
noun|other|court|法院|tribunal|tribunal|tribunale
noun|people|citizen|公民|ciudadano;ciudadana|citoyen;citoyenne|cittadino;cittadina
noun|other|democracy|民主|democracia|démocratie|democrazia
noun|people|politician|政治人物|político;política|homme politique;femme politique|politico;politica
adjective|other|political|政治的|político;política|politique|politico;politica
noun|other|political party|政黨|partido político|parti politique|partito politico
noun|other|parliament|國會|parlamento|parlement|parlamento
noun|people|candidate|候選人|candidato;candidata|candidat;candidate|candidato;candidata
noun|people|voter|選民|votante|électeur;électrice|elettore;elettrice
noun|other|campaign|競選活動|campaña|campagne|campagna
verb|actions|protest|抗議|protestar|protester|protestare
noun|other|demonstration|示威|manifestación|manifestation|manifestazione
noun|people|protester|抗議者|manifestante|manifestant;manifestante|manifestante
noun|other|conflict|衝突|conflicto|conflit|conflitto
noun|other|attack|攻擊|ataque|attaque|attacco
noun|objects|weapon|武器|arma|arme|arma
noun|objects|gun|槍|pistola|pistolet|pistola
noun|objects|bomb|炸彈|bomba|bombe|bomba
noun|other|explosion|爆炸|explosión|explosion|esplosione
noun|other|violence|暴力|violencia|violence|violenza
adjective|other|violent|暴力的|violento;violenta|violent;violente|violento;violenta
noun|people|victim|受害者|víctima|victime|vittima
noun|people|suspect|嫌犯|sospechoso;sospechosa|suspect;suspecte|sospettato;sospettata
verb|actions|arrest|逮捕|detener|arrêter|arrestare
noun|objects|prison|監獄|cárcel|prison|prigione
noun|people|prisoner|囚犯|preso;presa|détenu;détenue|detenuto;detenuta
noun|people|criminal|罪犯|delincuente|criminel;criminelle|criminale
noun|people|thief|小偷|ladrón;ladrona|voleur;voleuse|ladro;ladra
noun|other|murder|謀殺|asesinato|meurtre|omicidio
noun|people|murderer|殺人犯|asesino;asesina|meurtrier;meurtrière|assassino;assassina
noun|other|theft|竊盜|robo|vol|furto
noun|other|robbery|搶劫|atraco;asalto|braquage|rapina
verb|actions|investigate|調查|investigar|enquêter|indagare
noun|other|investigation|調查|investigación|enquête|indagine
noun|other|evidence|證據|prueba|preuve|prova
noun|people|witness|證人|testigo|témoin|testimone
noun|other|trial|審判|juicio|procès|processo
noun|other|verdict|判決|veredicto|verdict|verdetto
adjective|other|guilty|有罪的|culpable|coupable|colpevole
adjective|other|innocent|無辜的|inocente|innocent;innocente|innocente
adjective|other|illegal|違法的;非法的|ilegal|illégal;illégale|illegale
adjective|other|legal|合法的|legal|légal;légale|legale
noun|other|justice|正義|justicia|justice|giustizia
noun|other|human rights|人權|derechos humanos|droits de l'homme|diritti umani
noun|other|equality|平等|igualdad|égalité|uguaglianza
noun|other|discrimination|歧視|discriminación|discrimination|discriminazione
noun|other|racism|種族歧視|racismo|racisme|razzismo
noun|other|poverty|貧窮|pobreza|pauvreté|povertà
noun|other|inequality|不平等|desigualdad|inégalité|disuguaglianza
noun|other|population|人口|población|population|popolazione
noun|other|community|社區|comunidad|communauté|comunità
adjective|other|social|社會的|social|social;sociale|sociale
noun|other|issue|議題|cuestión|question|questione
noun|other|impact|影響|impacto|impact|impatto
noun|other|decline|下降|descenso|baisse|calo
noun|other|threat|威脅|amenaza|menace|minaccia
verb|actions|threaten|威脅|amenazar|menacer|minacciare
noun|other|warning|警告|advertencia|avertissement|avvertimento
verb|actions|warn|警告|advertir|avertir|avvertire
noun|other|alert|警報|alerta|alerte|allerta
noun|other|controversy|爭議|polémica|controverse|controversia
adjective|other|controversial|有爭議的|polémico;polémica|controversé;controversée|controverso;controversa
noun|other|scandal|醜聞|escándalo|scandale|scandalo
noun|other|debate|辯論|debate|débat|dibattito
noun|other|criticism|批評|crítica|critique|critica
verb|actions|criticize;criticise|批評|criticar|critiquer|criticare
noun|other|tragedy|悲劇|tragedia|tragédie|tragedia
noun|other|disaster|災難|desastre|catastrophe|disastro
noun|other|natural disaster|天然災害|desastre natural|catastrophe naturelle|calamità naturale
noun|other|flood|水災|inundación|inondation|alluvione
noun|other|drought|乾旱|sequía|sécheresse|siccità
noun|other|wildfire|野火|incendio forestal|incendie de forêt|incendio boschivo
noun|other|tsunami|海嘯|tsunami|tsunami|tsunami
noun|other|landslide|山崩|deslizamiento de tierra|glissement de terrain|frana
noun|other|aftershock|餘震|réplica|réplique|scossa di assestamento
noun|other|emergency|緊急情況|emergencia|urgence|emergenza
verb|actions|evacuate|撤離|evacuar|évacuer|evacuare
noun|other|evacuation|撤離|evacuación|évacuation|evacuazione
verb|actions|rescue|救援|rescatar|secourir|soccorrere
noun|objects|shelter|避難所|refugio|abri|rifugio
noun|people|survivor|倖存者|sobreviviente;superviviente|survivant;survivante|sopravvissuto;sopravvissuta
noun|other|death toll|死亡人數|número de muertos|nombre de morts|numero dei morti
noun|other|fatality|死亡案例|víctima mortal|décès|decesso
noun|other|damage|損害|daño|dégât|danno
verb|actions|destroy|摧毀|destruir|détruire|distruggere
noun|other|destruction|破壞|destrucción|destruction|distruzione
adjective|other|missing|失蹤的|desaparecido;desaparecida|disparu;disparue|disperso;dispersa
noun|other|disappearance|失蹤|desaparición|disparition|scomparsa
noun|other|accident|意外|accidente|accident|incidente
noun|other|collision|碰撞|colisión|collision|collisione
noun|other|plane crash|墜機|accidente aéreo|accident d'avion|incidente aereo
noun|other|pollution|汙染;污染|contaminación|pollution|inquinamento
verb|actions|pollute|汙染;污染|contaminar|polluer|inquinare
noun|other|climate change|氣候變遷|cambio climático|changement climatique|cambiamento climatico
noun|other|global warming|全球暖化|calentamiento global|réchauffement climatique|riscaldamento globale
noun|other|greenhouse gas|溫室氣體|gas de efecto invernadero|gaz à effet de serre|gas serra
noun|other|emission|排放|emisión|émission|emissione
noun|other|carbon footprint|碳足跡|huella de carbono|empreinte carbone|impronta di carbonio
noun|other|renewable energy|再生能源|energía renovable|énergie renouvelable|energia rinnovabile
noun|other|solar energy|太陽能|energía solar|énergie solaire|energia solare
noun|other|wind power|風力發電|energía eólica|énergie éolienne|energia eolica
noun|other|nuclear power|核能|energía nuclear|énergie nucléaire|energia nucleare
noun|other|fossil fuel|化石燃料|combustible fósil|combustible fossile|combustibile fossile
noun|objects|power plant|發電廠|central eléctrica|centrale électrique|centrale elettrica
noun|other|power outage|停電|apagón|coupure de courant|blackout
noun|other|air pollution|空氣汙染;空氣污染|contaminación del aire|pollution de l'air|inquinamento atmosferico
noun|other|environmental protection|環保|protección del medio ambiente|protection de l'environnement|tutela dell'ambiente
adjective|other|eco-friendly|環保的|ecológico;ecológica|écologique|ecologico;ecologica
adjective|other|sustainable|永續的|sostenible;sustentable|durable|sostenibile
noun|other|sustainability|永續|sostenibilidad|durabilité|sostenibilità
verb|actions|recycle|回收|reciclar|recycler|riciclare
noun|other|deforestation|森林砍伐|deforestación|déforestation|deforestazione
noun|other|extinction|滅絕|extinción|extinction|estinzione
adjective|other|endangered|瀕危的|en peligro de extinción|menacé d'extinction;menacée d'extinction|in via di estinzione
noun|other|conservation|保育|conservación|préservation|tutela
noun|other|sea level|海平面|nivel del mar|niveau de la mer|livello del mare
noun|people|mayor|市長|alcalde;alcaldesa|maire|sindaco;sindaca
noun|people|king|國王|rey|roi|re
noun|people|queen|女王|reina|reine|regina
noun|people|prince|王子|príncipe|prince|principe
noun|people|princess|公主|princesa|princesse|principessa
noun|people|emperor|皇帝|emperador|empereur|imperatore
noun|other|empire|帝國|imperio|empire|impero
noun|other|kingdom|王國|reino|royaume|regno
noun|other|republic|共和國|república|république|repubblica
noun|other|monarchy|君主制|monarquía|monarchie|monarchia
noun|other|royal family|王室|familia real|famille royale|famiglia reale
noun|other|constitution|憲法|constitución|constitution|costituzione
noun|people|leader|領袖|líder|dirigeant;dirigeante|leader
noun|other|power|權力|poder|pouvoir|potere
noun|other|authority|當局|autoridad|autorité|autorità
noun|people|official|官員|funcionario;funcionaria|responsable|funzionario;funzionaria
noun|other|reform|改革|reforma|réforme|riforma
noun|other|regulation|法規|regulación|réglementation|normativa
noun|other|sanction|制裁|sanción|sanction|sanzione
noun|other|treaty|條約|tratado|traité|trattato
noun|other|negotiation|談判|negociación|négociation|negoziato
verb|actions|negotiate|談判|negociar|négocier|negoziare
noun|people|diplomat|外交官|diplomático;diplomática|diplomate|diplomatico;diplomatica
noun|other|diplomacy|外交|diplomacia|diplomatie|diplomazia
noun|people|ambassador|大使|embajador;embajadora|ambassadeur;ambassadrice|ambasciatore;ambasciatrice
noun|other|summit|高峰會|cumbre|sommet|vertice
noun|other|alliance|聯盟|alianza|alliance|alleanza
noun|people|ally|盟友|aliado;aliada|allié;alliée|alleato;alleata
noun|other|independence|獨立|independencia|indépendance|indipendenza
noun|other|sovereignty|主權|soberanía|souveraineté|sovranità
noun|other|territory|領土|territorio|territoire|territorio
noun|other|border|邊境|frontera|frontière|frontiera
noun|objects|strait|海峽|estrecho|détroit|stretto
noun|other|nation|國家|nación|nation|nazione
noun|people|vice president|副總統|vicepresidente;vicepresidenta|vice-président;vice-présidente|vicepresidente
noun|people|refugee|難民|refugiado;refugiada|réfugié;réfugiée|rifugiato;rifugiata
noun|people|immigrant|移民|inmigrante|immigré;immigrée|immigrato;immigrata
noun|other|immigration|移民|inmigración|immigration|immigrazione
noun|other|migration|遷移|migración|migration|migrazione
noun|other|asylum|庇護|asilo|asile|asilo
verb|actions|deport|驅逐出境|deportar|expulser|espellere
noun|other|eviction|驅逐|desalojo;desahucio|expulsion|sfratto
verb|actions|flee|逃離|huir|fuir|fuggire
verb|actions|immigrate|移民|inmigrar|immigrer|immigrare
noun|other|dictatorship|獨裁統治|dictadura|dictature|dittatura
noun|people|dictator|獨裁者|dictador;dictadora|dictateur;dictatrice|dittatore;dittatrice
noun|other|regime|政權|régimen|régime|regime
adjective|other|authoritarian|威權的|autoritario;autoritaria|autoritaire|autoritario;autoritaria
adjective|other|democratic|民主的|democrático;democrática|démocratique|democratico;democratica
noun|other|referendum|公投|referéndum|référendum|referendum
noun|objects|ballot|選票|papeleta;boleta|bulletin de vote|scheda elettorale
noun|other|poll|民調|encuesta|sondage|sondaggio
verb|actions|elect|選出|elegir|élire|eleggere
noun|other|opposition|在野黨|oposición|opposition|opposizione
noun|other|ruling party|執政黨|partido gobernante|parti au pouvoir|partito di governo
noun|other|majority|多數|mayoría|majorité|maggioranza
noun|other|minority|少數|minoría|minorité|minoranza
adjective|other|left-wing|左派的|de izquierda|de gauche|di sinistra
adjective|other|right-wing|右派的|de derecha|de droite|di destra
adjective|other|conservative|保守的|conservador;conservadora|conservateur;conservatrice|conservatore;conservatrice
adjective|other|liberal|自由派的|liberal|libéral;libérale|liberale
noun|people|extremist|極端分子|extremista|extrémiste|estremista
adjective|other|radical|激進的|radical|radical;radicale|radicale
noun|other|nationalism|民族主義|nacionalismo|nationalisme|nazionalismo
noun|other|communism|共產主義|comunismo|communisme|comunismo
noun|other|capitalism|資本主義|capitalismo|capitalisme|capitalismo
noun|other|public opinion|輿論|opinión pública|opinion publique|opinione pubblica
noun|other|statement|聲明|declaración|déclaration|dichiarazione
verb|actions|announce|宣布|anunciar|annoncer|annunciare
noun|other|press conference|記者會|rueda de prensa|conférence de presse|conferenza stampa
noun|people|spokesperson|發言人|portavoz|porte-parole|portavoce
noun|other|council|議會|consejo|conseil|consiglio
noun|objects|polling station|投票所|colegio electoral|bureau de vote|seggio elettorale
noun|other|turnout|投票率|participación|taux de participation|affluenza
noun|other|inauguration|就職典禮|toma de posesión|investiture|insediamento
noun|other|bureaucracy|官僚體制|burocracia|bureaucratie|burocrazia
verb|actions|resign|辭職|dimitir;renunciar|démissionner|dimettersi
verb|actions|appoint|任命|nombrar|nommer|nominare
verb|actions|govern|治理|gobernar|gouverner|governare
noun|objects|flag|旗子|bandera|drapeau|bandiera
noun|other|national anthem|國歌|himno nacional|hymne national|inno nazionale
noun|other|national day|國慶日|fiesta nacional|fête nationale|festa nazionale
adjective|other|national|國家的|nacional|national;nationale|nazionale
adjective|other|global|全球的|global|mondial;mondiale|globale
noun|other|globalization;globalisation|全球化|globalización|mondialisation|globalizzazione
noun|other|superpower|超級強國|superpotencia|superpuissance|superpotenza
noun|other|unification|統一|unificación|unification|unificazione
noun|other|colony|殖民地|colonia|colonie|colonia
noun|other|developing country|開發中國家|país en desarrollo|pays en développement|paese in via di sviluppo
noun|other|developed country|已開發國家|país desarrollado|pays développé|paese sviluppato
noun|other|aid|援助|ayuda|aide|aiuto
adjective|other|humanitarian|人道的|humanitario;humanitaria|humanitaire|umanitario;umanitaria
noun|other|famine|饑荒;飢荒|hambruna|famine|carestia
adjective|other|military|軍事的|militar|militaire|militare
noun|other|navy|海軍|armada|marine|marina
noun|other|air force|空軍|fuerza aérea|armée de l'air|aeronautica militare
noun|people|veteran|退伍軍人|veterano;veterana|ancien combattant;ancienne combattante|veterano;veterana
noun|other|battle|戰役|batalla|bataille|battaglia
verb|actions|invade|入侵|invadir|envahir|invadere
noun|other|invasion|入侵|invasión|invasion|invasione
noun|other|ceasefire|停火|alto el fuego|cessez-le-feu|cessate il fuoco
noun|objects|missile|飛彈|misil|missile|missile
noun|objects|nuclear weapon|核武|arma nuclear|arme nucléaire|arma nucleare
noun|other|defense;defence|國防|defensa|défense|difesa
noun|other|victory|勝利|victoria|victoire|vittoria
noun|other|defeat|挫敗|derrota|défaite|sconfitta
verb|actions|surrender|投降|rendirse|se rendre|arrendersi
noun|people|civilian|平民|civil|civil;civile|civile
noun|people|hero|英雄|héroe;heroína|héros;héroïne|eroe;eroina
noun|people|spy|間諜|espía|espion;espionne|spia
noun|other|tension|緊張局勢|tensión|tension|tensione
verb|actions|deter|嚇阻|disuadir|dissuader|dissuadere
verb|actions|escalate|升級|intensificarse|s'intensifier|intensificarsi
noun|other|terrorism|恐怖主義|terrorismo|terrorisme|terrorismo
noun|people|terrorist|恐怖分子|terrorista|terroriste|terrorista
noun|other|bombing|轟炸|bombardeo|bombardement|bombardamento
noun|other|shooting|槍擊|tiroteo|fusillade|sparatoria
verb|actions|shoot|開槍|disparar|tirer|sparare
verb|actions|explode|爆炸|explotar|exploser|esplodere
noun|other|massacre|屠殺|masacre|massacre|massacro
noun|other|genocide|種族滅絕|genocidio|génocide|genocidio
noun|other|airstrike|空襲|ataque aéreo|frappe aérienne|attacco aereo
noun|objects|warship|軍艦|buque de guerra|navire de guerre|nave da guerra
noun|objects|fighter jet|戰鬥機|avión de combate|avion de chasse|aereo da caccia
noun|objects|military base|軍事基地|base militar|base militaire|base militare
noun|other|military service|兵役|servicio militar|service militaire|servizio militare
noun|other|civil war|內戰|guerra civil|guerre civile|guerra civile
noun|other|world war|世界大戰|guerra mundial|guerre mondiale|guerra mondiale
noun|other|Cold War|冷戰|Guerra Fría|guerre froide|guerra fredda
noun|other|security|安全|seguridad|sécurité|sicurezza
noun|other|surveillance|監控|vigilancia|surveillance|sorveglianza
noun|people|hostage|人質|rehén|otage|ostaggio
verb|actions|kidnap|綁架|secuestrar|enlever|rapire
noun|other|revolution|革命|revolución|révolution|rivoluzione
noun|people|rebel|叛亂分子|rebelde|rebelle|ribelle
noun|other|coup|政變|golpe de Estado|coup d'État|colpo di Stato
noun|other|riot|暴動|disturbio|émeute|sommossa
noun|other|strike|罷工|huelga|grève|sciopero
noun|people|activist|社運人士|activista|militant;militante|attivista
noun|other|social movement|社會運動|movimiento social|mouvement social|movimento sociale
noun|other|petition|請願|petición|pétition|petizione
noun|other|boycott|抵制|boicot|boycott|boicottaggio
noun|other|freedom of speech|言論自由|libertad de expresión|liberté d'expression|libertà di espressione
noun|other|freedom of the press|新聞自由|libertad de prensa|liberté de la presse|libertà di stampa
noun|other|censorship|審查制度|censura|censure|censura
noun|other|propaganda|政治宣傳|propaganda|propagande|propaganda
noun|other|fake news|假新聞|noticia falsa|fausse information|notizia falsa
noun|other|disinformation|假訊息|desinformación|désinformation|disinformazione
adjective|other|misleading|誤導性的|engañoso;engañosa|trompeur;trompeuse|fuorviante
noun|other|rumor;rumour|謠言|rumor|rumeur|diceria
noun|other|slogan|口號|eslogan|slogan|slogan
noun|other|rally|集會|mitin|rassemblement|comizio
noun|objects|tear gas|催淚瓦斯|gas lacrimógeno|gaz lacrymogène|gas lacrimogeno
noun|other|curfew|宵禁|toque de queda|couvre-feu|coprifuoco
noun|other|martial law|戒嚴|ley marcial|loi martiale|legge marziale
noun|other|state of emergency|緊急狀態|estado de emergencia|état d'urgence|stato di emergenza
noun|people|dissident|異議人士|disidente|dissident;dissidente|dissidente
noun|people|political prisoner|政治犯|preso político;presa política|prisonnier politique;prisonnière politique|prigioniero politico;prigioniera politica
noun|other|exile|流亡|exilio|exil|esilio
noun|people|prosecutor|檢察官|fiscal|procureur|pubblico ministero
noun|people|defendant|被告|acusado;acusada|accusé;accusée|imputato;imputata
noun|other|jury|陪審團|jurado|jury|giuria
noun|other|lawsuit|訴訟|demanda|action en justice|causa
verb|actions|sue|提告|demandar|poursuivre en justice|fare causa
verb|actions|accuse|指控|acusar|accuser|accusare
noun|other|accusation|指控|acusación|accusation|accusa
noun|other|allegation|指控|denuncia|allégation|accusa
noun|other|legislation|立法|legislación|législation|legislazione
verb|actions|abolish|廢除|abolir|abolir|abolire
noun|other|abolition|廢除|abolición|abolition|abolizione
verb|actions|revoke|撤銷|revocar|révoquer|revocare
verb|actions|legalize;legalise|合法化|legalizar|légaliser|legalizzare
verb|actions|criminalize;criminalise|入罪化|criminalizar|criminaliser|criminalizzare
verb|actions|indict|起訴|acusar formalmente|inculper|incriminare
noun|other|settlement|和解|acuerdo extrajudicial|accord à l'amiable|accordo extragiudiziale
verb|actions|violate|違反|violar|enfreindre|violare
noun|other|violation|違規|infracción|infraction|violazione
verb|actions|comply|遵守|cumplir|respecter|rispettare
noun|other|ban|禁令|prohibición|interdiction|divieto
noun|other|rule of law|法治|Estado de derecho|État de droit|Stato di diritto
noun|other|supreme court|最高法院|tribunal supremo;corte suprema|cour suprême|corte suprema
noun|other|death penalty|死刑|pena de muerte|peine de mort|pena di morte
noun|other|imprisonment|監禁|encarcelamiento|emprisonnement|carcerazione
noun|other|punishment|懲罰|castigo|punition|punizione
verb|actions|punish|懲罰|castigar|punir|punire
verb|actions|confess|認罪|confesar|avouer|confessare
noun|other|bail|保釋|fianza|caution|cauzione
verb|actions|interrogate|審問|interrogar|interroger|interrogare
noun|people|pickpocket|扒手|carterista|pickpocket|borseggiatore;borseggiatrice
noun|other|drunk driving|酒駕|conducción en estado de ebriedad|conduite en état d'ivresse|guida in stato di ebbrezza
noun|other|drug trafficking|販毒|narcotráfico|trafic de drogue|traffico di droga
noun|other|organized crime;organised crime|組織犯罪|crimen organizado|crime organisé|criminalità organizzata
noun|other|smuggling|走私|contrabando|contrebande|contrabbando
noun|other|corruption|貪腐|corrupción|corruption|corruzione
adjective|other|corrupt|貪腐的|corrupto;corrupta|corrompu;corrompue|corrotto;corrotta
noun|other|bribe|賄賂|soborno|pot-de-vin|tangente
noun|other|fraud|詐欺|fraude|fraude|frode
noun|other|scam|詐騙|estafa|arnaque|truffa
noun|other|gang|幫派|banda|gang|banda
noun|other|harassment|騷擾|acoso|harcèlement|molestia
noun|other|bullying|霸凌|acoso escolar|harcèlement scolaire|bullismo
noun|other|domestic violence|家暴|violencia doméstica|violence domestique|violenza domestica
noun|other|human trafficking|人口販運|trata de personas|traite des êtres humains|tratta di esseri umani
noun|other|gender|性別|género|genre|genere
noun|other|feminism|女性主義|feminismo|féminisme|femminismo
noun|other|same-sex marriage|同性婚姻|matrimonio homosexual|mariage homosexuel|matrimonio omosessuale
noun|other|abortion|墮胎|aborto|avortement|aborto
noun|other|birth rate|出生率|tasa de natalidad|taux de natalité|tasso di natalità
noun|other|aging;ageing|高齡化|envejecimiento|vieillissement|invecchiamento
noun|other|census|人口普查|censo|recensement|censimento
noun|other|ethnic group|族群|grupo étnico|groupe ethnique|gruppo etnico
noun|people|indigenous people|原住民|pueblo indígena|peuple autochtone|popolo indigeno
noun|other|custom|習俗|costumbre|coutume|usanza
noun|other|heritage|文化遺產|patrimonio|patrimoine|patrimonio
noun|other|ceremony|儀式|ceremonia|cérémonie|cerimonia
noun|other|taboo|禁忌|tabú|tabou|tabù
noun|other|superstition|迷信|superstición|superstition|superstizione
noun|people|ancestor|祖先|antepasado;antepasada|ancêtre|antenato;antenata
noun|other|civilization;civilisation|文明|civilización|civilisation|civiltà
noun|people|homeless person|遊民|persona sin hogar|sans-abri|senzatetto
noun|people|orphan|孤兒|huérfano;huérfana|orphelin;orpheline|orfano;orfana
noun|other|charity|慈善機構|organización benéfica|association caritative|ente di beneficenza
noun|other|donation|捐款|donación|don|donazione
noun|other|social class|社會階級|clase social|classe sociale|classe sociale
noun|other|middle class|中產階級|clase media|classe moyenne|ceto medio
noun|other|privilege|特權|privilegio|privilège|privilegio
noun|other|diversity|多元|diversidad|diversité|diversità
noun|other|prejudice|偏見|prejuicio|préjugé|pregiudizio
noun|other|stereotype|刻板印象|estereotipo|stéréotype|stereotipo
noun|other|morality|道德|moralidad|moralité|moralità
noun|other|slavery|奴隸制度|esclavitud|esclavage|schiavitù
noun|other|housing|住宅|vivienda|logement|alloggio
noun|people|resident|居民|residente|habitant;habitante|residente
adjective|other|rural|鄉村的|rural|rural;rurale|rurale
adjective|other|urban|都市的|urbano;urbana|urbain;urbaine|urbano;urbana
noun|other|gambling|賭博|juego de azar|jeu d'argent|gioco d'azzardo
noun|other|labor union;labour union|工會|sindicato|syndicat|sindacato
noun|other|solidarity|團結|solidaridad|solidarité|solidarietà
noun|other|consensus|共識|consenso|consensus|consenso
noun|other|compromise|妥協|término medio|compromis|compromesso
noun|other|stability|穩定|estabilidad|stabilité|stabilità
noun|other|chaos|混亂|caos|chaos|caos
noun|other|shortage|短缺|escasez|pénurie|carenza
noun|other|collapse|倒塌|derrumbe|effondrement|crollo
noun|other|crackdown|取締|medidas enérgicas|répression|giro di vite
noun|other|deadlock|僵局|punto muerto|impasse|stallo
noun|other|confrontation|對抗|confrontación|confrontation|confronto
noun|other|clash|衝突|enfrentamiento|affrontement|scontro
noun|other|surge|激增|repunte|flambée|impennata
noun|other|breakthrough|突破|avance|percée|svolta
noun|other|disruption|中斷|interrupción|perturbation|interruzione
noun|other|intervention|干預|intervención|intervention|intervento
verb|actions|interfere|干涉|interferir|interférer|interferire
verb|actions|undermine|削弱|socavar|saper|minare
verb|actions|implement|實施|implementar|mettre en œuvre|implementare
verb|actions|displace|使流離失所|desplazar|déplacer|sfollare
adjective|other|unprecedented|前所未有的|sin precedentes|sans précédent|senza precedenti
adjective|other|mandatory|強制的|obligatorio;obligatoria|obligatoire|obbligatorio;obbligatoria
adjective|other|former|前任的|antiguo;antigua|ancien;ancienne|ex
adjective|other|subversive|顛覆性的|subversivo;subversiva|subversif;subversive|sovversivo;sovversiva
adjective|other|turbulent|動盪的|turbulento;turbulenta|turbulent;turbulente|turbolento;turbolenta
noun|people|representative|代表|representante|représentant;représentante|rappresentante
noun|other|constituency|選區|circunscripción|circonscription|collegio elettorale
noun|people|advocate|倡導者|defensor;defensora|défenseur|sostenitore;sostenitrice
noun|people|supporter|支持者|partidario;partidaria|partisan;partisane|sostenitore;sostenitrice
noun|people|correspondent|特派員|corresponsal|correspondant;correspondante|corrispondente
noun|people|commentator|評論員|comentarista|commentateur;commentatrice|commentatore;commentatrice
noun|other|outbreak|疫情爆發|brote|flambée épidémique|focolaio
noun|other|epidemic|流行病|epidemia|épidémie|epidemia
noun|other|pandemic|全球大流行|pandemia|pandémie|pandemia
noun|other|lockdown|封城|confinamiento|confinement|lockdown
noun|other|mourning|哀悼|luto|deuil|lutto
noun|other|pilgrimage|朝聖|peregrinación|pèlerinage|pellegrinaggio
adjective|other|religious|宗教的|religioso;religiosa|religieux;religieuse|religioso;religiosa
noun|other|God|上帝|Dios|Dieu|Dio
noun|other|Buddhism|佛教|budismo|bouddhisme|buddismo
noun|other|Christianity|基督教|cristianismo|christianisme|cristianesimo
noun|other|Islam|伊斯蘭教|islam|islam|islam
noun|other|Taoism|道教|taoísmo|taoïsme|taoismo
noun|people|Buddhist|佛教徒|budista|bouddhiste|buddista
noun|people|Christian|基督徒|cristiano;cristiana|chrétien;chrétienne|cristiano;cristiana
noun|people|Muslim|穆斯林|musulmán;musulmana|musulman;musulmane|musulmano;musulmana
verb|actions|pray|祈禱|rezar|prier|pregare
noun|other|prayer|禱告|oración|prière|preghiera
noun|people|priest|神父|sacerdote|prêtre|prete
noun|people|monk|僧侶|monje|moine|monaco
noun|people|nun|修女|monja|religieuse|suora
noun|objects|mosque|清真寺|mezquita|mosquée|moschea
noun|objects|abbey|修道院|abadía|abbaye|abbazia
noun|objects|Bible|聖經|Biblia|Bible|Bibbia
noun|other|faith|信仰|fe|foi|fede
noun|other|heaven|天堂|cielo|paradis|paradiso
noun|other|hell|地獄|infierno|enfer|inferno
noun|other|devil|魔鬼|diablo|diable|diavolo
noun|other|soul|靈魂|alma|âme|anima
noun|objects|cross|十字架|cruz|croix|croce
noun|other|angel|天使|ángel|ange|angelo
noun|other|ghost|鬼|fantasma|fantôme|fantasma
noun|other|miracle|奇蹟|milagro|miracle|miracolo
noun|other|sin|罪|pecado|péché|peccato
adjective|other|sacred|神聖的|sagrado;sagrada|sacré;sacrée|sacro;sacra
noun|people|atheist|無神論者|ateo;atea|athée|ateo;atea
noun|other|Mid-Autumn Festival|中秋節|Fiesta del Medio Otoño|fête de la Mi-Automne|festa di metà autunno
noun|other|Dragon Boat Festival|端午節|Festival del Bote del Dragón|fête des bateaux-dragons|festa delle barche drago
noun|other|Lantern Festival|元宵節|Festival de los Faroles|fête des lanternes|festa delle lanterne
noun|other|Tomb Sweeping Day|清明節|Festival de Qingming|fête de Qingming|festa di Qingming
noun|other|Easter|復活節|Pascua|Pâques|Pasqua
noun|other|Halloween|萬聖節|Halloween|Halloween|Halloween
noun|other|Ramadan|齋戒月|ramadán|ramadan|ramadan
verb|actions|deny|否認|negar|nier|negare
verb|actions|confirm|確認|confirmar|confirmer|confermare
verb|actions|condemn|譴責|condenar|condamner|condannare
verb|actions|injure|傷害|herir|blesser|ferire
adjective|other|peaceful|和平的|pacífico;pacífica|pacifique|pacifico;pacifica
adjective|other|armed|武裝的|armado;armada|armé;armée|armato;armata
adjective|other|racist|種族歧視的|racista|raciste|razzista
noun|other|network|網路|red|réseau|rete
noun|other|web page|網頁|página web|page web|pagina web
noun|other|browser|瀏覽器|navegador|navigateur|browser
noun|other|search engine|搜尋引擎|buscador;motor de búsqueda|moteur de recherche|motore di ricerca
noun|other|program|程式|programa|programme|programma
noun|other|code|程式碼|código|code|codice
noun|other|folder|資料夾|carpeta|dossier|cartella
noun|other|icon|圖示|icono|icône|icona
noun|other|cursor|游標|cursor|curseur|cursore
noun|other|spam|垃圾郵件|correo basura;spam|spam;courrier indésirable|spam
noun|people|hacker|駭客|hacker;pirata informático|pirate informatique;hacker|hacker
noun|other|backup|備份|copia de seguridad|sauvegarde|backup;copia di sicurezza
noun|other|update|更新|actualización|mise à jour|aggiornamento
verb|actions|install|安裝|instalar|installer|installare
verb|actions|uninstall|解除安裝|desinstalar|désinstaller|disinstallare
verb|actions|upload|上傳|subir|mettre en ligne;téléverser|caricare
verb|actions|copy|複製|copiar|copier|copiare
verb|actions|paste|貼上|pegar|coller|incollare
verb|actions|recharge|充電|recargar;cargar|recharger|ricaricare;caricare
verb|actions|swipe|滑動|deslizar|balayer;glisser|scorrere
phrase|other|press and hold|按住|mantener pulsado;mantener presionado|appuyer longuement|tenere premuto
noun|objects|touchscreen|觸控螢幕|pantalla táctil|écran tactile|schermo tattile;touchscreen
noun|other|screenshot|截圖;螢幕截圖|captura de pantalla|capture d'écran|screenshot;schermata
noun|other|ringtone|鈴聲|tono de llamada|sonnerie|suoneria
noun|other|text message|簡訊|mensaje de texto;SMS|SMS|SMS
noun|other|emoji|表情符號|emoji|émoji|emoji
noun|other|voice message|語音訊息|mensaje de voz;nota de voz|message vocal|messaggio vocale
noun|other|group chat|群組|chat de grupo|groupe de discussion|chat di gruppo
noun|other|hashtag|主題標籤;hashtag|hashtag|hashtag|hashtag
noun|people|follower|追蹤者|seguidor;seguidora|abonné;abonnée|follower
noun|other|post|貼文|publicación;post|publication;post|post
noun|other|profile|個人檔案|perfil|profil|profilo
noun|other|username|使用者名稱|nombre de usuario|nom d'utilisateur|nome utente
verb|actions|log out|登出|cerrar sesión|se déconnecter|disconnettersi
verb|actions|sign up|註冊|registrarse|s'inscrire|registrarsi;iscriversi
adjective|other|online|線上|en línea|en ligne|online;in linea
adjective|other|offline|離線|sin conexión;fuera de línea|hors ligne|offline
adjective|other|wireless|無線|inalámbrico;inalámbrica|sans fil|senza fili;wireless
noun|other|Bluetooth|藍牙|Bluetooth|Bluetooth|Bluetooth
noun|other|signal|訊號|señal|signal|segnale
noun|objects|router|路由器;分享器|router;enrutador|routeur|router
noun|objects|webcam|網路攝影機|cámara web;webcam|webcam|webcam
noun|other|server|伺服器|servidor|serveur|server
noun|other|database|資料庫|base de datos|base de données|database;base di dati
noun|other|algorithm|演算法|algoritmo|algorithme|algoritmo
noun|objects|robot|機器人|robot|robot|robot
noun|objects|drone|無人機|dron|drone|drone
noun|objects|satellite|衛星|satélite|satellite|satellite
noun|objects|rocket|火箭|cohete|fusée|razzo
noun|other|version|版本|versión|version|versione
noun|other|option|選項|opción|option|opzione
noun|other|setting|設定|configuración;ajuste|paramètre;réglage|impostazione
adjective|other|default|預設|predeterminado;predeterminada|par défaut|predefinito;predefinita
noun|other|brightness|亮度|brillo|luminosité|luminosità
noun|other|volume|音量|volumen|volume|volume
noun|other|airplane mode|飛航模式|modo avión|mode avion|modalità aereo
noun|other|tab|分頁|pestaña|onglet|scheda
noun|other|research|研究|investigación|recherche|ricerca
noun|people|researcher|研究人員;研究者|investigador;investigadora|chercheur;chercheuse|ricercatore;ricercatrice
noun|other|theory|理論|teoría|théorie|teoria
noun|other|hypothesis|假說;假設|hipótesis|hypothèse|ipotesi
noun|other|analysis|分析|análisis|analyse|analisi
verb|actions|analyze;analyse|分析|analizar|analyser|analizzare
noun|other|conclusion|結論|conclusión|conclusion|conclusione
noun|other|proof|證明|prueba|preuve|prova
noun|other|experiment|實驗|experimento|expérience|esperimento
noun|objects|laboratory|實驗室|laboratorio|laboratoire|laboratorio
noun|other|perception|感知;知覺|percepción|perception|percezione
noun|other|paradox|悖論|paradoja|paradoxe|paradosso
noun|other|analogy|類比|analogía|analogie|analogia
noun|other|concept|概念|concepto|concept|concetto
noun|other|principle|原則|principio|principe|principio
noun|other|capability|能力|capacidad|capacité|capacità
noun|other|abbreviation|縮寫|abreviatura|abréviation|abbreviazione
noun|other|questionnaire|問卷|cuestionario|questionnaire|questionario
noun|other|measurement|測量|medición;medida|mesure|misurazione;misura
noun|other|formula|公式|fórmula|formule|formula
noun|other|equation|方程式|ecuación|équation|equazione
noun|other|statistics|統計|estadística|statistique|statistica
noun|other|diagram|示意圖|diagrama|schéma|schema
noun|other|geometry|幾何|geometría|géométrie|geometria
noun|other|algebra|代數|álgebra|algèbre|algebra
noun|other|fraction|分數|fracción|fraction|frazione
noun|other|angle|角度|ángulo|angle|angolo
verb|actions|subtract|減去;減|restar|soustraire|sottrarre
verb|actions|multiply|乘以;乘|multiplicar|multiplier|moltiplicare
verb|actions|divide|除以;除|dividir|diviser|dividere
noun|other|atom|原子|átomo|atome|atomo
noun|other|molecule|分子|molécula|molécule|molecola
noun|other|cell|細胞|célula|cellule|cellula
noun|other|gene|基因|gen|gène|gene
noun|other|DNA|DNA|ADN|ADN|DNA
noun|other|evolution|演化|evolución|évolution|evoluzione
noun|other|energy|能量|energía|énergie|energia
noun|other|gravity|重力|gravedad|gravité|gravità
noun|other|electricity|電|electricidad|électricité|elettricità
noun|objects|magnet|磁鐵|imán|aimant|magnete;calamita
noun|other|oxygen|氧氣|oxígeno|oxygène|ossigeno
noun|other|hydrogen|氫|hidrógeno|hydrogène|idrogeno
noun|other|carbon dioxide|二氧化碳|dióxido de carbono|dioxyde de carbone|anidride carbonica
noun|other|element|元素|elemento|élément|elemento
noun|other|liquid|液體|líquido|liquide|liquido
noun|other|solid|固體|sólido|solide|solido
noun|objects|microscope|顯微鏡|microscopio|microscope|microscopio
noun|objects|telescope|望遠鏡|telescopio|télescope|telescopio
noun|objects|thermometer|溫度計|termómetro|thermomètre|termometro
noun|objects|sensor|感測器|sensor|capteur|sensore
noun|other|circuit|電路|circuito|circuit|circuito
noun|other|orbit|軌道|órbita|orbite|orbita
noun|other|astronomy|天文學|astronomía|astronomie|astronomia
noun|objects|prism|稜鏡|prisma|prisme|prisma
noun|other|hexagon|六邊形|hexágono|hexagone|esagono
noun|other|inertia|慣性|inercia|inertie|inerzia
noun|other|condensation|凝結|condensación|condensation|condensazione;condensa
noun|other|dopamine|多巴胺|dopamina|dopamine|dopamina
noun|other|pronoun|代名詞|pronombre|pronom|pronome
noun|other|adverb|副詞|adverbio|adverbe|avverbio
noun|other|conjunction|連接詞|conjunción|conjonction|congiunzione
noun|other|vowel|母音|vocal|voyelle|vocale
noun|other|consonant|子音|consonante|consonne|consonante
noun|other|syllable|音節|sílaba|syllabe|sillaba
noun|other|alphabet|字母表|alfabeto|alphabet|alfabeto
noun|other|punctuation|標點符號|puntuación|ponctuation|punteggiatura
noun|other|comma|逗號|coma|virgule|virgola
noun|other|full stop|句號|punto|point|punto
noun|other|question mark|問號|signo de interrogación|point d'interrogation|punto interrogativo
noun|other|exclamation mark|驚嘆號|signo de exclamación|point d'exclamation|punto esclamativo
noun|other|paragraph|段落|párrafo|paragraphe|paragrafo
noun|other|tense|時態|tiempo verbal|temps|tempo verbale
noun|other|plural|複數|plural|pluriel|plurale
noun|other|singular|單數|singular|singulier|singolare
adjective|other|masculine|陽性|masculino;masculina|masculin;masculine|maschile
adjective|other|feminine|陰性|femenino;femenina|féminin;féminine|femminile
noun|other|spelling|拼字|ortografía|orthographe|ortografia
noun|other|synonym|同義詞|sinónimo|synonyme|sinonimo
noun|other|antonym|反義詞|antónimo|antonyme|contrario;antonimo
noun|other|idiom|慣用語|modismo|expression idiomatique|modo di dire
noun|other|slang|俚語|jerga|argot|gergo
noun|other|proverb|諺語|proverbio;refrán|proverbe|proverbio
noun|other|dialect|方言|dialecto|dialecte|dialetto
noun|people|native speaker|母語人士|hablante nativo;hablante nativa|locuteur natif;locutrice native|madrelingua
adjective|other|bilingual|雙語|bilingüe|bilingue|bilingue
adjective|other|fluent|流利|fluido;fluida|courant;courante|fluente
noun|people|interpreter|口譯員|intérprete|interprète|interprete
noun|other|subtitle|字幕|subtítulo|sous-titre|sottotitolo
noun|other|chapter|章節|capítulo|chapitre|capitolo
noun|other|summary|摘要|resumen|résumé|riassunto
verb|actions|summarize;summarise|總結|resumir|résumer|riassumere
noun|other|essay|作文|redacción|rédaction|tema
noun|other|thesis|論文|tesis|thèse|tesi
noun|other|assignment|作業|tarea|devoir|compito
phrase|other|take notes|做筆記|tomar apuntes|prendre des notes|prendere appunti
noun|objects|flashcard|單字卡|tarjeta de estudio;flashcard|fiche de révision;flashcard|flashcard;scheda di studio
verb|actions|revise|複習|repasar|réviser|ripassare
verb|actions|cheat|作弊|hacer trampa|tricher|barare
phrase|other|skip class|翹課|faltar a clase|sécher les cours|saltare la lezione
noun|objects|blackboard|黑板|pizarra;pizarrón|tableau;tableau noir|lavagna
noun|objects|whiteboard|白板|pizarra blanca|tableau blanc|lavagna bianca
noun|objects|chalk|粉筆|tiza|craie|gesso
noun|objects|highlighter|螢光筆|marcador fluorescente;resaltador|surligneur|evidenziatore
noun|objects|school bus|校車|autobús escolar|car scolaire;bus scolaire|scuolabus
noun|objects|locker|置物櫃|casillero;taquilla|casier|armadietto
noun|objects|kindergarten|幼兒園|jardín de infancia;kínder|école maternelle|scuola dell'infanzia;scuola materna
noun|objects|primary school|國小;小學|escuela primaria|école primaire|scuola elementare
noun|objects|middle school|國中|escuela secundaria|collège|scuola media
noun|objects|high school|高中|bachillerato;preparatoria|lycée|scuola superiore;liceo
noun|people|professor|教授|profesor;profesora|professeur;professeure|professore;professoressa
noun|people|graduate|畢業生|graduado;graduada|diplômé;diplômée|laureato;laureata
noun|people|private tutor|家教|profesor particular;profesora particular|professeur particulier;professeure particulière|insegnante privato;insegnante privata
noun|other|scholarship|獎學金|beca|bourse|borsa di studio
noun|objects|diploma|畢業證書;文憑|diploma|diplôme|diploma
noun|other|semester|學期|semestre|semestre|semestre
noun|objects|campus|校園|campus|campus|campus
noun|objects|dormitory|宿舍|residencia universitaria|résidence universitaire|residenza universitaria
noun|other|lecture|演講;講座|conferencia|conférence|conferenza
noun|other|master's degree|碩士學位|máster;maestría|master|laurea magistrale
noun|other|bachelor's degree|學士學位|licenciatura;grado|licence|laurea triennale
noun|other|doctorate|博士學位|doctorado|doctorat|dottorato
noun|other|curriculum|課程|plan de estudios|programme scolaire|piano di studi
adjective|other|academic|學術|académico;académica|académique|accademico;accademica
adjective|other|scientific|科學的|científico;científica|scientifique|scientifico;scientifica
adjective|other|digital|數位|digital|numérique|digitale
adjective|other|electronic|電子|electrónico;electrónica|électronique|elettronico;elettronica
adjective|other|automatic|自動|automático;automática|automatique|automatico;automatica
adjective|other|virtual|虛擬|virtual|virtuel;virtuelle|virtuale
adjective|other|artificial|人工;人造|artificial|artificiel;artificielle|artificiale
adjective|other|advanced|進階|avanzado;avanzada|avancé;avancée|avanzato;avanzata
adjective|other|intermediate|中級|intermedio;intermedia|intermédiaire|intermedio;intermedia
adjective|other|basic|基本|básico;básica|de base;basique|di base;basilare
verb|actions|predict|預測|predecir;prever|prédire;prévoir|prevedere;predire
verb|actions|estimate|估計|estimar|estimer|stimare
verb|actions|observe|觀察|observar|observer|osservare
verb|actions|examine|檢查|examinar|examiner|esaminare
verb|actions|define|定義|definir|définir|definire
noun|other|definition|定義|definición|définition|definizione
verb|actions|evaluate|評估|evaluar|évaluer|valutare
noun|other|reference|參考|referencia|référence|riferimento
noun|other|trend|趨勢|tendencia|tendance|tendenza
noun|other|aspect|層面;方面|aspecto|aspect|aspetto
noun|other|category|類別|categoría|catégorie|categoria
noun|other|structure|結構|estructura|structure|struttura
noun|other|system|系統|sistema|système|sistema
noun|other|process|過程|proceso|processus|processo
noun|other|phase|階段|fase|phase|fase
noun|other|development|發展|desarrollo|développement|sviluppo
noun|other|innovation|創新|innovación|innovation|innovazione
noun|objects|device|裝置|dispositivo|appareil|dispositivo
noun|objects|engine|引擎;發動機|motor|moteur|motore
noun|other|invention|發明|invento;invención|invention|invenzione
verb|actions|invent|發明|inventar|inventer|inventare
noun|other|discovery|發現|descubrimiento|découverte|scoperta
noun|people|inventor|發明家|inventor;inventora|inventeur;inventrice|inventore;inventrice
noun|people|developer|開發人員;開發者|desarrollador;desarrolladora|développeur;développeuse|sviluppatore;sviluppatrice
noun|people|user|使用者|usuario;usuaria|utilisateur;utilisatrice|utente
noun|people|blogger|部落客|bloguero;bloguera|blogueur;blogueuse|blogger
noun|people|influencer|網紅|influencer;influenciador|influenceur;influenceuse|influencer
noun|other|blog|部落格|blog|blog|blog
noun|people|reporter|記者|reportero;reportera|reporter|reporter
noun|objects|flash drive|隨身碟|memoria USB;pendrive|clé USB|chiavetta USB
noun|objects|hard drive|硬碟|disco duro|disque dur|disco rigido
noun|objects|power bank|行動電源|batería externa;power bank|batterie externe|power bank
noun|objects|phone case|手機殼|funda|coque|custodia
noun|objects|desktop computer|桌上型電腦;桌機|computadora de escritorio;ordenador de sobremesa|ordinateur de bureau|computer fisso
noun|other|operating system|作業系統|sistema operativo|système d'exploitation|sistema operativo
noun|other|font|字型;字體|fuente;tipografía|police|carattere
noun|other|software bug|程式錯誤;bug|error de software;bug|bug|bug
noun|other|glitch|小故障|fallo;falla|pépin|glitch;intoppo
verb|actions|restart|重新啟動;重開機|reiniciar|redémarrer|riavviare
noun|other|media|媒體|medios de comunicación;medios|médias|media
noun|other|headline|標題|titular|titre|titolo
noun|other|article|文章|artículo|article|articolo
noun|other|channel|頻道|canal|chaîne|canale
noun|other|episode|集|episodio|épisode|episodio
noun|other|audience|觀眾|público|public|pubblico
verb|actions|subscribe|訂閱|suscribirse|s'abonner|abbonarsi
noun|other|streaming|串流|streaming|streaming|streaming
noun|other|playlist|播放清單|lista de reproducción|playlist|playlist
noun|other|privacy|隱私|privacidad|vie privée|privacy;riservatezza
noun|other|tutorial|教學|tutorial|tutoriel|tutorial
noun|other|chatbot|聊天機器人|chatbot|chatbot|chatbot
adjective|other|stressed|壓力大|estresado;estresada|stressé;stressée|stressato;stressata
adjective|other|anxious|焦慮|ansioso;ansiosa|anxieux;anxieuse|ansioso;ansiosa
adjective|other|exhausted|筋疲力盡|agotado;agotada|épuisé;épuisée|esausto;esausta
adjective|other|confident|有自信;有信心|seguro de sí mismo;segura de sí misma|sûr de soi;sûre de soi|sicuro di sé;sicura di sé
adjective|other|curious|好奇|curioso;curiosa|curieux;curieuse|curioso;curiosa
adjective|other|bored|無聊|aburrido;aburrida|qui s'ennuie;ennuyé;ennuyée|annoiato;annoiata
adjective|other|scared|害怕|asustado;asustada|effrayé;effrayée|spaventato;spaventata
adjective|other|shocked|震驚|impactado;impactada|choqué;choquée|scioccato;scioccata
adjective|other|annoyed|惱火|molesto;molesta|agacé;agacée|infastidito;infastidita
adjective|other|depressed|沮喪|deprimido;deprimida|déprimé;déprimée|depresso;depressa
adjective|other|allergic|過敏|alérgico;alérgica|allergique|allergico;allergica
adjective|other|painful|疼痛|doloroso;dolorosa|douloureux;douloureuse|doloroso;dolorosa
adjective|other|sleepy|想睡|con sueño|somnolent;somnolente|assonnato;assonnata
adjective|other|nauseous|想吐|con náuseas|nauséeux;nauséeuse|nauseato;nauseata
noun|other|diarrhea|腹瀉;拉肚子|diarrea|diarrhée|diarrea
noun|other|nausea|噁心;反胃|náusea|nausée|nausea
verb|actions|vomit|嘔吐;吐|vomitar|vomir|vomitare
noun|other|rash|皮疹;疹子|sarpullido|éruption cutanée|eruzione cutanea
noun|other|swelling|腫脹;腫|hinchazón|gonflement|gonfiore
noun|objects|wound|傷口|herida|plaie|ferita
verb|actions|bleed|流血|sangrar|saigner|sanguinare
verb|actions|faint|暈倒;昏倒|desmayarse|s'évanouir|svenire
noun|other|infection|感染|infección|infection|infezione
noun|other|virus|病毒|virus|virus|virus
noun|other|cancer|癌症|cáncer|cancer|cancro
noun|other|diabetes|糖尿病|diabetes|diabète|diabete
noun|other|asthma|氣喘|asma|asthme|asma
noun|other|injection|注射|inyección|injection|iniezione
noun|objects|antibiotic|抗生素|antibiótico|antibiotique|antibiotico
noun|objects|painkiller|止痛藥|analgésico|antidouleur;analgésique|antidolorifico;analgesico
noun|other|side effect|副作用|efecto secundario|effet secondaire|effetto collaterale
noun|other|treatment|治療|tratamiento|traitement|trattamento
verb|actions|recover|康復|recuperarse|se rétablir|riprendersi
noun|other|blood pressure|血壓|presión arterial;tensión arterial|tension artérielle|pressione sanguigna;pressione arteriosa
noun|other|x-ray|X光|radiografía|radiographie;radio|radiografia
noun|objects|waiting room|候診室|sala de espera|salle d'attente|sala d'attesa
noun|other|first aid|急救|primeros auxilios|premiers secours|primo soccorso
noun|people|surgeon|外科醫師;外科醫生|cirujano;cirujana|chirurgien;chirurgienne|chirurgo;chirurga
noun|other|pregnancy|懷孕|embarazo|grossesse|gravidanza
noun|other|insomnia|失眠|insomnio|insomnie|insonnia
noun|other|migraine|偏頭痛|migraña|migraine|emicrania
noun|other|depression|憂鬱症|depresión|dépression|depressione
noun|other|anxiety|焦慮|ansiedad|anxiété|ansia;ansietà
noun|other|addiction|成癮|adicción|dépendance|dipendenza
adjective|other|addicted|上癮|adicto;adicta|dépendant;dépendante|dipendente
noun|other|mental health|心理健康|salud mental|santé mentale|salute mentale
verb|actions|stretch|伸展|estirarse|s'étirer|stirarsi
verb|actions|lose weight|減肥;減重|adelgazar|maigrir|dimagrire
noun|other|diet|節食|dieta|régime|dieta
noun|other|massage|按摩|masaje|massage|massaggio
noun|other|vitamin|維他命;維生素|vitamina|vitamine|vitamina
noun|objects|abdomen|腹部|abdomen|abdomen|addome
noun|objects|spine|脊椎|columna vertebral|colonne vertébrale|colonna vertebrale
noun|objects|rib|肋骨|costilla|côte|costola
noun|objects|skull|頭骨;頭蓋骨|cráneo|crâne|cranio
noun|objects|skeleton|骨骼|esqueleto|squelette|scheletro
noun|objects|joint|關節|articulación|articulation|articolazione
noun|objects|kidney|腎臟;腎|riñón|rein|rene
noun|objects|nerve|神經|nervio|nerf|nervo
noun|objects|palm|手掌|palma de la mano;palma|paume|palmo della mano;palma della mano
noun|objects|wrinkle|皺紋|arruga|ride|ruga
noun|objects|scar|疤痕;傷疤|cicatriz|cicatrice|cicatrice
noun|objects|tattoo|刺青;紋身|tatuaje|tatouage|tatuaggio
noun|objects|bruise|瘀青|moretón;moratón|bleu|livido
noun|objects|pimple|痘痘|grano;espinilla|bouton|brufolo
noun|objects|sweat|汗|sudor|sueur|sudore
noun|other|tooth decay|蛀牙|caries|carie|carie
noun|other|fatigue|疲勞|cansancio|fatigue|stanchezza
noun|other|dizziness|頭暈|mareo|vertige;étourdissement|capogiro
noun|other|constipation|便祕|estreñimiento|constipation|stitichezza
verb|actions|itch|癢|picar|démanger|prudere
verb|actions|swell|腫起來|hincharse|enfler|gonfiarsi
noun|other|sprain|扭傷|esguince|entorse|distorsione
noun|other|fracture|骨折|fractura|fracture|frattura
noun|other|cramp|抽筋|calambre|crampe|crampo
noun|objects|blister|水泡|ampolla|ampoule|vescica
verb|actions|snore|打呼|roncar|ronfler|russare
verb|actions|yawn|打哈欠|bostezar|bâiller|sbadigliare
verb|actions|shiver|發抖|tiritar|frissonner|rabbrividire
noun|other|hangover|宿醉|resaca|gueule de bois|postumi della sbornia
noun|other|sunburn|曬傷|quemadura solar|coup de soleil|scottatura solare
noun|other|heatstroke|中暑|golpe de calor|coup de chaleur|colpo di calore
noun|other|hay fever|花粉症|fiebre del heno|rhume des foins|raffreddore da fieno
noun|other|runny nose|流鼻水|moqueo|nez qui coule|naso che cola
noun|other|stuffy nose|鼻塞|nariz tapada|nez bouché|naso chiuso
noun|other|food poisoning|食物中毒|intoxicación alimentaria|intoxication alimentaire|intossicazione alimentare
noun|other|heart attack|心臟病發作;心肌梗塞|infarto;ataque al corazón|crise cardiaque|infarto
noun|other|pneumonia|肺炎|neumonía|pneumonie|polmonite
adjective|other|chronic|慢性|crónico;crónica|chronique|cronico;cronica
adjective|other|benign|良性|benigno;benigna|bénin;bénigne|benigno;benigna
adjective|other|contagious|有傳染性|contagioso;contagiosa|contagieux;contagieuse|contagioso;contagiosa
noun|objects|capsule|膠囊|cápsula|gélule|capsula
noun|objects|cough syrup|止咳糖漿|jarabe para la tos|sirop contre la toux|sciroppo per la tosse
noun|objects|ointment|藥膏|pomada;ungüento|pommade|pomata
noun|objects|petroleum jelly|凡士林|vaselina|vaseline|vaselina
noun|other|vaccination|疫苗接種|vacunación|vaccination|vaccinazione
noun|objects|wheelchair|輪椅|silla de ruedas|fauteuil roulant|sedia a rotelle
noun|people|midwife|助產師;助產士|partera;matrona|sage-femme|ostetrica
noun|other|physical therapy|物理治療|fisioterapia|kinésithérapie|fisioterapia
noun|other|scoliosis|脊椎側彎|escoliosis|scoliose|scoliosi
noun|objects|lymph node|淋巴結;淋巴腺|ganglio linfático|ganglion lymphatique|linfonodo
noun|other|health scare|健康警訊;健康驚魂|susto de salud|alerte de santé|allarme per la salute
noun|other|back pain|背痛;腰痛|dolor de espalda|mal de dos|mal di schiena
verb|actions|catch a cold|感冒|resfriarse|attraper un rhume|raffreddarsi
verb|actions|have a fever|發燒|tener fiebre|avoir de la fièvre|avere la febbre
verb|actions|take medicine|吃藥|tomar medicina|prendre un médicament|prendere una medicina
verb|actions|make an appointment|預約|pedir cita;pedir una cita|prendre rendez-vous|prendere appuntamento
verb|actions|warm up|熱身|calentar|s'échauffer|riscaldarsi
verb|actions|jog|慢跑|hacer jogging;trotar|faire du jogging|fare jogging
verb|actions|gain weight|變胖|engordar|grossir|ingrassare
noun|other|workout|健身|entrenamiento|entraînement|allenamento
noun|other|push-up|伏地挺身|flexión;lagartija|pompe|flessione
noun|other|calorie|卡路里;熱量|caloría|calorie|caloria
noun|other|protein|蛋白質|proteína|protéine|proteina
noun|other|sauna|三溫暖|sauna|sauna|sauna
noun|other|foot massage|腳底按摩|masaje de pies|massage des pieds|massaggio ai piedi
noun|other|meditation|冥想|meditación|méditation|meditazione
noun|people|bodybuilder|健美選手|culturista;fisicoculturista|culturiste|culturista
adjective|other|overweight|過重|con sobrepeso|en surpoids|in sovrappeso
adjective|other|slim|苗條|delgado;delgada|mince|snello;snella
adjective|other|skinny|瘦巴巴|flaco;flaca|maigre|magro;magra
adjective|other|blind|失明;看不見|ciego;ciega|aveugle|cieco;cieca
adjective|other|deaf|耳聾;聾;失聰|sordo;sorda|sourd;sourde|sordo;sorda
adjective|other|attractive|有吸引力|atractivo;atractiva|séduisant;séduisante|attraente
adjective|other|cheerful|開朗|alegre|joyeux;joyeuse|allegro;allegra
adjective|other|moved|感動|conmovido;conmovida|ému;émue|commosso;commossa
adjective|other|furious|暴怒|furioso;furiosa|furieux;furieuse|furioso;furiosa
adjective|other|relieved|如釋重負|aliviado;aliviada|soulagé;soulagée|sollevato;sollevata
adjective|other|hopeful|充滿希望|esperanzado;esperanzada|plein d'espoir;pleine d'espoir|speranzoso;speranzosa
adjective|other|terrified|驚恐|aterrorizado;aterrorizada|terrifié;terrifiée|terrorizzato;terrorizzata
adjective|other|insecure|沒有安全感|inseguro;insegura|peu sûr de soi;peu sûre de soi|insicuro;insicura
adjective|other|melancholy|憂鬱|melancólico;melancólica|mélancolique|malinconico;malinconica
adjective|other|disgusting|噁心|asqueroso;asquerosa|dégoûtant;dégoûtante|disgustoso;disgustosa
adjective|other|negative|負面|negativo;negativa|négatif;négative|negativo;negativa
other|other|proudly|自豪地|con orgullo|fièrement|orgogliosamente
noun|other|boredom|無聊|aburrimiento|ennui|noia
noun|other|loneliness|孤單;寂寞|soledad|solitude|solitudine
noun|other|jealousy|嫉妒|celos|jalousie|gelosia
noun|other|envy|羨慕|envidia|envie|invidia
noun|other|shame|羞愧;羞恥|vergüenza|honte|vergogna
noun|other|guilt|罪惡感;內疚|culpa|culpabilité|colpa
noun|other|embarrassment|尷尬|vergüenza|embarras|imbarazzo
noun|other|despair|絕望|desesperación|désespoir|disperazione
noun|other|nostalgia|懷舊|nostalgia|nostalgie|nostalgia
noun|other|grief|悲痛|dolor|chagrin|dolore
noun|other|pride|自豪|orgullo|fierté|orgoglio
noun|other|gratitude|感激|gratitud|gratitude|gratitudine
noun|other|curiosity|好奇心|curiosidad|curiosité|curiosità
noun|other|disappointment|失望|decepción|déception|delusione
noun|other|confusion|困惑|confusión|confusion|confusione
noun|other|self-esteem|自尊|autoestima|estime de soi|autostima
noun|other|confidence|自信|confianza en uno mismo|confiance en soi|fiducia in sé
noun|other|personality|個性;性格|personalidad|personnalité|personalità
noun|other|sense of humor|幽默感|sentido del humor|sens de l'humour|senso dell'umorismo
noun|other|ambition|野心|ambición|ambition|ambizione
noun|other|arrogance|傲慢|arrogancia|arrogance|arroganza
noun|other|self-discipline|自律|autodisciplina|autodiscipline|autodisciplina
adjective|other|ambitious|有野心|ambicioso;ambiciosa|ambitieux;ambitieuse|ambizioso;ambiziosa
adjective|other|arrogant|傲慢|arrogante|arrogant;arrogante|arrogante
adjective|other|courageous|勇敢|valiente|courageux;courageuse|coraggioso;coraggiosa
adjective|other|courteous|有禮貌|cortés|courtois;courtoise|cortese
adjective|other|meticulous|一絲不苟|meticuloso;meticulosa|méticuleux;méticuleuse|meticoloso;meticolosa
adjective|other|conscientious|盡責|concienzudo;concienzuda|consciencieux;consciencieuse|coscienzioso;coscienziosa
adjective|other|audacious|大膽|audaz|audacieux;audacieuse|audace
adjective|other|discreet|低調|discreto;discreta|discret;discrète|discreto;discreta
adjective|other|tenacious|堅毅|tenaz|tenace|tenace
adjective|other|stubborn|固執;頑固|terco;terca|têtu;têtue|testardo;testarda
adjective|other|mature|成熟|maduro;madura|mûr;mûre|maturo;matura
adjective|other|unconditional|無條件|incondicional|inconditionnel;inconditionnelle|incondizionato;incondizionata
adjective|other|humble|謙卑|humilde|humble|umile
adjective|other|modest|謙虛|modesto;modesta|modeste|modesto;modesta
adjective|other|sincere|真誠|sincero;sincera|sincère|sincero;sincera
adjective|other|considerate|體貼|considerado;considerada|prévenant;prévenante|premuroso;premurosa
adjective|other|loyal|忠誠|leal|loyal;loyale|leale
adjective|other|determined|有決心|decidido;decidida|déterminé;déterminée|determinato;determinata
adjective|other|cautious|謹慎|cauteloso;cautelosa|prudent;prudente|cauto;cauta
adjective|other|charming|迷人|encantador;encantadora|charmant;charmante|affascinante
adjective|other|creative|有創意|creativo;creativa|créatif;créative|creativo;creativa
adjective|other|cruel|殘忍|cruel|cruel;cruelle|crudele
adjective|other|cowardly|膽小|cobarde|lâche|codardo;codarda
adjective|other|dishonest|不誠實|deshonesto;deshonesta|malhonnête|disonesto;disonesta
adjective|other|energetic|精力充沛|enérgico;enérgica|énergique|energico;energica
adjective|other|extroverted|外向|extrovertido;extrovertida|extraverti;extravertie|estroverso;estroversa
adjective|other|introverted|內向|introvertido;introvertida|introverti;introvertie|introverso;introversa
adjective|other|greedy|貪心|codicioso;codiciosa|avide|avido;avida
adjective|other|naive|天真|ingenuo;ingenua|naïf;naïve|ingenuo;ingenua
adjective|other|sensitive|敏感|sensible|sensible|sensibile
adjective|other|talkative|話多|hablador;habladora|bavard;bavarde|loquace
adjective|other|wise|有智慧|sabio;sabia|sage|saggio;saggia
adjective|other|grumpy|脾氣差|gruñón;gruñona|grincheux;grincheuse|scontroso;scontrosa
adjective|other|silly|傻氣|tonto;tonta|bête|sciocco;sciocca
adjective|other|tender|溫柔|tierno;tierna|tendre|tenero;tenera
noun|people|acquaintance|熟人|conocido;conocida|connaissance|conoscente
noun|people|ex|前任|ex|ex|ex
noun|people|fiancé|未婚夫|prometido|fiancé|fidanzato
noun|people|fiancée|未婚妻|prometida|fiancée|fidanzata
noun|people|spouse|配偶|cónyuge|conjoint;conjointe|coniuge
noun|people|widow|寡婦|viuda|veuve|vedova
noun|people|twin|雙胞胎|gemelo;gemela|jumeau;jumelle|gemello;gemella
noun|people|father-in-law|岳父;公公|suegro|beau-père|suocero
noun|people|mother-in-law|岳母;婆婆|suegra|belle-mère|suocera
noun|people|son-in-law|女婿|yerno|gendre|genero
noun|people|daughter-in-law|媳婦|nuera|belle-fille|nuora
noun|people|stepfather|繼父|padrastro|beau-père|patrigno
noun|people|stepmother|繼母|madrastra|belle-mère|matrigna
noun|people|grandparent|祖父母|abuelo;abuela|grand-parent|nonno;nonna
noun|people|old friend|老朋友|viejo amigo;vieja amiga|vieil ami;vieille amie|vecchio amico;vecchia amica
noun|people|new friend|新朋友|nuevo amigo;nueva amiga|nouvel ami;nouvelle amie|nuovo amico;nuova amica
noun|people|childhood friend|童年好友|amigo de la infancia;amiga de la infancia|ami d'enfance;amie d'enfance|amico d'infanzia;amica d'infanzia
noun|people|sweetheart|甜心|cariño|chéri;chérie|tesoro
noun|people|bride|新娘|novia|mariée|sposa
noun|people|groom|新郎|novio|marié|sposo
adjective|other|divorced|離婚|divorciado;divorciada|divorcé;divorcée|divorziato;divorziata
adjective|other|engaged|已訂婚|comprometido;comprometida|fiancé;fiancée|fidanzato;fidanzata
adjective|other|separated|分居|separado;separada|séparé;séparée|separato;separata
noun|other|anniversary|紀念日;週年|aniversario|anniversaire|anniversario
noun|other|bachelor party|單身派對|despedida de soltero|enterrement de vie de garçon|addio al celibato
noun|other|birthday party|生日派對|fiesta de cumpleaños|fête d'anniversaire|festa di compleanno
noun|objects|wedding dress|婚紗|vestido de novia|robe de mariée|abito da sposa
noun|objects|wedding ring|婚戒|anillo de boda;alianza|alliance|fede nuziale
noun|other|burial|安葬;埋葬|entierro|enterrement|sepoltura
phrase|other|my condolences|請節哀;節哀順變|mi más sentido pésame;mi pésame|mes condoléances|le mie condoglianze
phrase|other|rest in peace|安息吧|descanse en paz|repose en paix|riposa in pace
verb|actions|propose marriage|求婚|proponer matrimonio|demander en mariage|chiedere in sposa
verb|actions|give birth|生小孩;分娩|dar a luz|accoucher|partorire
verb|actions|adopt|領養;收養|adoptar|adopter|adottare
verb|actions|bury|埋葬|enterrar|enterrer|seppellire
verb|actions|flirt|調情|coquetear;flirtear|flirter|flirtare
verb|actions|reconcile|和好|reconciliarse|se réconcilier|riconciliarsi
verb|actions|get along|處得來|llevarse bien|s'entendre bien|andare d'accordo
verb|actions|hold hands|牽手|tomarse de la mano|se tenir la main|tenersi per mano
verb|actions|betray|背叛|traicionar|trahir|tradire
verb|actions|quarrel|吵架|pelearse;discutir|se disputer|litigare
verb|actions|insult|侮辱|insultar|insulter|insultare
verb|actions|lose touch|失去聯絡|perder el contacto|perdre le contact|perdere i contatti
verb|actions|make friends|交朋友|hacer amigos|se faire des amis|fare amicizia
verb|actions|let down|讓人失望|decepcionar|décevoir|deludere
verb|actions|burst into tears|突然大哭|romper a llorar|éclater en sanglots|scoppiare a piangere
verb|actions|comfort|安慰|consolar|consoler|consolare
verb|actions|admire|欽佩;佩服|admirar|admirer|ammirare
verb|actions|adore|熱愛|adorar|adorer|adorare
verb|actions|blame|責怪|culpar|blâmer|incolpare
verb|actions|panic|驚慌|entrar en pánico|paniquer|andare nel panico
verb|actions|pout|噘嘴|hacer pucheros;hacer un mohín|faire la moue|fare il broncio
verb|actions|regret|後悔|arrepentirse|regretter|pentirsi
verb|actions|scream|尖叫|gritar;chillar|hurler|urlare
adjective|other|retired|退休|jubilado;jubilada|retraité;retraitée|in pensione
adjective|other|elderly|年長|anciano;anciana|âgé;âgée|anziano;anziana
adjective|other|middle-aged|中年|de mediana edad|d'âge moyen|di mezza età
verb|actions|sob|啜泣|sollozar|sangloter|singhiozzare
verb|actions|sigh|嘆氣|suspirar|soupirer|sospirare
verb|actions|blush|臉紅|sonrojarse;ruborizarse|rougir|arrossire
noun|objects|attic|閣樓|desván|grenier|soffitta
noun|objects|basement|地下室|sótano|sous-sol|scantinato
noun|objects|terrace|露台|terraza|terrasse|terrazza
noun|objects|courtyard|中庭|patio|cour|cortile
noun|objects|chimney|煙囪|chimenea|cheminée|comignolo
noun|objects|fireplace|壁爐|chimenea|cheminée|camino
noun|objects|door handle|門把;門把手|picaporte;manija|poignée de porte|maniglia
noun|objects|gate|大門|portón;verja|portail|cancello
noun|objects|window sill|窗台|alféizar|rebord de fenêtre|davanzale
noun|objects|wallpaper|壁紙|papel pintado;papel tapiz|papier peint|carta da parati
noun|objects|ground floor|一樓|planta baja|rez-de-chaussée|piano terra
noun|objects|top floor|頂樓|último piso;última planta|dernier étage|ultimo piano
noun|objects|pipe|水管|tubería|tuyau|tubo
noun|objects|socket|插座|toma de corriente;enchufe|prise de courant|presa
noun|objects|plug|插頭|enchufe;clavija|fiche|spina
noun|objects|extension cord|延長線|alargador;extensión|rallonge|prolunga
noun|objects|light switch|電燈開關;開關|interruptor|interrupteur|interruttore
noun|objects|smoke alarm|煙霧警報器;火災警報器|detector de humo|détecteur de fumée|rilevatore di fumo
noun|objects|water heater|熱水器|calentador de agua|chauffe-eau|scaldabagno
noun|objects|cupboard|櫥櫃|armario|placard|armadio
noun|objects|pantry|食物儲藏室|despensa|garde-manger|dispensa
noun|objects|storage room|儲藏室|trastero;bodega|débarras|ripostiglio
noun|objects|laundry room|洗衣間|lavadero|buanderie|lavanderia
noun|objects|guest room|客房|habitación de invitados|chambre d'amis|camera degli ospiti
noun|objects|master bedroom|主臥室;主臥|dormitorio principal|chambre parentale|camera da letto principale
noun|objects|children's room|兒童房|habitación infantil|chambre d'enfant|cameretta
noun|objects|entryway|玄關|recibidor;entrada|entrée|ingresso
noun|objects|shower|淋浴|ducha|douche|doccia
noun|objects|villa|別墅|villa|villa|villa
noun|objects|apartment building|公寓大樓|edificio de apartamentos;bloque de pisos|immeuble|condominio
noun|objects|parking space|停車位|plaza de aparcamiento;plaza de estacionamiento|place de parking|posto auto
noun|objects|house number|門牌號碼|número de la casa|numéro de rue|numero civico
noun|other|postal code;zip code|郵遞區號|código postal|code postal|codice postale
noun|objects|spare key|備用鑰匙|llave de repuesto|clé de rechange|chiave di scorta
noun|objects|padlock|掛鎖|candado|cadenas|lucchetto
noun|objects|security camera|監視器|cámara de seguridad|caméra de surveillance|telecamera di sorveglianza
noun|objects|fire extinguisher|滅火器|extintor|extincteur|estintore
noun|objects|intercom|對講機|portero automático;interfono|interphone|citofono
noun|people|building manager|大樓管理員;管理員|conserje;portero|gardien d'immeuble|portiere
noun|other|heating|暖氣|calefacción|chauffage|riscaldamento
noun|other|electricity bill|電費|factura de la luz;recibo de la luz|facture d'électricité|bolletta della luce
noun|other|water bill|水費|factura del agua;recibo del agua|facture d'eau|bolletta dell'acqua
noun|objects|garbage truck|垃圾車|camión de la basura|camion poubelle|camion della spazzatura
noun|objects|laundromat|自助洗衣店|lavandería|laverie|lavanderia
noun|objects|dry cleaner|乾洗店|tintorería|pressing|tintoria
adjective|other|furnished|附家具的|amueblado;amueblada|meublé;meublée|ammobiliato;ammobiliata
noun|people|real estate agent|房仲|agente inmobiliario;agente inmobiliaria|agent immobilier;agente immobilière|agente immobiliare
noun|objects|studio apartment|套房|estudio|studio|monolocale
noun|people|homeowner|屋主|propietario;propietaria|propriétaire|proprietario;proprietaria
noun|objects|moving truck|搬家貨車|camión de mudanzas|camion de déménagement|camion dei traslochi
noun|other|moving company|搬家公司|empresa de mudanzas|entreprise de déménagement|ditta di traslochi
phrase|other|for rent|出租|se alquila|à louer|affittasi
phrase|other|for sale|出售|se vende|à vendre|in vendita
noun|objects|coffee table|茶几|mesa de centro|table basse|tavolino
noun|objects|bedside table|床頭櫃|mesilla de noche;mesita de noche|table de chevet|comodino
noun|objects|stool|凳子|taburete|tabouret|sgabello
noun|objects|bunk bed|上下鋪;上下舖|litera|lit superposé|letto a castello
noun|objects|sofa bed|沙發床|sofá cama|canapé-lit|divano letto
noun|objects|pillowcase|枕頭套|funda de almohada|taie d'oreiller|federa
noun|objects|duvet|被子|edredón|couette|piumone
noun|objects|cushion|抱枕;靠墊|cojín|coussin|cuscino
noun|objects|rug|地毯|alfombra|tapis|tappeto
noun|objects|picture frame|相框|marco de fotos;marco de fotografías|cadre photo|cornice
noun|objects|poster|海報|póster|affiche|poster
noun|objects|wall clock|掛鐘|reloj de pared|horloge murale|orologio da parete
noun|objects|alarm clock|鬧鐘|despertador|réveil|sveglia
noun|objects|ceiling light|吸頂燈;天花板燈|lámpara de techo|plafonnier|plafoniera
noun|objects|floor lamp|落地燈|lámpara de pie|lampadaire|lampada da terra
noun|objects|desk lamp|檯燈|lámpara de escritorio;lámpara de mesa|lampe de bureau|lampada da scrivania
noun|objects|chandelier|吊燈|lámpara de araña|lustre|lampadario
noun|objects|armrest|扶手|reposabrazos;apoyabrazos|accoudoir|bracciolo
noun|objects|coat rack|衣帽架|perchero|portemanteau|appendiabiti
noun|objects|shoe rack|鞋櫃;鞋架|zapatero|meuble à chaussures|scarpiera
noun|objects|storage box|收納盒|caja de almacenaje|boîte de rangement|scatola portaoggetti
noun|objects|laundry basket|洗衣籃|cesto de la ropa sucia|panier à linge|cesto della biancheria
noun|objects|ironing board|燙衣板|tabla de planchar|planche à repasser|asse da stiro
noun|objects|drying rack|曬衣架|tendedero|étendoir|stendino
noun|objects|clothespin|曬衣夾|pinza de la ropa;pinza|pince à linge|molletta
noun|objects|ashtray|菸灰缸|cenicero|cendrier|posacenere
noun|objects|mosquito net|蚊帳|mosquitera|moustiquaire|zanzariera
noun|objects|mosquito coil|蚊香|espiral antimosquitos|spirale anti-moustiques|zampirone
noun|objects|insect repellent|防蚊液|repelente de insectos|répulsif anti-moustiques|repellente per insetti
noun|objects|fridge|冰箱|nevera;refrigerador|frigo|frigorifero
noun|objects|clothes dryer|烘衣機|secadora|sèche-linge|asciugatrice
noun|objects|air purifier|空氣清淨機|purificador de aire|purificateur d'air|purificatore d'aria
noun|objects|humidifier|加濕器|humidificador|humidificateur|umidificatore
noun|objects|dehumidifier|除濕機|deshumidificador|déshumidificateur|deumidificatore
noun|objects|coffee maker|咖啡機|cafetera|machine à café|macchina del caffè
noun|objects|range hood|抽油煙機|campana extractora|hotte aspirante|cappa
noun|objects|dustpan|畚箕|recogedor|pelle à poussière|paletta
noun|objects|mop|拖把|fregona;trapeador|serpillière|mocio
noun|objects|rag|抹布|trapo|chiffon|straccio
noun|objects|sponge|海綿|esponja|éponge|spugna
noun|objects|dish soap|洗碗精|jabón para platos;lavavajillas|liquide vaisselle|detersivo per piatti
noun|objects|bleach|漂白水|lejía;cloro|eau de Javel|candeggina
noun|objects|fabric softener|衣物柔軟精;柔軟精|suavizante|assouplissant|ammorbidente
noun|objects|cleaning product|清潔用品|producto de limpieza|produit ménager|prodotto per le pulizie
noun|objects|dish rack|碗盤架;碗架|escurreplatos|égouttoir|scolapiatti
noun|objects|tumbler|平底玻璃杯|vaso|verre à boire|bicchiere
noun|objects|bottled water|瓶裝水|agua embotellada|eau en bouteille|acqua in bottiglia
noun|objects|bath mat|浴室地墊|alfombrilla de baño|tapis de bain|tappetino da bagno
noun|objects|towel rack|毛巾架|toallero|porte-serviettes|portasciugamani
noun|objects|toilet brush|馬桶刷|escobilla de baño|brosse de toilette|scopino
noun|objects|shower head|蓮蓬頭|cabezal de ducha|pommeau de douche|soffione
noun|objects|bathrobe|浴袍|albornoz;bata de baño|peignoir|accappatoio
noun|objects|razor|刮鬍刀|maquinilla de afeitar;rastrillo|rasoir|rasoio
noun|objects|cotton swab|棉花棒|bastoncillo;hisopo|coton-tige|cotton fioc
noun|objects|deodorant|體香劑;除臭劑|desodorante|déodorant|deodorante
noun|objects|conditioner|潤髮乳|acondicionador|après-shampoing|balsamo
noun|objects|body wash|沐浴乳|gel de ducha;gel de baño|gel douche|bagnoschiuma
noun|objects|facial cleanser|洗面乳|limpiador facial|nettoyant visage|detergente viso
noun|objects|moisturizer;moisturiser|保濕霜|crema hidratante|crème hydratante|crema idratante
noun|objects|makeup;make-up|化妝品;彩妝|maquillaje|maquillage|trucco
noun|objects|nail polish|指甲油|esmalte de uñas|vernis à ongles|smalto
noun|objects|nail clipper|指甲剪|cortauñas|coupe-ongles|tagliaunghie
noun|objects|tweezers|鑷子|pinzas|pince à épiler|pinzette
noun|objects|scissors|剪刀|tijeras|ciseaux|forbici
noun|objects|hair tie|髮圈|goma del pelo;coletero|élastique à cheveux|elastico per capelli
noun|objects|hairbrush|髮刷|cepillo para el pelo;cepillo para el cabello|brosse à cheveux|spazzola per capelli
noun|objects|dental floss|牙線|hilo dental|fil dentaire|filo interdentale
noun|objects|mouthwash|漱口水|enjuague bucal|bain de bouche|collutorio
noun|objects|lip balm|護唇膏|bálsamo labial|baume à lèvres|balsamo per le labbra
noun|objects|hand cream|護手霜|crema de manos|crème pour les mains|crema per le mani
noun|objects|hand sanitizer|乾洗手|gel hidroalcohólico|gel hydroalcoolique|gel igienizzante
noun|objects|tissue|面紙|pañuelo de papel;pañuelo desechable|mouchoir en papier|fazzoletto di carta
noun|objects|wet wipe|濕紙巾|toallita húmeda|lingette|salvietta umidificata
noun|objects|saw|鋸子|sierra|scie|sega
noun|objects|wrench|扳手|llave inglesa|clé à molette|chiave inglese
noun|objects|pliers|鉗子|alicates|pince|pinze
noun|objects|nail|釘子|clavo|clou|chiodo
noun|objects|ladder|梯子|escalera|échelle|scala
noun|objects|tape measure|捲尺|cinta métrica;flexómetro|mètre ruban|metro a nastro
noun|objects|sandpaper|砂紙|papel de lija;lija|papier de verre|carta vetrata
noun|objects|paint roller|油漆滾筒|rodillo de pintura|rouleau à peinture|rullo per pittura
noun|objects|rope|繩子|cuerda|corde|corda
noun|objects|rake|耙子|rastrillo|râteau|rastrello
noun|objects|watering can|澆水壺|regadera|arrosoir|annaffiatoio
noun|objects|staple|釘書針;訂書針|grapa|agrafe|punto metallico
noun|objects|tape|膠帶|cinta adhesiva|ruban adhésif|nastro adesivo
noun|objects|glue|膠水|pegamento|colle|colla
noun|objects|marker|麥克筆;馬克筆|rotulador;marcador|feutre|pennarello
noun|objects|colored pencil;coloured pencil|色鉛筆|lápiz de color|crayon de couleur|matita colorata
noun|objects|crayon|蠟筆|crayón;lápiz de cera|crayon de cire|pastello a cera
noun|objects|rubber band|橡皮筋|goma elástica;liga|élastique|elastico
noun|objects|sticker|貼紙|pegatina;calcomanía|autocollant|adesivo
noun|objects|bookmark|書籤|marcapáginas|marque-page|segnalibro
noun|objects|diary|日記|diario|journal intime|diario
noun|objects|ballpoint pen|原子筆|bolígrafo|stylo bille|penna a sfera
noun|objects|fountain pen|鋼筆|pluma estilográfica|stylo plume|penna stilografica
noun|objects|correction fluid|修正液;立可白|corrector|correcteur blanc|correttore
noun|objects|stamp|郵票|sello;estampilla|timbre|francobollo
noun|objects|tracksuit|運動服|chándal|survêtement|tuta
noun|objects|leggings|內搭褲|leggings;mallas|legging|leggings
noun|objects|tights|褲襪|medias;pantis|collant|collant
noun|objects|tank top|背心|camiseta de tirantes;camiseta sin mangas|débardeur|canotta
noun|objects|blouse|女襯衫|blusa|chemisier|camicetta
noun|objects|blazer|西裝外套|americana;saco|blazer|blazer
noun|objects|cardigan|開襟衫;針織外套|cárdigan;rebeca|cardigan|cardigan
noun|objects|turtleneck|高領毛衣|jersey de cuello alto|pull à col roulé|dolcevita
noun|objects|down jacket|羽絨外套|plumífero;chaqueta de plumas|doudoune|piumino
noun|objects|windbreaker|防風外套|cortavientos|coupe-vent|giacca a vento
noun|objects|trench coat|風衣|gabardina|trench|trench
noun|objects|shawl|披肩|chal|châle|scialle
noun|objects|mitten|連指手套|manopla|moufle|muffola
noun|objects|beanie|毛帽|gorro|bonnet|berretto
noun|objects|baseball cap|棒球帽|gorra|casquette|cappellino da baseball
noun|objects|straw hat|草帽|sombrero de paja|chapeau de paille|cappello di paglia
noun|objects|wristwatch|手錶|reloj de pulsera|montre|orologio da polso
noun|objects|keychain|鑰匙圈|llavero|porte-clés|portachiavi
noun|objects|fanny pack|腰包|riñonera|sac banane|marsupio
noun|objects|rain boot|雨靴|bota de agua;bota de lluvia|botte de pluie|stivale di gomma
noun|objects|high heels|高跟鞋|zapatos de tacón|chaussures à talons|scarpe con il tacco
noun|objects|loafer|樂福鞋|mocasín|mocassin|mocassino
noun|objects|leather shoes|皮鞋|zapatos de cuero|chaussures en cuir|scarpe di pelle
noun|objects|shoelace|鞋帶|cordón|lacet|laccio
noun|objects|collar|領子|cuello|col|colletto
noun|objects|needle|針|aguja|aiguille|ago
noun|objects|stain|污漬|mancha|tache|macchia
noun|objects|fur|毛皮|piel|fourrure|pelliccia
noun|objects|linen|亞麻|lino|lin|lino
noun|objects|denim|牛仔布|tela vaquera;mezclilla|denim|denim
noun|objects|nylon|尼龍|nailon;nylon|nylon|nylon
noun|objects|polyester|聚酯纖維|poliéster|polyester|poliestere
noun|objects|velvet|天鵝絨|terciopelo|velours|velluto
noun|objects|lace|蕾絲|encaje|dentelle|pizzo
noun|objects|concrete|混凝土|hormigón;concreto|béton|calcestruzzo
noun|objects|cement|水泥|cemento|ciment|cemento
noun|objects|aluminum;aluminium|鋁|aluminio|aluminium|alluminio
noun|objects|copper|銅|cobre|cuivre|rame
noun|objects|marble|大理石|mármol|marbre|marmo
noun|objects|porcelain|瓷器|porcelana|porcelaine|porcellana
noun|objects|clay|黏土|arcilla|argile|argilla
noun|objects|tile|瓷磚|azulejo;baldosa|carreau|piastrella
noun|objects|cardboard box|紙箱|caja de cartón|carton|scatola di cartone
noun|objects|earphone case|耳機盒|estuche de auriculares|boîtier d'écouteurs|custodia per auricolari
noun|objects|earphones|耳機|auriculares|écouteurs|auricolari
noun|other|fuchsia|紫紅色|fucsia|fuchsia|fucsia
noun|other|navy blue|藏青色;海軍藍;深藍色|azul marino|bleu marine|blu marino
noun|other|turquoise|土耳其藍;藍綠色|turquesa|turquoise|turchese
noun|other|burgundy|酒紅色|granate;burdeos|bordeaux|bordeaux
noun|other|lilac|淡紫色|lila|lilas|lilla
noun|other|khaki|卡其色|caqui|kaki|cachi
noun|other|light blue|淺藍色|azul claro|bleu clair|azzurro
noun|other|dark blue|深藍色|azul oscuro|bleu foncé|blu scuro
noun|other|sky blue|天藍色|azul cielo|bleu ciel|celeste
noun|other|cube|立方體|cubo|cube|cubo
noun|other|sphere|球體|esfera|sphère|sfera
noun|other|pyramid|金字塔|pirámide|pyramide|piramide
noun|other|stripe|條紋|raya|rayure|riga
adjective|other|striped|有條紋的;條紋的|a rayas|rayé;rayée|a righe
adjective|other|checked|格子的|de cuadros|à carreaux|a quadri
adjective|other|plain|素色的|liso;lisa|uni;unie|tinta unita
adjective|other|colorful;colourful|色彩繽紛的|colorido;colorida|coloré;colorée|colorato;colorata
adjective|other|loose|寬鬆的|holgado;holgada|ample|ampio;ampia
adjective|other|wrinkled|皺的|arrugado;arrugada|froissé;froissée|stropicciato;stropicciata
adjective|other|cozy;cosy|溫馨的|acogedor;acogedora|cosy|accogliente
adjective|other|spacious|寬敞的|espacioso;espaciosa|spacieux;spacieuse|spazioso;spaziosa
adjective|other|waterproof|防水的|impermeable|imperméable|impermeabile
adjective|other|disposable|一次性的;拋棄式的|desechable|jetable|usa e getta
adjective|other|foldable|可摺疊的;可折疊的|plegable|pliant;pliante|pieghevole
adjective|other|washable|可水洗的|lavable|lavable|lavabile
adjective|other|slippery|滑的|resbaladizo;resbaladiza|glissant;glissante|scivoloso;scivolosa
adjective|other|smooth|光滑的|liso;lisa|lisse|liscio;liscia
adjective|other|rough|粗糙的|áspero;áspera|rugueux;rugueuse|ruvido;ruvida
adjective|other|clogged|堵塞的|atascado;atascada|bouché;bouchée|intasato;intasata
verb|actions|mop the floor|拖地|fregar el suelo;trapear|passer la serpillière|lavare il pavimento
verb|actions|vacuum|吸地|pasar la aspiradora|passer l'aspirateur|passare l'aspirapolvere
verb|actions|wipe the table|擦桌子|limpiar la mesa|essuyer la table|pulire il tavolo
verb|actions|scrub|刷洗|fregar|frotter|strofinare
verb|actions|rinse|沖洗|enjuagar|rincer|sciacquare
verb|actions|soak|浸泡|remojar|faire tremper|ammollare
verb|actions|do the ironing|燙衣服|planchar|repasser|stirare
verb|actions|shrink|縮水|encoger|rétrécir|restringersi
verb|actions|tie your shoes|綁鞋帶|atarse los cordones|lacer ses chaussures|allacciarsi le scarpe
verb|actions|assemble|組裝|montar|monter|montare
verb|actions|unscrew|拆下螺絲;旋開|desatornillar|dévisser|svitare
verb|actions|tighten|鎖緊|apretar|serrer|stringere
verb|actions|drip|滴水|gotear|goutter|gocciolare
verb|actions|plug in|插電|enchufar|brancher|attaccare la spina
verb|actions|unplug|拔掉插頭|desenchufar|débrancher|staccare la spina
noun|other|leak|漏水|fuga|fuite|perdita
noun|other|crack|裂縫|grieta|fissure|crepa
noun|other|rust|鐵鏽;鏽|óxido|rouille|ruggine
noun|other|mold;mould|黴菌;霉|moho|moisissure|muffa
noun|other|chore|家務事;家事|tarea doméstica|corvée|faccenda
noun|other|spring cleaning|大掃除|limpieza de primavera;limpieza general|grand ménage|pulizie di primavera
noun|other|daily routine|日常作息;作息|rutina diaria|routine quotidienne|routine quotidiana
noun|objects|kitchen counter|流理台|encimera|plan de travail|piano di lavoro
verb|actions|sleep in|睡懶覺|dormir hasta tarde|faire la grasse matinée|dormire fino a tardi
verb|actions|stay up late|熬夜|trasnochar|veiller tard|fare le ore piccole
verb|actions|oversleep|睡過頭|quedarse dormido|se réveiller en retard|svegliarsi tardi
verb|actions|set an alarm|設鬧鐘|poner la alarma|mettre un réveil|mettere la sveglia
verb|actions|wash your face|洗臉|lavarse la cara|se laver le visage|lavarsi il viso
verb|actions|comb your hair|梳頭髮|peinarse|se peigner|pettinarsi
verb|actions|put on makeup|化妝|maquillarse|se maquiller|truccarsi
verb|actions|take off makeup|卸妝|desmaquillarse|se démaquiller|struccarsi
verb|actions|dry your hair|吹頭髮|secarse el pelo|se sécher les cheveux|asciugarsi i capelli
verb|actions|get a haircut|剪頭髮|cortarse el pelo|se faire couper les cheveux|tagliarsi i capelli
verb|actions|water the plants|澆花|regar las plantas|arroser les plantes|annaffiare le piante
verb|actions|walk the dog|遛狗|pasear al perro|promener le chien|portare a spasso il cane
verb|actions|set the table|擺碗筷;擺餐具|poner la mesa|mettre la table|apparecchiare la tavola
verb|actions|clear the table|收拾餐桌|recoger la mesa;quitar la mesa|débarrasser la table|sparecchiare la tavola
verb|actions|lock the door|鎖門|cerrar la puerta con llave|fermer la porte à clé|chiudere la porta a chiave
verb|actions|open the door|開門|abrir la puerta|ouvrir la porte|aprire la porta
verb|actions|close the door|關門|cerrar la puerta|fermer la porte|chiudere la porta
verb|actions|turn on the light|開燈|encender la luz|allumer la lumière|accendere la luce
verb|actions|turn off the light|關燈|apagar la luz|éteindre la lumière|spegnere la luce
verb|actions|charge the phone|幫手機充電|cargar el móvil;cargar el celular|charger le téléphone|caricare il telefono
verb|actions|come home|回家|volver a casa|rentrer à la maison|tornare a casa
verb|actions|pay the rent|付房租|pagar el alquiler|payer le loyer|pagare l'affitto
verb|actions|move in|搬進去;入住|mudarse|emménager|trasferirsi
verb|actions|hang a picture|掛畫|colgar un cuadro|accrocher un tableau|appendere un quadro
noun|other|haircut|剪髮;理髮|corte de pelo|coupe de cheveux|taglio di capelli
noun|people|barber|理髮師|barbero|barbier|barbiere
noun|people|locksmith|鎖匠|cerrajero;cerrajera|serrurier;serrurière|fabbro
noun|objects|plane|飛機|avión|avion|aereo
noun|objects|bike|腳踏車;單車|bici;bicicleta|vélo|bici;bicicletta
noun|other|journey|旅程|viaje|voyage|viaggio
noun|other|tourism|觀光|turismo|tourisme|turismo
noun|other|transportation;transport|交通|transporte|transport|trasporto
noun|other|public transportation|大眾運輸|transporte público|transports en commun|mezzi pubblici
noun|other|destination|目的地|destino|destination|destinazione
noun|other|route|路線|ruta|itinéraire|percorso
noun|other|distance|距離|distancia|distance|distanza
noun|other|departure|出發|salida|départ|partenza
noun|other|arrival|抵達;到達|llegada|arrivée|arrivo
noun|other|accommodation|住宿|alojamiento|hébergement|alloggio
noun|other|booking|預訂|reserva|réservation|prenotazione
noun|other|cancellation|取消|cancelación|annulation|cancellazione
noun|other|airline|航空公司|aerolínea|compagnie aérienne|compagnia aerea
noun|objects|bus station|客運站|estación de autobuses|gare routière|stazione degli autobus
noun|objects|resort|度假村|complejo turístico|complexe hôtelier|villaggio turistico
noun|objects|guesthouse|民宿|casa de huéspedes|maison d'hôtes|pensione
noun|objects|lobby|大廳|vestíbulo|hall|hall
noun|objects|single room|單人房|habitación individual|chambre simple|camera singola
noun|objects|double room|雙人房|habitación doble|chambre double|camera doppia
noun|other|room service|客房服務|servicio de habitaciones|service en chambre|servizio in camera
adjective|other|fully booked|客滿|completo;completa|complet;complète|al completo
noun|objects|landscape|風景|paisaje|paysage|paesaggio
noun|other|view|景色|vista|vue|vista
noun|objects|field|田野|campo|champ|campo
noun|objects|rock|岩石|roca|rocher|roccia
noun|objects|stream|小溪|arroyo|ruisseau|ruscello
noun|objects|bay|海灣|bahía|baie|baia
noun|objects|shore|岸邊|orilla|rivage|riva
noun|objects|trail|步道|sendero|sentier|sentiero
noun|objects|path|小路|camino|chemin|sentiero
noun|objects|national park|國家公園|parque nacional|parc national|parco nazionale
noun|objects|hot spring|溫泉|fuente termal|source chaude|sorgente termale
noun|other|region|地區|región|région|regione
other|other|abroad|國外|en el extranjero|à l'étranger|all'estero
noun|people|backpacker|背包客|mochilero;mochilera|routard;routarde|saccopelista
noun|people|pedestrian|行人|peatón;peatona|piéton;piétonne|pedone
noun|people|astronaut|太空人|astronauta|astronaute|astronauta
noun|people|explorer|探險家|explorador;exploradora|explorateur;exploratrice|esploratore;esploratrice
noun|other|adventure|冒險|aventura|aventure|avventura
noun|objects|insect|昆蟲|insecto|insecte|insetto
noun|objects|pet|寵物|mascota|animal de compagnie|animale domestico
noun|objects|wild animal|野生動物|animal salvaje|animal sauvage|animale selvatico
noun|objects|creature|生物|criatura|créature|creatura
noun|objects|deer|鹿|ciervo|cerf|cervo
noun|objects|dolphin|海豚|delfín|dauphin|delfino
noun|objects|giraffe|長頸鹿|jirafa|girafe|giraffa
noun|objects|mosquito|蚊子|mosquito|moustique|zanzara
noun|objects|octopus|章魚|pulpo|pieuvre|polpo
noun|objects|pigeon|鴿子|paloma|pigeon|piccione
noun|objects|puppy|小狗|cachorro|chiot|cucciolo
noun|objects|kitten|小貓|gatito|chaton|gattino
noun|objects|tail|尾巴|cola|queue|coda
noun|objects|wing|翅膀|ala|aile|ala
noun|objects|feather|羽毛|pluma|plume|piuma
noun|objects|nest|鳥巢|nido|nid|nido
noun|objects|rose|玫瑰|rosa|rose|rosa
noun|objects|sunflower|向日葵|girasol|tournesol|girasole
noun|objects|bamboo|竹子|bambú|bambou|bambù
noun|objects|palm tree|棕櫚樹|palmera|palmier|palma
noun|objects|pine tree|松樹|pino|pin|pino
noun|objects|cherry blossom|櫻花|flor de cerezo|fleur de cerisier|fiore di ciliegio
noun|objects|bush|灌木|arbusto|buisson|cespuglio
noun|objects|lawn|草坪;草皮|césped|pelouse|prato
noun|objects|weed|雜草|mala hierba|mauvaise herbe|erbaccia
noun|other|heat|炎熱|calor|chaleur|caldo
noun|other|forecast|預報|pronóstico|prévision|previsione
noun|other|breeze|微風|brisa|brise|brezza
noun|other|thunderstorm|雷雨|tormenta eléctrica|orage|temporale
noun|other|heat wave|熱浪|ola de calor|canicule|ondata di caldo
noun|other|rainy season|雨季|temporada de lluvias|saison des pluies|stagione delle piogge
noun|other|tornado|龍捲風|tornado|tornade|tornado
noun|other|drizzle|毛毛雨|llovizna|bruine|pioggerella
noun|other|heavy rain|大雨|lluvia fuerte|forte pluie|pioggia forte
noun|other|hail|冰雹|granizo|grêle|grandine
noun|other|frost|霜|escarcha|givre|brina
noun|objects|snowflake|雪花|copo de nieve|flocon de neige|fiocco di neve
noun|objects|snowman|雪人|muñeco de nieve|bonhomme de neige|pupazzo di neve
noun|objects|puddle|水坑|charco|flaque|pozzanghera
noun|other|shade|陰涼處|sombra|ombre|ombra
adjective|other|foggy|有霧|neblinoso;neblinosa|brumeux;brumeuse|nebbioso;nebbiosa
adjective|other|snowy|多雪|nevoso;nevosa|neigeux;neigeuse|nevoso;nevosa
adjective|other|freezing|冰冷|helado;helada|glacial;glaciale|gelido;gelida
adjective|other|mild|溫和|templado;templada|doux;douce|mite
phrase|other|below zero|零下|bajo cero|en dessous de zéro|sotto zero
noun|objects|outer space|外太空|espacio exterior|espace|spazio
noun|objects|universe|宇宙|universo|univers|universo
noun|objects|galaxy|星系|galaxia|galaxie|galassia
noun|objects|solar system|太陽系|sistema solar|système solaire|sistema solare
noun|objects|full moon|滿月|luna llena|pleine lune|luna piena
noun|objects|shooting star|流星|estrella fugaz|étoile filante|stella cadente
noun|other|meteor shower|流星雨|lluvia de estrellas|pluie d'étoiles filantes|sciame meteorico
noun|other|solar eclipse|日食;日蝕|eclipse solar|éclipse solaire|eclissi solare
noun|other|moonlight|月光|luz de luna|clair de lune|chiaro di luna
noun|other|dawn|黎明|amanecer|aube|alba
noun|other|dusk|黃昏|anochecer|crépuscule|crepuscolo
noun|other|darkness|黑暗|oscuridad|obscurité|oscurità
noun|other|horizon|地平線|horizonte|horizon|orizzonte
noun|other|Ghost Festival|中元節|Festival de los Fantasmas|fête des Fantômes|Festa dei fantasmi
noun|other|Lunar New Year's Eve|除夕|Nochevieja china|veille du Nouvel An chinois|vigilia del Capodanno cinese
noun|other|New Year's Eve|跨年夜|Nochevieja|Saint-Sylvestre|San Silvestro
noun|other|New Year's Day|元旦|día de Año Nuevo|jour de l'An|Capodanno
noun|other|Christmas Eve|平安夜|Nochebuena|veille de Noël|vigilia di Natale
noun|other|Valentine's Day|情人節|día de San Valentín|Saint-Valentin|San Valentino
noun|other|Mother's Day|母親節|día de la Madre|fête des Mères|festa della mamma
noun|other|Father's Day|父親節|día del Padre|fête des Pères|festa del papà
noun|other|Thanksgiving|感恩節|día de Acción de Gracias|Thanksgiving|festa del Ringraziamento
noun|other|Labor Day;Labour Day|勞動節|día del Trabajo|fête du Travail|festa dei lavoratori
noun|other|public holiday|國定假日|día festivo|jour férié|giorno festivo
noun|other|long weekend|連假|fin de semana largo|week-end prolongé|weekend lungo
noun|other|summer vacation|暑假|vacaciones de verano|vacances d'été|vacanze estive
noun|other|winter vacation|寒假|vacaciones de invierno|vacances d'hiver|vacanze invernali
noun|objects|fireworks|煙火|fuegos artificiales|feu d'artifice|fuochi d'artificio
noun|objects|firecracker|鞭炮|petardo|pétard|petardo
noun|objects|lantern|燈籠|farol|lanterne|lanterna
noun|objects|sky lantern|天燈|farolillo volador|lanterne céleste|lanterna volante
noun|objects|mooncake|月餅|pastel de luna|gâteau de lune|torta della luna
noun|objects|rice dumpling|粽子|zongzi|zongzi|zongzi
noun|objects|dragon boat|龍舟|barco dragón|bateau-dragon|barca drago
noun|objects|Christmas tree|聖誕樹|árbol de Navidad|sapin de Noël|albero di Natale
noun|people|Santa Claus|聖誕老人|Papá Noel|père Noël|Babbo Natale
noun|other|parade|遊行|desfile|défilé|sfilata
noun|other|carnival|嘉年華|carnaval|carnaval|carnevale
noun|other|celebration|慶祝活動|celebración|célébration|celebrazione
noun|other|countdown|倒數|cuenta atrás;cuenta regresiva|compte à rebours|conto alla rovescia
phrase|other|happy holidays|節日快樂|felices fiestas|joyeuses fêtes|buone feste
phrase|other|have a safe trip|一路平安|buen viaje|bon voyage|buon viaggio
phrase|other|have a good flight|飛行愉快|buen vuelo|bon vol|buon volo
phrase|other|how do I get to|怎麼去|cómo llego a|comment aller à|come arrivo a
phrase|other|is it far|遠嗎|está lejos|c'est loin|è lontano
phrase|other|around the corner|在轉角|a la vuelta de la esquina|au coin de la rue|dietro l'angolo
verb|actions|ask for directions|問路|preguntar el camino|demander son chemin|chiedere indicazioni
verb|actions|go camping|去露營|ir de camping;ir de acampada|faire du camping|andare in campeggio
verb|actions|board a plane|登機|embarcar|embarquer|imbarcarsi
verb|actions|depart|出發|salir|partir|partire
verb|actions|explore|探索|explorar|explorer|esplorare
verb|actions|sail|航行|navegar|naviguer|navigare
verb|actions|miss the bus|錯過公車|perder el autobús|rater le bus|perdere l'autobus
verb|actions|accelerate|加速|acelerar|accélérer|accelerare
verb|actions|drift|漂流|ir a la deriva|dériver|andare alla deriva
verb|actions|drown|溺水|ahogarse|se noyer|annegare
verb|actions|freeze|結冰|helar|geler|gelare
verb|actions|melt|融化|derretirse|fondre|sciogliersi
verb|actions|blow|吹|soplar|souffler|soffiare
verb|actions|shine|照耀|brillar|briller|splendere
verb|actions|bloom|開花|florecer|fleurir|fiorire
verb|actions|wither|枯萎|marchitarse|se faner|appassire
verb|actions|hunt|打獵|cazar|chasser|cacciare
verb|actions|bark|吠|ladrar|aboyer|abbaiare
verb|actions|sting|叮|picar|piquer|pungere
verb|actions|mow the lawn|割草|cortar el césped|tondre la pelouse|tagliare l'erba
verb|actions|prune|修剪|podar|élaguer|potare
other|other|nearby|附近|cerca|à proximité|nelle vicinanze
other|other|meow|喵|miau|miaou|miao
adjective|other|wild|野生|salvaje|sauvage|selvatico;selvatica
adjective|other|tropical|熱帶|tropical|tropical;tropicale|tropicale
adjective|other|remote|偏遠|remoto;remota|isolé;isolée|isolato;isolata
adjective|other|outdoor|戶外|al aire libre|en plein air|all'aperto
adjective|other|ancient|古代|antiguo;antigua|ancien;ancienne|antico;antica
adjective|other|luxurious|奢華|lujoso;lujosa|luxueux;luxueuse|lussuoso;lussuosa
adjective|other|picturesque|風景如畫|pintoresco;pintoresca|pittoresque|pittoresco;pittoresca
adjective|other|quaint|古色古香|con encanto|pittoresque|caratteristico;caratteristica
adjective|other|vast|廣闊|vasto;vasta|vaste|vasto;vasta
noun|objects|terminal|航廈|terminal|terminal|terminal
noun|objects|runway|跑道|pista|piste|pista
noun|other|takeoff|起飛|despegue|décollage|decollo
noun|other|landing|降落|aterrizaje|atterrissage|atterraggio
noun|other|layover|轉機|escala|escale|scalo
noun|other|connecting flight|轉機航班|vuelo de conexión|vol de correspondance|volo in coincidenza
noun|other|direct flight|直飛航班|vuelo directo|vol direct|volo diretto
noun|other|domestic flight|國內航班|vuelo nacional|vol intérieur|volo nazionale
noun|other|international flight|國際航班|vuelo internacional|vol international|volo internazionale
noun|objects|carry-on|隨身行李|equipaje de mano|bagage à main|bagaglio a mano
noun|objects|checked baggage|托運行李|equipaje facturado|bagage en soute|bagaglio da stiva
noun|objects|baggage claim|行李提領處|recogida de equipajes|retrait des bagages|ritiro bagagli
noun|objects|duty-free shop|免稅店|tienda libre de impuestos|boutique hors taxes|negozio duty free
noun|objects|passport control|證照查驗|control de pasaportes|contrôle des passeports|controllo passaporti
noun|other|economy class|經濟艙|clase turista;clase económica|classe économique|classe economica
noun|other|business class|商務艙|clase business|classe affaires|classe business
noun|other|first class|頭等艙|primera clase|première classe|prima classe
noun|objects|life jacket|救生衣|chaleco salvavidas|gilet de sauvetage|giubbotto di salvataggio
noun|other|travel insurance|旅遊保險|seguro de viaje|assurance voyage|assicurazione di viaggio
noun|objects|guidebook|旅遊指南|guía de viaje|guide de voyage|guida turistica
noun|objects|postcard|明信片|postal|carte postale|cartolina
noun|objects|souvenir shop|紀念品店|tienda de recuerdos|boutique de souvenirs|negozio di souvenir
noun|other|entrance fee|入場費|precio de entrada|prix d'entrée|prezzo d'ingresso
noun|objects|tourist office|遊客中心|oficina de turismo|office de tourisme|ufficio turistico
noun|other|tour group|旅行團|grupo turístico|groupe de touristes|gruppo turistico
noun|objects|tour bus|遊覽車|autobús turístico|car de tourisme|pullman turistico
noun|other|day trip|一日遊|excursión de un día|excursion d'une journée|gita di un giorno
noun|other|road trip|公路旅行|viaje por carretera|road trip|viaggio in macchina
noun|other|cruise|郵輪旅遊|crucero|croisière|crociera
noun|objects|yacht|遊艇|yate|yacht|yacht
noun|objects|hot-air balloon|熱氣球|globo aerostático|montgolfière|mongolfiera
noun|objects|van|廂型車|furgoneta|camionnette|furgone
noun|objects|railway;railroad|鐵路|ferrocarril|chemin de fer|ferrovia
noun|other|fare|車資|tarifa|tarif|tariffa
noun|other|speed limit|速限|límite de velocidad|limitation de vitesse|limite di velocità
noun|objects|lane|車道|carril|voie|corsia
noun|objects|one-way street|單行道|calle de sentido único|rue à sens unique|strada a senso unico
noun|objects|dead end|死巷|callejón sin salida|impasse|vicolo cieco
noun|objects|roundabout|圓環|rotonda;glorieta|rond-point|rotatoria
noun|objects|city block|街區|manzana;cuadra|pâté de maisons|isolato
noun|objects|pavement|人行道|acera|trottoir|marciapiede
noun|other|car accident|車禍|accidente de tráfico|accident de voiture|incidente stradale
noun|other|shortcut|捷徑|atajo|raccourci|scorciatoia
noun|other|lost and found|失物招領|objetos perdidos|objets trouvés|oggetti smarriti
noun|other|northeast|東北|noreste|nord-est|nord-est
noun|other|northwest|西北|noroeste|nord-ouest|nord-ovest
noun|other|southeast|東南|sureste|sud-est|sud-est
noun|other|southwest|西南|suroeste|sud-ouest|sud-ovest
noun|objects|harbor;harbour|港灣|puerto|port|porto
noun|objects|pier|碼頭|muelle|jetée|molo
noun|objects|suburb|郊區|afueras|banlieue|periferia
noun|objects|old town|舊城區|casco antiguo|vieille ville|centro storico
noun|objects|landmark|地標|lugar emblemático|lieu emblématique|luogo simbolo
noun|objects|monument|紀念碑|monumento|monument|monumento
noun|objects|ruin|遺跡|ruina|ruine|rovina
noun|objects|cathedral|大教堂|catedral|cathédrale|cattedrale
noun|objects|botanical garden|植物園|jardín botánico|jardin botanique|orto botanico
noun|objects|theme park|主題樂園|parque temático|parc à thème|parco a tema
noun|objects|playground|遊樂場|parque infantil|aire de jeux|parco giochi
noun|objects|cemetery|墓園|cementerio|cimetière|cimitero
noun|objects|viewpoint|觀景台|mirador|belvédère|belvedere
noun|other|night view|夜景|vista nocturna|vue de nuit|vista notturna
noun|objects|cityscape|城市景觀|paisaje urbano|paysage urbain|paesaggio urbano
noun|objects|utility pole|電線桿|poste eléctrico|poteau électrique|palo della luce
noun|objects|fire hydrant|消防栓|hidrante|borne d'incendie|idrante
noun|objects|hometown|家鄉|ciudad natal|ville natale|città natale
noun|objects|county|縣|condado|comté|contea
noun|objects|province|省|provincia|province|provincia
noun|objects|rice paddy|稻田|arrozal|rizière|risaia
noun|objects|orchard|果園|huerto frutal|verger|frutteto
noun|objects|vineyard|葡萄園|viñedo|vignoble|vigneto
noun|objects|tea plantation|茶園|plantación de té|plantation de thé|piantagione di tè
noun|objects|cabin|小木屋|cabaña|cabane|capanna
noun|objects|windmill|風車|molino de viento|moulin à vent|mulino a vento
noun|objects|dam|水壩|presa|barrage|diga
noun|objects|canal|運河|canal|canal|canale
noun|objects|peak|山峰|pico|pic|picco
noun|objects|mountain range|山脈|cordillera|chaîne de montagnes|catena montuosa
noun|objects|canyon|峽谷|cañón|canyon|canyon
noun|objects|glacier|冰河|glaciar|glacier|ghiacciaio
noun|objects|peninsula|半島|península|péninsule|penisola
noun|objects|continent|洲|continente|continent|continente
noun|other|altitude|海拔;海拔高度|altitud|altitude|altitudine
noun|other|tide|潮汐|marea|marée|marea
noun|other|natural wonder|天然奇景|maravilla natural|merveille naturelle|meraviglia naturale
noun|other|fresh air|新鮮空氣|aire fresco|air frais|aria fresca
noun|other|cold wave|寒流|ola de frío|vague de froid|ondata di freddo
noun|other|rain shower|陣雨|chubasco|averse|acquazzone
noun|objects|fossil|化石|fósil|fossile|fossile
noun|objects|tulip|鬱金香|tulipán|tulipe|tulipano
noun|objects|lotus|蓮花|loto|lotus|loto
noun|objects|orchid|蘭花|orquídea|orchidée|orchidea
noun|objects|lavender|薰衣草|lavanda|lavande|lavanda
noun|objects|jasmine|茉莉花|jazmín|jasmin|gelsomino
noun|objects|plum blossom|梅花|flor de ciruelo|fleur de prunier|fiore di pruno
noun|objects|cactus|仙人掌|cactus|cactus|cactus
noun|objects|oak|橡樹|roble|chêne|quercia
noun|objects|maple|楓樹|arce|érable|acero
noun|objects|petal|花瓣|pétalo|pétale|petalo
noun|objects|stump|樹樁|tocón|souche|ceppo
noun|objects|bouquet|花束|ramo de flores|bouquet|mazzo di fiori
noun|objects|rhinoceros|犀牛|rinoceronte|rhinocéros|rinoceronte
noun|objects|polar bear|北極熊|oso polar|ours polaire|orso polare
noun|objects|seal|海豹|foca|phoque|foca
noun|objects|sea turtle|海龜|tortuga marina|tortue de mer|tartaruga marina
noun|objects|abalone|鮑魚|abulón|ormeau|abalone
noun|objects|bat|蝙蝠|murciélago|chauve-souris|pipistrello
noun|objects|buffalo|水牛|búfalo|buffle|bufalo
noun|objects|bull|公牛|toro|taureau|toro
noun|objects|donkey|驢子|burro|âne|asino
noun|objects|crow|烏鴉|cuervo|corbeau|corvo
noun|objects|seagull|海鷗|gaviota|mouette|gabbiano
noun|objects|caterpillar|毛毛蟲|oruga|chenille|bruco
noun|objects|firefly|螢火蟲|luciérnaga|luciole|lucciola
noun|objects|paw|爪子|pata|patte|zampa
noun|objects|dragon|龍|dragón|dragon|drago
noun|objects|kimchi|泡菜;韓式泡菜|kimchi|kimchi|kimchi
noun|objects|cola|可樂|refresco de cola;cola|cola|cola
noun|objects|soju|燒酒|soju|soju|soju
noun|objects|tap water|自來水|agua del grifo;agua de la llave|eau du robinet|acqua del rubinetto
noun|objects|ramen|拉麵|ramen|ramen|ramen
noun|objects|spaghetti|義大利麵|espagueti;espaguetis|spaghetti|spaghetti
noun|objects|pancake|鬆餅|panqueque;tortita|pancake|pancake
noun|objects|crepe|可麗餅|crepe;crepa|crêpe|crêpe
noun|objects|omelet|歐姆蛋;煎蛋捲|tortilla francesa;omelette|omelette|omelette
noun|objects|stew|燉菜|estofado|ragoût|stufato
noun|objects|pie|派|tarta;pastel|tarte|crostata
noun|objects|pudding|布丁|pudín;flan|pudding;flan|budino
noun|objects|jelly|果凍|gelatina|gelée|gelatina
noun|objects|potato chips|洋芋片|patatas fritas;papas fritas|chips|patatine
noun|objects|whipped cream|鮮奶油|nata montada;crema batida|crème chantilly|panna montata
noun|objects|espresso|濃縮咖啡|café expreso;espresso|expresso;espresso|espresso
noun|objects|cappuccino|卡布奇諾|capuchino;cappuccino|cappuccino|cappuccino
noun|objects|iced coffee|冰咖啡|café helado|café glacé|caffè freddo
noun|objects|black coffee|黑咖啡|café negro;café solo|café noir|caffè nero
noun|objects|lemonade|檸檬水|limonada|citronnade|limonata
noun|objects|smoothie|冰沙;果昔|batido;smoothie|smoothie|frullato
noun|objects|tea bag|茶包|bolsita de té|sachet de thé|bustina di tè
noun|objects|oolong tea|烏龍茶|té oolong|thé oolong|tè oolong
noun|objects|herbal tea|花草茶|infusión|tisane|tisana
noun|objects|matcha|抹茶|matcha|matcha|matcha
noun|objects|sake|清酒|sake|saké|sake;sakè
noun|people|bartender|調酒師|barman;bartender|barman|barman
noun|objects|brown sugar|黑糖;紅糖|azúcar moreno|sucre roux;cassonade|zucchero di canna
noun|objects|peanut butter|花生醬|mantequilla de maní;crema de cacahuete|beurre de cacahuète|burro di arachidi
noun|objects|sesame oil|麻油;芝麻油|aceite de sésamo|huile de sésame|olio di sesamo
noun|objects|turkey|火雞|pavo|dinde|tacchino
noun|objects|pork ribs|排骨|costillas de cerdo|travers de porc|costine di maiale
noun|objects|minced meat|絞肉|carne picada;carne molida|viande hachée|carne macinata
noun|objects|chicken wing|雞翅|ala de pollo|aile de poulet|aletta di pollo
noun|objects|chicken breast|雞胸肉|pechuga de pollo|blanc de poulet|petto di pollo
noun|objects|fried chicken|炸雞|pollo frito|poulet frit|pollo fritto
noun|objects|roast chicken|烤雞|pollo asado|poulet rôti|pollo arrosto
noun|objects|radish|小蘿蔔;櫻桃蘿蔔|rábano|radis|ravanello
noun|objects|bok choy|青江菜|col china;bok choy|pak-choï|pak choi
noun|objects|bamboo shoot|竹筍|brote de bambú|pousse de bambou|germoglio di bambù
noun|objects|seaweed|海藻|alga|algue|alga
noun|objects|green bean|四季豆|judía verde;ejote|haricot vert|fagiolino
noun|objects|coriander;cilantro|香菜|cilantro;culantro|coriandre|coriandolo
noun|objects|parsley|巴西里|perejil|persil|prezzemolo
noun|objects|basil|羅勒|albahaca|basilic|basilico
noun|objects|mint|薄荷|menta|menthe|menta
noun|objects|herb|香草植物;香草|hierba aromática|herbe aromatique|erba aromatica
noun|objects|melon|哈密瓜|melón|melon|melone
noun|objects|lime|萊姆|lima|citron vert|lime
noun|objects|raisin|葡萄乾|pasa|raisin sec|uvetta
noun|objects|walnut|核桃|nuez|noix|noce
noun|objects|chestnut|栗子|castaña|châtaigne|castagna
noun|objects|boiled egg|水煮蛋|huevo cocido|œuf dur|uovo sodo
noun|objects|scrambled eggs|炒蛋|huevos revueltos|œufs brouillés|uova strapazzate
noun|objects|oats|燕麥片|copos de avena|flocons d'avoine|fiocchi d'avena
noun|objects|oyster sauce|蠔油|salsa de ostras|sauce d'huître|salsa di ostriche
noun|objects|chili sauce|辣椒醬|salsa picante|sauce pimentée|salsa piccante
noun|objects|broth|高湯|caldo|bouillon|brodo
noun|objects|pickle|酸黃瓜|pepinillo|cornichon|cetriolino
noun|objects|beef noodle soup|牛肉麵|sopa de fideos con carne de res|soupe de nouilles au bœuf|zuppa di noodle al manzo
noun|objects|braised pork rice|滷肉飯|arroz con cerdo estofado|riz au porc braisé|riso con maiale brasato
noun|objects|oyster omelet|蚵仔煎|tortilla de ostras|omelette aux huîtres|frittata di ostriche
noun|objects|scallion pancake|蔥油餅|tortita de cebolleta|galette à l'oignon vert|frittella di cipollotto
noun|objects|soup dumpling|小籠包|xiaolongbao|xiaolongbao|xiaolongbao
noun|objects|potsticker|鍋貼|gyoza|gyoza|gyoza
noun|objects|spring roll|春捲|rollito de primavera|rouleau de printemps|involtino primavera
noun|objects|rice ball|飯糰|bola de arroz|boule de riz|palla di riso
noun|objects|fried dough stick|油條|churro chino|beignet chinois|youtiao
noun|objects|congee|稀飯;粥|congee|congee|congee
noun|objects|pineapple cake|鳳梨酥|pastel de piña|gâteau à l'ananas|torta all'ananas
noun|objects|shaved ice|刨冰;剉冰|hielo raspado|glace pilée|ghiaccio tritato
noun|objects|tapioca pearl|珍珠|perla de tapioca|perle de tapioca|perla di tapioca
noun|objects|tea egg|茶葉蛋|huevo de té|œuf au thé|uovo al tè
noun|objects|oden|關東煮|oden|oden|oden
noun|objects|bento|便當|bento|bento|bento
noun|objects|tempura|天婦羅|tempura|tempura|tempura
noun|objects|udon|烏龍麵|udon|udon|udon
noun|objects|miso soup|味噌湯|sopa de miso|soupe miso|zuppa di miso
noun|objects|sashimi|生魚片|sashimi|sashimi|sashimi
noun|objects|dim sum|港式點心|dim sum|dim sum|dim sum
noun|objects|wonton|餛飩|wonton|wonton|wonton
noun|objects|steamed bun|包子|bollo al vapor|pain à la vapeur|panino al vapore
noun|objects|mochi|麻糬|mochi|mochi|mochi
noun|objects|taro|芋頭|taro|taro|taro
noun|objects|sticky rice|糯米|arroz glutinoso|riz gluant|riso glutinoso
noun|objects|rice noodles|米粉|fideos de arroz|nouilles de riz|noodle di riso
noun|objects|kebab|沙威瑪;土耳其烤肉|kebab|kebab|kebab
noun|objects|lasagna|千層麵|lasaña|lasagnes|lasagne
noun|objects|risotto|燉飯|risotto|risotto|risotto
noun|objects|bread roll|餐包;小麵包|panecillo|petit pain|panino
verb|actions|bake|烤;烘焙|hornear|cuire au four|cuocere al forno
verb|actions|boil|煮;煮沸|hervir|bouillir|bollire
verb|actions|fry|炸|freír|frire|friggere
verb|actions|stir-fry|炒|saltear|faire sauter|saltare in padella
verb|actions|grill|烤;燒烤|asar a la parrilla|griller|grigliare
verb|actions|roast|烤|asar|rôtir|arrostire
verb|actions|steam|蒸|cocer al vapor|cuire à la vapeur|cuocere a vapore
verb|actions|stir|攪拌|remover|remuer|mescolare
verb|actions|pour|倒|verter|verser|versare
verb|actions|chop|切碎|picar|hacher|tritare
verb|actions|slice|切片|cortar en rodajas|couper en tranches|affettare
verb|actions|peel|削皮;剝皮|pelar|éplucher|sbucciare
verb|actions|marinate|醃|marinar|mariner|marinare
verb|actions|simmer|燉|cocer a fuego lento|mijoter|cuocere a fuoco lento
verb|actions|defrost|解凍|descongelar|décongeler|scongelare
verb|actions|reheat|加熱|recalentar|réchauffer|riscaldare
verb|actions|serve|上菜|servir|servir|servire
verb|actions|chew|咀嚼;嚼|masticar|mâcher|masticare
verb|actions|swallow|吞|tragar|avaler|ingoiare
verb|actions|squeeze|擠|exprimir|presser|spremere
adjective|other|bland|沒味道|soso;sosa|fade|insipido;insipida
adjective|other|greasy|油膩|grasiento;grasienta|gras;grasse|unto;unta
adjective|other|crispy|酥脆|crujiente|croustillant;croustillante|croccante
adjective|other|juicy|多汁|jugoso;jugosa|juteux;juteuse|succoso;succosa
adjective|other|creamy|綿密|cremoso;cremosa|crémeux;crémeuse|cremoso;cremosa
adjective|other|rotten|腐爛|podrido;podrida|pourri;pourrie|marcio;marcia
adjective|other|ripe|成熟|maduro;madura|mûr;mûre|maturo;matura
adjective|other|fried|油炸的|frito;frita|frit;frite|fritto;fritta
adjective|other|boiled|水煮的|hervido;hervida|bouilli;bouillie|bollito;bollita
adjective|other|grilled|燒烤的;烤的|a la parrilla|grillé;grillée|alla griglia
adjective|other|steamed|蒸的|al vapor|à la vapeur|al vapore
adjective|other|smoked|煙燻的|ahumado;ahumada|fumé;fumée|affumicato;affumicata
adjective|other|sticky|黏的|pegajoso;pegajosa|collant;collante|appiccicoso;appiccicosa
adjective|other|homemade|自製的|casero;casera|fait maison|fatto in casa
adjective|other|organic|有機的|orgánico;orgánica|biologique;bio|biologico;biologica
adjective|other|vegan|純素的|vegano;vegana|végétalien;végétalienne|vegano;vegana
adjective|other|gluten-free|無麩質的|sin gluten|sans gluten|senza glutine
noun|other|aroma|香味;香氣|aroma|arôme|aroma
noun|other|appetite|胃口;食慾|apetito|appétit|appetito
noun|objects|freezer|冷凍庫|congelador|congélateur|congelatore
noun|objects|baking tray|烤盤|bandeja de horno|plaque de cuisson|teglia
noun|objects|steamer|蒸籠|vaporera|cuit-vapeur|vaporiera
noun|objects|pressure cooker|壓力鍋|olla a presión|autocuiseur;cocotte-minute|pentola a pressione
noun|objects|air fryer|氣炸鍋|freidora de aire|friteuse à air|friggitrice ad aria
noun|objects|jar|罐子;玻璃罐|frasco;tarro|bocal|barattolo
noun|objects|cutlery|餐具|cubiertos|couverts|posate
noun|objects|lunch box|便當盒|fiambrera;lonchera|boîte à repas|portapranzo
noun|objects|water bottle|水壺|botella de agua|gourde|borraccia
noun|objects|dining table|餐桌|mesa de comedor|table à manger|tavolo da pranzo
noun|objects|signature dish|招牌菜|especialidad de la casa|spécialité de la maison|specialità della casa
noun|objects|set meal|套餐|menú;combo|menu|menu fisso
noun|other|food delivery|外送|comida a domicilio|livraison de repas|consegna a domicilio
noun|objects|tea house|茶館|casa de té|salon de thé|sala da tè
noun|objects|bubble tea shop|手搖飲料店;手搖飲店|tienda de té de burbujas|boutique de bubble tea|negozio di bubble tea
noun|people|barista|咖啡師|barista|barista|barista
phrase|other|all-you-can-eat|吃到飽|buffet libre|à volonté|all you can eat
phrase|other|I'm full|我吃飽了|estoy lleno;estoy llena|je n'ai plus faim|sono pieno;sono piena
noun|other|boxing|拳擊|boxeo|boxe|boxe
noun|other|karate|空手道|kárate;karate|karaté|karate
noun|other|judo|柔道|judo;yudo|judo|judo
noun|other|martial arts|武術|artes marciales|arts martiaux|arti marziali
noun|other|cycling|單車運動|ciclismo|cyclisme|ciclismo
noun|other|surfing|衝浪|surf|surf|surf
noun|objects|skateboard|滑板|monopatín;patineta|skateboard|skateboard
noun|other|gymnastics|體操|gimnasia|gymnastique|ginnastica
noun|other|athletics|田徑|atletismo|athlétisme|atletica
noun|other|marathon|馬拉松|maratón|marathon|maratona
noun|other|weightlifting|舉重|halterofilia|haltérophilie|sollevamento pesi
noun|objects|treadmill|跑步機|cinta de correr|tapis de course|tapis roulant
noun|objects|yoga mat|瑜伽墊|esterilla de yoga|tapis de yoga|tappetino da yoga
noun|other|fitness|健身|fitness|fitness|fitness
noun|other|warm-up|熱身|calentamiento|échauffement|riscaldamento
noun|people|referee|裁判|árbitro;árbitra|arbitre|arbitro;arbitra
noun|other|tournament|錦標賽|torneo|tournoi|torneo
noun|other|league|聯賽|liga|championnat|campionato
noun|objects|medal|獎牌|medalla|médaille|medaglia
noun|objects|gold medal|金牌|medalla de oro|médaille d'or|medaglia d'oro
noun|objects|trophy|獎盃|trofeo|trophée|trofeo
noun|other|World Cup|世界盃|Mundial;Copa del Mundo|Coupe du monde|Coppa del Mondo
noun|people|opponent|對手|oponente;rival|adversaire|avversario;avversaria
noun|other|penalty kick|十二碼;十二碼罰球|penalti;penal|penalty|calcio di rigore;rigore
noun|people|winner|贏家|ganador;ganadora|gagnant;gagnante|vincitore;vincitrice
noun|people|loser|輸家|perdedor;perdedora|perdant;perdante|perdente
noun|people|teammate|隊友|compañero de equipo;compañera de equipo|coéquipier;coéquipière|compagno di squadra;compagna di squadra
noun|people|team captain|隊長|capitán;capitana|capitaine|capitano;capitana
noun|people|goalkeeper|守門員|portero;portera|gardien de but|portiere
noun|other|race|賽跑|carrera|course|corsa
noun|other|rock climbing|攀岩|escalada|escalade|arrampicata
noun|other|scuba diving|潛水|buceo|plongée sous-marine|immersione subacquea
noun|other|snorkeling|浮潛|esnórquel;snorkel|plongée avec tuba|snorkeling
noun|other|bowling|保齡球|bolos;boliche|bowling|bowling
noun|other|billiards|撞球|billar|billard|biliardo
noun|objects|jump rope|跳繩|cuerda de saltar;comba|corde à sauter|corda per saltare
noun|objects|frisbee|飛盤|frisbee;disco volador|frisbee|frisbee
noun|objects|kite|風箏|cometa;papalote|cerf-volant|aquilone
noun|objects|jersey|球衣|camiseta|maillot|maglia
noun|people|personal trainer|私人教練|entrenador personal;entrenadora personal|coach sportif|personal trainer
noun|objects|kettlebell|壺鈴|pesa rusa|kettlebell|kettlebell
noun|other|weight class|量級|categoría de peso|catégorie de poids|categoria di peso
noun|other|pommel horse|鞍馬|caballo con arcos|cheval d'arçons|cavallo con maniglie
noun|other|balance beam|平衡木|barra de equilibrio;viga|poutre|trave
noun|other|slam dunk|灌籃|mate;clavada|dunk|schiacciata
noun|people|contestant|參賽者|concursante|concurrent|concorrente
verb|actions|cheer|加油|animar|encourager|tifare
noun|other|puzzle|謎題|rompecabezas|casse-tête|rompicapo
noun|objects|dice|骰子|dado|dé|dado
noun|objects|deck of cards|一副撲克牌|baraja;mazo de cartas|jeu de cartes|mazzo di carte
noun|other|poker|撲克|póquer;póker|poker|poker
noun|other|mahjong|麻將|mahjong|mah-jong|mahjong
noun|objects|toy|玩具|juguete|jouet|giocattolo
noun|objects|doll|洋娃娃;娃娃|muñeca|poupée|bambola
noun|objects|game console|遊戲主機|consola|console de jeux|console
noun|other|lottery|彩券;樂透|lotería|loterie|lotteria
noun|objects|roller coaster|雲霄飛車|montaña rusa|grand huit;montagnes russes|ottovolante;montagne russe
noun|objects|Ferris wheel|摩天輪|noria;rueda de la fortuna|grande roue|ruota panoramica
noun|other|karaoke|卡拉OK;KTV|karaoke|karaoké|karaoke
noun|other|escape room|密室逃脫|escape room|escape game|escape room
verb|actions|bet|打賭|apostar|parier|scommettere
verb|actions|play cards|打牌|jugar a las cartas|jouer aux cartes|giocare a carte
verb|actions|play video games|打電動;玩電玩|jugar a videojuegos|jouer aux jeux vidéo|giocare ai videogiochi
verb|actions|go to the movies|看電影|ir al cine|aller au cinéma|andare al cinema
verb|actions|go to the gym|去健身房|ir al gimnasio|aller à la salle de sport|andare in palestra
verb|actions|go swimming|去游泳|ir a nadar|aller nager|andare a nuotare
verb|actions|go jogging|去慢跑|salir a correr|aller courir|andare a correre
verb|actions|go fishing|去釣魚|ir a pescar|aller à la pêche|andare a pescare
verb|actions|go hiking|去健行;去爬山|hacer senderismo|faire de la randonnée|fare escursioni
verb|actions|listen to music|聽音樂|escuchar música|écouter de la musique|ascoltare musica
verb|actions|watch TV|看電視|ver la tele;ver la televisión|regarder la télé|guardare la tv
noun|other|leisure|休閒|ocio|loisirs|svago
verb|actions|knit|編織;織毛線|tejer|tricoter|lavorare a maglia
noun|other|pottery|陶藝|alfarería;cerámica|poterie|ceramica
noun|other|origami|摺紙|origami|origami|origami
noun|other|calligraphy|書法|caligrafía|calligraphie|calligrafia
noun|other|watercolor|水彩|acuarela|aquarelle|acquerello
noun|other|sculpture|雕塑|escultura|sculpture|scultura
adjective|other|handmade|手工的|hecho a mano|fait main|fatto a mano
noun|people|composer|作曲家|compositor;compositora|compositeur;compositrice|compositore;compositrice
noun|other|melody|旋律|melodía|mélodie|melodia
noun|other|lyrics|歌詞|letra|paroles|testo
noun|other|album|專輯|álbum|album|album
noun|other|orchestra|管弦樂團|orquesta|orchestre|orchestra
noun|other|jazz|爵士樂|jazz|jazz|jazz
noun|other|classical music|古典音樂|música clásica|musique classique|musica classica
noun|other|rock music|搖滾樂|rock|rock|rock
noun|other|pop music|流行音樂|música pop|musique pop|musica pop
noun|other|hip-hop|嘻哈|hip hop|hip-hop|hip hop
noun|objects|nightclub|夜店|discoteca;club nocturno|boîte de nuit|discoteca
noun|people|idol|偶像|ídolo|idole|idolo
noun|people|pop star|流行歌星|estrella del pop|star de la pop|star del pop
noun|objects|sheet music|樂譜|partitura|partition|spartito
noun|objects|ukulele|烏克麗麗|ukelele;ukulele|ukulélé|ukulele
noun|people|film director|導演|director de cine;directora de cine|réalisateur;réalisatrice|regista
noun|other|screenplay|劇本|guion|scénario|sceneggiatura
noun|other|plot|劇情|trama;argumento|intrigue|trama
noun|other|trailer|預告片|tráiler;avance|bande-annonce|trailer
noun|other|subtitles|字幕|subtítulos|sous-titres|sottotitoli
noun|other|cartoon|卡通;動畫|dibujos animados|dessin animé|cartone animato
noun|other|documentary|紀錄片|documental|documentaire|documentario
noun|other|comedy|喜劇|comedia|comédie|commedia
noun|other|horror film|恐怖片|película de terror|film d'horreur|film horror
noun|other|science fiction|科幻|ciencia ficción|science-fiction|fantascienza
noun|other|stage play|舞台劇|obra de teatro|pièce de théâtre|spettacolo teatrale
noun|other|musical|音樂劇|musical|comédie musicale|musical
noun|other|ballet|芭蕾舞|ballet|ballet|balletto
noun|objects|circus|馬戲團|circo|cirque|circo
noun|people|movie star|電影明星|estrella de cine|star de cinéma|star del cinema
noun|other|sequel|續集|secuela|suite|sequel;seguito
noun|people|villain|反派|villano;villana|méchant;méchante|cattivo;cattiva
noun|other|ending|結局|final|fin|finale
noun|people|poet|詩人|poeta;poetisa|poète|poeta
noun|other|poetry|詩歌;詩|poesía|poésie|poesia
noun|people|author|作者|autor;autora|auteur|autore;autrice
noun|objects|book cover|封面|portada|couverture|copertina
noun|other|fairy tale|童話|cuento de hadas|conte de fées|fiaba
noun|other|biography|傳記|biografía|biographie|biografia
noun|objects|bestseller|暢銷書|superventas;bestseller|best-seller|bestseller
noun|other|illustration|插畫|ilustración|illustration|illustrazione
noun|people|reader|讀者|lector;lectora|lecteur;lectrice|lettore;lettrice
noun|objects|disco ball|迪斯可球|bola de discoteca|boule à facettes|palla da discoteca
`;
