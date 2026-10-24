import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/* =========================================================
   A headword's other readings, on a result or a card (Chi, 2026-10-19)

   One line saying the word reads more than one way, opening onto every
   reading, with the one on screen marked; a model's suggestion only for a
   word the app's lists do not have, and said to be one.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));

const readings: Record<string, { zhuyin?: string; pinyin?: string; ipa?: string }> = {
  "zh-TW:銀行": { zhuyin: "ㄧㄣˊ ㄏㄤˊ", pinyin: "yín háng" },
};
vi.mock("@/hooks/usePhonetics", () => ({
  default: () => (entry: { text: string; language: string }) => readings[`${entry.language}:${entry.text}`] ?? {},
}));

const { default: OtherReadings } = await import("@/components/pronunciation/OtherReadings");

describe("other readings", () => {
  it("says a character inside the word reads more than one way, and marks this one", async () => {
    const user = userEvent.setup();
    render(<OtherReadings text="銀行" language="zh-TW" />);

    const summary = screen.getByRole("button", { name: /「行」 has 3 readings/ });
    expect(summary).toHaveAttribute("aria-expanded", "false");
    await user.click(summary);

    expect(screen.getByText("ㄏㄤˊ").closest("li")).toHaveAttribute("data-used", "true");
    expect(screen.getByText("ㄒㄧㄥˊ").closest("li")).not.toHaveAttribute("data-used");
    expect(screen.getByRole("button", { name: "Play “銀行”" })).toBeInTheDocument();
  });

  it("marks an English reading by the part of speech the lookup gave", async () => {
    const user = userEvent.setup();
    render(<OtherReadings text="record" language="en" partOfSpeech="verb" />);

    await user.click(screen.getByRole("button", { name: /2 readings/ }));
    expect(screen.getByText("/rɪˈkɔrd/").closest("li")).toHaveAttribute("data-used", "true");
  });

  it("shows a model's readings for a word the lists do not have, as a suggestion", async () => {
    const user = userEvent.setup();
    render(
      <OtherReadings
        text="invalid"
        language="en"
        ipa="/ɪnˈvælɪd/"
        suggested={[
          { pronunciation: "/ɪnˈvælɪd/", meaning: "not valid", example: "an invalid ticket" },
          { pronunciation: "/ˈɪnvəlɪd/", meaning: "a sick person", example: "care for an invalid" },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /2 readings/ }));
    expect(screen.getByText("/ɪnˈvælɪd/").closest("li")).toHaveAttribute("data-used", "true");
    expect(screen.getByText(/Suggested by Yumi/)).toBeInTheDocument();
  });

  it("draws nothing for a word with one reading", () => {
    const { container } = render(<OtherReadings text="apple" language="en" />);
    expect(container).toBeEmptyDOMElement();
  });
});
