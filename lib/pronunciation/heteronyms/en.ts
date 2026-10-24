import type { PartOfSpeechKey } from "@/lib/vocabulary/partOfSpeech";

import type { LocalizedText } from "../localizedText";
import { meaning as m, type Heteronym, type HeteronymReading } from "./types";

/* =========================================================
   English words spelled alike and said differently

   Most move their stress with their part of speech — a REcord, to
   reCORD — and the rest change a vowel with their meaning: to read, have
   read; lead the way, a lead pipe. American English, written the way the
   app's other English IPA is (lib/pronunciation/builtinIpaData.ts).

   The example is a phrase that leaves the voice one reading to choose.
   ========================================================= */

function r(
  phonetic: string,
  sense: LocalizedText,
  example: string,
  examplePhonetic: string,
  partOfSpeech?: PartOfSpeechKey,
): HeteronymReading {
  return { phonetic, meaning: sense, example, examplePhonetic, partOfSpeech };
}

function en(word: string, ...readings: HeteronymReading[]): Heteronym {
  return { language: "en", word, readings };
}

export const EN_HETERONYMS: readonly Heteronym[] = [
  en(
    "record",
    r("/ˈrɛkərd/", m("a written account; a disc", "紀錄；唱片", "registro; disco", "registre ; disque", "registro; disco"), "a record", "/ə ˈrɛkərd/", "noun"),
    r("/rɪˈkɔrd/", m("to write down; to capture sound", "記錄；錄音", "registrar; grabar", "enregistrer", "registrare"), "to record", "/tə rɪˈkɔrd/", "verb"),
  ),
  en(
    "present",
    r("/ˈprɛzənt/", m("a gift; now; here", "禮物；現在的；在場的", "regalo; actual; presente", "cadeau ; actuel ; présent", "regalo; attuale; presente"), "a present", "/ə ˈprɛzənt/", "noun"),
    r("/prɪˈzɛnt/", m("to show; to give formally", "呈現；頒發", "presentar; entregar", "présenter ; remettre", "presentare; consegnare"), "to present", "/tə prɪˈzɛnt/", "verb"),
  ),
  en(
    "object",
    r("/ˈɑbdʒɪkt/", m("a thing", "物體", "objeto", "objet", "oggetto"), "an object", "/ən ˈɑbdʒɪkt/", "noun"),
    r("/əbˈdʒɛkt/", m("to protest", "反對", "objetar", "objecter", "obiettare"), "to object", "/tə əbˈdʒɛkt/", "verb"),
  ),
  en(
    "read",
    r("/rid/", m("to read (now)", "讀（現在式）", "leer (presente)", "lire (présent)", "leggere (presente)"), "to read", "/tə rid/"),
    r("/rɛd/", m("read (past)", "讀過（過去式）", "leído (pasado)", "lu (passé)", "letto (passato)"), "I have read", "/aɪ hæv rɛd/"),
  ),
  en(
    "lead",
    r("/lid/", m("to guide; first place", "帶領；領先", "guiar; ventaja", "mener ; tête", "guidare; comando"), "lead the way", "/lid ðə weɪ/"),
    r("/lɛd/", m("a heavy metal", "鉛", "plomo", "plomb", "piombo"), "a lead pipe", "/ə lɛd paɪp/"),
  ),
  en(
    "live",
    r("/lɪv/", m("to be alive; to dwell", "生活；居住", "vivir", "vivre ; habiter", "vivere; abitare"), "to live", "/tə lɪv/", "verb"),
    r("/laɪv/", m("alive; happening now", "活的；現場的", "vivo; en directo", "vivant ; en direct", "vivo; dal vivo"), "live music", "/laɪv ˈmjuzɪk/", "adjective"),
  ),
  en(
    "wind",
    r("/wɪnd/", m("moving air", "風", "viento", "vent", "vento"), "the wind", "/ðə wɪnd/", "noun"),
    r("/waɪnd/", m("to turn; to coil", "轉動；纏繞", "dar cuerda; enrollar", "remonter ; enrouler", "caricare; avvolgere"), "wind the clock", "/waɪnd ðə klɑk/", "verb"),
  ),
  en(
    "tear",
    r("/tɪr/", m("a drop from the eye", "眼淚", "lágrima", "larme", "lacrima"), "tears of joy", "/tɪrz əv dʒɔɪ/"),
    r("/tɛr/", m("to rip", "撕破", "rasgar", "déchirer", "strappare"), "tear the paper", "/tɛr ðə ˈpeɪpər/"),
  ),
  en(
    "bow",
    r("/baʊ/", m("to bend at the waist", "鞠躬", "inclinarse", "s'incliner", "inchinarsi"), "take a bow", "/teɪk ə baʊ/"),
    r("/boʊ/", m("a knot; a weapon for arrows", "蝴蝶結；弓", "lazo; arco", "nœud ; arc", "fiocco; arco"), "a bow and arrow", "/ə boʊ ənd ˈæroʊ/"),
  ),
  en(
    "row",
    r("/roʊ/", m("a line; to paddle", "一排；划船", "fila; remar", "rangée ; ramer", "fila; remare"), "in a row", "/ɪn ə roʊ/"),
    r("/raʊ/", m("a quarrel", "爭吵", "pelea", "dispute", "litigio"), "a blazing row", "/ə ˈbleɪzɪŋ raʊ/"),
  ),
  en(
    "close",
    r("/kloʊs/", m("near", "近的", "cerca", "proche", "vicino"), "close to home", "/kloʊs tə hoʊm/", "adjective"),
    r("/kloʊz/", m("to shut", "關上", "cerrar", "fermer", "chiudere"), "close the door", "/kloʊz ðə dɔr/", "verb"),
  ),
  en(
    "use",
    r("/jus/", m("purpose; usefulness", "用途", "uso", "usage", "uso"), "no use", "/noʊ jus/", "noun"),
    r("/juz/", m("to employ", "使用", "usar", "utiliser", "usare"), "use it", "/juz ɪt/", "verb"),
  ),
  en(
    "minute",
    r("/ˈmɪnɪt/", m("sixty seconds", "分鐘", "minuto", "minute", "minuto"), "one minute", "/wʌn ˈmɪnɪt/", "noun"),
    r("/maɪˈnut/", m("tiny", "極小的", "diminuto", "minuscule", "minuscolo"), "minute details", "/maɪˈnut ˈditeɪlz/", "adjective"),
  ),
  en(
    "content",
    r("/ˈkɑntɛnt/", m("what is inside", "內容", "contenido", "contenu", "contenuto"), "the content", "/ðə ˈkɑntɛnt/", "noun"),
    r("/kənˈtɛnt/", m("satisfied", "滿足的", "contento", "content", "contento"), "content with life", "/kənˈtɛnt wɪð laɪf/", "adjective"),
  ),
  en(
    "desert",
    r("/ˈdɛzərt/", m("dry land", "沙漠", "desierto", "désert", "deserto"), "the desert", "/ðə ˈdɛzərt/", "noun"),
    r("/dɪˈzɜrt/", m("to abandon", "拋棄", "abandonar", "abandonner", "abbandonare"), "desert a friend", "/dɪˈzɜrt ə frɛnd/", "verb"),
  ),
  en(
    "produce",
    r("/ˈproʊdus/", m("fruit and vegetables", "農產品", "productos frescos", "produits frais", "prodotti freschi"), "fresh produce", "/frɛʃ ˈproʊdus/", "noun"),
    r("/prəˈdus/", m("to make", "生產", "producir", "produire", "produrre"), "to produce", "/tə prəˈdus/", "verb"),
  ),
  en(
    "refuse",
    r("/rɪˈfjuz/", m("to say no", "拒絕", "negarse", "refuser", "rifiutare"), "to refuse", "/tə rɪˈfjuz/", "verb"),
    r("/ˈrɛfjus/", m("rubbish", "垃圾", "basura", "ordures", "rifiuti"), "household refuse", "/ˈhaʊshoʊld ˈrɛfjus/", "noun"),
  ),
  en(
    "wound",
    r("/wund/", m("an injury", "傷口", "herida", "blessure", "ferita"), "a deep wound", "/ə dip wund/"),
    r("/waʊnd/", m("turned, coiled (past of wind)", "轉過、纏繞過", "dio cuerda, enrolló", "remonté, enroulé", "caricato, avvolto"), "wound the clock", "/waʊnd ðə klɑk/"),
  ),
  en(
    "permit",
    r("/ˈpɜrmɪt/", m("a written permission", "許可證", "permiso", "permis", "permesso"), "a permit", "/ə ˈpɜrmɪt/", "noun"),
    r("/pərˈmɪt/", m("to allow", "允許", "permitir", "permettre", "permettere"), "to permit", "/tə pərˈmɪt/", "verb"),
  ),
  en(
    "project",
    r("/ˈprɑdʒɛkt/", m("a planned piece of work", "專案", "proyecto", "projet", "progetto"), "a project", "/ə ˈprɑdʒɛkt/", "noun"),
    r("/prəˈdʒɛkt/", m("to throw forward; to forecast", "投射；預測", "proyectar; prever", "projeter ; prévoir", "proiettare; prevedere"), "to project", "/tə prəˈdʒɛkt/", "verb"),
  ),
  en(
    "conduct",
    r("/ˈkɑndʌkt/", m("behaviour", "行為", "conducta", "conduite", "condotta"), "good conduct", "/ɡʊd ˈkɑndʌkt/", "noun"),
    r("/kənˈdʌkt/", m("to lead; to carry out", "指揮；進行", "dirigir; llevar a cabo", "diriger ; mener", "dirigere; condurre"), "to conduct", "/tə kənˈdʌkt/", "verb"),
  ),
  en(
    "contract",
    r("/ˈkɑntrækt/", m("an agreement", "合約", "contrato", "contrat", "contratto"), "a contract", "/ə ˈkɑntrækt/", "noun"),
    r("/kənˈtrækt/", m("to shrink; to catch (an illness)", "收縮；染上", "contraer", "contracter", "contrarre"), "to contract", "/tə kənˈtrækt/", "verb"),
  ),
  en(
    "subject",
    r("/ˈsʌbdʒɪkt/", m("a topic; a school subject", "主題；科目", "tema; asignatura", "sujet ; matière", "argomento; materia"), "the subject", "/ðə ˈsʌbdʒɪkt/", "noun"),
    r("/səbˈdʒɛkt/", m("to put through", "使遭受", "someter", "soumettre", "sottoporre"), "to subject", "/tə səbˈdʒɛkt/", "verb"),
  ),
  en(
    "does",
    r("/dʌz/", m("does (form of do)", "做（do 的第三人稱）", "hace (de do)", "fait (de do)", "fa (di do)"), "she does", "/ʃi dʌz/", "verb"),
    r("/doʊz/", m("female deer (plural)", "母鹿（複數）", "ciervas", "biches", "cerve"), "deer and does", "/dɪr ənd doʊz/", "noun"),
  ),
  en(
    "bass",
    r("/beɪs/", m("low sound; a bass instrument", "低音；貝斯", "bajo (sonido, instrumento)", "basse", "basso"), "bass guitar", "/beɪs ɡɪˈtɑr/"),
    r("/bæs/", m("a fish", "鱸魚", "lubina", "bar (poisson)", "branzino"), "sea bass", "/si bæs/"),
  ),
  en(
    "dove",
    r("/dʌv/", m("a bird", "鴿子", "paloma", "colombe", "colomba"), "a white dove", "/ə waɪt dʌv/", "noun"),
    r("/doʊv/", m("dived (past of dive)", "跳水了（dive 的過去式）", "se zambulló", "a plongé", "si tuffò"), "she dove in", "/ʃi doʊv ɪn/", "verb"),
  ),
  en(
    "separate",
    r("/ˈsɛpərɪt/", m("apart, not shared", "分開的", "separado", "séparé", "separato"), "separate rooms", "/ˈsɛpərɪt rumz/", "adjective"),
    r("/ˈsɛpəreɪt/", m("to divide", "分開", "separar", "séparer", "separare"), "to separate", "/tə ˈsɛpəreɪt/", "verb"),
  ),
  en(
    "estimate",
    r("/ˈɛstəmɪt/", m("a rough figure", "估計值", "estimación", "estimation", "stima"), "an estimate", "/ən ˈɛstəmɪt/", "noun"),
    r("/ˈɛstəmeɪt/", m("to judge roughly", "估計", "estimar", "estimer", "stimare"), "to estimate", "/tə ˈɛstəmeɪt/", "verb"),
  ),
  en(
    "increase",
    r("/ˈɪnkris/", m("a rise", "增加（名詞）", "aumento", "hausse", "aumento"), "an increase", "/ən ˈɪnkris/", "noun"),
    r("/ɪnˈkris/", m("to grow, to raise", "增加（動詞）", "aumentar", "augmenter", "aumentare"), "to increase", "/tu ɪnˈkris/", "verb"),
  ),
  en(
    "graduate",
    r("/ˈɡrædʒuɪt/", m("someone with a degree", "畢業生", "graduado", "diplômé", "laureato"), "a graduate", "/ə ˈɡrædʒuɪt/", "noun"),
    r("/ˈɡrædʒueɪt/", m("to finish a degree", "畢業", "graduarse", "obtenir son diplôme", "laurearsi"), "to graduate", "/tə ˈɡrædʒueɪt/", "verb"),
  ),
];
