import { NextResponse } from "next/server";

import {
  cleanLabel,
  issuePocketKey,
  listPocketKeys,
  revokePocketKey,
} from "@/lib/pocket/keys";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/*
 * Yumi Pocket Lookup's share-extension keys, for the signed-in reader only
 * (lib/pocket/keys.ts): POST issues one for this phone, GET lists the ones
 * in force for Settings, DELETE ?id= revokes one. The key itself is in the
 * POST's answer and nowhere else, ever.
 */

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

async function signedInUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "sign-in" }, { status: 401, headers: NO_STORE });

  let label = "iPhone";
  try {
    label = cleanLabel((await request.json())?.label);
  } catch {
    // No body: the default name.
  }

  try {
    const issued = await issuePocketKey(createServiceClient(), user.id, label);
    return NextResponse.json(issued, { headers: NO_STORE });
  } catch (error) {
    console.error("Pocket key could not be issued:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  }
}

export async function GET() {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "sign-in" }, { status: 401, headers: NO_STORE });

  try {
    const keys = await listPocketKeys(createServiceClient(), user.id);
    return NextResponse.json({ keys }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  }
}

export async function DELETE(request: Request) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "sign-in" }, { status: 401, headers: NO_STORE });

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  }

  try {
    await revokePocketKey(createServiceClient(), user.id, id);
    return NextResponse.json({ revoked: id }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  }
}
