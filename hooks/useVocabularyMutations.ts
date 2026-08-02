"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from "react";

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
  setError: Dispatch<SetStateAction<string>>;
};

export default function useVocabularyMutations({
  items,
  setItems,
  setError,
}: UseVocabularyMutationsOptions) {
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

        setError(
          updateError instanceof Error
            ? updateError.message
            : "Could not update this word.",
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [items, setError, setItems, updatingId],
  );

  const deleteVocabularyItem = useCallback(
    async (item: VocabularyItem) => {
      const confirmed = window.confirm(
        `Delete "${item.word}" from your vocabulary?`,
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

        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Could not delete this word.",
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [items, setError, setItems, updatingId],
  );

  return {
    updatingId,
    changeStatus,
    deleteVocabularyItem,
  };
}
