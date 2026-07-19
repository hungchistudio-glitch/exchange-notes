export type ZhuyinExample = {
  word: string;
  zhuyin: string;
};

export type ZhuyinSound = {
  id: string;
  symbol: string;
  category: "initial" | "medial" | "final";
  title: string;
  tip: string;
  anchor: string;
  examples: ZhuyinExample[];
};

export const zhuyinSounds: ZhuyinSound[] = [
  {
    id: "b",
    symbol: "ㄅ",
    category: "initial",
    title: "ㄅ",
    tip: "雙唇閉合後輕輕放開，不要明顯送氣。",
    anchor: "爸爸",
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
    title: "ㄆ",
    tip: "雙唇閉合後放開，帶出明顯氣流。",
    anchor: "朋友",
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
    title: "ㄇ",
    tip: "雙唇閉合，讓聲音從鼻腔通過。",
    anchor: "媽媽",
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
    title: "ㄈ",
    tip: "上排牙齒輕碰下唇，讓氣流通過。",
    anchor: "飛機",
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
    title: "ㄉ",
    tip: "舌尖抵住上排牙齒後方，輕輕放開。",
    anchor: "大家",
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
    title: "ㄊ",
    tip: "舌尖抵住上排牙齒後方，放開時明顯送氣。",
    anchor: "台灣",
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
    title: "ㄋ",
    tip: "舌尖抵住上排牙齒後方，讓聲音從鼻腔通過。",
    anchor: "你好",
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
    title: "ㄌ",
    tip: "舌尖抵住上排牙齒後方，氣流從舌頭兩側通過。",
    anchor: "老師",
    examples: [
      { word: "老師", zhuyin: "ㄌㄠˇ ㄕ" },
      { word: "藍色", zhuyin: "ㄌㄢˊ ㄙㄜˋ" },
      { word: "旅行", zhuyin: "ㄌㄩˇ ㄒㄧㄥˊ" },
    ],
  },
  {
    id: "i",
    symbol: "ㄧ",
    category: "medial",
    title: "ㄧ",
    tip: "嘴角微微向兩側展開，發出清楚的「衣」音。",
    anchor: "衣服",
    examples: [
      { word: "衣服", zhuyin: "ㄧ ㄈㄨˊ" },
      { word: "一", zhuyin: "ㄧ" },
      { word: "椅子", zhuyin: "ㄧˇ ㄗ˙" },
    ],
  },
  {
    id: "u",
    symbol: "ㄨ",
    category: "medial",
    title: "ㄨ",
    tip: "雙唇收圓，發出短而清楚的「烏」音。",
    anchor: "屋子",
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
    title: "ㄩ",
    tip: "舌位像ㄧ，嘴唇像ㄨ一樣收圓。",
    anchor: "魚",
    examples: [
      { word: "魚", zhuyin: "ㄩˊ" },
      { word: "雨", zhuyin: "ㄩˇ" },
      { word: "旅行", zhuyin: "ㄌㄩˇ ㄒㄧㄥˊ" },
    ],
  },
  {
    id: "a",
    symbol: "ㄚ",
    category: "final",
    title: "ㄚ",
    tip: "自然張開嘴巴，發出清楚的「啊」音。",
    anchor: "八",
    examples: [
      { word: "八", zhuyin: "ㄅㄚ" },
      { word: "媽媽", zhuyin: "ㄇㄚ ㄇㄚ˙" },
      { word: "大家", zhuyin: "ㄉㄚˋ ㄐㄧㄚ" },
    ],
  },
  {
    id: "o",
    symbol: "ㄛ",
    category: "final",
    title: "ㄛ",
    tip: "嘴唇微微收圓，發出短促的「喔」音。",
    anchor: "喔",
    examples: [
      { word: "喔", zhuyin: "ㄛ" },
      { word: "波", zhuyin: "ㄅㄛ" },
      { word: "摸", zhuyin: "ㄇㄛ" },
    ],
  },
  {
    id: "e",
    symbol: "ㄜ",
    category: "final",
    title: "ㄜ",
    tip: "嘴巴放鬆，從口腔後方發出「鵝」音。",
    anchor: "喝",
    examples: [
      { word: "喝", zhuyin: "ㄏㄜ" },
      { word: "哥哥", zhuyin: "ㄍㄜ ㄍㄜ˙" },
      { word: "河", zhuyin: "ㄏㄜˊ" },
    ],
  },
];
