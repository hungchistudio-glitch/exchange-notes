import type { InterfaceLanguage } from "@/lib/appPreferences";

/* The design review’s own words (components/shop/proposals/Proposal333Review.tsx), in the five interface languages. */
type Copy = {
  title: string;
  subtitle: string;
  note: string;
  orbital: string;
  space: string;
  all: string;
  prototypes: string;
  list: string;
  mix: string;
  solo: string;
  reset: string;
  day: string;
  night: string;
  wearing: string;
  empty: string;
  draft: string;
  ready: string;
  download: string;
  language: string;
  price: string;
  search: string;
  count: string;
  story: string;
};

export const COPY_333: Record<InterfaceLanguage, Copy> = {
  "traditional-chinese": {
    title: "從地球工藝，走進異星想像。",
    subtitle: "333 件館藏的下一段旅程",
    note: "設計試閱：113 件提案，10 件可試穿代表款。這裡不會消耗餅乾或改動你的衣櫥。",
    orbital: "軌道工坊",
    space: "深空珍藏",
    all: "全部提案",
    prototypes: "試穿代表款",
    list: "完整清單",
    mix: "混搭試穿",
    solo: "單件檢視",
    reset: "卸下全部",
    day: "日間",
    night: "夜間",
    wearing: "穿戴中",
    empty: "原始 Yumi",
    draft: "設計提案",
    ready: "可試穿",
    download: "下載完整設計清單（繁體中文）",
    language: "頁面語言",
    price: "枚餅乾 · 提案價",
    search: "搜尋新品名稱",
    count: "件新品",
    story: "設計筆記",
  },
  english: {
    title: "Earth-made wonders. Otherworldly possibilities.",
    subtitle: "The next chapter of a 333-piece collection",
    note: "Design review: 113 proposals, 10 wearable prototypes. No cookies or wardrobe data are changed here.",
    orbital: "Orbital Atelier",
    space: "Deep Space Treasures",
    all: "All proposals",
    prototypes: "Try the prototypes",
    list: "Full catalogue",
    mix: "Mix and match",
    solo: "Inspect one piece",
    reset: "Remove all",
    day: "Day",
    night: "Night",
    wearing: "Wearing",
    empty: "Original Yumi",
    draft: "Design proposal",
    ready: "Try on",
    download: "Download full design list (Traditional Chinese)",
    language: "Page language",
    price: "cookies · proposed",
    search: "Search new pieces",
    count: "new pieces",
    story: "Design notes",
  },
  french: {
    title: "Merveilles de la Terre. Imaginaires d’ailleurs.",
    subtitle: "Le prochain chapitre d’une collection de 333 pièces",
    note: "Aperçu : 113 propositions, 10 prototypes à essayer. Aucun cookie ni aucune tenue enregistrée ne change ici.",
    orbital: "Atelier orbital",
    space: "Trésors de l’espace lointain",
    all: "Toutes les propositions",
    prototypes: "Essayer les prototypes",
    list: "Catalogue complet",
    mix: "Associer les pièces",
    solo: "Voir une seule pièce",
    reset: "Tout retirer",
    day: "Jour",
    night: "Nuit",
    wearing: "Porté",
    empty: "Yumi d’origine",
    draft: "Proposition",
    ready: "Essayer",
    download: "Télécharger la liste complète (chinois traditionnel)",
    language: "Langue de la page",
    price: "cookies · prix proposé",
    search: "Rechercher une pièce",
    count: "nouvelles pièces",
    story: "Notes de conception",
  },
  italian: {
    title: "Meraviglie terrestri. Immaginazioni lontane.",
    subtitle: "Il prossimo capitolo di una collezione di 333 pezzi",
    note: "Anteprima: 113 proposte, 10 prototipi da provare. Nessun biscotto o abito salvato viene modificato.",
    orbital: "Atelier orbitale",
    space: "Tesori dello spazio profondo",
    all: "Tutte le proposte",
    prototypes: "Prova i prototipi",
    list: "Catalogo completo",
    mix: "Combina i pezzi",
    solo: "Esamina un pezzo",
    reset: "Rimuovi tutto",
    day: "Giorno",
    night: "Notte",
    wearing: "Indossato",
    empty: "Yumi originale",
    draft: "Proposta",
    ready: "Prova",
    download: "Scarica la lista completa (cinese tradizionale)",
    language: "Lingua della pagina",
    price: "biscotti · prezzo proposto",
    search: "Cerca nuovi pezzi",
    count: "nuovi pezzi",
    story: "Note di progetto",
  },
  spanish: {
    title: "Maravillas terrestres. Imaginación de otros mundos.",
    subtitle: "El próximo capítulo de una colección de 333 piezas",
    note: "Vista de diseño: 113 propuestas, 10 prototipos para probar. No se gastan galletas ni se cambia tu vestuario.",
    orbital: "Taller orbital",
    space: "Tesoros del espacio profundo",
    all: "Todas las propuestas",
    prototypes: "Prueba los prototipos",
    list: "Catálogo completo",
    mix: "Combinar piezas",
    solo: "Ver una sola pieza",
    reset: "Quitar todo",
    day: "Día",
    night: "Noche",
    wearing: "Puesto",
    empty: "Yumi original",
    draft: "Propuesta",
    ready: "Probar",
    download: "Descargar la lista completa (chino tradicional)",
    language: "Idioma de la página",
    price: "galletas · precio propuesto",
    search: "Buscar piezas nuevas",
    count: "piezas nuevas",
    story: "Notas de diseño",
  },
};
