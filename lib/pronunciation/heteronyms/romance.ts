import type { LanguageCode } from "@/lib/languages";
import type { PartOfSpeechKey } from "@/lib/vocabulary/partOfSpeech";

import type { LocalizedText } from "../localizedText";
import { meaning as m, type Heteronym, type HeteronymReading } from "./types";

/* =========================================================
   French, Italian and Spanish

   French spells the same word for different sounds as its grammar
   changes: fils is /fis/ (son) or /fil/ (threads), est /ɛ/ (is) or /ɛst/
   (east), and six and dix change with what follows them.

   Italian and Spanish spell almost everything as they say it, so their
   spellings that read two ways are a matter of stress or of an open or
   closed vowel — and the dictionary accent shows which (àncora, the
   anchor; ancóra, still). Spanish writes the accent everywhere; Italian
   only in dictionaries, which is why the examples carry it: it is what
   tells a voice, and a reader, which one is meant.

   Written the way the app's other IPA is: syllables dotted, Spanish broad
   (b d g, seseo), French with ʁ and liaison ‿.
   ========================================================= */

type Extra = { spelling?: string; partOfSpeech?: PartOfSpeechKey };

function r(
  phonetic: string,
  sense: LocalizedText,
  example: string,
  examplePhonetic: string,
  extra: Extra = {},
): HeteronymReading {
  return { phonetic, meaning: sense, example, examplePhonetic, ...extra };
}

function word(language: LanguageCode, spelling: string, ...readings: HeteronymReading[]): Heteronym {
  return { language, word: spelling, readings };
}

export const FR_HETERONYMS: readonly Heteronym[] = [
  word(
    "fr",
    "fils",
    r("/fis/", m("son(s)", "兒子", "hijo(s)", "fils (enfant)", "figlio/i"), "mon fils", "/mɔ̃ fis/"),
    r("/fil/", m("threads, wires", "線（複數）", "hilos, cables", "fils (de fer)", "fili"), "les fils électriques", "/le fil e.lɛk.tʁik/"),
  ),
  word(
    "fr",
    "est",
    r("/ɛ/", m("is", "是（être）", "es, está", "est (être)", "è"), "il est là", "/i.l‿ɛ la/", { partOfSpeech: "verb" }),
    r("/ɛst/", m("east", "東方", "este", "est (point cardinal)", "est"), "à l'est", "/a lɛst/", { partOfSpeech: "noun" }),
  ),
  word(
    "fr",
    "plus",
    r("/ply/", m("no more; not … anymore", "不再", "ya no", "ne … plus", "non più"), "je n'en veux plus", "/ʒə nɑ̃ vø ply/"),
    r("/plys/", m("more; plus", "更多；加", "más", "davantage ; plus", "di più; più"), "deux plus deux", "/dø plys dø/"),
  ),
  word(
    "fr",
    "os",
    r("/ɔs/", m("a bone", "一根骨頭", "un hueso", "un os", "un osso"), "un os", "/œ̃.n‿ɔs/"),
    r("/o/", m("bones", "骨頭（複數）", "huesos", "des os", "ossa"), "des os", "/de.z‿o/"),
  ),
  word(
    "fr",
    "couvent",
    r("/ku.vɑ̃/", m("a convent", "修道院", "convento", "couvent", "convento"), "le couvent", "/lə ku.vɑ̃/", { partOfSpeech: "noun" }),
    r("/kuv/", m("they sit on eggs", "（牠們）孵蛋", "empollan", "elles couvent", "covano"), "les poules couvent", "/le pul kuv/", { partOfSpeech: "verb" }),
  ),
  word(
    "fr",
    "président",
    r("/pʁe.zi.dɑ̃/", m("president", "總統、主席", "presidente", "président", "presidente"), "le président", "/lə pʁe.zi.dɑ̃/", { partOfSpeech: "noun" }),
    r("/pʁe.zid/", m("they preside", "（他們）主持", "presiden", "ils président", "presiedono"), "ils président", "/il pʁe.zid/", { partOfSpeech: "verb" }),
  ),
  word(
    "fr",
    "as",
    r("/a/", m("you have", "你有", "tienes", "tu as", "hai"), "tu as", "/ty a/", { partOfSpeech: "verb" }),
    r("/ɑs/", m("an ace", "王牌；高手", "as", "as", "asso"), "un as", "/œ̃.n‿ɑs/", { partOfSpeech: "noun" }),
  ),
  word(
    "fr",
    "six",
    r("/sis/", m("six, on its own", "六（單獨說）", "seis (solo)", "six (seul)", "sei (da solo)"), "j'en ai six", "/ʒɑ̃.n‿e sis/"),
    r("/si/", m("six, before a consonant", "六（接子音）", "seis (ante consonante)", "six (devant consonne)", "sei (davanti a consonante)"), "six livres", "/si livʁ/"),
    r("/siz/", m("six, before a vowel", "六（接母音）", "seis (ante vocal)", "six (devant voyelle)", "sei (davanti a vocale)"), "six amis", "/si.z‿a.mi/"),
  ),
  word(
    "fr",
    "dix",
    r("/dis/", m("ten, on its own", "十（單獨說）", "diez (solo)", "dix (seul)", "dieci (da solo)"), "il en a dix", "/i.l‿ɑ̃.n‿a dis/"),
    r("/di/", m("ten, before a consonant", "十（接子音）", "diez (ante consonante)", "dix (devant consonne)", "dieci (davanti a consonante)"), "dix livres", "/di livʁ/"),
    r("/diz/", m("ten, before a vowel", "十（接母音）", "diez (ante vocal)", "dix (devant voyelle)", "dieci (davanti a vocale)"), "dix ans", "/di.z‿ɑ̃/"),
  ),
  word(
    "fr",
    "content",
    r("/kɔ̃.tɑ̃/", m("happy, pleased", "高興的", "contento", "content", "contento"), "je suis content", "/ʒə sɥi kɔ̃.tɑ̃/", { partOfSpeech: "adjective" }),
    r("/kɔ̃t/", m("they tell (stories)", "（他們）講述", "cuentan", "ils content", "raccontano"), "ils content des histoires", "/il kɔ̃t de.z‿is.twaʁ/", { partOfSpeech: "verb" }),
  ),
  word(
    "fr",
    "tous",
    r("/tu/", m("all (before a noun)", "所有的（接名詞）", "todos (ante sustantivo)", "tous (adjectif)", "tutti (davanti al nome)"), "tous les jours", "/tu le ʒuʁ/", { partOfSpeech: "adjective" }),
    r("/tus/", m("all of them", "全部（代名詞）", "todos (pronombre)", "tous (pronom)", "tutti (pronome)"), "ils viennent tous", "/il vjɛn tus/", { partOfSpeech: "pronoun" }),
  ),
  word(
    "fr",
    "vis",
    r("/vis/", m("a screw", "螺絲", "tornillo", "une vis", "vite (bullone)"), "une vis", "/yn vis/", { partOfSpeech: "noun" }),
    r("/vi/", m("I live; I saw", "我住；我看見", "vivo; vi", "je vis", "vivo; vidi"), "je vis ici", "/ʒə vi i.si/", { partOfSpeech: "verb" }),
  ),
];

export const IT_HETERONYMS: readonly Heteronym[] = [
  word(
    "it",
    "ancora",
    r("/ˈaŋ.ko.ra/", m("anchor", "錨", "ancla", "ancre", "àncora (della nave)"), "l'àncora della nave", "/ˈlaŋ.ko.ra del.la ˈna.ve/", { spelling: "àncora", partOfSpeech: "noun" }),
    r("/aŋˈko.ra/", m("still; again", "還、仍然；再", "todavía; otra vez", "encore", "ancóra (di nuovo)"), "non è ancóra pronto", "/non ɛ aŋˈko.ra ˈpron.to/", { spelling: "ancóra", partOfSpeech: "adverb" }),
  ),
  word(
    "it",
    "pesca",
    r("/ˈpe.ska/", m("fishing", "釣魚", "pesca", "pêche (au poisson)", "pésca (dei pesci)"), "andare a pésca", "/anˈda.re a ˈpe.ska/", { spelling: "pésca" }),
    r("/ˈpɛ.ska/", m("peach", "桃子", "melocotón", "pêche (fruit)", "pèsca (il frutto)"), "una pèsca matura", "/ˈu.na ˈpɛ.ska maˈtu.ra/", { spelling: "pèsca" }),
  ),
  word(
    "it",
    "principi",
    r("/ˈprin.tʃi.pi/", m("princes", "王子們", "príncipes", "princes", "prìncipi (figli del re)"), "i prìncipi", "/i ˈprin.tʃi.pi/", { spelling: "prìncipi" }),
    r("/prinˈtʃi.pi/", m("principles", "原則", "principios", "principes", "princìpi (regole)"), "i princìpi morali", "/i prinˈtʃi.pi moˈra.li/", { spelling: "princìpi" }),
  ),
  word(
    "it",
    "volto",
    r("/ˈvol.to/", m("face", "臉", "rostro", "visage", "vólto (viso)"), "un vólto sorridente", "/un ˈvol.to sor.riˈdɛn.te/", { spelling: "vólto", partOfSpeech: "noun" }),
    r("/ˈvɔl.to/", m("turned", "轉向的", "vuelto, girado", "tourné", "vòlto (girato)"), "vòlto a destra", "/ˈvɔl.to a ˈdɛ.stra/", { spelling: "vòlto" }),
  ),
  word(
    "it",
    "botte",
    r("/ˈbot.te/", m("barrel", "木桶", "barril", "tonneau", "bótte (per il vino)"), "una bótte di vino", "/ˈu.na ˈbot.te di ˈvi.no/", { spelling: "bótte" }),
    r("/ˈbɔt.te/", m("blows, a beating", "毆打", "golpes", "coups", "bòtte (colpi)"), "prendere le bòtte", "/ˈprɛn.de.re le ˈbɔt.te/", { spelling: "bòtte" }),
  ),
  word(
    "it",
    "legge",
    r("/ˈled.dʒe/", m("law", "法律", "ley", "loi", "légge (norma)"), "la légge", "/la ˈled.dʒe/", { spelling: "légge", partOfSpeech: "noun" }),
    r("/ˈlɛd.dʒe/", m("he/she reads", "他／她讀", "lee", "il lit", "lègge (leggere)"), "lui lègge un libro", "/ˈlu.i ˈlɛd.dʒe un ˈli.bro/", { spelling: "lègge", partOfSpeech: "verb" }),
  ),
  word(
    "it",
    "venti",
    r("/ˈven.ti/", m("twenty", "二十", "veinte", "vingt", "vénti (numero)"), "vénti euro", "/ˈven.ti ˈɛu.ro/", { spelling: "vénti" }),
    r("/ˈvɛn.ti/", m("winds", "風（複數）", "vientos", "vents", "vènti (aria)"), "i vènti del nord", "/i ˈvɛn.ti del nɔrd/", { spelling: "vènti" }),
  ),
  word(
    "it",
    "capitano",
    r("/ka.piˈta.no/", m("captain", "隊長、船長", "capitán", "capitaine", "capitàno"), "il capitàno", "/il ka.piˈta.no/", { spelling: "capitàno", partOfSpeech: "noun" }),
    r("/ˈka.pi.ta.no/", m("they happen", "（事情）發生", "suceden", "arrivent", "càpitano (succedono)"), "càpitano spesso", "/ˈka.pi.ta.no ˈspes.so/", { spelling: "càpitano", partOfSpeech: "verb" }),
  ),
  word(
    "it",
    "subito",
    r("/ˈsu.bi.to/", m("at once", "立刻", "enseguida", "tout de suite", "sùbito (immediatamente)"), "vieni sùbito", "/ˈvjɛ.ni ˈsu.bi.to/", { spelling: "sùbito", partOfSpeech: "adverb" }),
    r("/suˈbi.to/", m("suffered", "遭受了", "sufrido", "subi", "subìto (sopportato)"), "ha subìto un danno", "/a suˈbi.to un ˈdan.no/", { spelling: "subìto", partOfSpeech: "verb" }),
  ),
  word(
    "it",
    "ambito",
    r("/ˈam.bi.to/", m("field, scope", "範圍、領域", "ámbito", "domaine", "àmbito (campo)"), "nell'àmbito del lavoro", "/nelˈlam.bi.to del laˈvo.ro/", { spelling: "àmbito", partOfSpeech: "noun" }),
    r("/amˈbi.to/", m("coveted", "令人嚮往的", "codiciado", "convoité", "ambìto (desiderato)"), "un premio ambìto", "/un ˈprɛ.mjo amˈbi.to/", { spelling: "ambìto", partOfSpeech: "adjective" }),
  ),
  word(
    "it",
    "compito",
    r("/ˈkom.pi.to/", m("task, homework", "任務、作業", "tarea", "devoir, tâche", "còmpito (dovere)"), "fare i còmpiti", "/ˈfa.re i ˈkom.pi.ti/", { spelling: "còmpito", partOfSpeech: "noun" }),
    r("/komˈpi.to/", m("polite, well-mannered", "有禮貌的", "cortés", "poli", "compìto (educato)"), "un ragazzo compìto", "/un raˈɡat.tso komˈpi.to/", { spelling: "compìto", partOfSpeech: "adjective" }),
  ),
];

export const ES_HETERONYMS: readonly Heteronym[] = [
  word(
    "es",
    "publico",
    r("/ˈpu.bli.ko/", m("public; audience", "公眾的；觀眾", "público", "public", "pubblico"), "el público", "/el ˈpu.bli.ko/", { spelling: "público" }),
    r("/pu.ˈbli.ko/", m("I publish", "我出版", "publico (yo)", "je publie", "pubblico (io)"), "yo publico", "/ʝo pu.ˈbli.ko/", { spelling: "publico", partOfSpeech: "verb" }),
    r("/pu.bli.ˈko/", m("he/she published", "他／她出版了", "publicó", "il/elle a publié", "pubblicò"), "ella publicó", "/ˈe.ʝa pu.bli.ˈko/", { spelling: "publicó", partOfSpeech: "verb" }),
  ),
  word(
    "es",
    "termino",
    r("/ˈteɾ.mi.no/", m("term; end", "術語；終點", "término", "terme ; fin", "termine; fine"), "el término", "/el ˈteɾ.mi.no/", { spelling: "término", partOfSpeech: "noun" }),
    r("/teɾ.ˈmi.no/", m("I finish", "我完成", "termino (yo)", "je termine", "termino (io)"), "yo termino", "/ʝo teɾ.ˈmi.no/", { spelling: "termino", partOfSpeech: "verb" }),
    r("/teɾ.mi.ˈno/", m("it finished", "結束了", "terminó", "c'est fini", "terminò"), "ya terminó", "/ʝa teɾ.mi.ˈno/", { spelling: "terminó", partOfSpeech: "verb" }),
  ),
  word(
    "es",
    "arbitro",
    r("/ˈaɾ.bi.tɾo/", m("referee", "裁判", "árbitro", "arbitre", "arbitro"), "el árbitro", "/el ˈaɾ.bi.tɾo/", { spelling: "árbitro", partOfSpeech: "noun" }),
    r("/aɾ.ˈbi.tɾo/", m("I referee", "我擔任裁判", "arbitro (yo)", "j'arbitre", "arbitro (io)"), "yo arbitro", "/ʝo aɾ.ˈbi.tɾo/", { spelling: "arbitro", partOfSpeech: "verb" }),
    r("/aɾ.bi.ˈtɾo/", m("he/she refereed", "他／她當了裁判", "arbitró", "il/elle a arbitré", "arbitrò"), "él arbitró", "/el aɾ.bi.ˈtɾo/", { spelling: "arbitró", partOfSpeech: "verb" }),
  ),
  word(
    "es",
    "animo",
    r("/ˈa.ni.mo/", m("spirit; cheer up!", "精神；加油！", "ánimo", "courage !", "coraggio!"), "¡ánimo!", "/ˈa.ni.mo/", { spelling: "ánimo", partOfSpeech: "noun" }),
    r("/a.ˈni.mo/", m("I encourage", "我鼓勵", "animo (yo)", "j'encourage", "incoraggio"), "yo te animo", "/ʝo te a.ˈni.mo/", { spelling: "animo", partOfSpeech: "verb" }),
    r("/a.ni.ˈmo/", m("he/she encouraged", "他／她鼓勵了", "animó", "il/elle a encouragé", "incoraggiò"), "nos animó", "/nos a.ni.ˈmo/", { spelling: "animó", partOfSpeech: "verb" }),
  ),
  word(
    "es",
    "habito",
    r("/ˈa.bi.to/", m("a habit", "習慣", "hábito", "habitude", "abitudine"), "un hábito", "/un ˈa.bi.to/", { spelling: "hábito", partOfSpeech: "noun" }),
    r("/a.ˈbi.to/", m("I live (in)", "我居住", "habito (yo)", "j'habite", "abito (io)"), "yo habito aquí", "/ʝo a.ˈbi.to a.ˈki/", { spelling: "habito", partOfSpeech: "verb" }),
    r("/a.bi.ˈto/", m("he/she lived (in)", "他／她住過", "habitó", "il/elle a habité", "abitò"), "habitó la casa", "/a.bi.ˈto la ˈka.sa/", { spelling: "habitó", partOfSpeech: "verb" }),
  ),
  word(
    "es",
    "calculo",
    r("/ˈkal.ku.lo/", m("a calculation", "計算", "cálculo", "calcul", "calcolo"), "un cálculo", "/un ˈkal.ku.lo/", { spelling: "cálculo", partOfSpeech: "noun" }),
    r("/kal.ˈku.lo/", m("I calculate", "我計算", "calculo (yo)", "je calcule", "calcolo (io)"), "yo calculo", "/ʝo kal.ˈku.lo/", { spelling: "calculo", partOfSpeech: "verb" }),
    r("/kal.ku.ˈlo/", m("he/she calculated", "他／她算了", "calculó", "il/elle a calculé", "calcolò"), "lo calculó", "/lo kal.ku.ˈlo/", { spelling: "calculó", partOfSpeech: "verb" }),
  ),
  word(
    "es",
    "celebre",
    r("/ˈse.le.bɾe/", m("famous", "著名的", "célebre", "célèbre", "celebre"), "un pintor célebre", "/um pin.ˈtoɾ ˈse.le.bɾe/", { spelling: "célebre", partOfSpeech: "adjective" }),
    r("/se.ˈle.bɾe/", m("(that) he/she celebrate", "（讓他）慶祝", "celebre", "qu'il célèbre", "che celebri"), "que lo celebre", "/ke lo se.ˈle.bɾe/", { spelling: "celebre", partOfSpeech: "verb" }),
    r("/se.le.ˈbɾe/", m("I celebrated", "我慶祝了", "celebré", "j'ai fêté", "ho festeggiato"), "ya lo celebré", "/ʝa lo se.le.ˈbɾe/", { spelling: "celebré", partOfSpeech: "verb" }),
  ),
  word(
    "es",
    "esta",
    r("/ˈes.ta/", m("this", "這個", "esta", "cette", "questa"), "esta casa", "/ˈes.ta ˈka.sa/", { spelling: "esta" }),
    r("/es.ˈta/", m("is (location, state)", "在；處於", "está", "est", "è, sta"), "está aquí", "/es.ˈta a.ˈki/", { spelling: "está", partOfSpeech: "verb" }),
  ),
  word(
    "es",
    "papa",
    r("/ˈpa.pa/", m("potato; the Pope", "馬鈴薯；教宗", "papa", "pomme de terre ; pape", "patata; papa"), "una papa", "/ˈu.na ˈpa.pa/", { spelling: "papa", partOfSpeech: "noun" }),
    r("/pa.ˈpa/", m("dad", "爸爸", "papá", "papa", "papà"), "mi papá", "/mi pa.ˈpa/", { spelling: "papá", partOfSpeech: "noun" }),
  ),
  word(
    "es",
    "sabana",
    r("/ˈsa.ba.na/", m("bed sheet", "床單", "sábana", "drap", "lenzuolo"), "una sábana", "/ˈu.na ˈsa.ba.na/", { spelling: "sábana", partOfSpeech: "noun" }),
    r("/sa.ˈba.na/", m("savanna", "熱帶草原", "sabana", "savane", "savana"), "la sabana africana", "/la sa.ˈba.na a.fɾi.ˈka.na/", { spelling: "sabana", partOfSpeech: "noun" }),
  ),
];
