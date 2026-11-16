import type { LanguageCode } from "@/lib/languages";

import { meaning as m, type Heteronym, type HeteronymReading } from "./types";

/* =========================================================
   Japanese and Korean (2026-11-16)

   Japanese has more words that read two ways than any other language in
   the app, because a kanji word can be read the Chinese way or the native
   way, and the meaning moves with it: 今日 is きょう (today) or こんにち
   (these days), 上手 じょうず (skilful) or うわて (a cut above). The reading
   is written in hiragana, the way a Japanese dictionary gives it, and the
   example in IPA for Yumi's mouth.

   Korean spelling is close to its sound, so its pairs are of two kinds the
   spelling hides: the long vowels of the standard language (눈 eye and
   눈ː snow — kept in the dictionary, though many in Seoul no longer
   lengthen them), and the tensed consonant some words take where the
   spelling shows none (대가, a price, is [대까]; 대가, a master, is [대가]).

   Checked against the NHK accent dictionary's readings and the 표준국어대사전
   (Standard Korean Dictionary) by hand, as every list here is.
   ========================================================= */

function r(phonetic: string, sense: ReturnType<typeof m>, example: string, examplePhonetic: string): HeteronymReading {
  return { phonetic, meaning: sense, example, examplePhonetic };
}

function word(language: LanguageCode, spelling: string, ...readings: HeteronymReading[]): Heteronym {
  return { language, word: spelling, readings };
}

export const JA_HETERONYMS: readonly Heteronym[] = [
  word(
    "ja",
    "今日",
    r("きょう", m("today", "今天", "hoy", "aujourd’hui", "oggi", "きょう、この日", "오늘"), "今日は晴れです", "/kʲoː wa ha.ɾe de.sɯ/"),
    r("こんにち", m("these days, nowadays", "現今、如今", "hoy en día", "de nos jours", "al giorno d’oggi", "このごろ、現代", "오늘날"), "今日の社会", "/koɴ.ni.tɕi no ɕa.kai/"),
  ),
  word(
    "ja",
    "一日",
    r("ついたち", m("the first of the month", "每月一號", "el día uno del mes", "le premier du mois", "il primo del mese", "月の最初の日", "초하루"), "四月一日", "/ɕi.ŋa.tsɯ tsɯ.i.ta.tɕi/"),
    r("いちにち", m("one day, a whole day", "一天、一整天", "un día, todo el día", "un jour, toute une journée", "un giorno, tutto il giorno", "まる一日", "하루, 하루 종일"), "一日中", "/i.tɕi.ni.tɕi dʑɯː/"),
  ),
  word(
    "ja",
    "上手",
    r("じょうず", m("skilful, good at", "擅長、拿手", "hábil, bueno en", "doué, habile", "bravo, abile", "うまいこと", "잘함, 능숙함"), "料理が上手", "/ɾʲoː.ɾi ŋa dʑoː.zɯ/"),
    r("うわて", m("a cut above, superior", "更勝一籌", "superior, por encima", "supérieur, plus fort", "superiore, più bravo", "相手より勝っていること", "한 수 위"), "一枚上手", "/i.tɕi.mai u.wa.te/"),
  ),
  word(
    "ja",
    "下手",
    r("へた", m("unskilful, bad at", "不擅長、笨拙", "torpe, malo en", "maladroit, mauvais en", "maldestro, scarso", "うまくないこと", "서투름"), "歌が下手", "/ɯ.ta ŋa he.ta/"),
    r("しもて", m("stage left (from the audience, the right)", "下手（觀眾看去的舞台左側）", "lado izquierdo del escenario", "côté jardin", "lato sinistro del palco", "客席から見て舞台の左側", "무대 왼쪽(객석 기준)"), "下手に立つ", "/ɕi.mo.te ni ta.tsɯ/"),
  ),
  word(
    "ja",
    "生物",
    r("せいぶつ", m("living thing, organism; biology", "生物；生物學", "ser vivo; biología", "être vivant ; biologie", "essere vivente; biologia", "生きているもの", "생물"), "生物の授業", "/seː.bɯ.tsɯ no dʑɯ.ɡʲoː/"),
    r("なまもの", m("raw food, perishables", "生鮮食品", "alimento crudo, perecedero", "denrée crue, périssable", "cibo crudo, deperibile", "火を通していない食べ物", "날것, 생물(음식)"), "生物はお早めに", "/na.ma.mo.no wa o.ha.ja.me ni/"),
  ),
  word(
    "ja",
    "人気",
    r("にんき", m("popularity", "人氣、受歡迎", "popularidad", "popularité", "popolarità", "評判がよいこと", "인기"), "人気の店", "/niŋ.ki no mi.se/"),
    r("ひとけ", m("signs of people", "人的氣息、人影", "presencia de gente", "présence humaine", "presenza di persone", "人がいる気配", "인기척"), "人気のない道", "/çi.to.ke no na.i mi.tɕi/"),
  ),
  word(
    "ja",
    "市場",
    r("いちば", m("market (a place)", "市場（地方）", "mercado (lugar)", "marché (lieu)", "mercato (luogo)", "物を売り買いする場所", "시장(장소)"), "魚市場", "/sa.ka.na i.tɕi.ba/"),
    r("しじょう", m("market (the economy)", "市場（經濟）", "mercado (economía)", "marché (économie)", "mercato (economia)", "経済の取引の場", "시장(경제)"), "株式市場", "/ka.bɯ.ɕi.ki ɕi.dʑoː/"),
  ),
  word(
    "ja",
    "風車",
    r("ふうしゃ", m("windmill", "風車（建築）", "molino de viento", "moulin à vent", "mulino a vento", "風の力で回る大きな装置", "풍차"), "オランダの風車", "/o.ɾaɴ.da no ɸɯː.ɕa/"),
    r("かざぐるま", m("pinwheel (toy)", "風車（玩具）", "molinillo de viento", "moulinet (jouet)", "girandola", "風で回るおもちゃ", "바람개비"), "風車を回す", "/ka.za.ɡɯ.ɾɯ.ma o ma.wa.sɯ/"),
  ),
  word(
    "ja",
    "色紙",
    r("しきし", m("square board for autographs", "簽名板", "cartulina para autógrafos", "carton pour autographes", "cartoncino per autografi", "サインや絵を書く四角い厚紙", "사인용 색지"), "色紙にサイン", "/ɕi.ki.ɕi ni sa.iɴ/"),
    r("いろがみ", m("coloured paper (origami)", "色紙（摺紙用）", "papel de colores", "papier de couleur", "carta colorata", "折り紙などの色のついた紙", "색종이"), "色紙で鶴を折る", "/i.ɾo.ɡa.mi de tsɯ.ɾɯ o o.ɾɯ/"),
  ),
  word(
    "ja",
    "明日",
    r("あした", m("tomorrow", "明天", "mañana", "demain", "domani", "今日の次の日", "내일"), "明日会おう", "/a.ɕi.ta a.oː/"),
    r("みょうにち", m("tomorrow (formal)", "明日（正式）", "mañana (formal)", "demain (soutenu)", "domani (formale)", "あしたの改まった言い方", "내일(격식)"), "明日伺います", "/mʲoː.ni.tɕi u.ka.ŋa.i.ma.sɯ/"),
  ),
];

export const KO_HETERONYMS: readonly Heteronym[] = [
  word(
    "ko",
    "눈",
    r("/nun/", m("eye", "眼睛", "ojo", "œil", "occhio", "目", "눈(신체)"), "눈을 감다", "/nu.nɯl kam.t͈a/"),
    r("/nuːn/", m("snow", "雪", "nieve", "neige", "neve", "雪", "눈(날씨)"), "눈이 오다", "/nuː.ni o.da/"),
  ),
  word(
    "ko",
    "말",
    r("/mal/", m("horse", "馬", "caballo", "cheval", "cavallo", "馬", "말(동물)"), "말을 타다", "/ma.ɾɯl tʰa.da/"),
    r("/maːl/", m("speech, words", "話、言語", "palabras, habla", "paroles", "parole", "ことば", "말(언어)"), "말을 하다", "/maː.ɾɯl ha.da/"),
  ),
  word(
    "ko",
    "밤",
    r("/pam/", m("night", "夜晚", "noche", "nuit", "notte", "夜", "밤(시간)"), "밤이 깊다", "/pa.mi kip̚.t͈a/"),
    r("/paːm/", m("chestnut", "栗子", "castaña", "châtaigne", "castagna", "栗", "밤(열매)"), "군밤", "/kuːn.bam/"),
  ),
  word(
    "ko",
    "벌",
    r("/pʌːl/", m("bee", "蜜蜂", "abeja", "abeille", "ape", "ハチ", "벌(곤충)"), "벌에 쏘이다", "/pʌː.ɾe s͈o.i.da/"),
    r("/pʌl/", m("punishment", "懲罰", "castigo", "punition", "punizione", "罰", "벌(처벌)"), "벌을 받다", "/pʌ.ɾɯl pat̚.t͈a/"),
  ),
  word(
    "ko",
    "사과",
    r("/sa.ɡwa/", m("apple", "蘋果", "manzana", "pomme", "mela", "りんご", "사과(과일)"), "사과 한 개", "/sa.ɡwa han ɡe/"),
    r("/saː.ɡwa/", m("apology", "道歉", "disculpa", "excuses", "scuse", "謝罪", "사과(용서를 빎)"), "사과를 하다", "/saː.ɡwa.ɾɯl ha.da/"),
  ),
  word(
    "ko",
    "잠자리",
    r("/tɕam.dʑa.ɾi/", m("dragonfly", "蜻蜓", "libélula", "libellule", "libellula", "トンボ", "잠자리(곤충)"), "고추잠자리", "/ko.tɕʰu.dʑam.dʑa.ɾi/"),
    r("/tɕam.t͈ɕa.ɾi/", m("bed, place to sleep", "睡覺的地方", "cama, lugar para dormir", "lit, couche", "letto, giaciglio", "寝る所", "잠자리(자는 곳)"), "잠자리에 들다", "/tɕam.t͈ɕa.ɾi.e tɯl.da/"),
  ),
  word(
    "ko",
    "대가",
    r("/te.k͈a/", m("price, cost (paid for something)", "代價", "precio, coste", "prix, contrepartie", "prezzo, costo", "代価", "대가(값)"), "노력의 대가", "/no.ɾʲʌ.ɡe te.k͈a/"),
    r("/te.ɡa/", m("master, great authority", "大師、大家", "maestro, gran autoridad", "maître, grande autorité", "maestro, grande autorità", "大家（その道の権威）", "대가(권위자)"), "음악의 대가", "/ɯ.ma.ɡe te.ɡa/"),
  ),
  word(
    "ko",
    "사기",
    r("/sa.ɡi/", m("fraud, swindle", "詐騙", "estafa", "escroquerie", "truffa", "詐欺", "사기(속임)"), "사기를 당하다", "/sa.ɡi.ɾɯl taŋ.ha.da/"),
    r("/sa.k͈i/", m("morale", "士氣", "moral (ánimo)", "moral (des troupes)", "morale", "士気", "사기(의욕)"), "사기가 오르다", "/sa.k͈i.ɡa o.ɾɯ.da/"),
  ),
  word(
    "ko",
    "고가",
    r("/ko.k͈a/", m("high price", "高價", "precio alto", "prix élevé", "prezzo alto", "高価", "고가(비싼 값)"), "고가의 시계", "/ko.k͈a.e ɕi.ɡje/"),
    r("/ko.ɡa/", m("elevated (road, railway)", "高架", "elevado (vía)", "surélevé (voie)", "sopraelevato", "高架", "고가(높이 걸친 길)"), "고가 도로", "/ko.ɡa to.ɾo/"),
  ),
  word(
    "ko",
    "거리",
    r("/kʌ.ɾi/", m("street", "街道", "calle", "rue", "strada", "通り", "거리(길)"), "거리를 걷다", "/kʌ.ɾi.ɾɯl kʌt̚.t͈a/"),
    r("/kʌː.ɾi/", m("distance", "距離", "distancia", "distance", "distanza", "距離", "거리(사이)"), "먼 거리", "/mʌːn kʌː.ɾi/"),
  ),
];
