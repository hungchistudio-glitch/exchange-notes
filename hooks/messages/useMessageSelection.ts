"use client";

import { useCallback, useState } from "react";

type UseMessageSelectionOptions = {
  messageIds: number[];
};

type UseMessageSelectionResult = {
  selectionMode: boolean;
  selectedMessageIds: Set<number>;
  selectedCount: number;
  allSelected: boolean;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleMessageSelection: (messageId: number) => void;
  selectAllMessages: () => void;
  clearSelection: () => void;
};

export default function useMessageSelection({
  messageIds,
}: UseMessageSelectionOptions): UseMessageSelectionResult {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(
    () => new Set(),
  );

  const clearSelection = useCallback(() => {
    setSelectedMessageIds(new Set());
  }, []);

  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true);
    clearSelection();
  }, [clearSelection]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    clearSelection();
  }, [clearSelection]);

  const toggleMessageSelection = useCallback(
    (messageId: number) => {
      if (!messageIds.includes(messageId)) return;

      setSelectedMessageIds((current) => {
        const next = new Set(current);

        if (next.has(messageId)) {
          next.delete(messageId);
        } else {
          next.add(messageId);
        }

        return next;
      });
    },
    [messageIds],
  );

  const selectAllMessages = useCallback(() => {
    setSelectedMessageIds(new Set(messageIds));
  }, [messageIds]);

  const selectedCount = selectedMessageIds.size;
  const allSelected =
    messageIds.length > 0 && selectedMessageIds.size === messageIds.length;

  return {
    selectionMode,
    selectedMessageIds,
    selectedCount,
    allSelected,
    enterSelectionMode,
    exitSelectionMode,
    toggleMessageSelection,
    selectAllMessages,
    clearSelection,
  };
}
