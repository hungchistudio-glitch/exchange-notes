import type {
  AppFontSize,
  InterfaceLanguage,
} from "@/lib/appPreferences";
import type { VoiceGender } from "@/lib/speech";

type FontSizeCopy = {
  label: string;
  description: string;
};

type SettingsCopy = {
  appLanguage: {
    rowTitle: string;
    rowDescription: string;
    sheetTitle: string;
    sheetDescription: string;
    englishDescription: string;
    traditionalChineseDescription: string;
  };

  fontSize: {
    rowTitle: string;
    rowDescription: string;
    sheetTitle: string;
    sheetDescription: string;
    options: Record<AppFontSize, FontSizeCopy>;
  };

  pronunciation: {
    rowTitle: string;
    rowDescription: string;
    sheetTitle: string;
    sheetDescription: string;
    settingsAriaLabel: string;
    readingSpeed: string;
    readingSpeedDescription: string;
    readingSpeedAriaLabel: string;
    slower: string;
    faster: string;
    voice: string;
    voiceDescription: string;
    female: string;
    male: string;
    testVoice: string;
  };
};

const ENGLISH_COPY: SettingsCopy = {
  appLanguage: {
    rowTitle: "App language",
    rowDescription: "Choose the interface language",
    sheetTitle: "App language",
    sheetDescription:
      "Choose the language used by the Exchange Notes interface.",
    englishDescription:
      "Display the app interface in English.",
    traditionalChineseDescription:
      "Display the app interface in Traditional Chinese.",
  },

  fontSize: {
    rowTitle: "Font size",
    rowDescription: "Adjust text throughout the app",
    sheetTitle: "Font size",
    sheetDescription:
      "Choose the text size used throughout Exchange Notes.",
    options: {
      small: {
        label: "Small",
        description: "Fits more information on screen.",
      },
      medium: {
        label: "Medium",
        description: "The balanced default size.",
      },
      large: {
        label: "Large",
        description:
          "Easier and more comfortable to read.",
      },
    },
  },

  pronunciation: {
    rowTitle: "Pronunciation",
    rowDescription: "Voice and reading speed",
    sheetTitle: "Pronunciation",
    sheetDescription:
      "Choose the voice and reading speed used throughout Exchange Notes.",
    settingsAriaLabel: "Pronunciation settings",
    readingSpeed: "Reading speed",
    readingSpeedDescription:
      "Adjust how quickly words and examples are spoken.",
    readingSpeedAriaLabel: "Reading speed",
    slower: "Slower",
    faster: "Faster",
    voice: "Voice",
    voiceDescription:
      "Select your preferred pronunciation voice.",
    female: "Female",
    male: "Male",
    testVoice: "Test voice",
  },
};

const TRADITIONAL_CHINESE_COPY: SettingsCopy = {
  appLanguage: {
    rowTitle: "App 顯示語言",
    rowDescription: "選擇 App 的介面顯示語言",
    sheetTitle: "App 顯示語言",
    sheetDescription:
      "選擇 Exchange Notes 的介面顯示語言。",
    englishDescription:
      "以英文顯示 App 介面。",
    traditionalChineseDescription:
      "以繁體中文顯示 App 介面。",
  },

  fontSize: {
    rowTitle: "字體大小",
    rowDescription: "調整 App 內的文字大小",
    sheetTitle: "字體大小",
    sheetDescription:
      "選擇 Exchange Notes 全站使用的文字大小。",
    options: {
      small: {
        label: "小",
        description: "畫面可以顯示更多資訊。",
      },
      medium: {
        label: "中",
        description: "平衡且舒適的預設大小。",
      },
      large: {
        label: "大",
        description: "文字更大，閱讀更輕鬆。",
      },
    },
  },

  pronunciation: {
    rowTitle: "發音",
    rowDescription: "聲音與朗讀速度",
    sheetTitle: "發音",
    sheetDescription:
      "選擇 Exchange Notes 使用的聲音與朗讀速度。",
    settingsAriaLabel: "發音設定",
    readingSpeed: "朗讀速度",
    readingSpeedDescription:
      "調整單字與例句的朗讀速度。",
    readingSpeedAriaLabel: "朗讀速度",
    slower: "較慢",
    faster: "較快",
    voice: "聲音",
    voiceDescription: "選擇你偏好的發音聲音。",
    female: "女聲",
    male: "男聲",
    testVoice: "試聽聲音",
  },
};

export function getSettingsCopy(
  language: InterfaceLanguage,
): SettingsCopy {
  return language === "traditional-chinese"
    ? TRADITIONAL_CHINESE_COPY
    : ENGLISH_COPY;
}

export function getLanguageLabel(
  language: InterfaceLanguage,
) {
  return language === "traditional-chinese"
    ? "繁體中文"
    : "English";
}

export function getVoiceLabel(
  gender: VoiceGender,
  language: InterfaceLanguage,
) {
  const copy = getSettingsCopy(language);

  return gender === "female"
    ? copy.pronunciation.female
    : copy.pronunciation.male;
}
