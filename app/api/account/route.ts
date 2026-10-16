import { NextResponse } from "next/server";

import { ACCOUNT_DELETE_CONFIRMATION } from "@/lib/account/deletion";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   Delete the signed-in reader's account, and everything in it

   Reached from Settings → Delete account, after the reader has confirmed.
   The privacy page promises this, and until now it could not be kept: four
   tables refused the delete outright (see the 20261015120000 migration), and
   the files would have outlived it regardless, because nothing removed them.

   In this order, so a failure part way leaves something a retry can finish
   rather than an account with no files or files with no account:

   1. Files. Storage refuses direct deletes from SQL, so the database lists
      what the reader owns and the Storage API removes it. A failure stops
      here, with the account intact and the request safe to repeat.
   2. The auth user. Every table the reader owns cascades from it: notes,
      words, review history, messages they sent, friendships, Yumi, the
      cookie ledger, push subscriptions, widget tokens.
   3. The session cookies on this response, so the browser is signed out of
      an account that no longer exists.

   Who: only the session's own user. There is no id in the request — the
   one being deleted is whoever the cookies say is asking.

   Cross-site: DELETE with a JSON body is not a request another site can
   make without a CORS preflight this route never answers, and the session
   cookies are SameSite=Lax besides. The body's confirmation is not a
   security boundary; it stops a stray call from being an account deletion.
   ========================================================= */

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

/** Storage's remove() takes a list; this keeps each request well inside its limits. */
const REMOVE_BATCH = 100;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

export async function DELETE(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "unsupported_media_type" }, 415);
  }

  const body = (await request.json().catch(() => null)) as
    | { confirm?: unknown }
    | null;
  if (body?.confirm !== ACCOUNT_DELETE_CONFIRMATION) {
    return json({ error: "confirmation_required" }, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return json({ error: "unauthorized" }, 401);
  }

  let admin: ReturnType<typeof createServiceClient>;
  try {
    admin = createServiceClient();
  } catch (error) {
    console.error("Account deletion is not configured.", error);
    return json({ error: "unavailable" }, 503);
  }

  const { data: objects, error: listError } = await admin.rpc(
    "prepare_account_deletion",
    { p_user_id: user.id },
  );

  if (listError) {
    console.error("Could not list the account's files.", listError);
    return json({ error: "files_not_listed" }, 500);
  }

  const byBucket = new Map<string, string[]>();
  for (const row of (objects ?? []) as Array<{
    bucket_id: string;
    object_name: string;
  }>) {
    const names = byBucket.get(row.bucket_id) ?? [];
    names.push(row.object_name);
    byBucket.set(row.bucket_id, names);
  }

  for (const [bucket, names] of byBucket) {
    for (let start = 0; start < names.length; start += REMOVE_BATCH) {
      const { error } = await admin.storage
        .from(bucket)
        .remove(names.slice(start, start + REMOVE_BATCH));

      if (error) {
        console.error(`Could not remove files from ${bucket}.`, error);
        return json({ error: "files_not_removed" }, 500);
      }
    }
  }

  // Hard delete: a soft-deleted user keeps every row the cascade exists to
  // remove.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Could not delete the account.", deleteError);
    return json({ error: "account_not_deleted" }, 500);
  }

  // The refresh token died with the user, so the server may refuse this;
  // the cookies are cleared on the way regardless.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

  return json({ deleted: true });
}
