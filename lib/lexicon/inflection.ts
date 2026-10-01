import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   The dictionary form of a typed word, guessed

   The dictionaries on the server hold one form of each word — "shoe",
   "nave", "fuerza" — and readers type the one in front of them: "shoes",
   "navi", "fuerzas" (all three among real lookups that came back empty,
   2026-10-01). These are the forms a plural or a third-person "-s" most
   likely came from, most likely first. A guess only ever counts when the
   dictionary has it, so a wrong one costs nothing.

   Plurals and the commonest endings only. Anything cleverer — verb tenses,
   irregulars ("children", "yeux") — is what the model is for.
   ========================================================= */

type Rule = readonly [ending: RegExp, replacement: string];

const RULES: Record<LanguageCode, readonly Rule[]> = {
  en: [
    [/ies$/, "y"], // berries → berry, cities → city
    [/ves$/, "f"], // leaves → leaf, shelves → shelf
    [/ves$/, "fe"], // knives → knife, wives → wife
    [/(s|x|z|ch|sh|o)es$/, "$1"], // boxes → box, dishes → dish, tomatoes → tomato
    [/s$/, ""], // shoes → shoe, eats → eat
  ],
  es: [
    [/ces$/, "z"], // luces → luz, lápices → lápiz
    [/([aeiouáéíóú])s$/, "$1"], // casas → casa, cafés → café
    [/es$/, ""], // ciudades → ciudad, flores → flor
  ],
  fr: [
    [/aux$/, "al"], // journaux → journal, animaux → animal
    [/eaux$/, "eau"], // gâteaux → gâteau
    [/x$/, ""], // jeux → jeu, cheveux → cheveu
    [/s$/, ""], // pommes → pomme, chats → chat
  ],
  it: [
    [/chi$/, "co"], // cuochi → cuoco, tedeschi → tedesco
    [/ghi$/, "go"], // laghi → lago
    [/che$/, "ca"], // amiche → amica
    [/ghe$/, "ga"], // righe → riga
    [/i$/, "o"], // libri → libro, gatti → gatto
    [/i$/, "e"], // navi → nave, fiori → fiore
    [/e$/, "a"], // case → casa, sedie → sedia
  ],
  "zh-TW": [],
};

/** Possible dictionary forms of `text`, most likely first; never `text` itself. */
export function lemmaCandidates(text: string, language: LanguageCode): string[] {
  const word = text.trim();
  // Too short to be a plural worth guessing at ("is", "as", "tu").
  if (word.length < 4 || /\s/.test(word)) return [];

  const seen = new Set<string>();
  for (const [ending, replacement] of RULES[language]) {
    if (!ending.test(word)) continue;
    const candidate = word.replace(ending, replacement);
    if (candidate !== word && candidate.length >= 2) seen.add(candidate);
  }

  return [...seen];
}
