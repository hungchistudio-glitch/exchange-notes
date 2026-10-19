import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanSense, cleanText, lookupFromRpc, newHelloId, posterPublicUrl } from "@/lib/hello/server";
import { isHelloId } from "@/lib/hello/url";

/* =========================================================
   What a hello stores and shows, on the server

   Whatever is stored is shown to anyone with the link under the sharer's
   name, so a side is a short word or gloss — never a link, a "www." or an
   address. What the database returns is re-checked rather than trusted,
   and a hello that is off says nothing more than that.
   ========================================================= */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cleaning a side's text", () => {
  it("keeps a word or short gloss, tidied", () => {
    expect(cleanText("  library  ")).toBe("library");
    expect(cleanText("make   yourself\nat home")).toBe("make yourself at home");
    expect(cleanText("圖書館")).toBe("圖書館");
    expect(cleanText("étoile")).toBe("étoile");
  });

  it("refuses links, addresses, nothing, and anything long", () => {
    expect(cleanText("see https://example.com")).toBeNull();
    expect(cleanText("http://x.y")).toBeNull();
    expect(cleanText("www.example.com")).toBeNull();
    expect(cleanText("write me at someone@example.com")).toBeNull();
    expect(cleanText("   ")).toBeNull();
    expect(cleanText("x".repeat(81))).toBeNull();
    expect(cleanText(42)).toBeNull();
  });

  it("keeps the five languages only, and drops a side that does not clean", () => {
    const sense = cleanSense({
      en: { text: "library", partOfSpeech: "Noun", phonetic: { ipa: "/ˈlaɪˌbrɛri/" } },
      fr: { text: "visit www.example.com" },
      de: { text: "Bibliothek" },
      it: { text: "biblioteca", partOfSpeech: "something-else" },
    });
    expect(Object.keys(sense).sort()).toEqual(["en", "it"]);
    expect(sense.en).toEqual({ text: "library", partOfSpeech: "noun", phonetic: { ipa: "/ˈlaɪˌbrɛri/" } });
    expect(sense.it).toEqual({ text: "biblioteca" });
  });
});

describe("ids and pictures", () => {
  it("makes ids of the public shape", () => {
    for (let index = 0; index < 50; index += 1) expect(isHelloId(newHelloId())).toBe(true);
  });

  it("builds a picture's address only from a path of the exact shape", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co/");
    expect(posterPublicUrl("AbCdEfGhIjKl/0123456789abcdef.png")).toBe(
      "https://project.supabase.co/storage/v1/object/public/yumi-hellos/AbCdEfGhIjKl/0123456789abcdef.png",
    );
    expect(posterPublicUrl("../secret/0123456789abcdef.png")).toBeNull();
    expect(posterPublicUrl("AbCdEfGhIjKl/0123456789abcdef.jpg")).toBeNull();
    expect(posterPublicUrl("AbCdEfGhIjKl/x.png")).toBeNull();
    expect(posterPublicUrl(null)).toBeNull();
  });
});

const ROW = {
  status: "active",
  hello: {
    id: "AbCdEfGhIjKl",
    createdAt: "2026-10-19T09:00:00.000Z",
    sender: { name: "  Chi ", exchangeId: "chi" },
    yumi: { outfit: { material: "jade" }, mode: "yumi-cosmic", posterPath: "AbCdEfGhIjKl/0123456789abcdef.png" },
    pair: ["en", "zh-TW"],
    source: "en",
    sense: { en: { text: "library" }, "zh-TW": { text: "圖書館" } },
  },
};

describe("reading a hello back", () => {
  it("returns the public snapshot, re-checked", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    const lookup = lookupFromRpc(ROW);
    expect(lookup.status).toBe("active");
    if (lookup.status !== "active") return;
    expect(lookup.hello.sender).toEqual({ name: "Chi", exchangeId: "chi" });
    expect(lookup.hello.pair).toEqual(["en", "zh-TW"]);
    expect(lookup.hello.yumi).toMatchObject({ mode: "yumi-cosmic", complete: true, outfit: { material: "jade" } });
    expect(lookup.hello.yumi.posterUrl).toContain("/yumi-hellos/AbCdEfGhIjKl/");
    expect(Object.keys(lookup.hello)).not.toContain("owner");
  });

  it("says a hello is off, and nothing else about it", () => {
    expect(lookupFromRpc({ status: "revoked", hello: ROW.hello })).toEqual({ status: "revoked" });
  });

  it("treats anything malformed as missing", () => {
    expect(lookupFromRpc(null)).toEqual({ status: "missing" });
    expect(lookupFromRpc({ status: "active", hello: { ...ROW.hello, id: "../../x" } })).toEqual({ status: "missing" });
    expect(lookupFromRpc({ status: "active", hello: { ...ROW.hello, pair: ["en", "en"] } })).toEqual({ status: "missing" });
    expect(lookupFromRpc({ status: "active", hello: { ...ROW.hello, sender: { name: "x" } } })).toEqual({ status: "missing" });
  });

  it("marks a hello whose outfit the shop no longer fully knows, so the page shows its picture instead", () => {
    const lookup = lookupFromRpc({
      ...ROW,
      hello: { ...ROW.hello, yumi: { ...ROW.hello.yumi, outfit: { material: "jade", head: "a-retired-hat" } } },
    });
    expect(lookup.status === "active" && lookup.hello.yumi.complete).toBe(false);
    expect(lookup.status === "active" && lookup.hello.yumi.outfit).toEqual({ material: "jade" });
  });
});
