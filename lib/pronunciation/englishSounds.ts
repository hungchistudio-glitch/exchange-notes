import type { PhoneticFeatures } from "./yumiRig";
import type { LocalizedText } from "./localizedText";

// ── A-Z letter model ──────────────────────────────────────────────────────
// This used to be 40 phoneme cards (one per consonant/vowel sound, e.g. a
// dedicated /k/ card and a separate /s/ card). That's more linguistically
// precise, but the redesign brief specifically asked for the English side
// to teach the way phonics actually teaches it: one card per LETTER (A-Z),
// showing that letter's own name pronunciation plus whichever sound(s) it
// commonly makes in words — since several letters make more than one sound
// (C is /k/ in "cat" but /s/ in "city"; G is /g/ in "go" but /dʒ/ in
// "giant"), each letter can carry more than one LetterSoundValue.
//
// The phonetic/articulatory data (PhoneticFeatures, tip, guidance) for each
// sound value is carried over from the old phoneme-card data wherever the
// sound is the same one that card taught — the underlying linguistics
// didn't change, just how it's organized into cards.

export type LetterCategory = "vowel" | "consonant";
// Kept under its old name too since teachingSteps.ts / page.tsx already
// import `EnglishCategory` — same type, still just "vowel" | "consonant".
export type EnglishCategory = LetterCategory;

export type GuidancePoint = { label: LocalizedText; text: LocalizedText };

export interface LetterSoundValue {
  /** Stable id for this specific sound value, e.g. "k" for hard C, "s" for soft C. */
  id: string;
  /** Short label distinguishing this value from a letter's other sound(s), e.g. "Hard C" / "硬音 C". */
  label: LocalizedText;
  /** IPA symbol for this sound. */
  ipa: string;
  /** KK phonetic symbol (the notation system taught alongside IPA in Taiwan) for this sound. */
  kk: string;
  /** Browser TTS text for this sound's main speaker — a real, TTS-reliable word. */
  soundText: string;
  /** Full explanation — shown when "More guidance" is expanded. */
  tip: LocalizedText;
  /** 2-3 short teaching points (lips/tongue/airflow/voicing) shown by default. */
  guidance: GuidancePoint[];
  /** Drives Yumi's mouth/tongue rig — see lib/pronunciation/yumiRig.ts. */
  phonetics: PhoneticFeatures;
  examples: string[];
}

export interface EnglishLetter {
  id: string;
  /** Uppercase display form, "A".."Z". */
  letter: string;
  category: LetterCategory;
  /**
   * The letter's own NAME pronunciation, shown as a small KK gloss next to
   * `letter` in the card header (e.g. "B [bi]"). This is also what Yumi's
   * teaching stage actually speaks when tapped — the letter's name itself
   * (e.g. "A", "B"), never a commonSounds value or an example word's audio.
   */
  letterName: {
    kk: string;
  };
  /**
   * Which `commonSounds` entry's phonetics/guidance Yumi shows by default —
   * whichever sound is actually embedded in this letter's own name (e.g.
   * C's name /si/ embeds soft C, so C's primarySoundId is "s", not hard
   * C's "k"). Used only for Yumi's default mouth/tongue demo; the audio
   * Yumi plays is always the letter name regardless of this or of which
   * pill the user has selected.
   */
  primarySoundId: string;
  /** This letter's common sound(s) in words — the actual taught content. */
  commonSounds: LetterSoundValue[];
}

export const englishLetters: EnglishLetter[] = [
  {
    id: "a",
    letter: "A",
    category: "vowel",
    letterName: { kk: "/e/" },
    primarySoundId: "a-long",
    commonSounds: [
      {
        id: "a-short",
        label: { english: "Short A", "traditional-chinese": "短音 A" },
        ipa: "/æ/",
        kk: "/æ/",
        soundText: "cat",
        tip: { english: "Open your mouth as wide as it goes. Your tongue sits low and forward — it should sound like a flattened \"a.\"", "traditional-chinese": "嘴巴張到最大，舌位低而靠前，像被壓扁的 a。" },
        guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Open as wide as it goes", "traditional-chinese": "嘴巴張到最大" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Low and forward", "traditional-chinese": "舌位低而靠前" } }],
        phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.9, tongueRegion: "middle", tongueHeight: 0.25, tongueFrontness: 0.75, contactZone: "none" },
        examples: ["Cat", "Bad", "Apple"],
      },
      {
        id: "a-long",
        label: { english: "Long A", "traditional-chinese": "長音 A" },
        ipa: "/eɪ/",
        kk: "/e/",
        soundText: "say",
        tip: { english: "Glide quickly from an e mouth shape into an ɪ mouth shape.", "traditional-chinese": "從 e 的嘴形快速滑向 ɪ 的嘴形。" },
        guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Glide quickly from an e shape to an ɪ shape", "traditional-chinese": "從 e 的嘴形快速滑向 ɪ 的嘴形" } }],
        phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.3, tongueRegion: "middle", tongueHeight: 0.78, tongueFrontness: 0.85, contactZone: "none" },
        examples: ["Say", "Cake", "Rain"],
      },
    ],
  },
  {
    id: "b",
    letter: "B",
    category: "consonant",
    letterName: { kk: "/bi/" },
    primarySoundId: "b",
    commonSounds: [
      {
        id: "b",
        label: { english: "B", "traditional-chinese": "B" },
        ipa: "/b/",
        kk: "/b/",
        soundText: "buh",
        tip: { english: "Press your lips together, then release — same motion as p, but your vocal cords vibrate this time.", "traditional-chinese": "雙唇緊閉後放開，動作跟 p 一樣，但聲帶要振動。" },
        guidance: [{ label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Press together, then release", "traditional-chinese": "雙唇緊閉後放開" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords do vibrate", "traditional-chinese": "聲帶要振動" } }],
        phonetics: { manner: "stop", place: "bilabial", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.06, tongueRegion: "neutral", tongueHeight: 0.5, tongueFrontness: 0.5, contactZone: "lower_lip" },
        examples: ["Bag", "Cab", "Rubber"],
      },
    ],
  },
  {
    id: "c",
    letter: "C",
    category: "consonant",
    letterName: { kk: "/si/" },
    primarySoundId: "s",
    commonSounds: [
      {
        id: "k",
        label: { english: "Hard C", "traditional-chinese": "硬音 C（像 K）" },
        ipa: "/k/",
        kk: "/k/",
        soundText: "cat",
        tip: { english: "Press the back of your tongue against your soft palate, then release with a puff of air. Vocal cords don't vibrate.", "traditional-chinese": "舌根抵住軟顎，放開時吐氣，聲帶不振動。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Back of tongue touches the soft palate", "traditional-chinese": "舌根抵住軟顎" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
        phonetics: { manner: "stop", place: "velar", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "back", tongueHeight: 0.75, tongueFrontness: 0.15, contactZone: "velum" },
        examples: ["Cat", "Cup", "Music"],
      },
      {
        id: "s",
        label: { english: "Soft C", "traditional-chinese": "軟音 C（像 S）" },
        ipa: "/s/",
        kk: "/s/",
        soundText: "snake",
        tip: { english: "Bring your tongue tip close to the ridge behind your teeth and let air hiss out through the narrow gap. Vocal cords don't vibrate.", "traditional-chinese": "舌尖靠近齒齦，氣流從中間縫隙摩擦而出，聲帶不振動。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip near the ridge behind your teeth", "traditional-chinese": "舌尖靠近齒齦" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
        phonetics: { manner: "fricative", place: "alveolar", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
        examples: ["City", "Ice", "Face"],
      },
    ],
  },
  {
    id: "d",
    letter: "D",
    category: "consonant",
    letterName: { kk: "/di/" },
    primarySoundId: "d",
    commonSounds: [
      {
        id: "d",
        label: { english: "D", "traditional-chinese": "D" },
        ipa: "/d/",
        kk: "/d/",
        soundText: "duh",
        tip: { english: "Touch your tongue tip to the ridge behind your upper teeth, then release with your vocal cords vibrating.", "traditional-chinese": "舌尖抵住上齒齦，放開時聲帶要振動。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip touches the ridge behind your upper teeth", "traditional-chinese": "舌尖抵住上齒齦" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords vibrate on release", "traditional-chinese": "放開時聲帶要振動" } }],
        phonetics: { manner: "stop", place: "alveolar", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
        examples: ["Dog", "Bed", "Ladder"],
      },
    ],
  },
  {
    id: "e",
    letter: "E",
    category: "vowel",
    letterName: { kk: "/i/" },
    primarySoundId: "e-long",
    commonSounds: [
      {
        id: "e-short",
        label: { english: "Short E", "traditional-chinese": "短音 E" },
        ipa: "/ɛ/",
        kk: "/ɛ/",
        soundText: "bed",
        tip: { english: "Open your mouth about halfway. Your tongue sits mid-front — more relaxed than for iː.", "traditional-chinese": "嘴巴半開，舌位中前，比 iː 更放鬆。" },
        guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Half open", "traditional-chinese": "嘴巴半開" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Mid-front", "traditional-chinese": "舌位中前" } }],
        phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.4, tongueRegion: "middle", tongueHeight: 0.6, tongueFrontness: 0.7, contactZone: "none" },
        examples: ["Bed", "Red", "Head"],
      },
      {
        id: "e-long",
        label: { english: "Long E", "traditional-chinese": "長音 E" },
        ipa: "/iː/",
        kk: "/i/",
        soundText: "he",
        tip: { english: "Pull the corners of your mouth wide like a smile. Your tongue sits at its highest, most forward point. Hold the sound long.", "traditional-chinese": "嘴角向兩側拉開像微笑，舌位最高最前，音拉長。" },
        guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Corners pulled wide, like a smile", "traditional-chinese": "嘴角向兩側拉開像微笑" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Highest and most forward", "traditional-chinese": "舌位最高最前" } }],
        phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "middle", tongueHeight: 0.95, tongueFrontness: 0.95, contactZone: "none" },
        examples: ["He", "Me", "Even"],
      },
    ],
  },
  {
    id: "f",
    letter: "F",
    category: "consonant",
    letterName: { kk: "/ɛf/" },
    primarySoundId: "f",
    commonSounds: [
      {
        id: "f",
        label: { english: "F", "traditional-chinese": "F" },
        ipa: "/f/",
        kk: "/f/",
        soundText: "fun",
        tip: { english: "Rest your upper teeth lightly on your lower lip. Push air out through the gap. Vocal cords don't vibrate.", "traditional-chinese": "上排牙齒輕觸下唇，氣流從縫隙擠出摩擦，聲帶不振動。" },
        guidance: [{ label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Upper teeth touch your lower lip", "traditional-chinese": "上排牙齒輕觸下唇" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
        phonetics: { manner: "fricative", place: "labiodental", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "neutral", tongueHeight: 0.5, tongueFrontness: 0.6, contactZone: "lower_lip" },
        examples: ["Fish", "Coffee", "Leaf"],
      },
    ],
  },
  {
    id: "g",
    letter: "G",
    category: "consonant",
    letterName: { kk: "/dʒi/" },
    primarySoundId: "j",
    commonSounds: [
      {
        id: "g",
        label: { english: "Hard G", "traditional-chinese": "硬音 G" },
        ipa: "/g/",
        kk: "/g/",
        soundText: "go",
        tip: { english: "Press the back of your tongue against your soft palate, then release with your vocal cords vibrating.", "traditional-chinese": "舌根抵住軟顎，放開時聲帶要振動。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Back of tongue touches the soft palate", "traditional-chinese": "舌根抵住軟顎" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords vibrate on release", "traditional-chinese": "放開時聲帶要振動" } }],
        phonetics: { manner: "stop", place: "velar", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "back", tongueHeight: 0.75, tongueFrontness: 0.15, contactZone: "velum" },
        examples: ["Go", "Bag", "Game"],
      },
      {
        id: "j",
        label: { english: "Soft G", "traditional-chinese": "軟音 G（像 J）" },
        ipa: "/dʒ/",
        kk: "/dʒ/",
        soundText: "judge",
        tip: { english: "Combine d and zh in quick succession, with your vocal cords vibrating.", "traditional-chinese": "d 跟 zh 快速連續發出，聲帶要振動。" },
        guidance: [{ label: { english: "How it's made", "traditional-chinese": "發音方式" }, text: { english: "d and zh fired quickly together", "traditional-chinese": "d 跟 zh 快速連續發出" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords vibrate", "traditional-chinese": "聲帶要振動" } }],
        phonetics: { manner: "affricate", place: "postalveolar", voiced: true, aspirated: false, nasal: false, lipRounding: "slightly_rounded", jawOpening: 0.2, tongueRegion: "blade", tongueHeight: 0.7, tongueFrontness: 0.75, contactZone: "postalveolar_zone" },
        examples: ["Giant", "Gym", "Age"],
      },
    ],
  },
  {
    id: "h",
    letter: "H",
    category: "consonant",
    letterName: { kk: "/etʃ/" },
    primarySoundId: "h",
    commonSounds: [
      {
        id: "h",
        label: { english: "H", "traditional-chinese": "H" },
        ipa: "/h/",
        kk: "/h/",
        soundText: "house",
        tip: { english: "Let air brush gently past your glottis, like breathing out a soft \"ha.\" Vocal cords don't vibrate.", "traditional-chinese": "聲門輕輕摩擦送氣，像哈氣一樣，聲帶不振動。" },
        guidance: [{ label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "A light friction at the glottis", "traditional-chinese": "聲門輕輕摩擦送氣" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
        phonetics: { manner: "fricative", place: "glottal", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.3, tongueRegion: "neutral", tongueHeight: 0.4, tongueFrontness: 0.5, contactZone: "none" },
        examples: ["Hat", "Hello", "Ahead"],
      },
    ],
  },
  {
    id: "i",
    letter: "I",
    category: "vowel",
    letterName: { kk: "/aɪ/" },
    primarySoundId: "i-long",
    commonSounds: [
      {
        id: "i-short",
        label: { english: "Short I", "traditional-chinese": "短音 I" },
        ipa: "/ɪ/",
        kk: "/ɪ/",
        soundText: "sit",
        tip: { english: "Open your mouth corners only slightly. Your tongue sits a little lower and further back than for iː. Keep it short.", "traditional-chinese": "嘴角微張，舌位比 iː 略低略後，音短促。" },
        guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Corners slightly open", "traditional-chinese": "嘴角微張" } }, { label: { english: "Length", "traditional-chinese": "長度" }, text: { english: "Short and relaxed", "traditional-chinese": "音短促" } }],
        phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.25, tongueRegion: "middle", tongueHeight: 0.8, tongueFrontness: 0.8, contactZone: "none" },
        examples: ["Sit", "Ship", "Big"],
      },
      {
        id: "i-long",
        label: { english: "Long I", "traditional-chinese": "長音 I" },
        ipa: "/aɪ/",
        kk: "/aɪ/",
        soundText: "ice",
        tip: { english: "Glide quickly from an a mouth shape to an ɪ mouth shape.", "traditional-chinese": "從 a 的嘴形快速滑向 ɪ。" },
        guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Glide quickly from a to ɪ", "traditional-chinese": "從 a 的嘴形快速滑向 ɪ" } }],
        phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.7, tongueRegion: "middle", tongueHeight: 0.4, tongueFrontness: 0.5, contactZone: "none" },
        examples: ["Time", "Kite", "Ice"],
      },
    ],
  },
  {
    id: "j",
    letter: "J",
    category: "consonant",
    letterName: { kk: "/dʒe/" },
    primarySoundId: "j",
    commonSounds: [
      {
        id: "j",
        label: { english: "J", "traditional-chinese": "J" },
        ipa: "/dʒ/",
        kk: "/dʒ/",
        soundText: "judge",
        tip: { english: "Combine d and zh in quick succession, with your vocal cords vibrating.", "traditional-chinese": "d 跟 zh 快速連續發出，聲帶要振動。" },
        guidance: [{ label: { english: "How it's made", "traditional-chinese": "發音方式" }, text: { english: "d and zh fired quickly together", "traditional-chinese": "d 跟 zh 快速連續發出" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords vibrate", "traditional-chinese": "聲帶要振動" } }],
        phonetics: { manner: "affricate", place: "postalveolar", voiced: true, aspirated: false, nasal: false, lipRounding: "slightly_rounded", jawOpening: 0.2, tongueRegion: "blade", tongueHeight: 0.7, tongueFrontness: 0.75, contactZone: "postalveolar_zone" },
        examples: ["Jump", "Bridge", "Age"],
      },
    ],
  },
  {
    id: "k",
    letter: "K",
    category: "consonant",
    letterName: { kk: "/ke/" },
    primarySoundId: "k",
    commonSounds: [
      {
        id: "k",
        label: { english: "K", "traditional-chinese": "K" },
        ipa: "/k/",
        kk: "/k/",
        soundText: "kuh",
        tip: { english: "Press the back of your tongue against your soft palate, then release with a puff of air. Vocal cords don't vibrate.", "traditional-chinese": "舌根抵住軟顎，放開時吐氣，聲帶不振動。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Back of tongue touches the soft palate", "traditional-chinese": "舌根抵住軟顎" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
        phonetics: { manner: "stop", place: "velar", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "back", tongueHeight: 0.75, tongueFrontness: 0.15, contactZone: "velum" },
        examples: ["Cat", "Sky", "Duck"],
      },
    ],
  },
  {
    id: "l",
    letter: "L",
    category: "consonant",
    letterName: { kk: "/ɛl/" },
    primarySoundId: "l",
    commonSounds: [
      {
        id: "l",
        label: { english: "L", "traditional-chinese": "L" },
        ipa: "/l/",
        kk: "/l/",
        soundText: "love",
        tip: { english: "Touch your tongue tip to the ridge behind your upper teeth, and let the air flow out around the sides of your tongue.", "traditional-chinese": "舌尖抵住上齒齦，氣流從舌頭兩側流出。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip touches the ridge behind your upper teeth", "traditional-chinese": "舌尖抵住上齒齦" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Air flows out around the sides of your tongue", "traditional-chinese": "氣流從舌頭兩側流出" } }],
        phonetics: { manner: "lateral", place: "alveolar", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
        examples: ["Leg", "Ball", "Yellow"],
      },
    ],
  },
  {
    id: "m",
    letter: "M",
    category: "consonant",
    letterName: { kk: "/ɛm/" },
    primarySoundId: "m",
    commonSounds: [
      {
        id: "m",
        label: { english: "M", "traditional-chinese": "M" },
        ipa: "/m/",
        kk: "/m/",
        soundText: "moon",
        tip: { english: "Close your lips, and let the air flow out through your nose instead. Vocal cords vibrate.", "traditional-chinese": "雙唇閉合，氣流改從鼻腔流出，聲帶振動。" },
        guidance: [{ label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Close together", "traditional-chinese": "雙唇閉合" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Air flows out through your nose instead", "traditional-chinese": "氣流改從鼻腔流出" } }],
        phonetics: { manner: "nasal", place: "bilabial", voiced: true, aspirated: false, nasal: true, lipRounding: "unrounded", jawOpening: 0.06, tongueRegion: "neutral", tongueHeight: 0.5, tongueFrontness: 0.5, contactZone: "lower_lip" },
        examples: ["Man", "Summer", "Time"],
      },
    ],
  },
  {
    id: "n",
    letter: "N",
    category: "consonant",
    letterName: { kk: "/ɛn/" },
    primarySoundId: "n",
    commonSounds: [
      {
        id: "n",
        label: { english: "N", "traditional-chinese": "N" },
        ipa: "/n/",
        kk: "/n/",
        soundText: "nice",
        tip: { english: "Touch your tongue tip to the ridge behind your upper teeth, and let the air flow out through your nose instead.", "traditional-chinese": "舌尖抵住上齒齦，氣流改從鼻腔流出。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip touches the ridge behind your upper teeth", "traditional-chinese": "舌尖抵住上齒齦" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Air flows out through your nose instead", "traditional-chinese": "氣流改從鼻腔流出" } }],
        phonetics: { manner: "nasal", place: "alveolar", voiced: true, aspirated: false, nasal: true, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
        examples: ["Nose", "Dinner", "Sun"],
      },
    ],
  },
  {
    id: "o",
    letter: "O",
    category: "vowel",
    letterName: { kk: "/o/" },
    primarySoundId: "o-long",
    commonSounds: [
      {
        id: "o-short",
        label: { english: "Short O", "traditional-chinese": "短音 O" },
        ipa: "/ɑ/",
        kk: "/ɑ/",
        soundText: "hot",
        tip: { english: "Open your mouth wide. Your tongue sits low and back.", "traditional-chinese": "嘴巴張大，舌位低而靠後。" },
        guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Open wide", "traditional-chinese": "嘴巴張大" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Low and back", "traditional-chinese": "舌位低而靠後" } }],
        phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.85, tongueRegion: "middle", tongueHeight: 0.15, tongueFrontness: 0.15, contactZone: "none" },
        examples: ["Hot", "Dog", "Box"],
      },
      {
        id: "o-long",
        label: { english: "Long O", "traditional-chinese": "長音 O" },
        ipa: "/oʊ/",
        kk: "/o/",
        soundText: "go",
        tip: { english: "Glide from an o mouth shape toward ʊ, letting your lips gradually round.", "traditional-chinese": "從 o 的嘴形滑向 ʊ，嘴唇漸漸收圓。" },
        guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Glide from o toward ʊ, lips gradually rounding", "traditional-chinese": "從 o 的嘴形滑向 ʊ，嘴唇漸漸收圓" } }],
        phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "rounded", jawOpening: 0.35, tongueRegion: "middle", tongueHeight: 0.6, tongueFrontness: 0.25, contactZone: "none" },
        examples: ["Go", "Boat", "Home"],
      },
    ],
  },
  {
    id: "p",
    letter: "P",
    category: "consonant",
    letterName: { kk: "/pi/" },
    primarySoundId: "p",
    commonSounds: [
      {
        id: "p",
        label: { english: "P", "traditional-chinese": "P" },
        ipa: "/p/",
        kk: "/p/",
        soundText: "puh",
        tip: { english: "Press your lips together, then release quickly. Let a light puff of air out — your vocal cords don't vibrate.", "traditional-chinese": "雙唇緊閉後迅速放開，氣流輕輕吐出，聲帶不振動。" },
        guidance: [{ label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Press together, then release quickly", "traditional-chinese": "雙唇緊閉後迅速放開" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
        phonetics: { manner: "stop", place: "bilabial", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.06, tongueRegion: "neutral", tongueHeight: 0.5, tongueFrontness: 0.5, contactZone: "lower_lip" },
        examples: ["Pen", "Cup", "Apple"],
      },
    ],
  },
  {
    id: "q",
    letter: "Q",
    category: "consonant",
    letterName: { kk: "/kju/" },
    primarySoundId: "q-kw",
    commonSounds: [
      {
        id: "q-kw",
        label: { english: "Qu", "traditional-chinese": "Qu（像 KW）" },
        ipa: "/kw/",
        kk: "/kw/",
        soundText: "queen",
        tip: { english: "Q is almost always followed by u — together they say kw, starting like k then rounding your lips into a w.", "traditional-chinese": "Q 幾乎都跟著 u，兩個字母合起來唸 kw，先像 k 一樣抵住軟顎，再圓唇滑向 w。" },
        guidance: [{ label: { english: "How it's made", "traditional-chinese": "發音方式" }, text: { english: "k released straight into a rounded w", "traditional-chinese": "k 之後立刻圓唇滑向 w" } }, { label: { english: "Note", "traditional-chinese": "重點提示" }, text: { english: "Q on its own is never said — it always pairs with u", "traditional-chinese": "Q 單獨不會發音，一定跟 u 一起" } }],
        phonetics: { manner: "approximant", place: "velar", voiced: true, aspirated: false, nasal: false, lipRounding: "strongly_rounded", jawOpening: 0.15, tongueRegion: "back", tongueHeight: 0.75, tongueFrontness: 0.15, contactZone: "none" },
        examples: ["Queen", "Quick", "Quiet"],
      },
    ],
  },
  {
    id: "r",
    letter: "R",
    category: "consonant",
    letterName: { kk: "/ɑr/" },
    primarySoundId: "r",
    commonSounds: [
      {
        id: "r",
        label: { english: "R", "traditional-chinese": "R" },
        ipa: "/r/",
        kk: "/r/",
        soundText: "rain",
        tip: { english: "Curl your tongue tip back without letting it touch the roof of your mouth, and push your lips forward slightly.", "traditional-chinese": "舌尖往後捲但不碰上顎，嘴唇微微突出。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip curls back without touching the roof of your mouth", "traditional-chinese": "舌尖往後捲但不碰上顎" } }, { label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Push forward slightly", "traditional-chinese": "嘴唇微微突出" } }],
        phonetics: { manner: "approximant", place: "retroflex", voiced: true, aspirated: false, nasal: false, lipRounding: "slightly_rounded", jawOpening: 0.22, tongueRegion: "tip", tongueHeight: 0.6, tongueFrontness: 0.6, contactZone: "none" },
        examples: ["Red", "Car", "Very"],
      },
    ],
  },
  {
    id: "s",
    letter: "S",
    category: "consonant",
    letterName: { kk: "/ɛs/" },
    primarySoundId: "s",
    commonSounds: [
      {
        id: "s",
        label: { english: "S", "traditional-chinese": "S" },
        ipa: "/s/",
        kk: "/s/",
        soundText: "snake",
        tip: { english: "Bring your tongue tip close to the ridge behind your teeth and let air hiss out through the narrow gap. Vocal cords don't vibrate.", "traditional-chinese": "舌尖靠近齒齦，氣流從中間縫隙摩擦而出，聲帶不振動。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip near the ridge behind your teeth", "traditional-chinese": "舌尖靠近齒齦" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
        phonetics: { manner: "fricative", place: "alveolar", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
        examples: ["Sun", "Bus", "Snake"],
      },
      {
        id: "z",
        label: { english: "S as Z", "traditional-chinese": "S 唸成 Z" },
        ipa: "/z/",
        kk: "/z/",
        soundText: "zebra",
        tip: { english: "Same tongue position as s, but between vowels or at the end of many words, s is voiced — your vocal cords vibrate.", "traditional-chinese": "舌位跟 s 一樣，但夾在母音之間或很多字尾時，s 其實是有聲的，聲帶要振動。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Same as s", "traditional-chinese": "舌位跟 s 一樣" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "The difference is your vocal cords vibrate", "traditional-chinese": "差別是聲帶要振動" } }],
        phonetics: { manner: "fricative", place: "alveolar", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
        examples: ["Rose", "As", "Dogs"],
      },
    ],
  },
  {
    id: "t",
    letter: "T",
    category: "consonant",
    letterName: { kk: "/ti/" },
    primarySoundId: "t",
    commonSounds: [
      {
        id: "t",
        label: { english: "T", "traditional-chinese": "T" },
        ipa: "/t/",
        kk: "/t/",
        soundText: "tuh",
        tip: { english: "Touch your tongue tip to the ridge behind your upper teeth, then release with a puff of air. Vocal cords don't vibrate.", "traditional-chinese": "舌尖抵住上齒齦，放開時吐氣，聲帶不振動。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip touches the ridge behind your upper teeth", "traditional-chinese": "舌尖抵住上齒齦" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
        phonetics: { manner: "stop", place: "alveolar", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
        examples: ["Top", "Cat", "Butter"],
      },
    ],
  },
  {
    id: "u",
    letter: "U",
    category: "vowel",
    letterName: { kk: "/ju/" },
    primarySoundId: "u-long",
    commonSounds: [
      {
        id: "u-short",
        label: { english: "Short U", "traditional-chinese": "短音 U" },
        ipa: "/ʌ/",
        kk: "/ʌ/",
        soundText: "cup",
        tip: { english: "Open your mouth about halfway, lips relaxed and not rounded. Your tongue sits central, slightly back. Keep it short.", "traditional-chinese": "嘴巴半開，不圓唇，舌位中央偏後，音短促。" },
        guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Half open, lips not rounded", "traditional-chinese": "嘴巴半開，不圓唇" } }, { label: { english: "Length", "traditional-chinese": "長度" }, text: { english: "Short", "traditional-chinese": "音短促" } }],
        phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.45, tongueRegion: "middle", tongueHeight: 0.5, tongueFrontness: 0.4, contactZone: "none" },
        examples: ["Cup", "Sun", "Up"],
      },
      {
        id: "u-long",
        label: { english: "Long U", "traditional-chinese": "長音 U" },
        ipa: "/uː/",
        kk: "/u/",
        soundText: "blue",
        tip: { english: "Round your lips tightly and push them forward. Your tongue sits at its highest, furthest-back point. Hold the sound long.", "traditional-chinese": "嘴唇緊緊收圓突出，舌位最高最後，音拉長。" },
        guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Lips tightly rounded and pushed forward", "traditional-chinese": "嘴唇緊緊收圓突出" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Highest and furthest back", "traditional-chinese": "舌位最高最後" } }],
        phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "strongly_rounded", jawOpening: 0.2, tongueRegion: "middle", tongueHeight: 0.9, tongueFrontness: 0.05, contactZone: "none" },
        examples: ["Blue", "June", "Rule"],
      },
    ],
  },
  {
    id: "v",
    letter: "V",
    category: "consonant",
    letterName: { kk: "/vi/" },
    primarySoundId: "v",
    commonSounds: [
      {
        id: "v",
        label: { english: "V", "traditional-chinese": "V" },
        ipa: "/v/",
        kk: "/v/",
        soundText: "voice",
        tip: { english: "Rest your upper teeth lightly on your lower lip, same as f — but this time your vocal cords vibrate.", "traditional-chinese": "上排牙齒輕觸下唇，動作跟 f 一樣，差別是聲帶要振動。" },
        guidance: [{ label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Same as f (upper teeth on lower lip)", "traditional-chinese": "動作跟 f 完全一樣（上齒觸下唇）" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "The difference is your vocal cords vibrate", "traditional-chinese": "差別是聲帶要振動" } }],
        phonetics: { manner: "fricative", place: "labiodental", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "neutral", tongueHeight: 0.5, tongueFrontness: 0.6, contactZone: "lower_lip" },
        examples: ["Van", "Very", "Love"],
      },
    ],
  },
  {
    id: "w",
    letter: "W",
    category: "consonant",
    letterName: { kk: "/'dʌbḷju/" },
    primarySoundId: "w",
    commonSounds: [
      {
        id: "w",
        label: { english: "W", "traditional-chinese": "W" },
        ipa: "/w/",
        kk: "/w/",
        soundText: "wow",
        tip: { english: "Round your lips and push them forward, then relax quickly as you glide into the next vowel.", "traditional-chinese": "雙唇先圓起突出，再迅速放鬆滑向下一個母音。" },
        guidance: [{ label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Round and push forward first", "traditional-chinese": "雙唇先圓起突出" } }, { label: { english: "Glide", "traditional-chinese": "滑動" }, text: { english: "Then relax quickly into the next vowel", "traditional-chinese": "再迅速放鬆滑向下一個母音" } }],
        phonetics: { manner: "approximant", place: "velar", voiced: true, aspirated: false, nasal: false, lipRounding: "strongly_rounded", jawOpening: 0.15, tongueRegion: "back", tongueHeight: 0.75, tongueFrontness: 0.15, contactZone: "none" },
        examples: ["Water", "Away", "Swim"],
      },
    ],
  },
  {
    id: "x",
    letter: "X",
    category: "consonant",
    letterName: { kk: "/ɛks/" },
    primarySoundId: "x-ks",
    commonSounds: [
      {
        id: "x-ks",
        label: { english: "X as KS", "traditional-chinese": "X 唸成 KS" },
        ipa: "/ks/",
        kk: "/ks/",
        soundText: "box",
        tip: { english: "Most words say x as a quick k followed by an s — the tongue moves from the back of the mouth straight to the front.", "traditional-chinese": "大多數單字裡 x 唸成 k 加 s 快速連在一起，舌頭從口腔後方快速移到前方。" },
        guidance: [{ label: { english: "How it's made", "traditional-chinese": "發音方式" }, text: { english: "k released straight into s", "traditional-chinese": "k 之後立刻接 s" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
        phonetics: { manner: "fricative", place: "alveolar", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
        examples: ["Box", "Fox", "Six"],
      },
      {
        id: "x-gz",
        label: { english: "X as GZ", "traditional-chinese": "X 唸成 GZ" },
        ipa: "/gz/",
        kk: "/gz/",
        soundText: "exam",
        tip: { english: "When x sits between two vowels in a stressed word like exam, it's voiced instead — g followed by z.", "traditional-chinese": "當 x 夾在兩個母音之間、且該音節重讀時（例如 exam），會唸成有聲的 g 加 z。" },
        guidance: [{ label: { english: "How it's made", "traditional-chinese": "發音方式" }, text: { english: "g released straight into z", "traditional-chinese": "g 之後立刻接 z" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords do vibrate", "traditional-chinese": "聲帶要振動" } }],
        phonetics: { manner: "fricative", place: "alveolar", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
        examples: ["Exam", "Exact", "Exist"],
      },
    ],
  },
  {
    id: "y",
    letter: "Y",
    category: "consonant",
    letterName: { kk: "/waɪ/" },
    primarySoundId: "y-ai",
    commonSounds: [
      {
        id: "y",
        label: { english: "Y as consonant", "traditional-chinese": "Y 當子音" },
        ipa: "/j/",
        kk: "/j/",
        soundText: "yes",
        tip: { english: "Bring the body of your tongue close to your hard palate for a brief moment, then glide straight into the next vowel.", "traditional-chinese": "舌面接近硬顎，短暫滑音後立刻滑向下一個母音。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Body of tongue close to the hard palate", "traditional-chinese": "舌面接近硬顎" } }, { label: { english: "Glide", "traditional-chinese": "滑動" }, text: { english: "A brief glide straight into the next vowel", "traditional-chinese": "短暫滑音後立刻滑向下一個母音" } }],
        phonetics: { manner: "approximant", place: "palatal", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.2, tongueRegion: "front", tongueHeight: 0.8, tongueFrontness: 0.85, contactZone: "none" },
        examples: ["Yes", "Yellow", "Beyond"],
      },
      {
        id: "y-ai",
        label: { english: "Y as long I", "traditional-chinese": "Y 當長音 I" },
        ipa: "/aɪ/",
        kk: "/aɪ/",
        soundText: "eye",
        tip: { english: "At the end of a short word, y often says the same sound as long i — glide quickly from an a mouth shape to an ɪ mouth shape.", "traditional-chinese": "在短單字字尾，y 常常唸成跟長音 i 一樣：從 a 的嘴形快速滑向 ɪ。" },
        guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Glide quickly from a to ɪ", "traditional-chinese": "從 a 的嘴形快速滑向 ɪ" } }],
        phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.7, tongueRegion: "middle", tongueHeight: 0.4, tongueFrontness: 0.5, contactZone: "none" },
        examples: ["My", "Try", "Sky"],
      },
    ],
  },
  {
    id: "z",
    letter: "Z",
    category: "consonant",
    letterName: { kk: "/zi/" },
    primarySoundId: "z",
    commonSounds: [
      {
        id: "z",
        label: { english: "Z", "traditional-chinese": "Z" },
        ipa: "/z/",
        kk: "/z/",
        soundText: "zebra",
        tip: { english: "Same tongue position as s, but your vocal cords vibrate — it should sound like a buzzing bee.", "traditional-chinese": "舌位跟 s 一樣，差別是聲帶要振動，像蜜蜂嗡嗡聲。" },
        guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Same as s", "traditional-chinese": "舌位跟 s 一樣" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "The difference is your vocal cords vibrate", "traditional-chinese": "差別是聲帶要振動" } }],
        phonetics: { manner: "fricative", place: "alveolar", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
        examples: ["Zoo", "Buzz", "Rose"],
      },
    ],
  },
];
