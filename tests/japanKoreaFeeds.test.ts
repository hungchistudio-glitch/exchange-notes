import { describe, expect, it } from "vitest";

import { parseRssArticles } from "@/lib/news/rss";
import { RSS_SOURCES } from "@/lib/news/sources";

/* =========================================================
   Japan and Korea, from their own papers in English (2026-11-16)

   Shapes copied from the live feeds on 2026-11-20: The Japan Times files
   each item under one upper-case section and carries a sentence or two;
   The Korea Herald files everything under "All News" with a longer excerpt.
   ========================================================= */

const now = Date.parse("2026-11-20T12:00:00Z");
const long = "A story about the economy and the people it touches, told plainly. ".repeat(3);

const feed = (items: string) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>t</title>${items}</channel></rss>`;

describe("The Japan Times", () => {
  const item = (section: string, path: string) => `<item>
    <title>A headline from ${section}</title>
    <link>https://www.japantimes.co.jp/${path}</link>
    <pubDate>Fri, 20 Nov 2026 19:53:00 +0900</pubDate>
    <category>${section}</category>
    <description><![CDATA[${long}]]></description>
    <media:content url="https://www.japantimes.co.jp/japantimes/uploads/images/2026/11/20/thumbs/400x400/575265.jpg" />
  </item>`;

  it("keeps Japan, business and culture, and leaves out commentary and sport", () => {
    const articles = parseRssArticles(
      feed(item("JAPAN", "news/2026/11/20/japan/a/") + item("COMMENTARY", "opinion/2026/11/20/b/") + item("SOCCER", "sports/2026/11/20/c/") + item("BUSINESS", "business/2026/11/20/d/")),
      RSS_SOURCES.japanTimes,
      "Japan",
      now,
    );
    expect(articles.map((article) => article.title)).toEqual(["A headline from JAPAN", "A headline from BUSINESS"]);
    expect(articles[0]).toMatchObject({ category: "Japan", sourceName: "The Japan Times" });
    expect(articles[0].imageUrl).toContain("www.japantimes.co.jp");
  });
});

describe("The Korea Herald", () => {
  it("reads its items with their pictures", () => {
    const articles = parseRssArticles(
      feed(`<item>
        <title>Seoul and Tokyo agree on something</title>
        <link>https://www.koreaherald.com/article/10944489</link>
        <pubDate>Fri, 20 Nov 2026 18:00:00 +0900</pubDate>
        <category>All News</category>
        <description><![CDATA[${long}]]></description>
        <media:content url="https://wimg.heraldcorp.com/news/cms/2026/11/20/photo_T1.jpg" />
      </item>`),
      RSS_SOURCES.koreaHerald,
      "Korea",
      now,
    );
    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({ category: "Korea", sourceName: "The Korea Herald", url: "https://www.koreaherald.com/article/10944489" });
    expect(articles[0].imageUrl).toBe("https://wimg.heraldcorp.com/news/cms/2026/11/20/photo_T1.jpg");
  });
});
