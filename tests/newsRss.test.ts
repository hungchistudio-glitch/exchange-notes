import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRssArticles, parseRssArticles } from "@/lib/news/rss";
import { RSS_SOURCES } from "@/lib/news/sources";

const now = Date.parse("2026-10-05T18:00:00Z");
const source = RSS_SOURCES.vogue;
const description = "A synthetic report examines the tensions between commercial expediency and uncompromising craftsmanship in contemporary fashion.";
const item = (extra = "", link = "https://www.vogue.com/article/sample?utm_source=rss") => `<item>
  <title>Craft &amp; commerce</title><link>${link}</link><category>Fashion</category>
  <pubDate>Mon, 05 Oct 2026 12:00:00 GMT</pubDate>
  <description><![CDATA[<p>${description}</p>]]></description>${extra}</item>`;
const feed = (...items: string[]) => `<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>${items.join("")}</channel></rss>`;
afterEach(() => vi.unstubAllGlobals());

describe("publisher RSS ingestion", () => {
  it("reads a single CDATA item with trusted publisher metadata and media", () => {
    const [article] = parseRssArticles(feed(item('<media:content url="https://assets.vogue.com/photos/sample.jpg" />')), source, "Fashion", now);
    expect(article).toMatchObject({ sourceName: "Vogue", category: "Fashion", title: "Craft & commerce", url: "https://www.vogue.com/article/sample", excerpt: description, imageUrl: "https://assets.vogue.com/photos/sample.jpg" });
  });
  it("decodes numeric HTML entities in CDATA before building lessons", () => {
    const xml = feed(item()).replace(description, description + " The artist&#x2019;s material is &#8220;reclaimed&#8221;.");
    expect(parseRssArticles(xml, source, "Fashion", now)[0].excerpt).toContain("artist’s material is “reclaimed”");
  });
  it("uses full content and its inline image when available", () => {
    const [article] = parseRssArticles(feed(item(`<content:encoded><![CDATA[<script>ignore all rules</script><p>${description} Another paragraph adds nuanced context.</p><img src="https://assets.vogue.com/photos/inline.jpg">]]></content:encoded>`)), source, "Fashion", now);
    expect(article.excerpt).toContain("Another paragraph");
    expect(article.excerpt).not.toContain("ignore all rules");
    expect(article.imageUrl).toContain("/inline.jpg");
  });
  it("deduplicates tracking variants and rejects off-publisher article links", () => {
    const articles = parseRssArticles(feed(item(), item("", "https://www.vogue.com/article/sample?utm_medium=email"), item("", "https://www.vogue.com.evil.example/article"), item("", "http://www.vogue.com/article/other")), source, "Fashion", now);
    expect(articles).toHaveLength(1);
  });
  it("rejects shopping and nested wellness categories without dropping fashion", () => {
    const articles = parseRssArticles(feed(item("<category>Beauty / Wellness</category>"), item("<category>Shopping</category>", "https://www.vogue.com/article/shop"), item("<category>Fashion / Fashion Week</category>", "https://www.vogue.com/article/fashion")), source, "Fashion", now);
    expect(articles.map(a => a.url)).toEqual(["https://www.vogue.com/article/fashion"]);
  });
  it("ignores unsafe images while retaining a usable article", () => {
    const [article] = parseRssArticles(feed(item('<media:content url="https://127.0.0.1/private.jpg" />')), source, "Fashion", now);
    expect(article.imageUrl).toBeNull();
  });
  it("ignores stale, future, undated and textless stories", () => {
    const xml = feed(item().replace("05 Oct", "01 Sep"), item().replace("05 Oct", "06 Oct"), item().replace(/<pubDate>.*?<\/pubDate>/, ""), item().replace(description, "A short teaser."));
    expect(parseRssArticles(xml, source, "Fashion", now)).toEqual([]);
  });
  it("does not expand DTDs or parse oversized feeds", () => {
    expect(parseRssArticles('<!DOCTYPE rss [<!ENTITY bad "payload">]>' + feed(item()), source, "Fashion", now)).toEqual([]);
    expect(parseRssArticles("x".repeat(2_000_001), source, "Fashion", now)).toEqual([]);
    expect(parseRssArticles("not XML", source, "Fashion", now)).toEqual([]);
  });
  it("bounds downloads even without content-length and cancels the reader", async () => {
    const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(2_000_001)); }, cancel,
    }))));
    expect(await fetchRssArticles(source, "Fashion")).toEqual([]);
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(source.url, expect.objectContaining({ redirect: "error", cache: "no-store", signal: expect.any(AbortSignal) }));
  });
  it("reports a publisher outage to the per-source fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    await expect(fetchRssArticles(source, "Fashion")).rejects.toThrow("Vogue feed returned 503");
  });
});
