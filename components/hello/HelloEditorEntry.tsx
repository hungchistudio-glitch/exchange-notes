"use client";

import { useMemo, useSyncExternalStore } from "react";

import { parseHelloDraft, readHelloDraftRaw } from "@/lib/hello/draft";

import HelloEditor from "./HelloEditor";

const noSubscription = () => () => {};

/*
 * The editor, once this tab's storage can be read.
 *
 * A word handed over from the search screen (lib/hello/draft.ts) lives in
 * sessionStorage, which the server render cannot see; waiting for the
 * first client render means the editor starts on it, rather than starting
 * on the saved-word tab and switching under the reader's finger.
 */
export default function HelloEditorEntry({ wordId, fromLookup }: { wordId?: string; fromLookup: boolean }) {
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const raw = useSyncExternalStore(
    noSubscription,
    () => (fromLookup ? readHelloDraftRaw() : null),
    () => null,
  );
  const draft = useMemo(() => parseHelloDraft(raw), [raw]);
  if (!hydrated) return null;
  return <HelloEditor key={raw ?? "fresh"} wordId={wordId} draft={draft ?? undefined} />;
}
