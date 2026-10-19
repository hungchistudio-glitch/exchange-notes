import { describe, expect, it } from "vitest";

import { APP_ORIGIN } from "@/lib/auth/canonicalOrigin";
import { exchangeIdFromInviteUrl } from "@/lib/friends";
import { helloIdFromUrl, helloJoinPath, helloPath, helloShareUrl, isHelloId } from "@/lib/hello/url";

/* =========================================================
   Where a hello lives, and what a scanned code opens

   Every build shares the live site's one real domain (Chi: a long
   deployment address reads like a scam), under a path that says what it
   is; one made off the live site is marked, so the screen can say why it
   may not open yet. A scanned code opens a hello only for the exact
   /a-word-to-invite-you/<id> shape, or the first /hello/<id> one — and a
   hello code is never read as a friend code, so scanning one cannot send
   a request.
   ========================================================= */

const ID = "AbCd_EfGh-12";

describe("hello links", () => {
  it("always use the live domain, and say when they were made anywhere else", () => {
    const live = `https://exchange-notes-app.vercel.app/a-word-to-invite-you/${ID}`;
    expect(helloShareUrl(ID, APP_ORIGIN)).toEqual({ url: live, test: false });
    expect(helloShareUrl(ID, `${APP_ORIGIN}/`)).toEqual({ url: live, test: false });
    expect(helloShareUrl(ID, "http://localhost:3000")).toEqual({ url: live, test: true });
    expect(helloShareUrl(ID, "https://exchange-notes-od071uet2-hungchistudio-7883s-projects.vercel.app")).toEqual({
      url: live,
      test: true,
    });
  });

  it("have ids of exactly twelve url-safe characters", () => {
    expect(isHelloId(ID)).toBe(true);
    expect(isHelloId("short")).toBe(false);
    expect(isHelloId("AbCdEfGhIjK/")).toBe(false);
    expect(isHelloId("AbCdEfGhIjKlM")).toBe(false);
    expect(isHelloId(null)).toBe(false);
    expect(helloPath(ID)).toBe(`/a-word-to-invite-you/${ID}`);
    expect(helloJoinPath(ID)).toBe(`/a-word-to-invite-you/${ID}/join`);
  });
});

describe("a scanned code", () => {
  it("opens a hello for its path, the first /hello/ one too, on any build", () => {
    expect(helloIdFromUrl(`${APP_ORIGIN}/a-word-to-invite-you/${ID}`)).toBe(ID);
    expect(helloIdFromUrl(`${APP_ORIGIN}/hello/${ID}`)).toBe(ID);
    expect(helloIdFromUrl(`${APP_ORIGIN}/hello/${ID}/`)).toBe(ID);
    expect(helloIdFromUrl(` http://localhost:3000/hello/${ID} `)).toBe(ID);
  });

  it("is not ours for anything else", () => {
    expect(helloIdFromUrl(`${APP_ORIGIN}/hello/${ID}/join`)).toBe("");
    expect(helloIdFromUrl(`${APP_ORIGIN}/a-word-to-invite-you/${ID}/join`)).toBe("");
    expect(helloIdFromUrl(`${APP_ORIGIN}/a-word/${ID}`)).toBe("");
    expect(helloIdFromUrl(`${APP_ORIGIN}/hello/short`)).toBe("");
    expect(helloIdFromUrl(`${APP_ORIGIN}/invite/someone`)).toBe("");
    expect(helloIdFromUrl(`javascript:alert(1)//hello/${ID}`)).toBe("");
    expect(helloIdFromUrl(`ftp://example.com/hello/${ID}`)).toBe("");
    expect(helloIdFromUrl("not a url")).toBe("");
  });

  it("from a hello is never read as a friend code", () => {
    expect(exchangeIdFromInviteUrl(`${APP_ORIGIN}/hello/${ID}`)).toBe("");
    expect(exchangeIdFromInviteUrl(`${APP_ORIGIN}/a-word-to-invite-you/${ID}`)).toBe("");
  });
});
