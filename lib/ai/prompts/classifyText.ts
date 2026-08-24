import {
  promptLanguageName,
  whenScriptRuleApplies,
} from "@/lib/ai/languagePrompt";
import { LANGUAGE_CODES, type LanguageCode } from "@/lib/languages";
import type { LanguageRoles } from "@/lib/lexicon/languageRouting";
import type { LexiconQueryKind } from "@/lib/lexicon/types";

/* =========================================================
   Asking about a piece of text without telling it what to be

   The old prompt named two languages and said the input was one of them.
   That was true while the app taught one pair. With five languages it is a
   trap: a reader studying English who types "tondre" was handed a model that
   had been told, in the prompt and in the schema both, that French was not
   an option. It answered English, because it had been left nothing else to
   answer, and the word went into the library filed as English forever.

   So the languages are named as *context* now — this is what the reader
   studies, this is what they read — and the question of what the text
   actually is stays open across all five.
   ========================================================= */

export type ClassifyTextPromptOptions = {
  query: string;
  /** What the reader studies, reads the app in, and grew up with. */
  roles: LanguageRoles;
  /**
   * The spelling detector's guess, when it had one worth mentioning.
   *
   * Offered as evidence, not as an instruction — it has seen how the word is
   * spelled and nothing else, and it is wrong often enough that a model told
   * to obey it would inherit its mistakes.
   */
  detected?: LanguageCode | null;
  /** Set when the reader picked the language by hand. Then it is settled. */
  chosen?: LanguageCode | null;
  /** How much text this is, as the app measured it. */
  kind: LexiconQueryKind;
};

function languageList(displayIn: (code: LanguageCode) => string) {
  return LANGUAGE_CODES.map((code) => `${displayIn(code)} (${code})`).join(", ");
}

export function buildClassifyTextPrompt({
  query,
  roles,
  detected,
  chosen,
  kind,
}: ClassifyTextPromptOptions) {
  const { learning, support, native } = roles;
  const learningName = promptLanguageName(learning);
  const supportName = promptLanguageName(support);

  /*
   * The languages the reader can already read without help. The answer they
   * want depends on it — see resolveCardLanguages — so the model is told the
   * set rather than being asked to guess who they are.
   */
  const readable = [support, native].filter(
    (code, index, all): code is LanguageCode =>
      Boolean(code) && all.indexOf(code) === index,
  );

  const readableNames = readable.map(promptLanguageName).join(" or ");

  const scriptRule = whenScriptRuleApplies(
    LANGUAGE_CODES,
    "\n- Whenever you write Chinese, write Traditional Chinese. Never Simplified.",
  );

  const languageInstruction = chosen
    ? `The reader has stated that their text is ${promptLanguageName(chosen)}.
Read it as that language, even if it could also be a word in another one, and
set "queryLanguage" to ${JSON.stringify(chosen)}.`
    : `First work out which of the supported languages the reader's own text is
in. Do not assume it is ${learningName}: readers look up words they met on a
street sign, in a message, or on a menu, in languages they are not studying.${
        detected
          ? `\n\nSpelling alone suggests ${promptLanguageName(detected)}. That is
one piece of evidence and you know what the text means, so overrule it freely
if it is wrong.`
          : ""
      }`;

  const kindInstruction =
    kind === "sentence"
      ? `This is a full sentence. The three cases above still decide which
language each side is in: put the sentence, or its ${learningName} rendering
where case 2 applies, in "term", and the other language in "translation". Then pick the single most useful thing in it for
a learner to keep — usually a verb phrase or a collocation, not a bare article
or pronoun — and put it in "highlightTerm" with its meaning in
"highlightTranslation" and its part of speech in "highlightPartOfSpeech". If
nothing in the sentence is worth keeping on its own, leave all three empty.`
      : `Put the ${
          kind === "phrase" ? "phrase" : "word"
        } in "term", spelled the way the
language writes it — restore any accents the reader left off. Leave
"highlightTerm", "highlightTranslation" and "highlightPartOfSpeech" empty.`;

  return `
A learner typed this into a language app: ${JSON.stringify(query)}

They are studying ${learningName} and read the app in ${supportName}.

The supported languages are: ${languageList(promptLanguageName)}.

${languageInstruction}

Put that answer in "queryLanguage", then decide which two languages the card
itself should hold. There are three
cases and they are not the same question:

1. The text is ${learningName} — the language they are studying.
   Put it in "term" (termLanguage ${JSON.stringify(learning)}) and gloss it in
   ${supportName} (translationLanguage ${JSON.stringify(support)}).

2. The text is in a language they already read (${readableNames}).
   They are not asking what it means; they know. They are asking for the
   ${learningName}. Put the ${learningName} word in "term"
   (termLanguage ${JSON.stringify(learning)}) and put ${supportName} in
   "translation" (translationLanguage ${JSON.stringify(support)}).

3. The text is in none of those — a word met on a sign, a menu, a message.
   Keep it as it is: put it in "term" with its own language in
   "termLanguage", and gloss it in ${supportName}
   (translationLanguage ${JSON.stringify(support)}).

"termLanguage" and "translationLanguage" must never be the same language.

${kindInstruction}

Rules:${scriptRule}
- "termExample" is a short natural sentence in the same language as "term".
  "translationExample" is that same sentence in the same language as
  "translation". They must mean the same thing.
- If the input is misspelled, answer for the word the reader most likely
  meant, put the correct spelling in "term", and use low confidence.
- If you cannot tell what was meant, make your best guess and use low
  confidence rather than refusing.
- "kind" is ${JSON.stringify(kind)} unless the text is plainly something else.
  `.trim();
}
