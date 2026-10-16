import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ExchangeShowcase from "@/components/landing/sections/ExchangeShowcase";
import LensShowcase from "@/components/landing/sections/LensShowcase";
import NotesShowcase from "@/components/landing/sections/NotesShowcase";
import YumiShowcase from "@/components/landing/sections/YumiShowcase";
import { getTranslations } from "@/lib/i18n";

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
  it("reads in either language or both, as the note's own view does", () => {
    render(<NotesShowcase copy={en.notes} />);
    const view = screen.getByRole("group", { name: en.notes.viewLabel });

    expect(screen.getByText(/I finally found the word/)).toBeInTheDocument();
    expect(screen.getByText(/我終於找到/)).toHaveAttribute("lang", "zh-Hant");

    fireEvent.click(within(view).getByRole("button", { name: "English" }));
    expect(screen.queryByText(/我終於找到/)).not.toBeInTheDocument();

    fireEvent.click(within(view).getByRole("button", { name: "繁體中文" }));
    expect(screen.queryByText(/I finally found the word/)).not.toBeInTheDocument();
    expect(screen.getByText(/我終於找到/)).toBeInTheDocument();
  });

  it("looks up the word that is not in the reader's language, where it stands, and reads it aloud", () => {
    render(<NotesShowcase copy={en.notes} />);

    const word = screen.getByRole("button", { name: "苦樂參半" });
    expect(word).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(word);
    expect(word).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(en.notes.lookup.meaning)).toBeInTheDocument();
    expect(screen.getByText("kǔ lè cān bàn")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: en.notes.listen }));
    expect(lastSpoken().text).toBe("苦樂參半");
    expect(lastSpoken().lang).toBe("zh-TW");

    fireEvent.click(screen.getByRole("button", { name: en.notes.listenSentence }));
    expect(lastSpoken().text).toBe(en.notes.original);
    expect(lastSpoken().lang).toBe("en-US");

    fireEvent.click(screen.getByRole("button", { name: en.notes.close }));
    expect(screen.queryByText(en.notes.lookup.meaning)).not.toBeInTheDocument();
  });

  it("gives a Spanish reader the English word to look up instead", () => {
    const es = getTranslations("spanish")!.landing.notes;
    render(<NotesShowcase copy={es} />);
    fireEvent.click(screen.getByRole("button", { name: "bittersweet" }));
    expect(screen.getByText(es.lookup.meaning)).toBeInTheDocument();
    expect(screen.getByText("agridulce", { selector: "mark" })).toBeInTheDocument();
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
      const { lookup } = landing.notes;
      expect(landing.exchange.word, language).toBe(lookup.word);
      expect(landing.yumi.reviewWord, language).toBe(lookup.word);
      expect(landing.exchange.meaning, language).toBe(lookup.meaning);

      // The word to look up is in one line of the note, its pair in the other.
      const lines = [landing.notes.original, landing.notes.translation];
      const at = lines.findIndex(line => line.includes(lookup.word));
      expect(at, language).toBeGreaterThanOrEqual(0);
      expect(lines[1 - at], language).toContain(lookup.pair);
    }
  });
});
