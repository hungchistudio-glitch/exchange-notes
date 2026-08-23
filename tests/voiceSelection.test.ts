import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   Which voice reads a card

   Playback follows the card's own language, so switching what you are
   learning switches the voice with it — no setting to remember, and the
   best installed voice for that language is chosen on its own. What a
   reader chooses by hand overrides that, for the language they chose it in
   and only that one.
   ========================================================= */

function voice(name: string, lang: string, uri = name) {
  return { name, lang, voiceURI: uri, default: false, localService: true };
}

const installed = vi.hoisted(() => ({ list: [] as unknown[] }));

vi.stubGlobal("speechSynthesis", {
  getVoices: () => installed.list,
  addEventListener: () => {},
  cancel: () => {},
  speak: () => {},
});

const { selectVoice } = await import("@/lib/speech");

describe("selectVoice", () => {
  beforeEach(() => {
    installed.list = [
      voice("Alice", "en-US"),
      voice("Amélie", "fr-FR"),
      voice("Alice-IT", "it-IT"),
      voice("Meijia", "zh-TW"),
      voice("Zarvox", "en-US"),
    ];
  });

  it("reads each language with a voice for that language", () => {
    expect(selectVoice("fr-FR", "female")?.lang).toBe("fr-FR");
    expect(selectVoice("it-IT", "female")?.lang).toBe("it-IT");
    expect(selectVoice("zh-TW", "female")?.lang).toBe("zh-TW");
  });

  it("honours a voice the reader chose for that language", () => {
    expect(selectVoice("en-US", "female", "Zarvox")?.name).toBe("Zarvox");
  });

  it("ignores a chosen voice that is not that language", () => {
    /*
     * Preferences are stored per language and survive everything: switching
     * what you are learning, reinstalling voices, moving device. A pin left
     * pointing at another language's voice used to win outright — the one
     * case where honouring the setting produces exactly what the setting
     * exists to prevent.
     */
    const chosen = selectVoice("it-IT", "female", "Zarvox");

    expect(chosen?.name).not.toBe("Zarvox");
    expect(chosen?.lang).toBe("it-IT");
  });

  it("says so plainly when the device has no voice for the language", () => {
    installed.list = [voice("Alice", "en-US")];

    // Null, not "here is an English one". The caller can tell the reader
    // their device has no Italian voice; it cannot un-hear one reading
    // Italian with English vowels.
    expect(selectVoice("it-IT", "female")).toBeNull();
  });

  it("prefers a normal voice over a novelty one when choosing for itself", () => {
    installed.list = [voice("Zarvox", "en-US"), voice("Alice", "en-US")];

    expect(selectVoice("en-US", "female")?.name).toBe("Alice");
  });
});
