"use client";

import type { Dispatch, SetStateAction } from "react";

import useVocabularyLookup from "@/hooks/useVocabularyLookup";
import useVocabularyLookupPartnerShare from "@/hooks/useVocabularyLookupPartnerShare";
import useVocabularyLookupSave, {
  type VocabularyLookupSaveMessages,
} from "@/hooks/useVocabularyLookupSave";
import useVocabularyShare from "@/hooks/useVocabularyShare";

import type { VocabularyItem } from "@/lib/types/app";

type UseVocabularyLookupControllerOptions = {
  query: string;

  items: VocabularyItem[];
  addItem: (item: VocabularyItem) => void;

  setError: Dispatch<SetStateAction<string>>;
  setQuery: Dispatch<SetStateAction<string>>;
  setAiSearchOpen: Dispatch<SetStateAction<boolean>>;

  messages: VocabularyLookupSaveMessages;
  onSendToPartner: (item: VocabularyItem) => void;
};

export default function useVocabularyLookupController({
  query,
  items,
  addItem,
  setError,
  setQuery,
  setAiSearchOpen,
  messages,
  onSendToPartner,
}: UseVocabularyLookupControllerOptions) {
  const lookup = useVocabularyLookup(query);

  const save = useVocabularyLookupSave({
    items,
    lookupResult: lookup.lookupResult,
    addItem,
    setError,
    setQuery,
    setAiSearchOpen,
    resetLookup: lookup.resetLookup,
    messages,
  });

  const share = useVocabularyShare(lookup.lookupResult);

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
