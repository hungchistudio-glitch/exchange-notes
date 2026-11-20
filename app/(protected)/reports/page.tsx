import { notFound } from "next/navigation";

import ReportsReview from "@/components/reports/ReportsReview";
import { isAppOwner } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";

/* Readers' reports, for the app's owner only (Chi, 2026-11-16: 回報問題);
   anyone else is shown the page that is not there. */
export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAppOwner(user?.id)) notFound();
  return <ReportsReview />;
}
