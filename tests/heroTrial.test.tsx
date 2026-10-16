import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HeroTrial from "@/components/landing/trial/HeroTrial";
import type { InterfaceLanguage } from "@/lib/appPreferences";
import { getTranslations } from "@/lib/i18n";
import { getSpeechSettings, setSpeechSettings } from "@/lib/speech";

const voice = (name: string, lang: string, voiceURI = name) =>
  ({ name, lang, voiceURI, default: false, localService: true }) as SpeechSynthesisVoice;

const VOICES = [
  voice("Meijia", "zh-TW"),
  voice("Tingting", "zh-CN"),
  voice("Samantha", "en-US"),
  // A novelty voice: on the device, never offered by name.
  voice("Bubbles", "zh-TW"),
  voice("Alice", "it-IT"),
];

const english = getTranslations("english")!.landing.hero;

function renderTrial(language: InterfaceLanguage = "english") {
  const copy = getTranslations(language)!.landing.hero;
  render(<HeroTrial copy={copy} language={language} />);
  return { copy, trial: screen.getByRole("region", { name: copy.trial.title }) };
}

let speak: ReturnType<typeof vi.fn>;

beforeEach(() => {
  speak = vi.fn();
  vi.stubGlobal("speechSynthesis", {
    speak,
    cancel: () => {},
    getVoices: () => VOICES,
    addEventListener: () => {},
    removeEventListener: () => {},
    speaking: false,
    pending: false,
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      lang = "";
      rate = 1;
      voice: unknown = null;
      constructor(public text: string) {}
    },
  );
  setSpeechSettings({ ...getSpeechSettings(), voiceURIs: {} });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Keep", () => {
  it("keeps the phrase with the reader's own where and why, and lets them take it out again", () => {
    const { trial } = renderTrial();
    const notebook = within(trial).getByRole("complementary");
    expect(notebook).toHaveTextContent(english.trial.notebook.empty);

    fireEvent.change(within(trial).getByLabelText(english.journey.keep.whyLabel), {
      target: { value: "Quiet, like my grandmother’s kitchen." },
    });
    fireEvent.click(within(trial).getByRole("button", { name: english.trial.keep.save }));

    expect(within(notebook).getByText("留白")).toHaveAttribute("lang", "zh-Hant");
    expect(within(notebook).getByText(english.journey.keep.where)).toBeInTheDocument();
    expect(within(trial).getByRole("button", { name: english.trial.keep.saved })).toBeDisabled();

    // A later edit is offered as a change to the kept card, not a second one.
    fireEvent.change(within(trial).getByLabelText(english.trial.keep.whereLabel), {
      target: { value: "the night market" },
    });
    fireEvent.click(within(trial).getByRole("button", { name: english.trial.keep.update }));
    expect(within(notebook).getAllByRole("listitem")).toHaveLength(1);
    expect(within(notebook).getByText("the night market")).toBeInTheDocument();

    fireEvent.click(within(notebook).getByRole("button", { name: "Remove 留白" }));
    expect(notebook).toHaveTextContent(english.trial.notebook.empty);
    expect(within(trial).getByRole("button", { name: english.trial.keep.save })).toBeEnabled();
  });

  it("moves between steps with the arrow keys, as tabs do", () => {
    const { trial } = renderTrial();
    const keep = within(trial).getByRole("tab", { name: /Keep/ });
    keep.focus();
    fireEvent.keyDown(keep, { key: "ArrowRight" });
    const understand = within(trial).getByRole("tab", { name: /Understand/ });
    expect(understand).toHaveAttribute("aria-selected", "true");
    expect(understand).toHaveFocus();
    fireEvent.keyDown(understand, { key: "End" });
    expect(within(trial).getByRole("tab", { name: /Review/ })).toHaveAttribute("aria-selected", "true");
  });
});

describe("Understand", () => {
  it("reads the phrase aloud in a voice the reader picks from their device, at the speed they pick", () => {
    const { trial } = renderTrial();
    fireEvent.click(within(trial).getByRole("tab", { name: /Understand/ }));

    for (const label of ["Meaning", "Tone", "Culture"]) {
      expect(within(trial).getByText(label)).toBeInTheDocument();
    }

    const picker = within(trial).getByLabelText(english.trial.listen.voice) as HTMLSelectElement;
    const offered = Array.from(picker.options).map(option => option.textContent);
    expect(offered[0]).toBe(english.trial.listen.automatic);
    expect(offered).toContain("Meijia · Taiwan");
    expect(offered).toContain("Tingting · China");
    expect(offered.some(name => name?.includes("Bubbles"))).toBe(false);
    expect(offered.some(name => name?.includes("Samantha"))).toBe(false);

    fireEvent.change(picker, { target: { value: "Meijia" } });
    // The app's own setting: the voice they will hear after signing in.
    expect(getSpeechSettings().voiceURIs["zh-TW"]).toBe("Meijia");

    fireEvent.click(within(trial).getByRole("button", { name: english.trial.listen.slow }));
    fireEvent.click(within(trial).getAllByRole("button", { name: english.trial.listen.play })[0]);
    const utterance = speak.mock.calls.at(-1)![0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe("留白");
    expect(utterance.voice).toMatchObject({ name: "Meijia" });
    expect(utterance.rate).toBeLessThan(1);
  });

  it("compares the idea across five languages, with its own language picker", () => {
    const { trial } = renderTrial();
    fireEvent.click(within(trial).getByRole("tab", { name: /Understand/ }));

    const languages = within(trial).getByRole("group", { name: english.trial.compare.label });
    expect(within(languages).getAllByRole("button")).toHaveLength(5);
    // Opens in the reader's language.
    expect(within(languages).getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(languages).getByRole("button", { name: "Italiano" }));
    expect(within(trial).getByText("respiro", { selector: "strong" })).toBeInTheDocument();
    expect(within(trial).getByText(/Uno spazio vuoto lasciato apposta/).closest("[lang]")).toHaveAttribute("lang", "it");
    // The interface around it stays in English.
    expect(within(trial).getByText(english.trial.compare.title)).toBeInTheDocument();

    fireEvent.click(within(trial).getByRole("button", { name: `${english.trial.listen.play}: respiro` }));
    const utterance = speak.mock.calls.at(-1)![0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe("respiro");
    expect(utterance.lang).toBe("it-IT");
  });
});

describe("Exchange", () => {
  it("copies the card a friend would get, and keeps the friend's word too", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const { trial } = renderTrial();
    fireEvent.click(within(trial).getByRole("tab", { name: /Exchange/ }));

    await act(async () => {
      fireEvent.click(within(trial).getByRole("button", { name: english.trial.exchange.copy }));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain("留白 (liú bái)");
    expect(text).toContain(english.journey.keep.why);
    expect(within(trial).getByRole("button", { name: english.trial.exchange.copied })).toBeInTheDocument();

    fireEvent.click(within(trial).getByRole("button", { name: "Keep “respiro” too" }));
    const notebook = within(trial).getByRole("complementary");
    expect(within(notebook).getByText("respiro")).toHaveAttribute("lang", "it");
    expect(within(trial).getByRole("button", { name: "“respiro” is in your notebook" })).toBeDisabled();
  });

  it("says so when the copy fails, rather than claiming it worked", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    const { trial } = renderTrial();
    fireEvent.click(within(trial).getByRole("tab", { name: /Exchange/ }));
    await act(async () => {
      fireEvent.click(within(trial).getByRole("button", { name: english.trial.exchange.copy }));
    });
    expect(within(trial).getByRole("status")).toHaveTextContent(english.trial.exchange.copyFailed);
  });
});

describe("Review", () => {
  it("offers to keep the phrase first when the notebook is empty", () => {
    const { trial } = renderTrial();
    fireEvent.click(within(trial).getByRole("tab", { name: /Review/ }));
    expect(within(trial).getByText(english.trial.review.empty)).toBeInTheDocument();

    fireEvent.click(within(trial).getByRole("button", { name: english.trial.review.keepAndReview }));
    expect(within(trial).getByText("Card 1 of 1")).toBeInTheDocument();
    expect(within(within(trial).getByRole("complementary")).getByText("留白")).toBeInTheDocument();
  });

  it("runs recall, reveal, again and got it on what was kept, and says what the app would do", () => {
    const { trial } = renderTrial();
    fireEvent.click(within(trial).getByRole("button", { name: english.trial.keep.save }));
    fireEvent.click(within(trial).getByRole("tab", { name: /Exchange/ }));
    fireEvent.click(within(trial).getByRole("button", { name: "Keep “respiro” too" }));
    fireEvent.click(within(trial).getByRole("tab", { name: /Review/ }));

    expect(within(trial).getByText("Card 1 of 2")).toBeInTheDocument();
    expect(within(trial).getByText(english.trial.review.prompt)).toBeInTheDocument();
    expect(within(trial).queryByText(english.journey.understand.meaning)).not.toBeInTheDocument();

    fireEvent.click(within(trial).getByRole("button", { name: english.trial.review.reveal }));
    expect(within(trial).getByText(english.journey.understand.meaning)).toBeInTheDocument();

    // Again: the card comes back later in the sitting.
    fireEvent.click(within(trial).getByRole("button", { name: english.trial.review.again }));
    expect(within(trial).getByRole("status")).toHaveTextContent(english.trial.review.againResult);
    fireEvent.click(within(trial).getByRole("button", { name: english.trial.review.next }));
    expect(within(trial).getByText("respiro", { selector: "p" })).toBeInTheDocument();

    for (let i = 0; i < 2; i += 1) {
      fireEvent.click(within(trial).getByRole("button", { name: english.trial.review.reveal }));
      fireEvent.click(within(trial).getByRole("button", { name: english.trial.review.gotIt }));
      expect(within(trial).getByRole("status")).toHaveTextContent(english.trial.review.gotItResult);
      fireEvent.click(within(trial).getByRole("button", { name: english.trial.review.next }));
    }
    expect(within(trial).getByText(english.trial.review.done)).toBeInTheDocument();
  });
});

describe("Language", () => {
  it("speaks the language picked at the top of the page", () => {
    const { copy, trial } = renderTrial("spanish");
    expect(within(trial).getAllByRole("tab").map(tab => tab.textContent)).toEqual([
      "1Guardar",
      "2Entender",
      "3Intercambiar",
      "4Repasar",
    ]);
    expect(within(trial).getByRole("button", { name: copy.trial.keep.save })).toBeInTheDocument();
    fireEvent.click(within(trial).getByRole("tab", { name: /Entender/ }));
    expect(
      within(within(trial).getByRole("group", { name: copy.trial.compare.label })).getByRole("button", {
        name: "Español",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("has every trial string in every interface language", () => {
    const flat = (value: unknown, path = ""): Array<[string, string]> =>
      typeof value === "string"
        ? [[path, value]]
        : Object.entries(value as object).flatMap(([key, inner]) => flat(inner, `${path}.${key}`));
    const base = new Map(flat(english.trial));
    for (const language of ["traditional-chinese", "spanish", "french", "italian"] as const) {
      const entries = flat(getTranslations(language)!.landing.hero.trial);
      expect(entries.map(([path]) => path).sort()).toEqual([...base.keys()].sort());
      const translated = entries.filter(([path, value]) => value !== base.get(path));
      // Nearly everything differs; a word like "Natural" may not.
      expect(translated.length).toBeGreaterThan(entries.length - 4);
    }
  });
});
