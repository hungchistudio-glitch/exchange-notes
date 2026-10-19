import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { HELLO_POSTER_BUCKET, posterPublicUrl } from "@/lib/hello/server";
import { isHelloId } from "@/lib/hello/url";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/*
 * The picture of Yumi taken on the sharer's device when the hello was made
 * (lib/hello/poster.ts): the same scene, the same outfit, rendered once.
 * The page shows it before the live scene is ready, and the shared image
 * and link previews are made from it.
 *
 * PNG only, at most 2 MB, written by the server under a fresh random name
 * and attached only to the owner's own, still-live hello. A second upload —
 * "make the image again" — replaces the first and deletes it.
 */

const MAX_BYTES = 2 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isHelloId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  /* Whose it is, and what it had before, through the owner's own session. */
  const { data: hello } = await supabase
    .from("yumi_hellos")
    .select("id, poster_path, revoked_at")
    .eq("id", id)
    .maybeSingle();
  if (!hello || hello.revoked_at) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: "Too large" }, { status: 413 });
  }
  if (!PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    return NextResponse.json({ error: "Not a PNG" }, { status: 415 });
  }

  const service = createServiceClient();
  const path = `${id}/${randomBytes(12).toString("base64url")}.png`;
  const { error: uploadError } = await service.storage
    .from(HELLO_POSTER_BUCKET)
    .upload(path, bytes, { contentType: "image/png", upsert: false, cacheControl: "31536000" });
  if (uploadError) return NextResponse.json({ error: "Could not store" }, { status: 500 });

  const { data: attached } = await service.rpc("set_yumi_hello_poster", {
    p_owner: user.id,
    p_id: id,
    p_path: path,
  });
  if (!attached) {
    await service.storage.from(HELLO_POSTER_BUCKET).remove([path]);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (typeof hello.poster_path === "string" && hello.poster_path !== path) {
    await service.storage.from(HELLO_POSTER_BUCKET).remove([hello.poster_path]);
  }

  return NextResponse.json({ posterUrl: posterPublicUrl(path) });
}
