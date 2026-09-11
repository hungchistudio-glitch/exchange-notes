import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

type CookieWrite = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

type CookieAdapter = {
  setAll: (
    values: CookieWrite[],
    headers?: Record<string, string>,
  ) => void;
};

const state = vi.hoisted(() => ({
  adapter: null as CookieAdapter | null,
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(
    (_url: string, _key: string, options: { cookies: CookieAdapter }) => {
      state.adapter = options.cookies;
      return { kind: "server-client" };
    },
  ),
}));

import { createClient } from "@/lib/supabase/server";

beforeEach(() => {
  state.adapter = null;
});

describe("Supabase server cookie adapter", () => {
  it("persists rotated cookies from a Route Handler", async () => {
    const set = vi.fn();
    vi.mocked(cookies).mockResolvedValue({ getAll: () => [], set } as never);

    await createClient();
    state.adapter?.setAll([
      {
        name: "sb-session",
        value: "rotated",
        options: { httpOnly: true, sameSite: "lax" },
      },
    ]);

    expect(set).toHaveBeenCalledWith("sb-session", "rotated", {
      httpOnly: true,
      sameSite: "lax",
    });
  });

  it("remains usable in a read-only Server Component cookie context", async () => {
    vi.mocked(cookies).mockResolvedValue({
      getAll: () => [],
      set: () => {
        throw new Error("Cookies can only be modified in a Server Action");
      },
    } as never);

    await createClient();

    expect(() =>
      state.adapter?.setAll([
        { name: "sb-session", value: "rotated", options: {} },
      ]),
    ).not.toThrow();
  });
});
