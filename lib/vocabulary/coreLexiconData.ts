import "server-only";

/* =========================================================
   The built-in five-language dictionary — the data

   Chi's choice (2026-09-28): when every model is busy and the basic
   translation service is out too, a typed word should still get an answer
   in any of the app's five languages. CC-CEDICT, the other dictionary on
   this server, only speaks English and Chinese.

   1,855 everyday words and phrases, written for this app — not taken from
   any published dictionary — in English, Traditional Chinese as used in
   Taiwan, Spanish, French and Italian, then reviewed line by line by a
   second pass for wrong senses, spelling, gender and Mainland-only Chinese.

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

   Read by lib/vocabulary/coreLexicon.ts. Server-only: it is ~130 kB of
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
`;
