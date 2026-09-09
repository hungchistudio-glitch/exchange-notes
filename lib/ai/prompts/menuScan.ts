import {
  promptLanguageName,
  promptLanguagePair,
  whenFieldNamesMislead,
  whenScriptRuleApplies,
} from "@/lib/ai/languagePrompt";
import type { LanguageCode } from "@/lib/languages";

/*
 * One prompt, no target language in it.
 *
 * The reader asks for both languages every time, so which of the two leads on
 * screen is the viewer's decision rather than the model's — and a scan is the
 * same scan whichever way the app is set.
 */
export function buildMenuScanPrompt([first, second]: readonly [
  LanguageCode,
  LanguageCode,
]) {
  const firstName = promptLanguageName(first);
  const secondName = promptLanguageName(second);
  const pair = promptLanguagePair(first, second);

  /*
   * The script rule outranks fidelity to the photograph, and it is the
   * longest rule in this prompt — so it is also the one most worth leaving
   * out when it does not apply. A Spanish and French menu scan should not be
   * carrying three paragraphs about Traditional characters and two
   * transcription examples; that is not merely wasted context, it is an
   * instruction to think about a language that is not involved.
   */
  const fieldNote = whenFieldNamesMislead([first, second], `\n\nThe output fields are named "englishName", "chineseName",
"englishDescription" and "chineseDescription" for historical reasons; those
names do not describe this request. Every "english" field holds the
${firstName} side and every "chinese" field holds the ${secondName} side. Answer only in the two languages named above.`);

  const scriptRule = whenScriptRuleApplies(
    [first, second],
    `

Chinese script rule. It outranks every other rule here, including fidelity to
the photograph:
- Every Chinese character you return, in every field — sourceName,
  chineseName and both descriptions included — must be Traditional as written
  in Taiwan.
- When the list is printed in Simplified characters, sourceName is the
  Traditional transcription of what it says, not a copy of the glyphs. 电视机
  is returned as 電視機; 开水器 as 開水器; 灭蝇灯 as 滅蠅燈.
- There is no field, and no reason, for which a Simplified character is
  acceptable. The reader of this app reads Traditional Chinese and nothing
  else.`,
  );

  return `
You are reading a photograph of a printed list for someone learning ${pair} —
most often a restaurant menu, but equally a price list, a shop's shelf card,
or a handwritten shopping list. Return the whole list as structured data.

Every item comes back in BOTH ${firstName} and ${secondName}, whatever language
the list itself is written in. Their app is the two languages against each
other, so a list already printed in the reader's own language still needs the
other side just as much, and the same the other way round. Never leave either
side empty because it felt redundant.

Layout rules:
- Group items under the section headings the list itself uses. If it has no
  headings, return one section with an empty title.
- Keep every price with the item it belongs to, exactly as printed, including
  the currency symbol or word. Never convert, round, or invent a price. A
  shopping list usually has no prices at all: return an empty string for
  those rather than estimating one.
- Report every region as normalised coordinates between 0 and 1, where x and y
  are the top-left corner, relative to the whole image. An item's region must
  cover its name and its price as printed.
- Read the list in the order a person would: top to bottom within a column,
  then column by column.${scriptRule}

Naming rules:
- sourceName is the line exactly as printed, in the language of the list.
- englishName is the item's name in ${firstName}. chineseName is its name in
  ${secondName}. One of the two is usually a translation of the other; when the
  list is already in that language, it is simply the same name.
- If the list is already written in ${firstName} or in ${secondName}, that side
  repeats the printed name rather than being left empty or invented anew.
- When a dish is culturally specific and a literal translation would mislead
  (Okonomiyaki, Bibimbap, Cacio e Pepe), keep the original or transliterated
  name and put a short plain explanation in the descriptions instead. A
  recognisable name plus an explanation beats a literal translation that means
  nothing.
- englishDescription and chineseDescription are one short sentence each,
  saying the same thing in the two languages. If the list prints a
  description, translate it; if it does not, name the main ingredients you can
  infer from the name, or return empty strings if you cannot.
- ipa is the IPA transcription of englishName, written without surrounding
  slashes. Give the pronunciation a native ${firstName} speaker would use,
  including for borrowed names like Okonomiyaki.
- Never state or imply that an item is safe for an allergy or a diet.

Confidence rules:
- Use low ocrConfidence for text that is blurred, cut off, glared over,
  handwritten or partly hidden.
- Use low translationConfidence when the dish name is ambiguous or you are
  guessing at what it contains.
- Do not raise confidence to look helpful. A marked uncertainty is useful; a
  confident mistake is not.

If the photograph contains no list of written items at all — a landscape, a
person, a single object, a page of prose — return isMenu false with an empty
sections array. Anything that is a list of named things, priced or not,
should be read.${fieldNote}
`.trim();
}
