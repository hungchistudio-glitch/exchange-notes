"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

import { createClient } from "@/lib/supabase/client";
import { applyFedCookie, saveFedProgress } from "@/lib/pet/repository";
import type { Cookie, PetState } from "@/lib/pet/types";

/*
 * Recording a fed cookie, at the speed a hand can actually feed them.
 *
 * Two things this has to get right that a plain `await feedCookie(...)` did
 * not, both of which only became reachable once the tray stopped locking
 * itself for the length of the chewing animation:
 *
 *   The tray has to empty *now*. The cookie has visibly gone into Yumi's
 *   mouth by the time this is called; waiting for a round trip before taking
 *   it out of the tray meant it reappeared in its slot for over a second,
 *   fully draggable, and could be fed a second time.
 *
 *   Writes have to be serialised, and each one has to carry the whole
 *   accumulated state rather than re-deriving it. Two overlapping
 *   read-modify-writes off the same snapshot lose one of the two words.
 *
 * The queue is a promise chain rather than anything cleverer because the
 * ordering requirement is exactly "one at a time, latest wins", and a rejected
 * link must not poison the ones behind it — hence the catch inside each step.
 */
export default function useFeedPersistence(
  petState: PetState | null,
  setPetState: Dispatch<SetStateAction<PetState | null>>,
) {
  const stateRef = useRef<PetState | null>(petState);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    stateRef.current = petState;
  }, [petState]);

  return useCallback(
    (cookie: Cookie) => {
      const current = stateRef.current;
      if (!current) return;

      const next = applyFedCookie(current, cookie.id);
      // Already fed — a duplicate release, or a replayed accessibility
      // activation. Nothing to show and nothing to write.
      if (next === current) return;

      stateRef.current = next;
      setPetState(next);

      queueRef.current = queueRef.current.then(async () => {
        const pending = stateRef.current;
        if (!pending) return;

        try {
          const supabase = createClient();
          const saved = await saveFedProgress(supabase, pending);
          stateRef.current = saved;
          setPetState(saved);
        } catch {
          // The optimistic state stands. Growth just won't be remembered
          // next visit, which is the same trade the write path already made.
        }
      });
    },
    [setPetState],
  );
}
