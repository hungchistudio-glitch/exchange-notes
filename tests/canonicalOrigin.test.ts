import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { canonicalPageUrl } from "@/lib/auth/canonicalOrigin";

vi.mock("@/lib/supabase/proxy", () => ({ updateSession: vi.fn() }));
import { updateSession } from "@/lib/supabase/proxy";
import { proxy } from "@/proxy";

const aliases = [
  "v0-language-exchange-app-bychi.vercel.app",
  "exchange-notes-app-hungchistudio-7883s-projects.vercel.app",
  "exchange-notes-app-git-main-hungchistudio-7883s-projects.vercel.app",
];

describe("one public app origin", () => {
  it.each(aliases)("moves page visits from %s while retaining path and query", (host) => {
    const url = new URL(`https://${host}/invite?exchangeId=ABC123&next=%2Fhome`);
    expect(canonicalPageUrl(url, "GET")?.href).toBe(
      "https://exchange-notes-app.vercel.app/invite?exchangeId=ABC123&next=%2Fhome",
    );
    expect(canonicalPageUrl(url, "HEAD")?.hostname).toBe("exchange-notes-app.vercel.app");
    expect(url.hostname).toBe(host);
  });

  it.each(["exchange-notes-app.vercel.app", "localhost:3000", "127.0.0.1:3045", "exchange-notes-preview.vercel.app", "unrelated.example"])(
    "does not redirect the canonical host, development, previews or unknown hosts: %s", (host) => {
      expect(canonicalPageUrl(new URL(`https://${host}/login`), "GET")).toBeNull();
    },
  );

  it.each(["/auth/callback?code=example", "/api/review", "/_next/static/app.js", "/sw.js", "/manifest.webmanifest", "/shop-thumbs/item.webp"])(
    "keeps callbacks and non-page requests on their original host: %s", (path) => {
      expect(canonicalPageUrl(new URL(`https://${aliases[0]}${path}`), "GET")).toBeNull();
    },
  );

  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])("does not forward %s requests", (method) => {
    expect(canonicalPageUrl(new URL(`https://${aliases[0]}/home`), method)).toBeNull();
  });

  it("redirects before refreshing a session on the old origin", async () => {
    vi.mocked(updateSession).mockClear();
    const response = await proxy(new NextRequest(`https://${aliases[0]}/shop?mode=cosmic`));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://exchange-notes-app.vercel.app/shop?mode=cosmic");
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("preserves session handling on the canonical origin", async () => {
    vi.mocked(updateSession).mockClear();
    const request = new NextRequest("https://exchange-notes-app.vercel.app/home");
    await proxy(request);
    expect(updateSession).toHaveBeenCalledWith(request);
  });
});
