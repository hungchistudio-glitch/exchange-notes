import { describe, expect, it } from "vitest";

import { cleanHelloText, cleanSenderName, helloTextProblem } from "@/lib/hello/text";

/* =========================================================
   What a hello may say under the app's own domain

   A hello is a public page on exchange-notes-app.vercel.app with a name
   and two words on it (Chi's review, 2026-10-19). A word is a word or a
   short phrase — never a phone number, an account, a "LINE ID:" or an
   "@handle" — and a nickname follows the same rules or is not shown, the
   hello falling back to the sender's Exchange ID.
   ========================================================= */

describe("a side's text", () => {
  it("keeps words and short phrases in the five languages", () => {
    for (const word of ["library", "圖書館", "faites comme chez vous", "estrella", "2024", "COVID-19", "7 days"]) {
      expect(cleanHelloText(word)).toBe(word);
    }
  });

  it("keeps ordinary words that happen to name an app", () => {
    for (const word of ["line", "online", "deadline", "telegram", "signal", "messenger"]) {
      expect(cleanHelloText(word)).toBe(word);
    }
  });

  it("refuses phone and account numbers, however they are written", () => {
    for (const text of ["0912345678", "0912-345-678", "+886 912 345", "(02) 2345 6789", "０９１２３４５６７８", "acct 12345"]) {
      expect(cleanHelloText(text)).toBeNull();
      expect(helloTextProblem(text)).toBe("digits");
    }
  });

  it("refuses ways to be contacted somewhere else", () => {
    for (const text of ["@scammer", "find me @hello_world", "LINE ID: abc", "line:abc", "WeChat ID abc", "IG: abc", "加我好友", "加賴", "私訊我", "聯絡我"]) {
      expect(cleanHelloText(text)).toBeNull();
    }
    expect(helloTextProblem("@scammer")).toBe("contact");
  });

  it("refuses links and addresses", () => {
    for (const text of ["https://example.com", "www.example.com", "me@example.com"]) {
      expect(helloTextProblem(text)).toBe("link");
      expect(cleanHelloText(text)).toBeNull();
    }
  });

  it("is at most 40 characters, counted as characters", () => {
    expect(cleanHelloText("x".repeat(40))).toBe("x".repeat(40));
    expect(cleanHelloText("x".repeat(41))).toBeNull();
    expect(cleanHelloText("圖".repeat(40))).toBe("圖".repeat(40));
  });
});

describe("a sender's nickname", () => {
  it("is tidied and shown", () => {
    expect(cleanSenderName("  Hung-Chi  ")).toBe("Hung-Chi");
    expect(cleanSenderName("小明")).toBe("小明");
  });

  it("is cut to 24 characters", () => {
    expect(cleanSenderName("A".repeat(30))).toBe(`${"A".repeat(24)}…`);
  });

  it("is not shown when it carries a link, a number or a contact line", () => {
    for (const name of ["Support 0912345678", "www.example.com", "LINE ID: help", "@exchange_notes", ""]) {
      expect(cleanSenderName(name)).toBeNull();
    }
    expect(cleanSenderName(null)).toBeNull();
  });
});
