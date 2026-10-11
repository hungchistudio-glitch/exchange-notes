import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import FeaturedStoryCard from "@/components/discover/FeaturedStoryCard";
import english from "@/lib/i18n/en";
import { readDailyNewsCard } from "@/lib/types/dailyNews";

vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({ pair: ["en", "zh-TW"] }),
}));

describe("Discover photo descriptions", () => {
  it.each(["legacy", "multilingual"])(
    "does not present an unverified %s cached caption as a photo description",
    async (shape) => {
      const inventedCaption = "Activists gather in city streets during a demonstration";
      const card = readDailyNewsCard({
        id: "story", category: "Art", imageUrl: "/stage-performance.jpg",
        ...(shape === "legacy" ? {
          englishTitle: "Long Live Generation 6-7", chineseTitle: "第六至七世代萬歲",
          englishCaption: inventedCaption, chineseCaption: "示威活動期間，行動主義者聚集在城市街道上",
        } : {
          titles: { en: "Long Live Generation 6-7", "zh-TW": "第六至七世代萬歲" },
          captions: { en: inventedCaption, "zh-TW": "示威活動期間，行動主義者聚集在城市街道上" },
        }),
      });
      if (!card) throw new Error("Fixture must remain a readable story");
      const onOpen = vi.fn();
      const { container } = render(<FeaturedStoryCard
        card={card} copy={english.discover} categoryText="Art" formattedTime="10 Oct"
        onOpen={onOpen} isAudioPlaying={false} audioProgress={0} audioMode="primary"
        onAudioModeChange={vi.fn()} onToggleAudio={vi.fn()} onExploreImage={vi.fn()}
      />);

      expect(screen.queryByText(inventedCaption)).not.toBeInTheDocument();
      expect(screen.queryByText(/示威活動期間/)).not.toBeInTheDocument();
      expect(container.querySelector("img")).toHaveAttribute("alt", "");
      expect(container.querySelector("img")).toHaveAttribute("src");
      // The decorative photo must not remove keyboard access to the story.
      const story = screen.getByRole("button", { name: /Long Live Generation 6-7/ });
      story.focus();
      await userEvent.keyboard("{Enter}");
      expect(onOpen).toHaveBeenCalledOnce();
    },
  );
});
