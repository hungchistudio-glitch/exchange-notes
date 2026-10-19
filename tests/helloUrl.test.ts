import { describe, expect, it } from "vitest";

import { APP_ORIGIN } from "@/lib/auth/canonicalOrigin";
import { exchangeIdFromInviteUrl } from "@/lib/friends";
import { helloIdFromUrl, helloPath, helloShareUrl, isHelloId } from "@/lib/hello/url";

/* =========================================================
   Where a hello lives, and what a scanned code opens

   The live site always shares its one real domain; a development machine
   or a preview build shares its own address, marked as a test. A scanned
   code opens a hello only for the exact /hello/<id> shape — and a hello
   code is never read as a friend code, so scanning one cannot send a
   request.
   ========================================================= */

const ID = "AbCd_EfGh-12";

describe("hello links", () => {
  it("use the canonical domain on the live site, and are marked as tests anywhere else", () => {
    expect(helloShareUrl(ID, APP_ORIGIN)).toEqual({ url: `${APP_ORIGIN}/hello/${ID}`, test: false });
    expect(helloShareUrl(ID, `${APP_ORIGIN}/`)).toEqual({ url: `${APP_ORIGIN}/hello/${ID}`, test: false });
    expect(helloShareUrl(ID, "http://localhost:3000")).toEqual({ url: `http://localhost:3000/hello/${ID}`, test: true });
    expect(helloShareUrl(ID, "https://exchange-notes-git-branch.vercel.app").test).toBe(true);
  });

  it("have ids of exactly twelve url-safe characters", () => {
    expect(isHelloId(ID)).toBe(true);
    expect(isHelloId("short")).toBe(false);
    expect(isHelloId("AbCdEfGhIjK/")).toBe(false);
    expect(isHelloId("AbCdEfGhIjKlM")).toBe(false);
    expect(isHelloId(null)).toBe(false);
    expect(helloPath(ID)).toBe(`/hello/${ID}`);
  });
});

describe("a scanned code", () => {
  it("opens a hello for /hello/<id>, on the live site or a test build", () => {
    expect(helloIdFromUrl(`${APP_ORIGIN}/hello/${ID}`)).toBe(ID);
    expect(helloIdFromUrl(`${APP_ORIGIN}/hello/${ID}/`)).toBe(ID);
    expect(helloIdFromUrl(` http://localhost:3000/hello/${ID} `)).toBe(ID);
  });

  it("is not ours for anything else", () => {
    expect(helloIdFromUrl(`${APP_ORIGIN}/hello/${ID}/join`)).toBe("");
    expect(helloIdFromUrl(`${APP_ORIGIN}/hello/short`)).toBe("");
    expect(helloIdFromUrl(`${APP_ORIGIN}/invite/someone`)).toBe("");
    expect(helloIdFromUrl(`javascript:alert(1)//hello/${ID}`)).toBe("");
    expect(helloIdFromUrl(`ftp://example.com/hello/${ID}`)).toBe("");
    expect(helloIdFromUrl("not a url")).toBe("");
  });

  it("from a hello is never read as a friend code", () => {
    expect(exchangeIdFromInviteUrl(`${APP_ORIGIN}/hello/${ID}`)).toBe("");
  });
});
