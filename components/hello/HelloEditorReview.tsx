"use client";

import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { VocabularyProvider } from "@/contexts/VocabularyContext";
import type { HelloSenseKnown } from "@/lib/ai/prompts/helloSense";
import type { InterfaceMode } from "@/lib/appPreferences";
import type { LanguageCode } from "@/lib/languages";

import HelloEditor from "./HelloEditor";

/*
 * The hello editor without an account (app/hello-review/editor): the
 * providers the protected layout would give it, a learner's two languages,
 * and a looked-up word handed over as the search screen would. Signed out,
 * so there are no saved words and "create" is refused by the server —
 * this is for looking, not making.
 */
const DRAFT: HelloSenseKnown[] = [
  { language: "en", text: "library", partOfSpeech: "noun" },
  { language: "zh-TW", text: "圖書館", partOfSpeech: "noun" },
];

export default function HelloEditorReview({
  storedMode,
  learning,
  native,
}: {
  storedMode: InterfaceMode;
  learning: LanguageCode | null;
  native: LanguageCode | null;
}) {
  return (
    <InterfaceModeProvider initialMode={storedMode}>
      <LearningLanguageProvider initialLearningLanguage={learning} initialNativeLanguage={native}>
        <VocabularyProvider>
          <div
            style={{
              margin: "0.75rem 1rem 0",
              padding: "0.625rem 0.875rem",
              borderRadius: "0.875rem",
              background: "#fff4d6",
              color: "#3d2f0e",
              fontSize: "0.8125rem",
            }}
          >
            <strong>Fixture · 範例資料</strong> — signed out; nothing here is saved or sent. Profile:{" "}
            <a href="/hello-review/editor">en + zh-TW</a> · <a href="/hello-review/editor?profile=same">same language twice</a> ·{" "}
            <a href="/hello-review/editor?profile=none">no languages</a>
          </div>
          <HelloEditor draft={DRAFT} profile={{ learning, native }} />
        </VocabularyProvider>
      </LearningLanguageProvider>
    </InterfaceModeProvider>
  );
}
