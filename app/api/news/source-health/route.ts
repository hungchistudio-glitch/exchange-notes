import { NextResponse } from "next/server";

import { checkGuardianKey } from "@/lib/news/guardianKey";
import { createClient } from "@/lib/supabase/server";

/* =========================================================
   Whether the news is reading the Guardian's API or only its feeds

   For one line in Settings, shown to the app's owner and nobody else (Chi,
   2026-11-15): when the Guardian refuses the key, the daily news quietly
   reads the Guardian's public feeds instead (lib/dailyNews.ts), and this is
   how the owner learns a new free key is wanted.

   Who the owner is comes from NEWS_OWNER_USER_ID, a Supabase user id set in
   the project's environment. Without it nobody is the owner, so nobody is
   shown anything: the guard fails closed. Anyone else is told only that they
   are not the owner, never the key's state.
   ========================================================= */

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const owner = process.env.NEWS_OWNER_USER_ID?.trim();
  if (!owner || owner !== user.id) {
    return NextResponse.json({ owner: false }, { headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(
    { owner: true, guardian: await checkGuardianKey() },
    { headers: NO_STORE_HEADERS },
  );
}
