import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import YumiDecodeCard from "@/components/messages/YumiDecodeCard";
import english from "@/lib/i18n/en";
import spanish from "@/lib/i18n/es";
import french from "@/lib/i18n/fr";
import { plural } from "@/lib/i18n/format";
import italian from "@/lib/i18n/it";
import type { TranslationLanguage } from "@/lib/i18n/types";
import traditionalChinese from "@/lib/i18n/zh-TW";
import { openGraphLocale } from "@/lib/info/metadata";
import { readToneKeys, TONE_KEYS } from "@/lib/messages/decode";
import {
  formatConversationTime,
  formatDateLabel,
} from "@/lib/messages/format";
import { CUISINE_KEYS, readCuisineKey } from "@/lib/scanner/menuTypes";

/* =========================================================
   Everything the reader sees follows the display language

   The 2026-10-12 audit found interface text that ignored the setting: raw
   server and database errors, AI labels written in whatever language the
   model chose, dates and decimals in the phone's language, English-only
   plural rules, page titles, the install description, the offline page,
   the 404 page and the Scriptable widget. Each of these pins one of them.
   ========================================================= */

const reader = vi.hoisted(() => ({
  language: "english" as TranslationLanguage,
}));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => reader.language,
}));

// The root layout's fonts are a build-time transform; any function will do.
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

vi.mock("@/lib/preferences/serverPreferences", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getServerInterfaceLanguage: async () => reader.language,
}));

const DICTIONARIES = {
  english,
  "traditional-chinese": traditionalChinese,
  spanish,
  french,
  italian,
};

beforeEach(() => {
  reader.language = "english";
});

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = "exchange-notes-interface-language=; path=/; max-age=0";
  window.localStorage.clear();
});

describe("counted phrases", () => {
  it("takes the singular by the language's own rule", () => {
    expect(plural(0, "fr", "{count} mot", "{count} mots")).toBe("0 mot");
    expect(plural(0, "en", "{count} word", "{count} words")).toBe("0 words");
    expect(plural(1, "en", "{count} word", "{count} words")).toBe("1 word");
    expect(plural(1, "it", "{count} giorno", "{count} giorni")).toBe(
      "1 giorno",
    );
    expect(plural(2, "es", "{count} día", "{count} días")).toBe("2 días");
  });

  it("has a singular for every count the old code got wrong", () => {
    for (const copy of Object.values(DICTIONARIES)) {
      expect(copy.home.progress.totalReviewsOne).toContain("{count}");
      expect(copy.review.completedReviewsOne).toContain("{count}");
      expect(copy.scanner.menu.itemCountOne).toContain("{count}");
      expect(copy.vocabulary.mascot.summaryStreakOne).toContain("{count}");
      expect(copy.discover.keyWordsLabelOne).toContain("{count}");
      expect(copy.discover.exploreImageLabelOne).toContain("{count}");
    }
  });
});

describe("Yumi's read of a conversation's tone", () => {
  it("is stored as keys and shown in the display language", () => {
    reader.language = "french";

    render(
      <YumiDecodeCard
        analysis={{
          messageId: 1,
          status: "ready",
          tone: "casual,friendly",
          toneConfidence: "high",
          phrases: [],
        }}
        conversationId="c1"
        speechLanguage="en-US"
        savedPhraseIds={new Set()}
        savingPhraseId={null}
        onSavePhrase={() => undefined}
        onInsertReply={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText("Décontracté · Amical")).toBeTruthy();
  });

  it("recognises older English labels and drops anything else", () => {
    expect(readToneKeys("Casual · Friendly")).toEqual(["casual", "friendly"]);
    expect(readToneKeys("溫柔而直接")).toEqual([]);
    expect(readToneKeys(null)).toEqual([]);
  });

  it("has a label for every key in every language", () => {
    for (const copy of Object.values(DICTIONARIES)) {
      expect(Object.keys(copy.messages.decode.tones).sort()).toEqual(
        [...TONE_KEYS].sort(),
      );
    }
  });
});

describe("the cuisine a menu is read as", () => {
  it("is a key, read from older free-text labels too", () => {
    expect(readCuisineKey("japanese")).toBe("japanese");
    expect(readCuisineKey("Japanese izakaya")).toBe("japanese");
    expect(readCuisineKey("Middle Eastern")).toBe("middleEastern");
    expect(readCuisineKey("Café")).toBe("cafe");
    expect(readCuisineKey("other")).toBeNull();
    expect(readCuisineKey("")).toBeNull();
  });

  it("has a label for every key in every language", () => {
    for (const copy of Object.values(DICTIONARIES)) {
      expect(Object.keys(copy.scanner.menu.cuisines).sort()).toEqual(
        [...CUISINE_KEYS].sort(),
      );
    }
  });
});

describe("message dates", () => {
  it("follow the display language, not the phone's", () => {
    const old = "2025-03-04T10:00:00Z";
    const expected = new Intl.DateTimeFormat("fr", {
      month: "short",
      day: "numeric",
    }).format(new Date(old));

    expect(formatConversationTime(old, "fr")).toBe(expected);
    expect(formatDateLabel(old, "aujourd'hui", "hier", "fr")).toContain(
      expected,
    );
  });
});

describe("pages outside the app", () => {
  it("previews the introduction in the reader's language", async () => {
    reader.language = "traditional-chinese";
    const { generateMetadata } = await import("@/app/(public)/page");
    const metadata = await generateMetadata();

    expect(metadata.title).toBe(traditionalChinese.meta.landingTitle);
    expect(metadata.openGraph?.locale).toBe("zh_TW");
  });

  it("describes the app in the reader's language and links their manifest", async () => {
    reader.language = "italian";
    const { generateMetadata } = await import("@/app/layout");
    const metadata = await generateMetadata();

    expect(metadata.description).toBe(italian.meta.appDescription);
    expect(metadata.manifest).toBe("/manifest/italian");
  });

  it("serves one manifest per display language", async () => {
    const { GET } = await import("@/app/manifest/[language]/route");
    const response = await GET(new Request("http://x/manifest/spanish"), {
      params: Promise.resolve({ language: "spanish" }),
    });
    const manifest = await response.json();

    expect(manifest.description).toBe(spanish.meta.appDescription);
    expect(manifest.lang).toBe("es");
    expect(manifest.id).toBe("/");

    const missing = await GET(new Request("http://x/manifest/klingon"), {
      params: Promise.resolve({ language: "klingon" }),
    });
    expect(missing.status).toBe(404);
  });

  it("writes Open Graph locales the way Open Graph reads them", () => {
    expect(openGraphLocale("english")).toBe("en_US");
    expect(openGraphLocale("traditional-chinese")).toBe("zh_TW");
    expect(openGraphLocale("italian")).toBe("it_IT");
  });

  it("says a page is missing in the reader's language", async () => {
    reader.language = "french";
    const { default: NotFound } = await import("@/app/not-found");

    render(await NotFound());

    expect(
      screen.getByRole("heading", { name: french.notFound.title }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: french.notFound.home })).toBeTruthy();
  });
});

describe("the offline page", () => {
  const html = readFileSync(join(process.cwd(), "public/offline.html"), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
  const body = html.match(/<body>([\s\S]*?)<script>/)?.[1] ?? "";

  function open() {
    document.body.innerHTML = body;
    new Function(script)();
  }

  it("follows the language cookie the app writes", () => {
    document.cookie = "exchange-notes-interface-language=spanish; path=/";
    open();

    expect(document.querySelector("h1")?.textContent).toBe(
      "Estás sin conexión.",
    );
    expect(document.documentElement.lang).toBe("es");
  });

  it("falls back to stored preference, then English", () => {
    window.localStorage.setItem(
      "exchange-notes-interface-language",
      "traditional-chinese",
    );
    open();
    expect(document.querySelector("button")?.textContent).toBe("再試一次");

    window.localStorage.clear();
    open();
    expect(document.querySelector("button")?.textContent).toBe("Try again");
  });
});

describe("the Scriptable widget", () => {
  it("has every line in all five languages", () => {
    const source = readFileSync(
      join(process.cwd(), "scriptable/ExchangeNotesYumiWidget.js"),
      "utf8",
    );
    const table = source.match(/const WIDGET_TEXT = \{([\s\S]*?)\n\};/)?.[1];
    expect(table).toBeTruthy();

    const blocks = [
      ...(table ?? "").matchAll(/\n {2}"?([a-z-]+)"?: \{\n([\s\S]*?)\n {2}\},/g),
    ];
    const keys = new Map(
      blocks.map(([, language, block]) => [
        language,
        [...block.matchAll(/^ {4}(\w+):/gm)].map(([, key]) => key).sort(),
      ]),
    );

    expect([...keys.keys()].sort()).toEqual(
      Object.keys(DICTIONARIES).sort(),
    );
    for (const list of keys.values()) {
      expect(list).toEqual(keys.get("english"));
    }
  });
});
