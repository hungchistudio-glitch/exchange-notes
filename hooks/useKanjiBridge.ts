"use client";

import { useEffect, useMemo, useState } from "react";

import type { Bridge, BridgeEntry } from "@/lib/kanjiBridge";

/* =========================================================
   The kanji bridge for the words on a card (lib/kanjiBridge.ts)

   Its tables are fetched the first time a Japanese or Korean word needs
   them, once for the whole session; a card in any other language never
   loads them.
   ========================================================= */

type BridgeModule = typeof import("@/lib/kanjiBridge");

let loaded: BridgeModule | null = null;
let loading: Promise<BridgeModule> | null = null;

function load(): Promise<BridgeModule> {
  loading ??= import("@/lib/kanjiBridge").then((module) => (loaded = module));
  return loading;
}

/** Whether a word could have a bridge at all, before the tables load. */
function mayHaveBridge(entry: BridgeEntry): boolean {
  if (entry.language === "ko") return /[가-힣]/.test(entry.text);
  if (entry.language === "ja") return /\p{Script=Han}/u.test(entry.text);
  return false;
}

/** Each entry's bridge, by position; null where there is none (yet). */
export default function useKanjiBridge(entries: readonly BridgeEntry[]): (Bridge | null)[] {
  const wanted = entries.some(mayHaveBridge);
  const [module, setModule] = useState<BridgeModule | null>(loaded);

  useEffect(() => {
    if (!wanted || module) return;
    let live = true;
    load().then(
      (found) => { if (live) setModule(found); },
      () => { /* No bridge is fine; the card is whole without it. */ },
    );
    return () => { live = false; };
  }, [wanted, module]);

  return useMemo(
    () =>
      entries.map((entry, index) =>
        module && mayHaveBridge(entry)
          ? module.bridgeFor(entry, entries.filter((_, other) => other !== index))
          : null,
      ),
    [entries, module],
  );
}
