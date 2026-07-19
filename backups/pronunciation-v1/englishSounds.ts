export type EnglishSound = {
  id: string;
  title: string;
  symbol: string;
  ipa: string;
  category: "vowel" | "consonant";
  description: string;
  mouthTip: string;
  examples: string[];
};

export const englishSounds: EnglishSound[] = [
  {
    id: "short-a",
    title: "Short A",
    symbol: "A",
    ipa: "/æ/",
    category: "vowel",
    description: "The short A sound heard in words such as cat and apple.",
    mouthTip:
      "Open your mouth wide, keep the tongue low, and relax the lips.",
    examples: ["apple", "ant", "bag", "cat", "map"],
  },
  {
    id: "long-a",
    title: "Long A",
    symbol: "A",
    ipa: "/eɪ/",
    category: "vowel",
    description: "The long A sound says the name of the letter A.",
    mouthTip:
      "Begin with the mouth slightly open and finish with a small smile.",
    examples: ["cake", "name", "train", "day", "rain"],
  },
  {
    id: "short-e",
    title: "Short E",
    symbol: "E",
    ipa: "/ɛ/",
    category: "vowel",
    description: "The short E sound heard in words such as bed and pen.",
    mouthTip:
      "Keep the jaw slightly open and the lips relaxed.",
    examples: ["bed", "pen", "egg", "head", "ten"],
  },
  {
    id: "short-i",
    title: "Short I",
    symbol: "I",
    ipa: "/ɪ/",
    category: "vowel",
    description: "The relaxed short I sound heard in sit and fish.",
    mouthTip:
      "Keep the tongue high but relaxed. Do not stretch the sound into ee.",
    examples: ["sit", "fish", "milk", "big", "window"],
  },
  {
    id: "short-o",
    title: "Short O",
    symbol: "O",
    ipa: "/ɑ/",
    category: "vowel",
    description: "The open short O sound commonly heard in American English.",
    mouthTip:
      "Open the mouth and keep the tongue low and toward the back.",
    examples: ["hot", "box", "clock", "dog", "shop"],
  },
  {
    id: "short-u",
    title: "Short U",
    symbol: "U",
    ipa: "/ʌ/",
    category: "vowel",
    description: "The relaxed central vowel heard in cup and sun.",
    mouthTip:
      "Relax the lips and jaw. Keep the sound short and unstressed.",
    examples: ["cup", "sun", "bus", "love", "money"],
  },
  {
    id: "th-unvoiced",
    title: "Unvoiced TH",
    symbol: "TH",
    ipa: "/θ/",
    category: "consonant",
    description: "A soft TH sound made without vibrating the vocal cords.",
    mouthTip:
      "Place the tongue gently between the teeth and blow air outward.",
    examples: ["think", "thank", "three", "thumb", "Thursday"],
  },
  {
    id: "th-voiced",
    title: "Voiced TH",
    symbol: "TH",
    ipa: "/ð/",
    category: "consonant",
    description: "A voiced TH sound made while the vocal cords vibrate.",
    mouthTip:
      "Place the tongue gently between the teeth and add your voice.",
    examples: ["this", "that", "these", "mother", "weather"],
  },
  {
    id: "r",
    title: "R",
    symbol: "R",
    ipa: "/ɹ/",
    category: "consonant",
    description: "The American English R sound.",
    mouthTip:
      "Pull the tongue slightly backward without touching the roof of the mouth.",
    examples: ["red", "rice", "road", "right", "rain"],
  },
  {
    id: "l",
    title: "L",
    symbol: "L",
    ipa: "/l/",
    category: "consonant",
    description: "The L sound made near the front of the mouth.",
    mouthTip:
      "Touch the tip of the tongue behind the upper front teeth.",
    examples: ["light", "love", "leaf", "look", "long"],
  },
  {
    id: "v",
    title: "V",
    symbol: "V",
    ipa: "/v/",
    category: "consonant",
    description: "A voiced friction sound found in very and love.",
    mouthTip:
      "Touch the upper teeth lightly to the lower lip and add your voice.",
    examples: ["very", "voice", "seven", "love", "move"],
  },
  {
    id: "w",
    title: "W",
    symbol: "W",
    ipa: "/w/",
    category: "consonant",
    description: "A rounded glide sound found in water and window.",
    mouthTip:
      "Round the lips first, then quickly relax them as the vowel begins.",
    examples: ["water", "window", "welcome", "weather", "away"],
  },
];
