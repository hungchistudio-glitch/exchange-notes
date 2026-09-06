import { NextResponse } from "next/server";

/*
 * TEMPORARY. Removed in the commit after the one that added it.
 *
 * The client bundle cannot answer "is this variable configured?" — the value
 * is substituted in while the module compiles, so an absent value and a
 * cached build that never recompiled produce identical output. On the server
 * this is an ordinary runtime read of the Lambda's environment, which is the
 * thing actually in question.
 *
 * Reports presence and shape only. The client id is public by design, but
 * there is no reason for an endpoint to hand it out.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return NextResponse.json({
    present: typeof raw === "string" && raw.length > 0,
    length: raw?.length ?? 0,
    trimmedLength: raw?.trim().length ?? 0,
    looksLikeGoogleClientId: raw?.trim().endsWith(".apps.googleusercontent.com") ?? false,
    tail: raw ? `…${raw.trim().slice(-14)}` : null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    /* Which NEXT_PUBLIC_ names exist at all, to catch a typo in the key. */
    publicKeys: Object.keys(process.env).filter((k) => k.startsWith("NEXT_PUBLIC_")).sort(),
  });
}
