import { describe, expect, it } from "vitest";

import { FIXTURE_LIBRARY, FIXTURE_STAR_COSMIC } from "@/lib/hello/fixtures";
import {
  HELLO_PAIRS,
  choicesFor,
  defaultPair,
  initialViewerPair,
  isOriginal,
  isValidPair,
  missingLanguages,
  setSlot,
  swapPair,
  viewerPairReducer,
} from "@/lib/hello/pairs";
import { LANGUAGE_CODES } from "@/lib/languages";

/* =========================================================
   A hello's two languages

   Any two different languages of the five, in either order — twenty
   pairs — starting as the sharer's own learning and native languages, and
   asking rather than guessing when those are not two. A visitor's changes
   are theirs for the visit: the sharer's pair is kept, and "back to the
   original" returns to it exactly. Nothing here reads the interface
   language: what the app is shown in is not what the hello is in.
   ========================================================= */

describe("hello pairs", () => {
  it("are every ordered pair of two different languages — all twenty", () => {
    const expected = LANGUAGE_CODES.flatMap((a) => LANGUAGE_CODES.filter((b) => b !== a).map((b) => `${a}>${b}`));
    expect(HELLO_PAIRS).toHaveLength(20);
    expect(HELLO_PAIRS.map(([a, b]) => `${a}>${b}`).sort()).toEqual(expected.sort());
    for (const pair of HELLO_PAIRS) expect(isValidPair(pair)).toBe(true);
  });

  it("refuses one language twice, an unknown language, or the wrong count", () => {
    expect(isValidPair(["en", "en"])).toBe(false);
    expect(isValidPair(["en", "de"])).toBe(false);
    expect(isValidPair(["zh", "en"])).toBe(false);
    expect(isValidPair(["en"])).toBe(false);
    expect(isValidPair(["en", "fr", "it"])).toBe(false);
  });

  it("start as learning then native, and are not guessed when the profile does not give two", () => {
    expect(defaultPair("fr", "zh-TW")).toEqual(["fr", "zh-TW"]);
    expect(defaultPair("zh-TW", "it")).toEqual(["zh-TW", "it"]);
    expect(defaultPair("en", "en")).toBeNull();
    expect(defaultPair(null, "en")).toBeNull();
    expect(defaultPair("es", undefined)).toBeNull();
  });

  it("never let one slot take the other slot's language", () => {
    expect(setSlot(["en", "fr"], 0, "fr")).toEqual(["en", "fr"]);
    expect(setSlot(["en", "fr"], 1, "en")).toEqual(["en", "fr"]);
    expect(setSlot(["en", "fr"], 1, "it")).toEqual(["en", "it"]);
    const choices = choicesFor(["en", "fr"], 1);
    expect(choices.filter((choice) => choice.disabled).map((choice) => choice.language)).toEqual(["en"]);
    expect(choices).toHaveLength(5);
  });

  it("swap both ways and back", () => {
    for (const pair of HELLO_PAIRS) expect(swapPair(swapPair(pair))).toEqual(pair);
  });
});

describe("a visitor's pair", () => {
  it("starts as the sharer made it, changes only for this visit, and restores exactly", () => {
    let state = initialViewerPair(["en", "zh-TW"]);
    expect(isOriginal(state)).toBe(true);

    state = viewerPairReducer(state, { type: "swap" });
    expect(state.current).toEqual(["zh-TW", "en"]);
    expect(isOriginal(state)).toBe(false);

    state = viewerPairReducer(state, { type: "set", slot: 1, language: "it" });
    expect(state.current).toEqual(["zh-TW", "it"]);
    expect(state.original).toEqual(["en", "zh-TW"]);

    state = viewerPairReducer(state, { type: "restore" });
    expect(state.current).toEqual(["en", "zh-TW"]);
    expect(isOriginal(state)).toBe(true);
  });

  it("can reach every one of the twenty pairs from any start", () => {
    for (const start of HELLO_PAIRS) {
      for (const target of HELLO_PAIRS) {
        let state = initialViewerPair(start);
        /* Clear the way when the target's first language is in slot B. */
        if (state.current[1] === target[0]) state = viewerPairReducer(state, { type: "swap" });
        state = viewerPairReducer(state, { type: "set", slot: 0, language: target[0] });
        state = viewerPairReducer(state, { type: "set", slot: 1, language: target[1] });
        expect(state.current).toEqual(target);
        expect(state.original).toEqual(start);
      }
    }
  });
});

describe("a hello's sense", () => {
  it("says which languages are still missing, and only those", () => {
    expect(missingLanguages(FIXTURE_LIBRARY.sense)).toEqual([]);
    expect(missingLanguages(FIXTURE_STAR_COSMIC.sense)).toEqual(["it"]);
  });
});
