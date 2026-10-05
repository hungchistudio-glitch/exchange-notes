import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import english from "@/lib/i18n/en";
const m = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), user: "reader" }));
vi.mock("@/lib/offline/db", () => ({ STORES: { kv: "kv" }, readRecord: m.read, writeRecord: m.write }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getSession: async () => ({ data: { session: { user: { id: m.user } } } }) } }) }));
vi.mock("@/hooks/useDisplayLanguages", () => ({ default: () => ({ learningLanguage: "en", pair: ["en", "zh-TW"] }) }));
vi.mock("@/hooks/i18n/useTranslation", () => ({ default: () => ({ t: english }) }));
vi.mock("@/hooks/discover/useSignalRadar", () => ({ default: (props: { onScan: () => void }) => ({ scan: props.onScan }) }));
vi.mock("@/components/discover/YumiSignalRadar", () => ({ default: ({ controller }: { controller: { scan: () => void } }) => <button onClick={controller.scan}>radar</button> }));
vi.mock("@/components/discover/FeaturedStoryCard", () => ({ default: ({ card, onOpen }: { card: { id: string }; onOpen: () => void }) => <button onClick={onOpen}>story {card.id}</button> }));
vi.mock("@/components/discover/StoryDetailSheet", () => ({ default: () => null }));
vi.mock("@/components/discover/VocabularyDrawer", () => ({ default: () => null }));
vi.mock("@/components/vocabulary/FriendPickerModal", () => ({ default: () => null }));
vi.mock("@/components/discover/SignalControlSheet", () => ({ default: () => null }));
import DailyNews from "@/app/components/DailyNews";
const card = (id: string) => ({ id, itemId: id, category: "World", titles: { en: id }, summaries: {}, captions: {}, vocabulary: [], publishedAt: "2026-10-04T12:00:00Z" });
beforeEach(() => {
  m.read.mockReset().mockResolvedValue({ cards: [card("saved")], language: "en", day: new Date().toLocaleDateString("en-CA"), generatedAt: "today" });
  m.write.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ cards: [card("fresh")], generatedAt: "now" }) }));
});
afterEach(() => vi.unstubAllGlobals());
it("reopening today's feed keeps its batch and marks only an opened story read", async () => {
  const view = render(<DailyNews />);
  await screen.findByText("story saved");
  expect(fetch).not.toHaveBeenCalled();
  expect(m.read).toHaveBeenCalledWith("kv", "news:lastBatch:reader:en");
  view.unmount();
  render(<DailyNews />);
  fireEvent.click(await screen.findByText("story saved"));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(fetch).toHaveBeenCalledWith("/api/daily-news/seen", expect.objectContaining({ body: JSON.stringify({ itemIds: ["saved"] }) }));
});
it("the radar explicitly requests and stores a new batch without marking it read", async () => {
  render(<DailyNews />);
  await screen.findByText("story saved");
  fireEvent.click(screen.getByText("radar"));
  await screen.findByText("story fresh");
  expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/daily-news", expect.any(Object));
  expect(m.write).toHaveBeenCalledWith("kv", expect.objectContaining({ key: "news:lastBatch:reader:en", cards: [card("fresh")] }));
});
it("yesterday's batch is refreshed on opening", async () => {
  m.read.mockResolvedValue({ cards: [card("old")], language: "en", day: "2000-01-01" });
  render(<DailyNews />);
  await screen.findByText("story fresh");
  expect(fetch).toHaveBeenCalledTimes(1);
});
