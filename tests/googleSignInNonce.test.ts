import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createSignInNonce } from "@/lib/auth/googleIdentity";

/* =========================================================
   The nonce Google signs has to be the one Supabase recomputes

   Google copies the hashed nonce into the token's `nonce` claim without
   looking at it, so nothing on the way out can tell a correct encoding from
   a wrong one. The only thing that ever compares them is Supabase, which
   does `fmt.Sprintf("%x", sha256.Sum256(rawNonce))` — lowercase hex — and
   answers a mismatch with `invalid nonce: Nonces mismatch`, server-side,
   where the browser never sees it. The symptom in the app is the generic
   "could not log in", identical to every other failure.

   This shipped as base64url of the right digest and blocked every branded
   sign-in there had ever been. The expected value below is computed with
   node:crypto rather than the app's own helper, so a test cannot agree with
   the code by repeating its mistake.
   ========================================================= */

describe("createSignInNonce", () => {
  it("hashes with SHA-256 and encodes as lowercase hex", async () => {
    const { raw, hashed } = await createSignInNonce();

    expect(hashed).toBe(createHash("sha256").update(raw).digest("hex"));
  });

  it("produces the 64 lowercase hex characters Supabase compares against", async () => {
    const { hashed } = await createSignInNonce();

    /* Base64url of the same digest is 43 chars and can carry - _ A-Z. */
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never repeats a raw nonce across attempts", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 32 }, () => createSignInNonce()),
    );

    expect(new Set(attempts.map((a) => a.raw)).size).toBe(attempts.length);
  });
});
