import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import VocabularyEditModal from "@/components/vocabulary/detail/VocabularyEditModal";
import type { VocabularyItem } from "@/lib/types/app";

vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({
    learningLanguage: "es",
    supportLanguage: "fr",
    pair: ["es", "fr"],
  }),
}));

const item = {
  id: "word-1",
  user_id: "reader-1",
  word: "hola",
  translation: "bonjour",
  language: "es",
  word_language: "es",
  translation_language: "fr",
  texts: { es: "hola", fr: "bonjour", en: "hello" },
  examples: { es: "Hola, amiga.", fr: "Bonjour, mon amie." },
  category: "other",
  favorite: false,
  part_of_speech: null,
  example_sentence: "Hola, amiga.",
  translated_example: "Bonjour, mon amie.",
  image_url: null,
  confidence: "high",
  status: "new",
  created_at: "2026-09-11T00:00:00.000Z",
  updated_at: "2026-09-11T00:00:00.000Z",
} as VocabularyItem;

describe("the multilingual vocabulary editor", () => {
  it("labels and persists the actual Spanish → French card sides", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <VocabularyEditModal
        open
        item={item}
        onClose={() => {}}
        onSave={onSave}
      />,
    );

    const spanish = screen.getByLabelText("Spanish");
    const french = screen.getByLabelText("French");
    expect(spanish).toHaveValue("hola");
    expect(french).toHaveValue("bonjour");
    expect(screen.queryByLabelText("Traditional Chinese")).not.toBeInTheDocument();

    await user.clear(spanish);
    await user.type(spanish, "buenas tardes");
    await user.clear(french);
    await user.type(french, "bonsoir");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        word: "buenas tardes",
        translation: "bonsoir",
        texts: {
          es: "buenas tardes",
          fr: "bonsoir",
          en: "hello",
        },
      }),
    );
  });
});
