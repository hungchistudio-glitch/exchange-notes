import { NextResponse } from "next/server";

import { HELLO_POSTER_BUCKET } from "@/lib/hello/server";
import { isHelloId } from "@/lib/hello/url";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/*
 * Turning a hello off, by its owner.
 *
 * The database decides whose it is (revoke_yumi_hello checks the session's
 * own id), and from then on the page and the link previews show nothing of
 * it. Its picture is deleted from the bucket too. What cannot be taken
 * back — an image already saved, a preview another app has cached — the
 * management screen says, rather than promising otherwise.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isHelloId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("revoke_yumi_hello", { p_id: id });
  if (error) return NextResponse.json({ error: "Could not turn off" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = createServiceClient();
  const { data: files } = await service.storage.from(HELLO_POSTER_BUCKET).list(id);
  if (files?.length) {
    await service.storage.from(HELLO_POSTER_BUCKET).remove(files.map((file) => `${id}/${file.name}`));
  }

  return NextResponse.json({ revoked: true });
}
