import { NextResponse, type NextRequest } from "next/server";

import { helloJoinPath, helloPath, isHelloId } from "@/lib/hello/url";

/*
 * The first hello links, /hello/<id> and /hello/<id>/join, now that a
 * hello lives at /a-word-to-invite-you/<id> (lib/hello/url.ts). Permanent,
 * so a link already sent keeps working and a preview fetched from it lands
 * on the new address. Built from the id alone — nothing else in the
 * request, the query included, reaches the destination, so this cannot be
 * pointed elsewhere.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ rest: string[] }> }) {
  const { rest } = await params;
  const [id, action, ...more] = rest.map((part) => decodeURIComponent(part));
  const valid = isHelloId(id) && more.length === 0 && (action === undefined || action === "join");
  if (!valid) return NextResponse.redirect(new URL("/", request.url), 308);

  const target = new URL(action === "join" ? helloJoinPath(id) : helloPath(id), request.url);
  return NextResponse.redirect(target, 308);
}
