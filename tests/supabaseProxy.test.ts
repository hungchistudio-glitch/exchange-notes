import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CookieAdapter = {
  setAll: (
    values: Array<{
      name: string;
      value: string;
      options: Record<string, unknown>;
    }>,
    headers: Record<string, string>,
  ) => void;
};

const state = vi.hoisted(() => ({
  adapter: null as CookieAdapter | null,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(
    (_url: string, _key: string, options: { cookies: CookieAdapter }) => {
      state.adapter = options.cookies;

      return {
        auth: {
          getClaims: async () => {
            options.cookies.setAll(
              [
                {
                  name: "sb-session",
                  value: "rotated",
                  options: { httpOnly: true, path: "/" },
                },
              ],
              {
                "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
                Expires: "0",
                Pragma: "no-cache",
              },
            );
          },
        },
      };
    },
  ),
}));

import { updateSession } from "@/lib/supabase/proxy";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";
  state.adapter = null;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});

describe("Supabase proxy session refresh", () => {
  it("updates this request, the browser cookie, and anti-cache headers together", async () => {
    const request = new NextRequest("https://exchange.test/home");
    const response = await updateSession(request);

    expect(request.cookies.get("sb-session")?.value).toBe("rotated");
    expect(response.cookies.get("sb-session")?.value).toBe("rotated");
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});
