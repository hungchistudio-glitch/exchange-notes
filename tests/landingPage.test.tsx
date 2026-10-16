import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics/track", () => ({
  track: vi.fn(),
}));

import LandingPage from "@/components/landing/LandingPage";
import { track } from "@/lib/analytics/track";
import { setInterfaceLanguage } from "@/lib/appPreferences";
import * as i18n from "@/lib/i18n";
import { getInterfaceLanguageMeta } from "@/lib/languages";

describe("the pre-login product tour", () => {
  beforeEach(() => {
    vi.mocked(track).mockClear();
    setInterfaceLanguage("english");
  });

  it("explains the real product before asking for sign-in", () => {
    render(<LandingPage />);

    // The About page's own first line: what the app is for.
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Exchange a phrase. Discover another way of seeing.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "A useful word can keep moving." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Learning feels lighter with someone nearby.",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText("Start with one phrase — Continue with Google"),
    ).toHaveLength(2);
    expect(
      screen.getByText(/Keep the words that find you/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Free during the beta. No feed, no likes — only the people you choose."),
    ).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("landing_view");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
  });

  it("offers every interface language before sign-in and changes the whole introduction", async () => {
    render(<LandingPage />);

    for (const name of ["English", "繁體中文", "Español", "Français", "Italiano"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Intercambia una frase. Descubre otra forma de ver el mundo.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Empieza con una frase — Continuar con Google"),
    ).toHaveLength(2);
    expect(document.documentElement).toHaveAttribute("lang", "es");
  });

  it("keeps the current language when a dictionary chunk cannot load", async () => {
    const load = vi
      .spyOn(i18n, "loadTranslations")
      .mockRejectedValueOnce(new Error("offline"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      render(<LandingPage />);
      fireEvent.click(screen.getByRole("button", { name: "Français" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "That language couldn't be loaded. Check your connection and try again.",
      );
      expect(document.documentElement).toHaveAttribute("lang", "en");
    } finally {
      load.mockRestore();
      consoleError.mockRestore();
    }
  });

  it("opens the hero on a trial of the app, with no autoplay and no decorative Yumi", () => {
    render(<LandingPage />);

    const trial = screen.getByRole("region", { name: "Try it with one phrase" });
    const tabs = within(trial).getAllByRole("tab");
    expect(tabs.map(tab => tab.textContent)).toEqual(["1Keep", "2Understand", "3Exchange", "4Review"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(within(trial).getByRole("heading", { name: "Keep it with its moment" })).toBeInTheDocument();
    expect(within(trial).queryByRole("button", { name: /Play tour|Pause tour/ })).not.toBeInTheDocument();
    // The only 3D Yumi near the top of the page is the film's.
    expect(trial.querySelector("canvas")).toBeNull();
  });

  it("shows every reader a phrase from a language that is not their own", async () => {
    render(<LandingPage />);

    // English readers meet Chinese, marked as Chinese for speech and fonts.
    const trial = screen.getByRole("region", { name: "Try it with one phrase" });
    expect(within(trial).getByText("留白")).toHaveAttribute("lang", "zh-Hant");
    fireEvent.click(within(trial).getByRole("tab", { name: /Exchange/ }));
    expect(within(trial).getByText("respiro", { selector: "mark" })).toHaveAttribute("lang", "it");

    fireEvent.click(screen.getByRole("button", { name: "繁體中文" }));

    // Traditional Chinese readers meet Italian, and a Spanish friend's word.
    const zhTrial = await screen.findByRole("region", { name: "用一句話試試看" });
    expect(within(zhTrial).getAllByText("dolce far niente")[0]).toHaveAttribute("lang", "it");
    expect(within(zhTrial).getByText("sobremesa", { selector: "mark" })).toHaveAttribute("lang", "es");
    expect(within(zhTrial).queryByText("留白")).not.toBeInTheDocument();
  });

  it("keeps the journey's phrase foreign and its friend from elsewhere in every language", async () => {
    const pairs: Record<string, { phrase: string; friendLang: string }> = {};
    for (const language of i18n.TRANSLATION_LANGUAGES) {
      const journey = (await i18n.loadTranslations(language)).landing.hero.journey;
      const ui = getInterfaceLanguageMeta(language).htmlLang;
      expect(journey.phraseLang.slice(0, 2)).not.toBe(ui.slice(0, 2));
      expect(journey.exchange.replyLang.slice(0, 2)).not.toBe(ui.slice(0, 2));
      expect(journey.exchange.reply).toContain(journey.exchange.replyWord);
      pairs[language] = { phrase: journey.phrase, friendLang: journey.exchange.replyLang };
    }
    expect(Object.keys(pairs)).toHaveLength(i18n.TRANSLATION_LANGUAGES.length);
  });

  it("switches between the two things the camera can do", () => {
    render(<LandingPage />);

    // Opens on the menu scan.
    const menu = screen.getByRole("button", { name: /Translate a menu/ });
    const target = screen.getByRole("button", { name: /Focus on one thing/ });

    expect(menu).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Sliced pork with garlic sauce")).toBeInTheDocument();

    fireEvent.click(target);

    expect(target).toHaveAttribute("aria-pressed", "true");
    expect(menu).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("teapot")).toBeInTheDocument();
    expect(
      screen.queryByText("Sliced pork with garlic sauce"),
    ).not.toBeInTheDocument();
  });

  it("says which of the two only exists in Cosmic Mode", () => {
    // The menu scanner's only entry point is the Cosmic Mode Command Deck, so
    // a reader who goes looking for it in the standard app would not find it.
    // Target focus is on the ordinary capture screen and carries no badge.
    render(<LandingPage />);

    const menu = screen.getByRole("button", { name: /Translate a menu/ });
    const target = screen.getByRole("button", { name: /Focus on one thing/ });

    expect(menu).toHaveTextContent("Yumi Cosmic Mode");
    expect(target).not.toHaveTextContent("Yumi Cosmic Mode");
  });

  it("keeps hero and final conversion events distinct", () => {
    render(<LandingPage />);

    const ctas = screen.getAllByText(
      "Start with one phrase — Continue with Google",
    );
    const navigation = screen.getByRole("link", { name: "Start" });
    const entries = [navigation, ...ctas];
    for (const entry of entries) {
      expect(entry).toHaveAttribute("href", "/login");
      // Keep the test in place while exercising the real click analytics.
      entry.addEventListener("click", (event) => event.preventDefault());
      fireEvent.click(entry);
    }
    expect(track).toHaveBeenCalledWith("landing_primary_cta_click", { source: "navigation" });
    expect(track).toHaveBeenCalledWith("landing_primary_cta_click", { source: "hero" });
    expect(track).toHaveBeenCalledWith("landing_final_cta_click", { source: "final" });
    expect(track).not.toHaveBeenCalledWith("google_auth_start", expect.anything());
  });
});
