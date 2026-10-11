import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import english from "@/lib/i18n/en";
import french from "@/lib/i18n/fr";
import italian from "@/lib/i18n/it";
import spanish from "@/lib/i18n/es";
import traditionalChinese from "@/lib/i18n/zh-TW";
import type {
  TranslationDictionary,
  TranslationLanguage,
} from "@/lib/i18n/types";
import { messagePreview } from "@/lib/messages/preview";
import { encodeNewsCardMessage } from "@/lib/messages/newsCard";

/* =========================================================
   Sending something to a friend, in the app's own language

   The sheet every "send to a partner" flow opens was written in Chinese —
   its title, its retry button and its empty state — so a reader who had set
   the app to English, Spanish, French or Italian was asked 傳送給夥伴. The
   errors under it were English whatever the setting. A news card that
   arrived in a conversation was labelled "Vocabulary / 學習單字" for
   everybody, and the inbox showed the English headline of every story a
   friend sent.
   ========================================================= */

const reader = vi.hoisted(() => ({
  language: "english" as TranslationLanguage,
}));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => reader.language,
}));

vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({
    learningLanguage: "en",
    supportLanguage: "zh-TW",
    pair: ["en", "zh-TW"] as const,
  }),
}));

vi.mock("@/lib/speech", () => ({ speak: vi.fn() }));

const { default: FriendPickerModal } = await import(
  "@/components/vocabulary/FriendPickerModal"
);
const { default: NewsCardMessage } = await import(
  "@/components/messages/NewsCardMessage"
);

const DICTIONARIES: [TranslationLanguage, TranslationDictionary][] = [
  ["english", english],
  ["traditional-chinese", traditionalChinese],
  ["spanish", spanish],
  ["french", french],
  ["italian", italian],
];

const HAN = /[一-鿿]/;

function openPicker(
  overrides: Partial<Parameters<typeof FriendPickerModal>[0]> = {},
) {
  return render(
    <FriendPickerModal
      friends={[]}
      loading={false}
      errorMessage=""
      sendingFriendId={null}
      onClose={vi.fn()}
      onPick={vi.fn()}
      onRetry={vi.fn()}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  reader.language = "english";
});

describe("the send-to-a-partner sheet", () => {
  it.each(DICTIONARIES)("is written in %s when the app is", (language, t) => {
    reader.language = language;
    openPicker();

    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("heading").textContent).toBe(
      t.friendPicker.title,
    );
    expect(within(sheet).getByText(t.friendPicker.empty)).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: t.common.close }),
    ).toHaveLength(2);

    if (language !== "traditional-chinese") {
      expect(sheet.textContent).not.toMatch(HAN);
    }
  });

  it.each(DICTIONARIES)("offers to try again in %s", (language, t) => {
    reader.language = language;
    openPicker({ errorMessage: t.friendPicker.loadFailed });

    expect(screen.getByText(t.friendPicker.loadFailed)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: t.friendPicker.retry }),
    ).toBeTruthy();
  });
});

describe("a news card in a conversation", () => {
  const card = {
    titles: { en: "Chipmakers race abroad", "zh-TW": "晶片廠加速海外設廠" },
    summaries: { en: "A summary.", "zh-TW": "摘要。" },
    vocabulary: [
      {
        texts: { en: "supply chain", "zh-TW": "供應鏈" },
        partOfSpeech: "noun",
        examples: { en: "The supply chain held.", "zh-TW": "供應鏈撐住了。" },
      },
    ],
    sourceName: "Example",
    sourceUrl: "https://example.com/story",
  };

  it.each(DICTIONARIES)("is labelled in %s", (language, t) => {
    reader.language = language;
    const { container } = render(
      <NewsCardMessage card={card as never} createdAt="2026-10-11T00:00:00Z" />,
    );

    expect(container.textContent).toContain(t.messages.newsCardEyebrow);
    expect(container.textContent).toContain(t.messages.newsCardVocabulary);
    expect(container.textContent).not.toContain("Vocabulary / 學習單字");
  });
});

describe("the inbox preview of something a friend sent", () => {
  const body = encodeNewsCardMessage({
    titles: { en: "Chipmakers race abroad", "zh-TW": "晶片廠加速海外設廠" },
    summaries: {},
    vocabulary: [],
    sourceName: "Example",
    sourceUrl: "https://example.com/story",
  } as never);

  it("shows the headline in the reader's language", () => {
    expect(messagePreview(body, { languages: ["zh-TW"] })).toBe(
      "晶片廠加速海外設廠",
    );
    expect(messagePreview(body, { languages: ["en"] })).toBe(
      "Chipmakers race abroad",
    );
  });

  it("falls back to a headline it has when the reader's is missing", () => {
    expect(messagePreview(body, { languages: ["it"] })).toBe(
      "Chipmakers race abroad",
    );
  });
});
