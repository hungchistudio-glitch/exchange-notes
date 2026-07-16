"use client";

import { useEffect, useState, type RefObject } from "react";

export type SelectionState = {
  text: string;
  top: number;
  left: number;
};

export default function useTextSelection(
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const [selection, setSelection] = useState<SelectionState | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection();
      const container = containerRef.current;

      if (!sel || sel.isCollapsed || !container) {
        setSelection(null);
        return;
      }

      const anchorNode = sel.anchorNode;

      if (!anchorNode || !container.contains(anchorNode)) {
        setSelection(null);
        return;
      }

      const text = sel.toString().trim();

      if (!text) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rangeRect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setSelection({
        text,
        top: rangeRect.top - containerRect.top,
        left: rangeRect.left - containerRect.left + rangeRect.width / 2,
      });
    }

    document.addEventListener("selectionchange", handleSelectionChange);

    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [containerRef]);

  return [selection, setSelection] as const;
}
