import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GUARDIAN_FEEDS, NEWS_SLOTS, type NewsArticle } from "@/lib/news/sources";

const mocks = vi.hoisted(() => ({ rss: vi.fn() }));
vi.mock("@/lib/news/rss", async (original) => ({
  ...(await original<typeof import("@/lib/news/rss")>()),
  fetchRssArticles: mocks.rss,
}));
import { selectTodaysArticles } from "@/lib/dailyNews";
import { checkGuardianKey } from "@/lib/news/guardianKey";
import { parseRssArticles } from "@/lib/news/rss";

/* =========================================================
   When the Guardian will not take the key (Chi, 2026-11-15)

   The Guardian deleted the app's API key at ninety days. Seven of the
   twelve slots read its API, and World, Science, Environment and Taiwan read
   nothing else, so every one would have come back empty. Chi chose: keep a
   free key for the longer excerpts, read the Guardian's public feeds
   whenever the API refuses it, and tell the owner in Settings.
   ========================================================= */

const story = (url: string, title = "A story", category = "World"): NewsArticle => ({
  category, sourceName: "The Guardian", title, url,
  publishedAt: "2026-11-14T10:00:00Z", excerpt: "x".repeat(300), imageUrl: null,
});

beforeEach(() => {
  mocks.rss.mockReset();
  mocks.rss.mockImplementation(async (source: { url: string }, category: string) => [
    story(`${source.url}#feed`, "Taiwan holds a drill", category),
  ]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const guardianSlots = NEWS_SLOTS.filter((slot) => !slot.rss);

describe("a refused key", () => {
  it("leaves no Guardian slot empty: each reads its own public feed", async () => {
    vi.stubEnv("GUARDIAN_API_KEY", "deleted-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"message":"Unauthorized"}', { status: 401 })));

    const chosen = await selectTodaysArticles(() => false);
    const fromFeeds = chosen.filter((article) => article.url.includes("theguardian.com"));

    expect(guardianSlots).toHaveLength(7);
    expect(guardianSlots.every((slot) => slot.rssFallback)).toBe(true);
    expect(fromFeeds.map((article) => article.category).sort()).toEqual(
      ["Art", "Environment", "Fashion", "Science", "Taiwan", "Technology", "World"],
    );
  });

  it("reads the feeds with no key at all", async () => {
    vi.stubEnv("GUARDIAN_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const chosen = await selectTodaysArticles(() => false);
    expect(fetch).not.toHaveBeenCalled();
    expect(chosen.some((article) => article.category === "World")).toBe(true);
  });

  it("keeps the Taiwan rule on the feed: a headline that does not name it is left out", async () => {
    vi.stubEnv("GUARDIAN_API_KEY", "");
    mocks.rss.mockImplementation(async (source: { url: string }) =>
      source.url === GUARDIAN_FEEDS.taiwan.url ? [story(`${source.url}#a`, "Markets fall in Asia")] : [],
    );
    const chosen = await selectTodaysArticles(() => false);
    expect(chosen.some((article) => article.category === "Taiwan")).toBe(false);
  });
});

describe("a key the Guardian takes", () => {
  it("still reads the API first, for its longer excerpts, and no feed", async () => {
    vi.stubEnv("GUARDIAN_API_KEY", "good-key");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      response: {
        results: [{
          type: "article",
          webTitle: "Taiwan votes",
          webUrl: "https://www.theguardian.com/world/2026/nov/14/api",
          webPublicationDate: "2026-11-14T10:00:00Z",
          fields: { trailText: "Trail", bodyText: "Body ".repeat(120) },
        }],
      },
    })));
    mocks.rss.mockResolvedValue([]);

    await selectTodaysArticles(() => false);
    const feedsRead = mocks.rss.mock.calls.map(([source]) => (source as { url: string }).url);
    expect(feedsRead.some((url) => url.includes("theguardian.com"))).toBe(false);
  });
});

describe("Settings' line for the owner", () => {
  it("tells a refused key from a missing one and from a working one", async () => {
    vi.stubEnv("GUARDIAN_API_KEY", "");
    expect(await checkGuardianKey()).toBe("missing");

    vi.stubEnv("GUARDIAN_API_KEY", "key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    expect(await checkGuardianKey()).toBe("refused");

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ response: { results: [] } })));
    expect(await checkGuardianKey()).toBe("ok");
  });
});

describe("a Guardian feed item", () => {
  it("is drawn from its widest image, without the feed's own 'Continue reading' link", () => {
    const xml = `<?xml version="1.0"?><rss xmlns:media="http://search.yahoo.com/mrss/"><channel><item>
      <title>Rain returns to the valley</title>
      <link>https://www.theguardian.com/world/2026/nov/14/rain</link>
      <pubDate>Sat, 14 Nov 2026 10:00:00 GMT</pubDate>
      <description>&lt;p&gt;${"Farmers are glad. ".repeat(20)}&lt;/p&gt; &lt;a href="https://www.theguardian.com/world/2026/nov/14/rain"&gt;Continue reading...&lt;/a&gt;</description>
      <media:content width="140" url="https://i.guim.co.uk/img/small.jpg"/>
      <media:content width="460" url="https://i.guim.co.uk/img/large.jpg"/>
    </item></channel></rss>`;
    const [item] = parseRssArticles(xml, GUARDIAN_FEEDS.world, "World", Date.parse("2026-11-15T00:00:00Z"));
    expect(item.imageUrl).toBe("https://i.guim.co.uk/img/large.jpg");
    expect(item.excerpt.endsWith("Farmers are glad.")).toBe(true);
    expect(item.sourceName).toBe("The Guardian");
  });

  it("leaves out the Guardian's shopping roundups", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item>
      <title>The 14 best men's boots for winter</title>
      <link>https://www.theguardian.com/thefilter/2026/nov/15/best-mens-boots-winter-uk</link>
      <pubDate>Sat, 14 Nov 2026 10:00:00 GMT</pubDate>
      <description>${"Boots. ".repeat(60)}</description>
    </item></channel></rss>`;
    expect(parseRssArticles(xml, GUARDIAN_FEEDS.fashion, "Fashion", Date.parse("2026-11-15T00:00:00Z"))).toEqual([]);
  });
});

describe("the owner's line in Settings", () => {
  it("answers anyone but the owner with nothing about the key, and fails closed with no owner set", async () => {
    const getUser = vi.fn();
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
    const { GET } = await import("@/app/api/news/source-health/route");

    getUser.mockResolvedValue({ data: { user: { id: "someone" } } });
    vi.stubEnv("NEWS_OWNER_USER_ID", "");
    expect(await (await GET()).json()).toEqual({ owner: false });

    vi.stubEnv("NEWS_OWNER_USER_ID", "owner");
    expect(await (await GET()).json()).toEqual({ owner: false });

    getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
    vi.stubEnv("GUARDIAN_API_KEY", "key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    expect(await (await GET()).json()).toEqual({ owner: true, guardian: "refused" });

    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET()).status).toBe(401);
    vi.doUnmock("@/lib/supabase/server");
  });
});
