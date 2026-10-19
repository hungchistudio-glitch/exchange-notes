import { describe, expect, it } from "vitest";

import { describeMoment } from "@/lib/pronunciation/articulationNotes";
import {
  buildTimeline,
  scaleTimeline,
  stepAt,
  utteranceFromBeats,
} from "@/lib/pronunciation/articulationTimeline";
import { parseIpa, parseTranscription, parseZhuyin } from "@/lib/pronunciation/phones";
import { phoneSpans, pitchSegments, traceMarks, TRACE } from "@/lib/pronunciation/traceGeometry";

/* =========================================================
   Yumi going through a word (Chi, 2026-10-19)

   A word is now a sequence of sounds, each a sequence of moments — shut
   and holding, letting go, puffing, hissing, held — with the prosody that
   changes them: stress, length, doubled consonants, the glottal stop and
   Mandarin's tones as spoken. These pin that the five languages'
   transcriptions come apart into the right sounds, that the moments are in
   the right order and proportion, and that what Yumi is told to point out
   at each moment is what a teacher would.
   ========================================================= */

const symbols = (ipa: string, language: string) => parseIpa(ipa, language).phones.map((phone) => phone.symbol);
const kinds = (ipa: string, language: string) =>
  buildTimeline(parseIpa(ipa, language)).steps.map((step) => step.kind);

describe("a transcription, as sounds", () => {
  it("joins affricates and splits English ts", () => {
    expect(symbols("/tʃip/", "en")).toEqual(["tʃ", "i", "p"]);
    expect(symbols("/kæts/", "en")).toEqual(["k", "æ", "t", "s"]);
    expect(symbols("/ˈdʒɛlo/", "it")).toEqual(["dʒ", "ɛ", "l", "o"]);
  });

  it("reads a doubled consonant as one held sound, across the syllable break", () => {
    const grazie = parseIpa("/ˈɡrat.tsje/", "it");
    const affricate = grazie.phones.find((phone) => phone.symbol === "ts");
    expect(affricate).toMatchObject({ geminate: true, long: true });

    const carro = parseIpa("/ˈkar.ro/", "it");
    expect(carro.phones.map((phone) => phone.symbol)).toEqual(["k", "a", "r", "o"]);
    expect(carro.phones[2].geminate).toBe(true);
  });

  it("keeps a diphthong's glide in its own syllable, and stress on the right one", () => {
    const quiet = parseIpa("/ˈkwaɪət/", "en");
    expect(quiet.syllables).toHaveLength(2);
    expect(quiet.syllables[0]).toMatchObject({ stress: 2 });
    const glide = quiet.phones.find((phone) => phone.symbol === "ɪ");
    expect(glide).toMatchObject({ glide: true, syllable: 0 });
  });

  it("reads English r as the approximant it is, and Spanish r as a trill", () => {
    expect(parseIpa("/rɛd/", "en").phones[0].features.manner).toBe("approximant");
    expect(parseIpa("/ˈpe.ro/", "es").phones[2].features.manner).toBe("trill");
    expect(parseIpa("/ˈpe.ɾo/", "es").phones[2].features.manner).toBe("tap");
  });

  it("marks long vowels, nasal vowels and French liaison", () => {
    expect(parseIpa("/siː/", "en").phones[1].long).toBe(true);
    const enfant = parseIpa("/ɑ̃.fɑ̃/", "fr");
    expect(enfant.phones[0].features).toMatchObject({ manner: "vowel", nasal: true });
    const amis = parseIpa("/le.z‿a.mi/", "fr");
    expect(amis.phones.find((phone) => phone.symbol === "a")?.linked).toBe(true);
  });

  it("puffs English p, t, k only where English does", () => {
    const pin = parseIpa("/pɪn/", "en");
    const spin = parseIpa("/spɪn/", "en");
    const happy = parseIpa("/ˈhæpi/", "en");
    expect(pin.phones[0].features.aspirated).toBe(true);
    expect(spin.phones[1].features.aspirated).toBe(false);
    /* Opening an unstressed syllable inside a word: no puff. */
    expect(happy.phones.find((phone) => phone.symbol === "p")?.features.aspirated).toBe(false);
  });

  it("skips symbols it does not know rather than failing the word", () => {
    expect(symbols("/ka☃sa/", "es")).toEqual(["k", "a", "s", "a"]);
    expect(parseTranscription("", "es")).toBeNull();
  });
});

describe("zhuyin, as sounds and tones", () => {
  it("spells out a syllable's initial, medial and moving rime", () => {
    const xian = parseZhuyin("ㄒㄧㄢ");
    expect(xian.phones.map((phone) => phone.symbol)).toEqual(["ɕ", "j", "ɛ", "n"]);
    const bao = parseZhuyin("ㄅㄠ");
    expect(bao.phones.map((phone) => phone.symbol)).toEqual(["p", "ɑ", "u"]);
    expect(bao.phones[2].glide).toBe(true);
  });

  it("holds the tongue where 知 and 資 put it, voiced", () => {
    const zhi = parseZhuyin("ㄓ");
    expect(zhi.phones).toHaveLength(2);
    expect(zhi.phones[1].features).toMatchObject({ manner: "approximant", voiced: true });
  });

  it("reads tones, with the neutral tone light", () => {
    const xiansheng = parseZhuyin("ㄒㄧㄢ ㄕㄥ˙");
    expect(xiansheng.syllables.map((syllable) => syllable.tone)).toEqual([1, 5]);
    expect(xiansheng.syllables[1].stress).toBe(0);
    expect(parseZhuyin("ㄆㄚˋ").phones[0].features.aspirated).toBe(true);
  });
});

describe("the moments of a word", () => {
  it("closes, holds and releases a stop, and puffs when it is aspirated", () => {
    expect(kinds("/ba/", "es")).toEqual(["closure", "burst", "shape"]);
    expect(buildTimeline(parseZhuyin("ㄆㄚ")).steps.map((step) => step.kind)).toEqual([
      "closure",
      "burst",
      "aspiration",
      "shape",
    ]);
  });

  it("holds a doubled consonant's closure about twice as long", () => {
    const single = buildTimeline(parseIpa("/ˈfa.to/", "it")).steps.find((step) => step.kind === "closure");
    const double = buildTimeline(parseIpa("/ˈfat.to/", "it")).steps.find((step) => step.kind === "closure");
    expect(double!.duration / single!.duration).toBeGreaterThan(1.8);
  });

  it("holds a long vowel longer than a short one", () => {
    const vowel = (ipa: string) =>
      buildTimeline(parseIpa(ipa, "en")).steps.find((step) => step.kind === "shape")!.duration;
    expect(vowel("/siːt/")).toBeGreaterThan(vowel("/sɪt/") * 1.6);
  });

  it("stops dead at a glottal stop, and pauses between words", () => {
    expect(kinds("/ʌˈʔoʊ/", "en")).toContain("glottal");
    expect(kinds("/ðə kæt/", "en")).toContain("pause");
  });

  it("taps once and trills several times", () => {
    const tap = buildTimeline(parseIpa("/ˈpe.ɾo/", "es")).steps.find((step) => step.kind === "tap")!;
    const trill = buildTimeline(parseIpa("/ˈpe.ro/", "es")).steps.find((step) => step.kind === "trill")!;
    expect(trill.duration).toBeGreaterThan(tap.duration * 2.5);
  });

  it("says 3 + 3 as 2 + 3, and dips a third tone that is not last", () => {
    const nihao = buildTimeline(parseZhuyin("ㄋㄧˇ ㄏㄠˇ"));
    expect(nihao.syllables[0]).toMatchObject({ spokenTone: 2, sandhi: true });
    expect(nihao.syllables[1]).toMatchObject({ spokenTone: 3, sandhi: false, halfThird: false });

    const henhao = buildTimeline(parseZhuyin("ㄏㄣˇ ㄍㄠ"));
    expect(henhao.syllables[0].halfThird).toBe(true);
  });

  it("scales to the real length of the audio and finds the moment at any time", () => {
    const timeline = scaleTimeline(buildTimeline(parseIpa("/ˈka.sa/", "es")), 1000);
    expect(timeline.duration).toBe(1000);
    const last = timeline.steps.at(-1)!;
    expect(last.start + last.duration).toBeCloseTo(1000);
    expect(stepAt(timeline, 0)).toBe(timeline.steps[0]);
    expect(stepAt(timeline, 999)).toBe(last);
    expect(stepAt(timeline, 1000)).toBeNull();
  });

  it("gives a rhythm phrase one beat per sounded syllable", () => {
    const beats = utteranceFromBeats([
      { text: "ca", stress: 1 },
      { text: "sa", stress: 0 },
      { text: "e", stress: 0, silent: true },
    ]);
    expect(beats.syllables).toHaveLength(2);
    expect(beats.syllables[0].stress).toBe(2);
  });
});

describe("what Yumi points out", () => {
  const notesFor = (ipa: string, language: string, kind: string) => {
    const timeline = buildTimeline(parseTranscription(ipa, language)!);
    const step = timeline.steps.find((candidate) => candidate.kind === kind)!;
    return describeMoment(timeline, step, language)!;
  };

  it("tells a Spanish /p/ not to puff, and an aspirated sound to", () => {
    expect(notesFor("/ˈpa.ta/", "es", "burst").notes).toContain("unaspirated");
    expect(notesFor("ㄆㄚ", "zh-TW", "aspiration").notes).toContain("aspirated");
  });

  it("says where a sound is made", () => {
    expect(notesFor("/ba/", "es", "closure").place).toBe("bilabial");
    expect(notesFor("/ka/", "es", "closure").place).toBe("velar");
    expect(notesFor("/ʁu/", "fr", "friction").place).toBe("uvular");
    expect(notesFor("/ʁu/", "fr", "friction").notes).toContain("uvular");
  });

  it("points out doubled consonants, long vowels and the glottal stop", () => {
    expect(notesFor("/ˈfat.to/", "it", "closure").notes).toContain("geminate");
    expect(notesFor("/siː/", "en", "shape").notes).toContain("longVowel");
    expect(notesFor("/ʌˈʔoʊ/", "en", "glottal").notes).toContain("glottalStop");
  });

  it("names the tone as said, sandhi first", () => {
    expect(notesFor("ㄋㄧˇ ㄏㄠˇ", "zh-TW", "shape").notes[0]).toBe("sandhi");
    expect(notesFor("ㄇㄚ", "zh-TW", "shape").notes[0]).toBe("tone1");
  });

  it("keeps it to three things at a time", () => {
    const timeline = buildTimeline(parseZhuyin("ㄋㄩˇ ㄦˊ"));
    for (const step of timeline.steps) {
      expect(describeMoment(timeline, step, "zh-TW")!.notes.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("the trace", () => {
  it("draws a mark for every moment but a pause, inside its box", () => {
    const timeline = buildTimeline(parseIpa("/ðə kæt/", "en"));
    const marks = traceMarks(timeline);
    const drawn = new Set(marks.map((mark) => mark.step));
    timeline.steps.forEach((step, index) => {
      expect(drawn.has(index)).toBe(step.kind !== "pause");
    });
    for (const mark of marks) {
      for (const number of mark.d.match(/-?\d+(\.\d+)?/g) ?? []) {
        expect(Number(number)).toBeGreaterThanOrEqual(0);
        expect(Number(number)).toBeLessThanOrEqual(TRACE.width);
      }
    }
  });

  it("draws one pitch line per voiced syllable, and labels every sound", () => {
    const timeline = buildTimeline(parseZhuyin("ㄋㄧˇ ㄏㄠˇ"));
    expect(pitchSegments(timeline)).toHaveLength(2);
    expect(phoneSpans(timeline)).toHaveLength(timeline.utterance.phones.length);
  });
});

describe("how a sentence's pitch ends", () => {
  it("rises on a yes/no question and falls on the rest", async () => {
    const { intonationOf } = await import("@/lib/pronunciation/phones");
    expect(intonationOf("Are you coming?", "en")).toBe("rise");
    expect(intonationOf("Where are you going?", "en")).toBe("fall");
    expect(intonationOf("I'm coming.", "en")).toBe("fall");
    expect(intonationOf("¿Dónde está?", "es")).toBe("fall");
    expect(intonationOf("¿Vienes?", "es")).toBe("rise");
    expect(intonationOf("Qu'est-ce que c'est ?", "fr")).toBe("fall");
    expect(intonationOf("Tu viens ?", "fr")).toBe("rise");
    expect(intonationOf("Perché no?", "it")).toBe("fall");
    expect(intonationOf("你好嗎？", "zh-TW")).toBe("fall");
  });

  it("draws the rise at the end of the trace", () => {
    const timeline = buildTimeline({ ...parseIpa("/ɑr ju ˈkʌmɪŋ/", "en"), intonation: "rise" });
    const segments = pitchSegments(timeline);
    const last = segments.at(-1)!;
    const numbers = last.match(/-?\d+(\.\d+)?/g)!.map(Number);
    /* y shrinks upward: the line ends higher than it starts. */
    expect(numbers.at(-1)!).toBeLessThan(numbers[1]);
  });
});

describe("American vowels in a row", () => {
  it("keeps ri-ər two syllables", () => {
    const anterior = parseIpa("/ænˈtɪriər/", "en");
    expect(anterior.syllables).toHaveLength(4);
    expect(anterior.phones.some((phone) => phone.glide)).toBe(false);
  });
});
