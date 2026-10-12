"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from "react";

import type { VocabularyError } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import { insertValues } from "@/lib/utils";
import {
  changeVocabularyStatus,
  removeVocabularyItem,
} from "@/lib/vocabulary/service";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

type UseVocabularyMutationsOptions = {
  items: VocabularyItem[];
  setItems: Dispatch<SetStateAction<VocabularyItem[]>>;
  setError: Dispatch<SetStateAction<VocabularyError>>;
};

export default function useVocabularyMutations({
  items,
  setItems,
  setError,
}: UseVocabularyMutationsOptions) {
  const { t } = useTranslation();
  const { deleteConfirm } = t.vocabulary.detail;
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const changeStatus = useCallback(
    async (item: VocabularyItem, status: VocabularyStatus) => {
      if (item.status === status || updatingId) return;

      const previousItems = items;

      setUpdatingId(item.id);
      setError("");

      // Update the UI immediately.
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, status }
            : currentItem,
        ),
      );

      try {
        await changeVocabularyStatus(item, status);
      } catch (updateError) {
        // Restore the previous state if the request fails.
        setItems(previousItems);

        console.error("Could not update the word:", updateError);
        setError("update-failed");
      } finally {
        setUpdatingId(null);
      }
    },
    [items, setError, setItems, updatingId],
  );

  const deleteVocabularyItem = useCallback(
    async (item: VocabularyItem) => {
      const confirmed = window.confirm(
        insertValues(deleteConfirm, { word: item.word }),
      );

      if (!confirmed || updatingId) return;

      const previousItems = items;

      setUpdatingId(item.id);
      setError("");

      // Remove the item from the UI immediately.
      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );

      try {
        await removeVocabularyItem(item);
      } catch (deleteError) {
        // Restore the item if deletion fails.
        setItems(previousItems);

        console.error("Could not delete the word:", deleteError);
        setError("delete-failed");
      } finally {
        setUpdatingId(null);
      }
    },
    [deleteConfirm, items, setError, setItems, updatingId],
  );

  return {
    updatingId,
    changeStatus,
    deleteVocabularyItem,
  };
}
