import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   Today's theme: a few words to start from

   A first reader asked for somewhere to begin without having to think of a
   word (Chi, 2026-11-13, choosing the daily theme over AI suggestions and a
   lesson mode). So the empty search offers five words from one everyday
   theme, in the language being learned, and a tap looks one up.

   Built in, not asked of a model: it costs no AI allowance, it is there with
   no signal, and it is the same for everyone on a given day. The theme
   changes at local midnight. A word the reader already keeps is passed over,
   so the five are always new to them; a theme they have kept every word of
   gives way to the next one.

   Each language's list is its own, not a translation table: the theme is
   shared, and each list is the everyday words of that theme in that
   language.
   ========================================================= */

export type ThemeWords = {
  id: string;
  /** The theme's name, in each interface language. */
  name: Record<LanguageCode, string>;
  /** The words, in each language that can be learned. */
  words: Record<LanguageCode, readonly string[]>;
};

export const THEMES: readonly ThemeWords[] = [
  {
    id: "cafe",
    name: { en: "At a café", "zh-TW": "咖啡廳", es: "En la cafetería", fr: "Au café", it: "Al bar" },
    words: {
      en: ["coffee", "tea", "menu", "cup", "sugar", "milk", "bill", "table"],
      "zh-TW": ["咖啡", "茶", "菜單", "杯子", "糖", "牛奶", "帳單", "桌子"],
      es: ["café", "té", "menú", "taza", "azúcar", "leche", "cuenta", "mesa"],
      fr: ["café", "thé", "menu", "tasse", "sucre", "lait", "addition", "table"],
      it: ["caffè", "tè", "menù", "tazza", "zucchero", "latte", "conto", "tavolo"],
    },
  },
  {
    id: "transit",
    name: { en: "Getting around", "zh-TW": "搭車", es: "Transporte", fr: "Se déplacer", it: "In viaggio" },
    words: {
      en: ["train", "ticket", "station", "bus", "airport", "map", "luggage", "platform"],
      "zh-TW": ["火車", "車票", "車站", "公車", "機場", "地圖", "行李", "月台"],
      es: ["tren", "billete", "estación", "autobús", "aeropuerto", "mapa", "equipaje", "andén"],
      fr: ["train", "billet", "gare", "bus", "aéroport", "plan", "bagages", "quai"],
      it: ["treno", "biglietto", "stazione", "autobus", "aeroporto", "mappa", "bagaglio", "binario"],
    },
  },
  {
    id: "weather",
    name: { en: "Weather", "zh-TW": "天氣", es: "El tiempo", fr: "La météo", it: "Il meteo" },
    words: {
      en: ["rain", "sun", "cloud", "wind", "umbrella", "snow", "hot", "cold"],
      "zh-TW": ["雨", "太陽", "雲", "風", "雨傘", "雪", "熱", "冷"],
      es: ["lluvia", "sol", "nube", "viento", "paraguas", "nieve", "calor", "frío"],
      fr: ["pluie", "soleil", "nuage", "vent", "parapluie", "neige", "chaud", "froid"],
      it: ["pioggia", "sole", "nuvola", "vento", "ombrello", "neve", "caldo", "freddo"],
    },
  },
  {
    id: "home",
    name: { en: "At home", "zh-TW": "家裡", es: "En casa", fr: "À la maison", it: "A casa" },
    words: {
      en: ["kitchen", "window", "door", "bed", "chair", "lamp", "key", "sofa"],
      "zh-TW": ["廚房", "窗戶", "門", "床", "椅子", "檯燈", "鑰匙", "沙發"],
      es: ["cocina", "ventana", "puerta", "cama", "silla", "lámpara", "llave", "sofá"],
      fr: ["cuisine", "fenêtre", "porte", "lit", "chaise", "lampe", "clé", "canapé"],
      it: ["cucina", "finestra", "porta", "letto", "sedia", "lampada", "chiave", "divano"],
    },
  },
  {
    id: "market",
    name: { en: "At the market", "zh-TW": "市場", es: "En el mercado", fr: "Au marché", it: "Al mercato" },
    words: {
      en: ["apple", "bread", "fish", "vegetables", "price", "bag", "egg", "rice"],
      "zh-TW": ["蘋果", "麵包", "魚", "蔬菜", "價格", "袋子", "蛋", "米"],
      es: ["manzana", "pan", "pescado", "verduras", "precio", "bolsa", "huevo", "arroz"],
      fr: ["pomme", "pain", "poisson", "légumes", "prix", "sac", "œuf", "riz"],
      it: ["mela", "pane", "pesce", "verdura", "prezzo", "borsa", "uovo", "riso"],
    },
  },
  {
    id: "feelings",
    name: { en: "Feelings", "zh-TW": "心情", es: "Emociones", fr: "Émotions", it: "Emozioni" },
    words: {
      en: ["happy", "tired", "nervous", "excited", "bored", "proud", "worried", "calm"],
      "zh-TW": ["開心", "累", "緊張", "興奮", "無聊", "驕傲", "擔心", "平靜"],
      es: ["feliz", "cansado", "nervioso", "emocionado", "aburrido", "orgulloso", "preocupado", "tranquilo"],
      fr: ["heureux", "fatigué", "nerveux", "ravi", "fier", "inquiet", "calme", "triste"],
      it: ["felice", "stanco", "nervoso", "emozionato", "annoiato", "orgoglioso", "preoccupato", "calmo"],
    },
  },
  {
    id: "doctor",
    name: { en: "At the doctor's", "zh-TW": "看醫生", es: "En el médico", fr: "Chez le médecin", it: "Dal medico" },
    words: {
      en: ["doctor", "headache", "medicine", "fever", "cough", "pharmacy", "appointment", "sleep"],
      "zh-TW": ["醫生", "頭痛", "藥", "發燒", "咳嗽", "藥局", "預約", "睡覺"],
      es: ["médico", "dolor de cabeza", "medicina", "fiebre", "tos", "farmacia", "cita", "dormir"],
      fr: ["médecin", "mal de tête", "médicament", "fièvre", "toux", "pharmacie", "rendez-vous", "dormir"],
      it: ["medico", "mal di testa", "medicina", "febbre", "tosse", "farmacia", "appuntamento", "dormire"],
    },
  },
  {
    id: "work",
    name: { en: "Work and school", "zh-TW": "上班上課", es: "Trabajo y estudios", fr: "Travail et études", it: "Lavoro e studio" },
    words: {
      en: ["meeting", "email", "deadline", "homework", "teacher", "notebook", "schedule", "break"],
      "zh-TW": ["會議", "電子郵件", "截止日期", "作業", "老師", "筆記本", "行程", "休息"],
      es: ["reunión", "correo", "fecha límite", "deberes", "profesor", "cuaderno", "horario", "descanso"],
      fr: ["réunion", "e-mail", "échéance", "devoirs", "professeur", "cahier", "emploi du temps", "pause"],
      it: ["riunione", "email", "scadenza", "compiti", "insegnante", "quaderno", "orario", "pausa"],
    },
  },
  {
    id: "greetings",
    name: { en: "Saying hello", "zh-TW": "打招呼", es: "Saludos", fr: "Salutations", it: "Saluti" },
    words: {
      en: ["hello", "thank you", "sorry", "please", "goodbye", "welcome", "nice to meet you", "how are you"],
      "zh-TW": ["你好", "謝謝", "對不起", "請", "再見", "歡迎", "很高興認識你", "你好嗎"],
      es: ["hola", "gracias", "perdón", "por favor", "adiós", "bienvenido", "encantado", "¿qué tal?"],
      fr: ["bonjour", "merci", "pardon", "s'il vous plaît", "au revoir", "bienvenue", "enchanté", "ça va ?"],
      it: ["ciao", "grazie", "scusa", "per favore", "arrivederci", "benvenuto", "piacere", "come stai?"],
    },
  },
  {
    id: "weekend",
    name: { en: "The weekend", "zh-TW": "週末", es: "El fin de semana", fr: "Le week-end", it: "Il fine settimana" },
    words: {
      en: ["movie", "music", "park", "beach", "museum", "concert", "picnic", "hiking"],
      "zh-TW": ["電影", "音樂", "公園", "海灘", "博物館", "演唱會", "野餐", "爬山"],
      es: ["película", "música", "parque", "playa", "museo", "concierto", "pícnic", "senderismo"],
      fr: ["film", "musique", "parc", "plage", "musée", "concert", "pique-nique", "randonnée"],
      it: ["film", "musica", "parco", "spiaggia", "museo", "concerto", "picnic", "escursionismo"],
    },
  },
];

/** How many words are offered at once. */
export const THEME_WORDS_SHOWN = 5;

const DAY_MS = 86_400_000;

/** Days since 1970-01-01 on the reader's own calendar, so the theme turns at their midnight. */
export function localDayNumber(now: Date = new Date()): number {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / DAY_MS);
}

/** Lower case, no accents or surrounding punctuation: "Café" and "cafe" are one word here. */
function comparable(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[¿?¡!.,]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Today's theme and up to five of its words the reader does not keep yet, in
 * the language they are learning. A theme with nothing left gives way to the
 * next; null only if every theme is exhausted.
 */
export function themeWordsFor(
  day: number,
  learning: LanguageCode,
  kept: Iterable<string>,
): { theme: ThemeWords; words: string[] } | null {
  const known = new Set<string>();
  for (const text of kept) known.add(comparable(text));

  for (let step = 0; step < THEMES.length; step += 1) {
    const theme = THEMES[(((day + step) % THEMES.length) + THEMES.length) % THEMES.length];
    const words = theme.words[learning]
      .filter((word) => !known.has(comparable(word)))
      .slice(0, THEME_WORDS_SHOWN);
    if (words.length > 0) return { theme, words };
  }

  return null;
}
