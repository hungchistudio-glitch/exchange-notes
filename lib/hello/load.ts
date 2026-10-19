import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { lookupFromRpc } from "./server";
import type { HelloLookup } from "./types";
import { isHelloId } from "./url";

/**
 * One hello, as anyone may see it: through get_yumi_hello, the public
 * snapshot only, whether or not the visitor is signed in. Cached per
 * request, so the page, its metadata and its preview image read it once.
 *
 * A hello that cannot be read — no such id, a database that has not been
 * given the function yet, a dropped connection — is "missing": the page
 * says it cannot find it, and shows nothing it cannot vouch for.
 */
export const loadHello = cache(async (id: string): Promise<HelloLookup> => {
  if (!isHelloId(id)) return { status: "missing" };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_yumi_hello", { p_id: id });
    if (error) return { status: "missing" };
    return lookupFromRpc(data);
  } catch {
    return { status: "missing" };
  }
});
