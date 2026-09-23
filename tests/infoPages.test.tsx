import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InfoPage, { INFO_CONTACT_EMAIL, type InfoPageKind } from "@/components/info/InfoPage";
import HelpSettingsPage from "@/app/(protected)/profile/help/page";
import { getInterfaceLanguage, setInterfaceLanguage } from "@/lib/appPreferences";
import * as i18n from "@/lib/i18n";
import { getInterfaceLanguageMeta } from "@/lib/languages";
import { buildSettingsSearchIndex, matchSettingsEntries } from "@/components/settings/settingsSearchIndex";
import { clearChosenBeforeSignIn, readChosenBeforeSignIn } from "@/lib/preferences/pendingChoices";

vi.mock("@/components/settings/TutorialSettingsButton", () => ({ default: () => <button>Tour</button> }));

beforeEach(() => {
  setInterfaceLanguage("english");
  clearChosenBeforeSignIn();
});

describe("localized information pages", () => {
  for (const language of i18n.TRANSLATION_LANGUAGES) {
    for (const page of ["about", "community", "privacy"] as InfoPageKind[]) {
      it(`renders ${page} in ${language} with working contact and navigation`, () => {
        setInterfaceLanguage(language);
        const copy = i18n.getTranslations(language)!.info;
        render(<InfoPage page={page} />);
        expect(screen.getByRole("main")).toHaveAttribute("lang", getInterfaceLanguageMeta(language).htmlLang);
        expect(screen.getByRole("heading", { level: 1, name: copy.nav[page] })).toBeVisible();
        if (page === "about") {
          for (const paragraph of copy.about.story) expect(screen.getByText(paragraph)).toBeVisible();
          for (const feature of copy.about.features) expect(screen.getByText(feature.body)).toBeVisible();
          expect(screen.getByText(copy.about.greeting)).toBeVisible();
        } else {
          const sections = page === "privacy" ? copy.privacy.sections : copy.community.rules;
          for (const section of sections) expect(screen.getByText(section.body)).toBeVisible();
          if (page === "privacy") {
            expect(screen.getByText(copy.privacy.status)).toBeVisible();
            expect(screen.getByText(copy.privacy.notice)).toBeVisible();
          }
        }
        expect(screen.getByRole("link", { name: new RegExp(INFO_CONTACT_EMAIL) })).toHaveAttribute("href", `mailto:${INFO_CONTACT_EMAIL}`);
        const related = screen.getByRole("navigation", { name: copy.nav.related });
        for (const link of related.querySelectorAll("a")) expect(link.getAttribute("href")).toMatch(/^\/profile\/(about|community|privacy)$/);
      });
    }
  }

  it("changes all page content through the real interface-language preference", async () => {
    render(<InfoPage page="privacy" publicView />);
    for (const language of ["traditional-chinese", "spanish", "french", "italian", "english"] as const) {
      fireEvent.change(screen.getByRole("combobox"), { target: { value: language } });
      const copy = i18n.getTranslations(language)!.info;
      await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(copy.nav.privacy));
      expect(screen.getByText(copy.privacy.notice)).toBeVisible();
      expect(getInterfaceLanguage()).toBe(language);
    }
    expect(readChosenBeforeSignIn()).toContain("interfaceLanguage");
    for (const link of screen.getAllByRole("link", { name: i18n.getTranslations("english")!.info.nav.about })) {
      expect(link).toHaveAttribute("href", "/about");
    }
  });

  it("keeps the current language if loading a translation fails and permits retry", async () => {
    vi.spyOn(i18n, "loadTranslations").mockRejectedValueOnce(new Error("offline"));
    render(<InfoPage page="about" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "french" } });
    await screen.findByRole("alert");
    expect(getInterfaceLanguage()).toBe("english");
    expect(screen.getByRole("combobox")).toHaveValue("english");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "french" } });
    await waitFor(() => expect(getInterfaceLanguage()).toBe("french"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(readChosenBeforeSignIn()).toEqual([]);
  });

  it("does not let a slower language request replace the latest choice", async () => {
    let finishFrench!: (value: i18n.TranslationDictionary) => void;
    vi.spyOn(i18n, "loadTranslations").mockImplementationOnce(() => new Promise((resolve) => { finishFrench = resolve; }));
    render(<InfoPage page="about" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "french" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "italian" } });
    await waitFor(() => expect(getInterfaceLanguage()).toBe("italian"));
    await act(async () => finishFrench(i18n.getTranslations("french")!));
    expect(getInterfaceLanguage()).toBe("italian");
  });

  it("can cancel a pending switch by choosing the current language", async () => {
    let finishFrench!: (value: i18n.TranslationDictionary) => void;
    vi.spyOn(i18n, "loadTranslations").mockImplementationOnce(() => new Promise((resolve) => { finishFrench = resolve; }));
    render(<InfoPage page="about" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "french" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "english" } });
    await act(async () => finishFrench(i18n.getTranslations("french")!));
    expect(getInterfaceLanguage()).toBe("english");
  });

  it("makes each information page reachable from Help and settings search", () => {
    render(<HelpSettingsPage />);
    const t = i18n.getTranslations("english")!;
    const index = buildSettingsSearchIndex(t);
    for (const page of ["about", "community", "privacy"] as const) {
      expect(screen.getByRole("link", { name: new RegExp(t.info.nav[page]) })).toHaveAttribute("href", `/profile/${page}`);
      expect(matchSettingsEntries(index, t.info.nav[page])).toContainEqual(expect.objectContaining({ id: `setting-${page}`, href: "/profile/help" }));
      expect(document.getElementById(`setting-${page}`)).toBeInTheDocument();
    }
  });
});

describe("where these pages sit in the app", () => {
  /*
   * Signed in, a reader reaches all three from one row in Settings, so that
   * is where back belongs. This used to send them to About instead — a page
   * they had not been on, from a page they had reached from Help.
   */
  it.each(["about", "community", "privacy"] as const)(
    "sends %s back to Help & About inside Settings",
    (page) => {
      const copy = i18n.getTranslations("english")!.info;
      render(<InfoPage page={page} />);

      const back = screen.getByRole("link", { name: copy.nav.back });
      expect(back).toHaveAttribute("href", "/profile/help");
    },
  );

  it("sends the signed-out About page home, and the other two to About", () => {
    const copy = i18n.getTranslations("english")!.info;

    const { unmount } = render(<InfoPage page="about" publicView />);
    expect(screen.getByRole("link", { name: copy.nav.home })).toHaveAttribute("href", "/");
    unmount();

    for (const page of ["community", "privacy"] as const) {
      const view = render(<InfoPage page={page} publicView />);
      const back = view.container.querySelector("header a");
      expect(back).toHaveAttribute("href", "/about");
      expect(back).toHaveTextContent(copy.nav.about);
      view.unmount();
    }
  });

  /*
   * The privacy page's last sentence ends in a colon, so the address has to
   * be the next thing read. The footer used to open with the planet line.
   */
  it("puts the contact address before the sign-off on every page", () => {
    const copy = i18n.getTranslations("english")!.info;

    for (const page of ["about", "community", "privacy"] as const) {
      const view = render(<InfoPage page={page} />);
      const email = screen.getByRole("link", { name: new RegExp(INFO_CONTACT_EMAIL) });
      const planet = screen.getByText(copy.about.planet);

      expect(planet).toBeVisible();
      expect(
        email.compareDocumentPosition(planet) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      view.unmount();
    }
  });

  it("names Chi's service planet in every language", () => {
    for (const language of i18n.TRANSLATION_LANGUAGES) {
      const planet = i18n.getTranslations(language)!.info.about.planet;
      expect(planet).toMatch(/earth|tierra|terre|terra|地球/i);
    }
  });
});
