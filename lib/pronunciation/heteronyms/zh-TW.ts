import type { LocalizedText } from "../localizedText";
import { meaning as m, type Heteronym, type HeteronymReading } from "./types";

/* =========================================================
   破音字 — Taiwan's readings (教育部國語辭典)

   The common ones a learner meets in their first thousand words, each
   reading with a word that can only be read that way: the word is what is
   spoken to demonstrate it, since a character on its own is read however
   the voice guesses. Every example's zhuyin is checked against the app's
   own readings (tests/pronunciation/heteronyms.test.ts), so the card, the
   word list and the Lab never disagree.
   ========================================================= */

function r(
  phonetic: string,
  pinyin: string,
  sense: LocalizedText,
  example: string,
  examplePhonetic: string,
): HeteronymReading {
  return { phonetic, pinyin, meaning: sense, example, examplePhonetic };
}

function zh(word: string, ...readings: HeteronymReading[]): Heteronym {
  return { language: "zh-TW", word, readings };
}

export const ZH_TW_HETERONYMS: readonly Heteronym[] = [
  zh(
    "行",
    r("ㄒㄧㄥˊ", "xíng", m("to walk; to do; OK", "走、做；可以", "andar; hacer; vale", "marcher ; faire ; d'accord", "camminare; fare; va bene"), "行走", "ㄒㄧㄥˊ ㄗㄡˇ"),
    r("ㄏㄤˊ", "háng", m("row; trade; firm", "行列、行業", "fila; oficio; firma", "rangée ; métier ; firme", "fila; mestiere; ditta"), "銀行", "ㄧㄣˊ ㄏㄤˊ"),
    r("ㄒㄧㄥˋ", "xìng", m("conduct", "品行、德行", "conducta", "conduite", "condotta"), "品行", "ㄆㄧㄣˇ ㄒㄧㄥˋ"),
  ),
  zh(
    "長",
    r("ㄔㄤˊ", "cháng", m("long", "長短的長", "largo", "long", "lungo"), "長度", "ㄔㄤˊ ㄉㄨˋ"),
    r("ㄓㄤˇ", "zhǎng", m("to grow; head, chief", "成長；首長", "crecer; jefe", "grandir ; chef", "crescere; capo"), "校長", "ㄒㄧㄠˋ ㄓㄤˇ"),
  ),
  zh(
    "重",
    r("ㄓㄨㄥˋ", "zhòng", m("heavy; important", "重量；重要", "pesado; importante", "lourd ; important", "pesante; importante"), "重要", "ㄓㄨㄥˋ ㄧㄠˋ"),
    r("ㄔㄨㄥˊ", "chóng", m("again; layer", "再一次；層", "otra vez; capa", "de nouveau ; couche", "di nuovo; strato"), "重複", "ㄔㄨㄥˊ ㄈㄨˋ"),
  ),
  zh(
    "樂",
    r("ㄌㄜˋ", "lè", m("happy", "快樂", "feliz", "joyeux", "felice"), "快樂", "ㄎㄨㄞˋ ㄌㄜˋ"),
    r("ㄩㄝˋ", "yuè", m("music", "音樂", "música", "musique", "musica"), "音樂", "ㄧㄣ ㄩㄝˋ"),
  ),
  zh(
    "還",
    r("ㄏㄞˊ", "hái", m("still; also", "仍然；還有", "todavía; también", "encore ; aussi", "ancora; anche"), "還是", "ㄏㄞˊ ㄕˋ"),
    r("ㄏㄨㄢˊ", "huán", m("to give back", "歸還", "devolver", "rendre", "restituire"), "還錢", "ㄏㄨㄢˊ ㄑㄧㄢˊ"),
  ),
  zh(
    "得",
    r("ㄉㄜˊ", "dé", m("to get", "得到", "obtener", "obtenir", "ottenere"), "得到", "ㄉㄜˊ ㄉㄠˋ"),
    r("˙ㄉㄜ", "de", m("particle after a verb: how it is done", "動詞後的助詞", "partícula tras el verbo", "particule après le verbe", "particella dopo il verbo"), "跑得快", "ㄆㄠˇ ˙ㄉㄜ ㄎㄨㄞˋ"),
    r("ㄉㄟˇ", "děi", m("must", "必須", "tener que", "devoir", "dovere"), "得要", "ㄉㄟˇ ㄧㄠˋ"),
  ),
  zh(
    "地",
    r("ㄉㄧˋ", "dì", m("ground, land", "土地", "tierra, suelo", "terre, sol", "terra, suolo"), "土地", "ㄊㄨˇ ㄉㄧˋ"),
    r("˙ㄉㄜ", "de", m("particle making an adverb", "副詞的助詞", "partícula adverbial", "particule adverbiale", "particella avverbiale"), "慢慢地", "ㄇㄢˋ ㄇㄢˋ ˙ㄉㄜ"),
  ),
  zh(
    "都",
    r("ㄉㄡ", "dōu", m("all; already", "全部；已經", "todos; ya", "tous ; déjà", "tutti; già"), "都是", "ㄉㄡ ㄕˋ"),
    r("ㄉㄨ", "dū", m("capital city", "首都", "capital", "capitale", "capitale"), "首都", "ㄕㄡˇ ㄉㄨ"),
  ),
  zh(
    "為",
    r("ㄨㄟˊ", "wéi", m("to be; to act as", "成為；作為", "ser; actuar como", "être ; servir de", "essere; fare da"), "成為", "ㄔㄥˊ ㄨㄟˊ"),
    r("ㄨㄟˋ", "wèi", m("for; because of", "為了；因為", "para; por", "pour ; à cause de", "per; a causa di"), "因為", "ㄧㄣ ㄨㄟˋ"),
  ),
  zh(
    "便",
    r("ㄅㄧㄢˋ", "biàn", m("convenient", "方便", "conveniente", "pratique", "comodo"), "方便", "ㄈㄤ ㄅㄧㄢˋ"),
    r("ㄆㄧㄢˊ", "pián", m("cheap", "便宜", "barato", "bon marché", "economico"), "便宜", "ㄆㄧㄢˊ ˙ㄧ"),
  ),
  zh(
    "好",
    r("ㄏㄠˇ", "hǎo", m("good", "很好", "bueno", "bon", "buono"), "很好", "ㄏㄣˇ ㄏㄠˇ"),
    r("ㄏㄠˋ", "hào", m("to like, be fond of", "喜好", "gustar de", "aimer", "amare"), "愛好", "ㄞˋ ㄏㄠˋ"),
  ),
  zh(
    "差",
    r("ㄔㄚ", "chā", m("difference", "差別", "diferencia", "différence", "differenza"), "差別", "ㄔㄚ ㄅㄧㄝˊ"),
    r("ㄔㄚˋ", "chà", m("poor; lacking", "不好；不夠", "malo; faltar", "mauvais ; manquer", "scarso; mancare"), "很差", "ㄏㄣˇ ㄔㄚˋ"),
    r("ㄔㄞ", "chāi", m("errand; business trip", "差事；出差", "encargo; viaje de trabajo", "mission ; déplacement", "incarico; trasferta"), "出差", "ㄔㄨ ㄔㄞ"),
  ),
  zh(
    "處",
    r("ㄔㄨˇ", "chǔ", m("to deal with; to get along", "處理；相處", "tratar; llevarse", "traiter ; s'entendre", "trattare; andare d'accordo"), "處理", "ㄔㄨˇ ㄌㄧˇ"),
    r("ㄔㄨˋ", "chù", m("place", "地方", "lugar", "endroit", "luogo"), "到處", "ㄉㄠˋ ㄔㄨˋ"),
  ),
  zh(
    "數",
    r("ㄕㄨˋ", "shù", m("number", "數字", "número", "nombre", "numero"), "數學", "ㄕㄨˋ ㄒㄩㄝˊ"),
    r("ㄕㄨˇ", "shǔ", m("to count", "計算數目", "contar", "compter", "contare"), "數錢", "ㄕㄨˇ ㄑㄧㄢˊ"),
  ),
  zh(
    "調",
    r("ㄉㄧㄠˋ", "diào", m("tone; to transfer; to investigate", "聲調；調動；調查", "tono; trasladar; investigar", "ton ; muter ; enquêter", "tono; trasferire; indagare"), "調查", "ㄉㄧㄠˋ ㄔㄚˊ"),
    r("ㄊㄧㄠˊ", "tiáo", m("to adjust", "調整", "ajustar", "ajuster", "regolare"), "調整", "ㄊㄧㄠˊ ㄓㄥˇ"),
  ),
  zh(
    "傳",
    r("ㄔㄨㄢˊ", "chuán", m("to pass on", "傳遞", "transmitir", "transmettre", "trasmettere"), "傳遞", "ㄔㄨㄢˊ ㄉㄧˋ"),
    r("ㄓㄨㄢˋ", "zhuàn", m("biography", "傳記", "biografía", "biographie", "biografia"), "傳記", "ㄓㄨㄢˋ ㄐㄧˋ"),
  ),
  zh(
    "種",
    r("ㄓㄨㄥˇ", "zhǒng", m("kind; seed", "種類；種子", "tipo; semilla", "sorte ; graine", "tipo; seme"), "種類", "ㄓㄨㄥˇ ㄌㄟˋ"),
    r("ㄓㄨㄥˋ", "zhòng", m("to plant", "栽種", "plantar", "planter", "piantare"), "種樹", "ㄓㄨㄥˋ ㄕㄨˋ"),
  ),
  zh(
    "少",
    r("ㄕㄠˇ", "shǎo", m("few, little", "不多", "poco", "peu", "poco"), "很少", "ㄏㄣˇ ㄕㄠˇ"),
    r("ㄕㄠˋ", "shào", m("young", "年輕", "joven", "jeune", "giovane"), "少年", "ㄕㄠˋ ㄋㄧㄢˊ"),
  ),
  zh(
    "中",
    r("ㄓㄨㄥ", "zhōng", m("middle", "中間", "medio", "milieu", "mezzo"), "中間", "ㄓㄨㄥ ㄐㄧㄢ"),
    r("ㄓㄨㄥˋ", "zhòng", m("to hit; to win", "射中；中獎", "acertar; ganar", "atteindre ; gagner", "colpire; vincere"), "中獎", "ㄓㄨㄥˋ ㄐㄧㄤˇ"),
  ),
  zh(
    "看",
    r("ㄎㄢˋ", "kàn", m("to look, read", "看見；閱讀", "mirar, leer", "regarder, lire", "guardare, leggere"), "看書", "ㄎㄢˋ ㄕㄨ"),
    r("ㄎㄢ", "kān", m("to look after, guard", "看守", "cuidar, vigilar", "garder, surveiller", "custodire"), "看門", "ㄎㄢ ㄇㄣˊ"),
  ),
  zh(
    "教",
    r("ㄐㄧㄠ", "jiāo", m("to teach", "教導", "enseñar", "enseigner", "insegnare"), "教書", "ㄐㄧㄠ ㄕㄨ"),
    r("ㄐㄧㄠˋ", "jiào", m("teaching; religion", "教育；宗教", "enseñanza; religión", "enseignement ; religion", "insegnamento; religione"), "教室", "ㄐㄧㄠˋ ㄕˋ"),
  ),
  zh(
    "覺",
    r("ㄐㄩㄝˊ", "jué", m("to feel; to sense", "感覺", "sentir", "sentir", "sentire"), "感覺", "ㄍㄢˇ ㄐㄩㄝˊ"),
    r("ㄐㄧㄠˋ", "jiào", m("sleep", "睡眠", "sueño", "sommeil", "sonno"), "睡覺", "ㄕㄨㄟˋ ㄐㄧㄠˋ"),
  ),
  zh(
    "角",
    r("ㄐㄧㄠˇ", "jiǎo", m("horn; angle; corner", "牛角；角度", "cuerno; ángulo", "corne ; angle", "corno; angolo"), "角度", "ㄐㄧㄠˇ ㄉㄨˋ"),
    r("ㄐㄩㄝˊ", "jué", m("role", "角色", "papel", "rôle", "ruolo"), "角色", "ㄐㄩㄝˊ ㄙㄜˋ"),
  ),
  zh(
    "給",
    r("ㄍㄟˇ", "gěi", m("to give", "給予東西", "dar", "donner", "dare"), "給你", "ㄍㄟˇ ㄋㄧˇ"),
    r("ㄐㄧˇ", "jǐ", m("to supply", "供給", "suministrar", "fournir", "fornire"), "供給", "ㄍㄨㄥ ㄐㄧˇ"),
  ),
  zh(
    "量",
    r("ㄌㄧㄤˋ", "liàng", m("amount", "數量", "cantidad", "quantité", "quantità"), "數量", "ㄕㄨˋ ㄌㄧㄤˋ"),
    r("ㄌㄧㄤˊ", "liáng", m("to measure", "測量", "medir", "mesurer", "misurare"), "測量", "ㄘㄜˋ ㄌㄧㄤˊ"),
  ),
  zh(
    "興",
    r("ㄒㄧㄥ", "xīng", m("to rise; to thrive", "興起；興盛", "surgir; prosperar", "s'élever ; prospérer", "sorgere; prosperare"), "興奮", "ㄒㄧㄥ ㄈㄣˋ"),
    r("ㄒㄧㄥˋ", "xìng", m("mood; interest", "興致；興趣", "ánimo; interés", "humeur ; intérêt", "umore; interesse"), "高興", "ㄍㄠ ㄒㄧㄥˋ"),
  ),
  zh(
    "曾",
    r("ㄘㄥˊ", "céng", m("once, ever", "曾經", "alguna vez", "déjà, autrefois", "già, una volta"), "曾經", "ㄘㄥˊ ㄐㄧㄥ"),
    r("ㄗㄥ", "zēng", m("great-grand-; a surname", "曾祖；姓曾", "bis-; un apellido", "arrière- ; un nom", "bis-; un cognome"), "曾祖父", "ㄗㄥ ㄗㄨˇ ㄈㄨˋ"),
  ),
  zh(
    "背",
    r("ㄅㄟˋ", "bèi", m("back; to recite", "背部；背誦", "espalda; recitar", "dos ; réciter", "schiena; recitare"), "背後", "ㄅㄟˋ ㄏㄡˋ"),
    r("ㄅㄟ", "bēi", m("to carry on the back", "用背負載", "llevar a la espalda", "porter sur le dos", "portare sulle spalle"), "背包", "ㄅㄟ ㄅㄠ"),
  ),
  zh(
    "朝",
    r("ㄓㄠ", "zhāo", m("morning", "早晨", "mañana", "matin", "mattino"), "朝陽", "ㄓㄠ ㄧㄤˊ"),
    r("ㄔㄠˊ", "cháo", m("dynasty; facing", "朝代；朝向", "dinastía; hacia", "dynastie ; vers", "dinastia; verso"), "朝代", "ㄔㄠˊ ㄉㄞˋ"),
  ),
  zh(
    "降",
    r("ㄐㄧㄤˋ", "jiàng", m("to fall, lower", "下降", "bajar", "descendre", "scendere"), "下降", "ㄒㄧㄚˋ ㄐㄧㄤˋ"),
    r("ㄒㄧㄤˊ", "xiáng", m("to surrender", "投降", "rendirse", "se rendre", "arrendersi"), "投降", "ㄊㄡˊ ㄒㄧㄤˊ"),
  ),
  zh(
    "假",
    r("ㄐㄧㄚˇ", "jiǎ", m("false, fake", "不真", "falso", "faux", "falso"), "真假", "ㄓㄣ ㄐㄧㄚˇ"),
    r("ㄐㄧㄚˋ", "jià", m("holiday, leave", "假期", "vacaciones", "congé", "vacanza"), "放假", "ㄈㄤˋ ㄐㄧㄚˋ"),
  ),
  zh(
    "間",
    r("ㄐㄧㄢ", "jiān", m("between; room", "中間；房間", "entre; cuarto", "entre ; pièce", "tra; stanza"), "時間", "ㄕˊ ㄐㄧㄢ"),
    r("ㄐㄧㄢˋ", "jiàn", m("gap; to separate", "間隔", "intervalo; separar", "intervalle ; séparer", "intervallo; separare"), "間隔", "ㄐㄧㄢˋ ㄍㄜˊ"),
  ),
  zh(
    "將",
    r("ㄐㄧㄤ", "jiāng", m("will, about to", "將要", "ir a, futuro", "aller, futur", "stare per, futuro"), "將來", "ㄐㄧㄤ ㄌㄞˊ"),
    r("ㄐㄧㄤˋ", "jiàng", m("general, commander", "將領", "general", "général", "generale"), "大將", "ㄉㄚˋ ㄐㄧㄤˋ"),
  ),
  zh(
    "空",
    r("ㄎㄨㄥ", "kōng", m("empty; sky", "空的；天空", "vacío; cielo", "vide ; ciel", "vuoto; cielo"), "天空", "ㄊㄧㄢ ㄎㄨㄥ"),
    r("ㄎㄨㄥˋ", "kòng", m("free time", "空閒", "tiempo libre", "temps libre", "tempo libero"), "有空", "ㄧㄡˇ ㄎㄨㄥˋ"),
  ),
  zh(
    "會",
    r("ㄏㄨㄟˋ", "huì", m("can; meeting", "能夠；會議", "saber; reunión", "savoir ; réunion", "sapere; riunione"), "開會", "ㄎㄞ ㄏㄨㄟˋ"),
    r("ㄎㄨㄞˋ", "kuài", m("accounting", "會計", "contabilidad", "comptabilité", "contabilità"), "會計", "ㄎㄨㄞˋ ㄐㄧˋ"),
  ),
  zh(
    "了",
    r("˙ㄌㄜ", "le", m("particle: done, changed", "表示完成", "partícula: hecho", "particule : accompli", "particella: compiuto"), "吃了", "ㄔ ˙ㄌㄜ"),
    r("ㄌㄧㄠˇ", "liǎo", m("to understand; to finish", "明白；完結", "entender; terminar", "comprendre ; finir", "capire; finire"), "了解", "ㄌㄧㄠˇ ㄐㄧㄝˇ"),
  ),
  zh(
    "的",
    r("˙ㄉㄜ", "de", m("possessive particle", "所屬的助詞", "partícula posesiva", "particule possessive", "particella possessiva"), "我的", "ㄨㄛˇ ˙ㄉㄜ"),
    r("ㄉㄧˊ", "dí", m("indeed", "的確", "en efecto", "en effet", "davvero"), "的確", "ㄉㄧˊ ㄑㄩㄝˋ"),
    r("ㄉㄧˋ", "dì", m("target, aim", "目的", "objetivo", "but", "scopo"), "目的", "ㄇㄨˋ ㄉㄧˋ"),
  ),
  zh(
    "著",
    r("˙ㄓㄜ", "zhe", m("particle: ongoing", "表示持續", "partícula: en curso", "particule : en cours", "particella: in corso"), "看著", "ㄎㄢˋ ˙ㄓㄜ"),
    r("ㄓㄠˊ", "zháo", m("to touch; to catch (fire, sleep)", "接觸；著火；睡著", "tocar; prender", "toucher ; prendre", "toccare; prendere"), "著急", "ㄓㄠˊ ㄐㄧˊ"),
    r("ㄓㄨˋ", "zhù", m("famous; to write (a book)", "著名；著作", "famoso; escribir", "célèbre ; écrire", "famoso; scrivere"), "著名", "ㄓㄨˋ ㄇㄧㄥˊ"),
  ),
  zh(
    "當",
    r("ㄉㄤ", "dāng", m("to be; when", "擔任；當時", "ser; cuando", "être ; quand", "essere; quando"), "當時", "ㄉㄤ ㄕˊ"),
    r("ㄉㄤˋ", "dàng", m("proper; to be fooled", "恰當；上當", "adecuado; ser engañado", "approprié ; se faire avoir", "adatto; farsi ingannare"), "上當", "ㄕㄤˋ ㄉㄤˋ"),
  ),
  zh(
    "分",
    r("ㄈㄣ", "fēn", m("to divide; minute", "分開；分鐘", "dividir; minuto", "diviser ; minute", "dividere; minuto"), "分開", "ㄈㄣ ㄎㄞ"),
    r("ㄈㄣˋ", "fèn", m("part, component", "成分", "parte, componente", "part, composant", "parte, componente"), "成分", "ㄔㄥˊ ㄈㄣˋ"),
  ),
  zh(
    "相",
    r("ㄒㄧㄤ", "xiāng", m("each other", "互相", "mutuamente", "mutuellement", "a vicenda"), "相信", "ㄒㄧㄤ ㄒㄧㄣˋ"),
    r("ㄒㄧㄤˋ", "xiàng", m("appearance; photo", "相貌；照相", "aspecto; foto", "apparence ; photo", "aspetto; foto"), "照相", "ㄓㄠˋ ㄒㄧㄤˋ"),
  ),
  zh(
    "結",
    r("ㄐㄧㄝˊ", "jié", m("knot; to tie; result", "打結；結果", "nudo; atar; resultado", "nœud ; nouer ; résultat", "nodo; legare; risultato"), "結果", "ㄐㄧㄝˊ ㄍㄨㄛˇ"),
    r("ㄐㄧㄝ", "jiē", m("to bear fruit; sturdy", "結果實；結實", "dar fruto; robusto", "porter des fruits ; solide", "fruttificare; robusto"), "結實", "ㄐㄧㄝ ˙ㄕ"),
  ),
  zh(
    "大",
    r("ㄉㄚˋ", "dà", m("big", "大小的大", "grande", "grand", "grande"), "大人", "ㄉㄚˋ ㄖㄣˊ"),
    r("ㄉㄞˋ", "dài", m("in 大夫: doctor", "大夫（醫生）", "en 大夫: médico", "dans 大夫 : médecin", "in 大夫: medico"), "大夫", "ㄉㄞˋ ˙ㄈㄨ"),
  ),
  zh(
    "參",
    r("ㄘㄢ", "cān", m("to join, take part", "參加", "participar", "participer", "partecipare"), "參加", "ㄘㄢ ㄐㄧㄚ"),
    r("ㄕㄣ", "shēn", m("ginseng", "人參", "ginseng", "ginseng", "ginseng"), "人參", "ㄖㄣˊ ㄕㄣ"),
  ),
  zh(
    "乾",
    r("ㄍㄢ", "gān", m("dry; clean", "乾燥；乾淨", "seco; limpio", "sec ; propre", "secco; pulito"), "乾淨", "ㄍㄢ ㄐㄧㄥˋ"),
    r("ㄑㄧㄢˊ", "qián", m("heaven (classical)", "乾坤的乾", "el cielo (clásico)", "le ciel (classique)", "il cielo (classico)"), "乾坤", "ㄑㄧㄢˊ ㄎㄨㄣ"),
  ),
  zh(
    "應",
    r("ㄧㄥ", "yīng", m("should", "應該", "deber", "devoir", "dovere"), "應該", "ㄧㄥ ㄍㄞ"),
    r("ㄧㄥˋ", "yìng", m("to respond", "回應；答應", "responder", "répondre", "rispondere"), "回應", "ㄏㄨㄟˊ ㄧㄥˋ"),
  ),
  zh(
    "藏",
    r("ㄘㄤˊ", "cáng", m("to hide", "躲藏", "esconder", "cacher", "nascondere"), "躲藏", "ㄉㄨㄛˇ ㄘㄤˊ"),
    r("ㄗㄤˋ", "zàng", m("treasury; Tibet", "寶藏；西藏", "tesoro; Tíbet", "trésor ; Tibet", "tesoro; Tibet"), "西藏", "ㄒㄧ ㄗㄤˋ"),
  ),
  zh(
    "冠",
    r("ㄍㄨㄢ", "guān", m("crown; hat", "帽子；皇冠", "corona; sombrero", "couronne ; chapeau", "corona; cappello"), "皇冠", "ㄏㄨㄤˊ ㄍㄨㄢ"),
    r("ㄍㄨㄢˋ", "guàn", m("first place", "第一名", "primer puesto", "première place", "primo posto"), "冠軍", "ㄍㄨㄢˋ ㄐㄩㄣ"),
  ),
  zh(
    "難",
    r("ㄋㄢˊ", "nán", m("difficult", "困難", "difícil", "difficile", "difficile"), "困難", "ㄎㄨㄣˋ ㄋㄢˊ"),
    r("ㄋㄢˋ", "nàn", m("disaster", "災難", "desastre", "catastrophe", "disastro"), "災難", "ㄗㄞ ㄋㄢˋ"),
  ),
  zh(
    "散",
    r("ㄙㄢˋ", "sàn", m("to scatter; to break up", "分散；散開", "dispersar", "disperser", "disperdere"), "散步", "ㄙㄢˋ ㄅㄨˋ"),
    r("ㄙㄢˇ", "sǎn", m("loose; prose", "鬆散；散文", "suelto; prosa", "lâche ; prose", "sciolto; prosa"), "散文", "ㄙㄢˇ ㄨㄣˊ"),
  ),
  zh(
    "盛",
    r("ㄕㄥˋ", "shèng", m("abundant; grand", "盛大；茂盛", "abundante; grandioso", "abondant ; grandiose", "abbondante; grandioso"), "盛大", "ㄕㄥˋ ㄉㄚˋ"),
    r("ㄔㄥˊ", "chéng", m("to fill (a bowl)", "把東西裝進容器", "servir (en un cuenco)", "remplir (un bol)", "riempire (una ciotola)"), "盛飯", "ㄔㄥˊ ㄈㄢˋ"),
  ),
];
