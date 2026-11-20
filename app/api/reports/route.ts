import { NextResponse } from "next/server";

import { DAILY_REPORT_LIMIT, isAppOwner, parseReport, type ContentReport } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/* =========================================================
   Readers' reports (lib/reports.ts; Chi, 2026-11-16: 回報問題)

   POST   any signed-in reader sends one (at most DAILY_REPORT_LIMIT a day)
   GET    the owner reads the open ones, newest first
   PATCH  the owner marks one done, or opens it again

   The table is the service role's alone; who may do what is decided here,
   from the session, and the owner is NEWS_OWNER_USER_ID (fails closed).
   ========================================================= */

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

async function sessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });

  const report = parseReport(await request.json().catch(() => null));
  if (!report) return NextResponse.json({ error: "invalid" }, { status: 400, headers: NO_STORE });

  const service = createServiceClient();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count, error: countError } = await service
    .from("content_reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (countError) return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  if ((count ?? 0) >= DAILY_REPORT_LIMIT) {
    return NextResponse.json({ error: "limited" }, { status: 429, headers: NO_STORE });
  }

  const { error } = await service.from("content_reports").insert({
    user_id: user.id,
    surface: report.surface,
    item_key: report.itemKey,
    language: report.language,
    quoted: report.quoted,
    note: report.note,
    page: report.page,
  });
  if (error) return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });

  return NextResponse.json({ ok: true }, { status: 201, headers: NO_STORE });
}

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  if (!isAppOwner(user.id)) return NextResponse.json({ owner: false }, { headers: NO_STORE });

  const { data, error } = await createServiceClient()
    .from("content_reports")
    .select("id, surface, item_key, language, quoted, note, page, created_at, resolved_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });

  const reports: ContentReport[] = (data ?? []).map((row) => ({
    id: row.id as string,
    surface: row.surface as ContentReport["surface"],
    itemKey: row.item_key as string,
    language: (row.language as string | null) ?? null,
    quoted: row.quoted as string,
    note: row.note as string,
    page: row.page as string,
    createdAt: row.created_at as string,
    resolvedAt: (row.resolved_at as string | null) ?? null,
  }));
  return NextResponse.json({ owner: true, reports }, { headers: NO_STORE });
}

export async function PATCH(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  if (!isAppOwner(user.id)) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });

  const body = (await request.json().catch(() => null)) as { id?: unknown; resolved?: unknown } | null;
  const id = typeof body?.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null;
  if (!id || typeof body?.resolved !== "boolean") {
    return NextResponse.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  }

  const { error } = await createServiceClient()
    .from("content_reports")
    .update({ resolved_at: body.resolved ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
