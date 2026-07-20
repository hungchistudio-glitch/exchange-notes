"use client";

import type { Dispatch, SetStateAction } from "react";

import useVocabularyLookup from "@/hooks/useVocabularyLookup";
import useVocabularyLookupSave from "@/hooks/useVocabularyLookupSave";
import useVocabularyShare from "@/hooks/useVocabularyShare";
import useVocabularyLookupPartnerShare from "@/hooks/useVocabularyLookupPartnerShare";

import type { VocabularyItem } from "@/lib/types/app";

type UseVocabularyLookupControllerOptions = {
  query: string;

  items: VocabularyItem[];
  setItems: Dispatch<SetStateAction<VocabularyItem[]>>;
  setError: Dispatch<SetStateAction<string>>;
  setQuery: Dispatch<SetStateAction<string>>;
  setAiSearchOpen: Dispatch<SetStateAction<boolean>>;

  onSendToPartner: (item: VocabularyItem) => void;
};

export default function useVocabularyLookupController({
  query,
  items,
  setItems,
  setError,
  setQuery,
  setAiSearchOpen,
  onSendToPartner,
}: UseVocabularyLookupControllerOptions) {
  const lookup = useVocabularyLookup(query);

  const save = useVocabularyLookupSave({
    items,
    lookupResult: lookup.lookupResult,
    setItems,
    setError,
    setQuery,
    setAiSearchOpen,
    resetLookup: lookup.resetLookup,
  });

  const share = useVocabularyShare(
    lookup.lookupResult,
  );

  const partner = useVocabularyLookupPartnerShare({
    lookupResult: lookup.lookupResult,
    onSendToPartner,
  });

  return {
    ...lookup,
    ...save,
    ...share,
    ...partner,
  };
}
