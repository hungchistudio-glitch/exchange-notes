import { afterEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   A guard that fails closed

   The first version of this asked `VERCEL_ENV !== "production"`. It reads
   correctly, it typechecked, it shipped — and all six review screens went
   on answering 200 on the live site, because that variable does not reach
   the runtime unless a project setting exposes it, and an absent variable
   is not equal to "production".

   That is the case these tests exist for. Every one of them describes an
   environment by what is *present*, including the one where nothing is, and
   the rule is that only development and preview are let in.
   ========================================================= */

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);

vi.mock("next/navigation", () => ({ notFound }));

const { reviewRouteOnly } = await import("@/lib/reviewRoutes");

/** Replaces the environment for one case; restored after each. */
function environment(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) vi.stubEnv(key, "");
    else vi.stubEnv(key, value);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  notFound.mockClear();
});

describe("who may see a review screen", () => {
  it("lets a development machine in", () => {
    environment({ NODE_ENV: "development", VERCEL_ENV: undefined });

    expect(() => reviewRouteOnly()).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("lets a preview deployment in", () => {
    // How a review screen gets opened on a phone against a branch.
    environment({ NODE_ENV: "production", VERCEL_ENV: "preview" });

    expect(() => reviewRouteOnly()).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("shuts the live site out", () => {
    environment({ NODE_ENV: "production", VERCEL_ENV: "production" });

    expect(() => reviewRouteOnly()).toThrow("NEXT_NOT_FOUND");
  });

  it("shuts out a production build with no VERCEL_ENV at all", () => {
    /*
     * The case that actually shipped broken. `VERCEL_ENV !== "production"`
     * is true when the variable is absent, so the old guard let this
     * through — and this is exactly what the live site looked like.
     */
    environment({ NODE_ENV: "production", VERCEL_ENV: undefined });

    expect(() => reviewRouteOnly()).toThrow("NEXT_NOT_FOUND");
  });

  it("shuts out anything it does not recognise", () => {
    // Fails closed on a value nobody anticipated, rather than open.
    environment({ NODE_ENV: "production", VERCEL_ENV: "staging" });

    expect(() => reviewRouteOnly()).toThrow("NEXT_NOT_FOUND");
  });

  it("shuts out a test run", () => {
    // Not development, not preview. The rule has no third exception.
    environment({ NODE_ENV: "test", VERCEL_ENV: undefined });

    expect(() => reviewRouteOnly()).toThrow("NEXT_NOT_FOUND");
  });
});
