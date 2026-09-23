import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeckWordCard } from "@/components/pronunciation/TodayWordCard";
import WordCardMessage from "@/components/messages/WordCardMessage";
import type { WordPhonetics } from "@/hooks/usePhonetics";
import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";
import english from "@/lib/i18n/en";

const state = vi.hoisted(() => ({
  table: {} as Record<string, WordPhonetics>,
  requests: [] as Array<{ text: string; language: string }>,
  speak: vi.fn(),
  support: "en" as LanguageCode,
}));

vi.mock("@/hooks/usePhonetics", () => ({
  default: (entries: Array<{ text: string; language: string }>) => {
    state.requests.push(...entries.filter((entry) => entry.text));
    return (entry: { text: string; language: string }) => state.table[`${entry.language}:${entry.text}`];
  },
}));
vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({ learningLanguage: "zh-TW", supportLanguage: state.support }),
}));
vi.mock("@/hooks/useTranslatedTexts", () => ({ default: () => () => undefined }));
vi.mock("@/lib/pronunciation/playback", () => ({ speakText: state.speak, stopSpeech: vi.fn() }));
vi.mock("@/lib/speech", () => ({ speak: state.speak }));
vi.mock("@/lib/vocabulary/repository", () => ({ fetchVocabulary: vi.fn(), getCurrentUser: vi.fn() }));

const chinese = { zhuyin: "ㄊㄨˊ ㄕㄨ ㄍㄨㄢˇ", pinyin: "tú shū guǎn" };
const word = (wordText: string, language: LanguageCode, translation: string, support: LanguageCode) => ({
  id: "reading-test", word: wordText, word_language: language, translation,
  translation_language: support, texts: {}, examples: {}, status: "learning",
} as VocabularyItem);

function card(item: VocabularyItem, support: LanguageCode, interactive = true) {
  return <DeckWordCard item={item} index={0} total={1} interactive={interactive} tone="ink"
    copy={english.home.todayWord} vocabularyCopy={english.vocabulary}
    learningLanguage={item.word_language!} supportLanguage={support} />;
}

beforeEach(() => {
  state.table = { "zh-TW:圖書館": chinese, "en:library": { ipa: "/ˈlaɪ.brer.i/" }, "fr:bibliothèque": { ipa: "/bi.bli.jɔ.tɛk/" } };
  state.requests = [];
  state.speak.mockClear();
});

describe("word card readings", () => {
  it.each([
    ["library", "en", "圖書館", "zh-TW"],
    ["圖書館", "zh-TW", "library", "en"],
  ] as const)("keeps Mandarin together for %s (%s)", (text, language, translation, support) => {
    render(card(word(text, language, translation, support), support));
    const mandarin = screen.getByRole("button", { name: /: 圖書館$/ });
    const zhuyin = within(mandarin).getByText(chinese.zhuyin);
    expect(zhuyin.nextElementSibling).toBe(within(mandarin).getByText(chinese.pinyin));
    expect(screen.getByText("/ˈlaɪ.brer.i/")).toBeVisible();
    expect(state.requests).toEqual(expect.arrayContaining([
      { text, language }, { text: translation, language: support },
    ]));
    expect(state.requests).not.toContainEqual({ text: "library", language: "zh-TW" });
    fireEvent.click(within(mandarin).getByText(chinese.pinyin));
    expect(state.speak).toHaveBeenCalledWith("圖書館", "zh-TW");
  });

  it("keeps a non-Chinese pair in its own languages", () => {
    render(card(word("bibliothèque", "fr", "library", "en"), "en"));
    expect(screen.getByText("/bi.bli.jɔ.tɛk/")).toBeVisible();
    expect(screen.getByText("/ˈlaɪ.brer.i/")).toBeVisible();
    expect(state.requests.every((request) => request.language !== "zh-TW")).toBe(true);
  });

  it("does not draw an empty second pronunciation button", () => {
    render(card(word("library", "en", "", "en"), "en"));
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("keeps playback available while a reading is loading and updates when it arrives", () => {
    const item = word("歡迎", "zh-TW", "welcome", "en");
    const view = render(card(item, "en"));
    const button = screen.getByRole("button", { name: /: 歡迎$/ });
    expect(within(button).getByText("歡迎")).toBeVisible();
    fireEvent.click(button);
    expect(state.speak).toHaveBeenCalledWith("歡迎", "zh-TW");

    state.table["zh-TW:歡迎"] = { zhuyin: "ㄏㄨㄢ ㄧㄥˊ", pinyin: "huān yíng" };
    view.rerender(card(item, "en"));
    expect(within(button).queryByText("歡迎")).not.toBeInTheDocument();
    expect(within(button).getByText("huān yíng")).toBeVisible();
  });

  it("keeps offscreen card audio outside the keyboard focus order", () => {
    const { container } = render(card(word("圖書館", "zh-TW", "library", "en"), "en", false));
    for (const button of container.querySelectorAll("button")) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("tabindex", "-1");
    }
  });

  it("also stacks zhuyin and pinyin in a shared word card", () => {
    render(<WordCardMessage card={{ word: "圖書館", translation: "library", wordLanguage: "zh-TW", translationLanguage: "en" }}
      createdAt="2026-09-22T12:00:00Z" learningLanguage="zh-TW" t={english}
      saved={false} saving={false} onSave={vi.fn()} onShare={vi.fn()} />);
    const zhuyin = screen.getByText(chinese.zhuyin);
    expect(zhuyin.nextElementSibling).toBe(screen.getByText(chinese.pinyin));
    expect(screen.getByText(chinese.pinyin)).toHaveClass("block");
  });
});
