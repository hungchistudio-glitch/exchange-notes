import { XMLParser } from "fast-xml-parser";
import type { NewsArticle, RssSource } from "./sources";

const MAX_FEED_BYTES = 2_000_000;
const MAX_AGE_MS = 14 * 86_400_000;
const parser = new XMLParser({
  ignoreAttributes: false, parseTagValue: false, trimValues: true,
  processEntities: true, htmlEntities: true,
});

type Node = Record<string, unknown>;
const object = (value: unknown): Node => value && typeof value === "object" ? value as Node : {};
const list = (value: unknown): unknown[] => value == null ? [] : Array.isArray(value) ? value : [value];
const text = (value: unknown): string => typeof value === "string" ? value : typeof object(value)["#text"] === "string" ? object(value)["#text"] as string : "";

function plain(value: unknown): string {
  return text(value).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ").replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/gi, entity => ({
      "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'",
    })[entity.toLowerCase()] ?? " ")
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, digits: string) => {
      const code = digits[0].toLowerCase() === "x" ? Number.parseInt(digits.slice(1), 16) : Number(digits);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : " ";
    }).replace(/\s+/g, " ").trim();
}

function trustedUrl(value: unknown, hosts: readonly string[]): string | null {
  try {
    const url = new URL(text(value));
    if (url.protocol !== "https:" || url.username || url.password || url.port || !hosts.includes(url.hostname)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}

/** Read only publisher-supplied RSS text; never fetch an article/paywall. */
export function parseRssArticles(xml: string, source: RssSource, category: string, now = Date.now()): NewsArticle[] {
  // No DTD/custom entity expansion from a network document.
  if (Buffer.byteLength(xml) > MAX_FEED_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) return [];
  let parsed: Node;
  try { parsed = object(parser.parse(xml)); } catch { return []; }
  const items = list(object(object(parsed.rss).channel).item);
  const used = new Set<string>();
  return items.flatMap(raw => {
    const item = object(raw);
    const url = trustedUrl(item.link, source.articleHosts);
    const title = plain(item.title).slice(0, 200);
    const published = Date.parse(text(item.pubDate));
    const categories = list(item.category).flatMap(value => plain(value).toLowerCase().split(/\s*\/\s*/));
    if (source.excludeCategories?.some(label => categories.includes(label.toLowerCase()))) return [];
    if (source.includeCategories && !source.includeCategories.some(label => categories.includes(label.toLowerCase()))) return [];
    if (!url || used.has(url) || !title || !Number.isFinite(published) || published > now + 3_600_000 || published < now - MAX_AGE_MS) return [];
    // Ignore recruiting, shopping roundups and paid placements in mixed feeds.
    if (/\b(sponsored|is hiring|job listings?|shop (?:now|the)|best .{0,35} to buy)\b/i.test(title)) return [];
    const content = plain(item["content:encoded"]);
    const description = plain(item.description);
    const excerpt = (content.length > description.length ? content : description).slice(0, 1600);
    if (excerpt.length < (source.minimumExcerptLength ?? 100)) return [];
    const media = [...list(item["media:content"]), ...list(item["media:thumbnail"]), ...list(item.enclosure)];
    const inlineImage = text(item["content:encoded"]).match(/<img\b[^>]*\bsrc=["']([^"']+)/i)?.[1];
    const imageUrl = [...media.map(node => object(node)["@_url"]), inlineImage]
      .map(value => trustedUrl(value, source.imageHosts)).find(Boolean) ?? null;
    used.add(url);
    return [{ category, sourceName: source.name, title, url, publishedAt: new Date(published).toISOString(), excerpt, imageUrl }];
  }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function fetchRssArticles(source: RssSource, category: string): Promise<NewsArticle[]> {
  const response = await fetch(source.url, {
    cache: "no-store", signal: AbortSignal.timeout(6_000),
    headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "ExchangeNotes/1.0 (RSS reader)" },
    redirect: "error",
  });
  if (!response.ok) throw new Error(`${source.name} feed returned ${response.status}`);
  if (!response.body || Number(response.headers.get("content-length")) > MAX_FEED_BYTES) return [];
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_FEED_BYTES) { await reader.cancel(); return []; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return parseRssArticles(Buffer.concat(chunks).toString("utf8"), source, category);
}
