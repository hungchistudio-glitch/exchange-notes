import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ExchangeShowcase from "@/components/landing/sections/ExchangeShowcase";
import LensShowcase from "@/components/landing/sections/LensShowcase";
import NotesShowcase, { languageCodeFor } from "@/components/landing/sections/NotesShowcase";
import YumiShowcase from "@/components/landing/sections/YumiShowcase";
import { getTranslations } from "@/lib/i18n";
import { NOTE_SAMPLES, noteOriginalFor } from "@/lib/landing/noteSamples";

const figure = vi.hoisted(() => ({ props: [] as Array<Record<string, unknown>> }));

/* jsdom has no WebGL; what matters here is what the section asks of her. */
vi.mock("@/components/yumi3d/Yumi3DFigure", () => ({
  default: (props: Record<string, unknown>) => {
    figure.props.push(props);
    return <div data-testid="yumi" />;
  },
}));

const en = getTranslations("english")!.landing;
let speak: ReturnType<typeof vi.fn>;

beforeEach(() => {
  figure.props = [];
  speak = vi.fn();
  vi.stubGlobal("speechSynthesis", {
    speak,
    cancel: () => {},
    getVoices: () => [],
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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const lastSpoken = () => speak.mock.calls.at(-1)![0] as SpeechSynthesisUtterance;

describe("Keep: a bilingual note", () => {
  it("keeps both lines and shows the second in any of the five languages, each with its own voice", () => {
    render(<NotesShowcase copy={en.notes} />);
    const languages = screen.getByRole("group", { name: en.notes.viewLabel });
    expect(within(languages).getAllByRole("button")).toHaveLength(5);

    // An English reader's note opens with its Chinese line.
    expect(within(languages).getByRole("button", { name: "繁體中文" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/I finally found the word/)).toHaveAttribute("lang", "en");
    expect(screen.getByText(/我終於找到/)).toHaveAttribute("lang", "zh-Hant");

    const cases = [
      ["Español", /Por fin encontré/, "es", "es-ES"],
      ["Français", /J'ai enfin trouvé/, "fr", "fr-FR"],
      ["Italiano", /Ho finalmente trovato/, "it", "it-IT"],
      ["繁體中文", /我終於找到/, "zh-Hant", "zh-TW"],
    ] as const;
    for (const [name, sentence, lang, speech] of cases) {
      fireEvent.click(within(languages).getByRole("button", { name }));
      // The line as written stays; the second line is the one chosen.
      expect(screen.getByText(/I finally found the word/)).toBeInTheDocument();
      expect(screen.getByText(sentence)).toHaveAttribute("lang", lang);
      fireEvent.click(screen.getByRole("button", { name: `${en.notes.listenSentence}: ${name}` }));
      expect(lastSpoken().lang).toBe(speech);
      expect(lastSpoken().text).toMatch(sentence);
    }

    // English as the second line puts the Chinese sentence first: never the
    // same language twice.
    fireEvent.click(within(languages).getByRole("button", { name: "English" }));
    expect(screen.getByText(/我終於找到/)).toBeInTheDocument();
    expect(screen.getByText(/I finally found the word/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: `${en.notes.listenSentence}: English` }));
    expect(lastSpoken().lang).toBe("en-US");
  });

  it("opens the word for the feeling in either line, with its reading, meaning and sound", () => {
    render(<NotesShowcase copy={en.notes} />);

    const chinese = screen.getByRole("button", { name: "苦樂參半" });
    const english = screen.getByRole("button", { name: "bittersweet" });
    fireEvent.click(chinese);
    expect(chinese).toHaveAttribute("aria-expanded", "true");
    expect(english).toHaveAttribute("data-linked", "true");
    expect(screen.getByText(en.notes.meaning)).toBeInTheDocument();
    expect(screen.getByText("kǔ lè cān bàn")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: `${en.notes.listen}: 苦樂參半` }));
    expect(lastSpoken().text).toBe("苦樂參半");
    expect(lastSpoken().lang).toBe("zh-TW");

    fireEvent.click(english);
    expect(screen.getByText("/ˌbɪtərˈswiːt/")).toBeInTheDocument();
    expect(chinese).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: en.notes.close }));
    expect(screen.queryByText(en.notes.meaning)).not.toBeInTheDocument();
  });

  it("closes the word and moves on when another language is chosen", () => {
    const es = getTranslations("spanish")!.landing.notes;
    render(<NotesShowcase copy={es} />);
    // A Spanish reader opens on Spanish.
    fireEvent.click(screen.getByRole("button", { name: "agridulce" }));
    expect(screen.getByText(es.meaning)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Français" }));
    expect(screen.queryByText(es.meaning)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "doux-amer" }));
    expect(screen.getByText("/du.za.mɛʁ/")).toBeInTheDocument();
  });
});

describe("Exchange: a word card to one friend", () => {
  it("sends the card, which arrives whole, and the friend saves it", () => {
    render(<ExchangeShowcase copy={en.exchange} />);
    expect(screen.getByText(en.exchange.waiting)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send to Mia" }));
    expect(screen.queryByText(en.exchange.waiting)).not.toBeInTheDocument();
    expect(screen.getByText(en.exchange.arrived)).toBeInTheDocument();
    expect(screen.getAllByText(en.exchange.meaning)).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Sent to Mia");

    fireEvent.click(screen.getByRole("button", { name: en.exchange.save }));
    expect(screen.getByRole("button", { name: "In Mia’s words now" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: `${en.exchange.listen}: 苦樂參半` }));
    expect(lastSpoken().text).toBe("苦樂參半");

    fireEvent.click(screen.getByRole("button", { name: en.exchange.again }));
    expect(screen.getByRole("button", { name: "Send to Mia" })).toBeInTheDocument();
  });
});

describe("Yumi: the word, brought back", () => {
  it("opens the word for review; she looks at it, and reaches for it when it is remembered", () => {
    render(<YumiShowcase copy={en.yumi} interfaceLang="en" />);
    expect(figure.props.at(-1)!.gaze).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /苦樂參半/ }));
    expect(figure.props.at(-1)!.gaze).toEqual({ x: 0, y: 0.9 });
    expect(screen.queryByText(en.yumi.reviewMeaning)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: en.yumi.reveal }));
    expect(screen.getByText(en.yumi.reviewMeaning)).toBeInTheDocument();

    const before = (figure.props.at(-1)!.reach as { key: number }).key;
    fireEvent.click(screen.getByRole("button", { name: en.yumi.gotIt }));
    expect((figure.props.at(-1)!.reach as { key: number }).key).toBe(before + 1);
    expect(screen.getByRole("status")).toHaveTextContent(en.yumi.gotItReaction);

    fireEvent.click(screen.getByRole("button", { name: en.yumi.restart }));
    fireEvent.click(screen.getByRole("button", { name: en.yumi.reveal }));
    fireEvent.click(screen.getByRole("button", { name: en.yumi.again }));
    expect(screen.getByRole("status")).toHaveTextContent(en.yumi.againReaction);
    // "Not yet" is not a reason to celebrate.
    expect((figure.props.at(-1)!.reach as { key: number }).key).toBe(before + 1);
  });
});

describe("Lens: what the camera does", () => {
  it("lets a dish be chosen and heard, the way you would order it", () => {
    render(<LensShowcase copy={en.lens} />);
    const second = screen.getByRole("button", { name: /宮保雞丁/ });
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: `${en.lens.listen}: 宮保雞丁` }));
    expect(lastSpoken().text).toBe("宮保雞丁");
    expect(lastSpoken().lang).toBe("zh-TW");
  });

  it("reads only the frame the reader chooses", () => {
    render(<LensShowcase copy={en.lens} />);
    fireEvent.click(screen.getByRole("button", { name: /Focus on one thing/ }));
    expect(screen.getByText("teapot")).toBeInTheDocument();

    const plant = screen.getByRole("button", { name: `${en.lens.target.demoCandidate}: plant` });
    fireEvent.click(plant);
    expect(plant).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("plant", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText("teapot")).not.toBeInTheDocument();
  });
});

describe("one word through all three", () => {
  it("is the same word in the note, the exchange and the review, in every language", () => {
    for (const language of ["english", "traditional-chinese", "spanish", "french", "italian"] as const) {
      const landing = getTranslations(language)!.landing;
      const wordLanguage = languageCodeFor(landing.exchange.wordLang);
      expect(landing.exchange.word, language).toBe(NOTE_SAMPLES[wordLanguage].word);
      expect(landing.yumi.reviewWord, language).toBe(landing.exchange.word);
      expect(landing.exchange.meaning, language).toBe(landing.notes.meaning);
      // And that word is in the note a reader first sees.
      const shown = languageCodeFor(landing.notes.translationLang);
      expect([shown, noteOriginalFor(shown)], language).toContain(wordLanguage);
    }
  });

  it("has every sentence carry its own word", () => {
    for (const sample of Object.values(NOTE_SAMPLES)) {
      expect(sample.sentence).toContain(sample.word);
    }
  });
});
