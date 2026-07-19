export type ZhuyinSound = {
  id: string;
  symbol: string;
  category: "initial" | "medial" | "final";
  title: string;
  description: string;
  examples: Array<{
    word: string;
    zhuyin: string;
  }>;
};

export const zhuyinSounds: ZhuyinSound[] = [
  {
    id: "b",
    symbol: "ㄅ",
    category: "initial",
    title: "ㄅ sound",
    description:
      "Close both lips, hold the air briefly, then release it gently. Similar to the unaspirated b sound.",
    examples: [
      { word: "爸爸", zhuyin: "ㄅㄚˋ ㄅㄚ˙" },
      { word: "背包", zhuyin: "ㄅㄟˋ ㄅㄠ" },
      { word: "冰", zhuyin: "ㄅㄧㄥ" },
    ],
  },
  {
    id: "p",
    symbol: "ㄆ",
    category: "initial",
    title: "ㄆ sound",
    description:
      "Close both lips and release a noticeable puff of air. Similar to an aspirated p sound.",
    examples: [
      { word: "朋友", zhuyin: "ㄆㄥˊ ㄧㄡˇ" },
      { word: "蘋果", zhuyin: "ㄆㄧㄥˊ ㄍㄨㄛˇ" },
      { word: "跑步", zhuyin: "ㄆㄠˇ ㄅㄨˋ" },
    ],
  },
  {
    id: "m",
    symbol: "ㄇ",
    category: "initial",
    title: "ㄇ sound",
    description:
      "Keep both lips together and let the sound travel through your nose, like the English m sound.",
    examples: [
      { word: "媽媽", zhuyin: "ㄇㄚ ㄇㄚ˙" },
      { word: "米飯", zhuyin: "ㄇㄧˇ ㄈㄢˋ" },
      { word: "貓", zhuyin: "ㄇㄠ" },
    ],
  },
  {
    id: "f",
    symbol: "ㄈ",
    category: "initial",
    title: "ㄈ sound",
    description:
      "Touch your upper teeth lightly to your lower lip and let the air pass through, like the English f sound.",
    examples: [
      { word: "飛機", zhuyin: "ㄈㄟ ㄐㄧ" },
      { word: "房子", zhuyin: "ㄈㄤˊ ㄗ˙" },
      { word: "風", zhuyin: "ㄈㄥ" },
    ],
  },
  {
    id: "d",
    symbol: "ㄉ",
    category: "initial",
    title: "ㄉ sound",
    description:
      "Place the tip of your tongue behind the upper teeth and release it without a strong puff of air.",
    examples: [
      { word: "大家", zhuyin: "ㄉㄚˋ ㄐㄧㄚ" },
      { word: "冬天", zhuyin: "ㄉㄨㄥ ㄊㄧㄢ" },
      { word: "電腦", zhuyin: "ㄉㄧㄢˋ ㄋㄠˇ" },
    ],
  },
  {
    id: "t",
    symbol: "ㄊ",
    category: "initial",
    title: "ㄊ sound",
    description:
      "Place the tip of your tongue behind the upper teeth and release it with a strong puff of air.",
    examples: [
      { word: "台灣", zhuyin: "ㄊㄞˊ ㄨㄢ" },
      { word: "天空", zhuyin: "ㄊㄧㄢ ㄎㄨㄥ" },
      { word: "兔子", zhuyin: "ㄊㄨˋ ㄗ˙" },
    ],
  },
  {
    id: "n",
    symbol: "ㄋ",
    category: "initial",
    title: "ㄋ sound",
    description:
      "Touch the tongue behind the upper teeth and allow the sound to pass through your nose.",
    examples: [
      { word: "你好", zhuyin: "ㄋㄧˇ ㄏㄠˇ" },
      { word: "牛奶", zhuyin: "ㄋㄧㄡˊ ㄋㄞˇ" },
      { word: "鳥", zhuyin: "ㄋㄧㄠˇ" },
    ],
  },
  {
    id: "l",
    symbol: "ㄌ",
    category: "initial",
    title: "ㄌ sound",
    description:
      "Touch the tongue behind the upper teeth and let air pass around the sides of the tongue.",
    examples: [
      { word: "老師", zhuyin: "ㄌㄠˇ ㄕ" },
      { word: "藍色", zhuyin: "ㄌㄢˊ ㄙㄜˋ" },
      { word: "旅行", zhuyin: "ㄌㄩˇ ㄒㄧㄥˊ" },
    ],
  },
  {
    id: "a",
    symbol: "ㄚ",
    category: "final",
    title: "ㄚ sound",
    description:
      "Open your mouth naturally and make a clear ah sound.",
    examples: [
      { word: "媽媽", zhuyin: "ㄇㄚ ㄇㄚ˙" },
      { word: "大家", zhuyin: "ㄉㄚˋ ㄐㄧㄚ" },
      { word: "八", zhuyin: "ㄅㄚ" },
    ],
  },
  {
    id: "o",
    symbol: "ㄛ",
    category: "final",
    title: "ㄛ sound",
    description:
      "Round your lips gently and make a short open o sound.",
    examples: [
      { word: "喔", zhuyin: "ㄛ" },
      { word: "我", zhuyin: "ㄨㄛˇ" },
      { word: "多", zhuyin: "ㄉㄨㄛ" },
    ],
  },
  {
    id: "e",
    symbol: "ㄜ",
    category: "final",
    title: "ㄜ sound",
    description:
      "Keep your mouth relaxed and produce a central vowel sound from the back of the mouth.",
    examples: [
      { word: "喝", zhuyin: "ㄏㄜ" },
      { word: "哥哥", zhuyin: "ㄍㄜ ㄍㄜ˙" },
      { word: "河", zhuyin: "ㄏㄜˊ" },
    ],
  },
  {
    id: "i",
    symbol: "ㄧ",
    category: "medial",
    title: "ㄧ sound",
    description:
      "Spread your lips slightly and make a clear ee sound.",
    examples: [
      { word: "衣服", zhuyin: "ㄧ ㄈㄨˊ" },
      { word: "一", zhuyin: "ㄧ" },
      { word: "你好", zhuyin: "ㄋㄧˇ ㄏㄠˇ" },
    ],
  },
  {
    id: "u",
    symbol: "ㄨ",
    category: "medial",
    title: "ㄨ sound",
    description:
      "Round your lips and make an oo sound.",
    examples: [
      { word: "五", zhuyin: "ㄨˇ" },
      { word: "屋子", zhuyin: "ㄨ ㄗ˙" },
      { word: "午餐", zhuyin: "ㄨˇ ㄘㄢ" },
    ],
  },
  {
    id: "yu",
    symbol: "ㄩ",
    category: "medial",
    title: "ㄩ sound",
    description:
      "Keep the tongue in the position for ㄧ while rounding the lips as if saying ㄨ.",
    examples: [
      { word: "魚", zhuyin: "ㄩˊ" },
      { word: "雨", zhuyin: "ㄩˇ" },
      { word: "旅行", zhuyin: "ㄌㄩˇ ㄒㄧㄥˊ" },
    ],
  },
];
