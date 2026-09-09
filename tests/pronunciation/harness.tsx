import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";

import type { LanguageCode } from "@/lib/languages";
import type { ProgressByUnit } from "@/lib/pronunciation/lab/types";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   A Lab, without a network

   The provider under test is the real one — the point of these tests is
   that PronunciationLabProvider wires a language to a pack to a set of
   progress rows, and mocking it would test nothing. What is faked is only
   what sits underneath it: the two upstream contexts it reads, and the
   Supabase repository it would otherwise call.
   ========================================================= */

export type HarnessState = {
  learningLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
  items: VocabularyItem[];
  progress: ProgressByUnit;
  /** Makes the progress query fail, for the error-state tests. */
  progressFails: boolean;
  /** Records every attempt the UI tried to save. */
  attempts: Array<Record<string, unknown>>;
};

export const harness: HarnessState = {
  learningLanguage: "es",
  nativeLanguage: "en",
  items: [],
  progress: {},
  progressFails: false,
  attempts: [],
};

export function resetHarness(overrides: Partial<HarnessState> = {}) {
  harness.learningLanguage = overrides.learningLanguage ?? "es";
  harness.nativeLanguage = overrides.nativeLanguage ?? "en";
  harness.items = overrides.items ?? [];
  harness.progress = overrides.progress ?? {};
  harness.progressFails = overrides.progressFails ?? false;
  harness.attempts = [];
}

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/pronunciation",
}));

vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({
    learningLanguage: harness.learningLanguage,
    nativeLanguage: harness.nativeLanguage,
    languagePair: [harness.learningLanguage, harness.nativeLanguage] as const,
    loading: false,
    refresh: async () => {},
  }),
  LearningLanguageProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/contexts/VocabularyContext", () => ({
  useVocabulary: () => ({
    items: harness.items,
    setItems: () => {},
    learningLanguage: harness.learningLanguage,
    loading: false,
    error: "",
    setError: () => {},
    fillingLanguage: false,
    refresh: async () => {},
    addItem: () => {},
    removeItem: () => {},
    updateItem: () => {},
  }),
  VocabularyProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}) as never,
}));

vi.mock("@/lib/pronunciation/lab/repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/pronunciation/lab/repository")
  >("@/lib/pronunciation/lab/repository");

  return {
    ...actual,
    fetchPronunciationProgress: async (_client: unknown, language: LanguageCode) =>
      harness.progressFails
        ? { ok: false as const, reason: "unavailable" as const }
        : {
            ok: true as const,
            // Scoped to the language the caller asked for, exactly as the
            // real query is — so a test can prove the provider does not
            // read another language's rows.
            progress:
              language === harness.learningLanguage ? harness.progress : {},
          },
    recordPronunciationAttempt: async (
      _client: unknown,
      attempt: Record<string, unknown>,
    ) => {
      harness.attempts.push(attempt);

      return {
        ok: true as const,
        progress: {
          language: attempt.language as LanguageCode,
          unitId: attempt.unitId as string,
          attempts: 1,
          correctAttempts: attempt.outcome === "correct" ? 1 : 0,
          mastery: "learning" as const,
        },
      };
    },
    saveTrainingSession: async () => ({ ok: true }),
  };
});

/** Renders a Lab screen inside the real provider. */
export async function renderInLab(ui: ReactElement): Promise<RenderResult> {
  const { PronunciationLabProvider } = await import(
    "@/contexts/PronunciationLabContext"
  );

  return render(<PronunciationLabProvider>{ui}</PronunciationLabProvider>);
}
