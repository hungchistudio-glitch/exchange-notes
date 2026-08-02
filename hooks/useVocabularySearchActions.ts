import {
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";

type UseVocabularySearchActionsOptions = {
  setQuery: Dispatch<SetStateAction<string>>;
  resetLookup: () => void;
  setAiSearchOpen: Dispatch<SetStateAction<boolean>>;
  setSortOpen: Dispatch<SetStateAction<boolean>>;
  setFiltersOpen: Dispatch<SetStateAction<boolean>>;
};

export default function useVocabularySearchActions({
  setQuery,
  resetLookup,
  setAiSearchOpen,
  setSortOpen,
  setFiltersOpen,
}: UseVocabularySearchActionsOptions) {
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      resetLookup();
    },
    [setQuery, resetLookup],
  );

  const clearQuery = useCallback(() => {
    setQuery("");
    resetLookup();
  }, [setQuery, resetLookup]);

  const openAiSearch = useCallback(() => {
    setQuery("");
    resetLookup();
    setAiSearchOpen(true);
  }, [setQuery, resetLookup, setAiSearchOpen]);

  const closeAiSearch = useCallback(() => {
    setAiSearchOpen(false);
    setQuery("");
    resetLookup();
  }, [setAiSearchOpen, setQuery, resetLookup]);

  const openSort = useCallback(() => {
    setSortOpen(true);
  }, [setSortOpen]);

  const openLibrary = useCallback(() => {
    setFiltersOpen(true);
  }, [setFiltersOpen]);

  return {
    handleQueryChange,
    clearQuery,
    openAiSearch,
    closeAiSearch,
    openSort,
    openLibrary,
  };
}
