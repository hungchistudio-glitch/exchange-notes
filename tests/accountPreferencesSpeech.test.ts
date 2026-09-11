import { describe, expect, it } from "vitest";

import {
  parseAccountPreferences,
  preferencesEqual,
  type AccountPreferences,
} from "@/lib/preferences/accountPreferences";

function preferences(
  voiceURIs: AccountPreferences["speech"]["voiceURIs"],
): AccountPreferences {
  return {
    fontSize: "medium",
    interfaceLanguage: "english",
    dailyGoalWords: 10,
    speech: {
      rate: 0.75,
      voiceGender: "female",
      voiceURIs,
    },
  };
}

describe("account speech preferences", () => {
  it("preserves a selected voice for all five supported speech tags", () => {
    const parsed = parseAccountPreferences({
      speech: {
        rate: 1,
        voiceGender: "male",
        voiceURIs: {
          "en-US": "voice-en",
          "zh-TW": "voice-zh",
          "es-ES": "voice-es",
          "fr-FR": "voice-fr",
          "it-IT": "voice-it",
          "de-DE": "unsupported-voice",
        },
      },
    });

    expect(parsed.speech.voiceURIs).toEqual({
      "en-US": "voice-en",
      "zh-TW": "voice-zh",
      "es-ES": "voice-es",
      "fr-FR": "voice-fr",
      "it-IT": "voice-it",
    });
  });

  it.each([
    ["es-ES", "Spanish"],
    ["fr-FR", "French"],
    ["it-IT", "Italian"],
  ] as const)("detects a changed %s voice during account sync", (tag, name) => {
    const saved = preferences({ [tag]: `${name}-voice-a` });
    const changed = preferences({ [tag]: `${name}-voice-b` });

    expect(preferencesEqual(saved, changed)).toBe(false);
    expect(preferencesEqual(saved, preferences({ ...saved.speech.voiceURIs })))
      .toBe(true);
  });
});
