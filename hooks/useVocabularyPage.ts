import { useMemo } from "react";

export function useVocabularyPage() {
  return useMemo(
    () => ({
      ready: true,
    }),
    [],
  );
}
