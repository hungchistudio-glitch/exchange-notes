"use client";

import { useCallback, useMemo } from "react";

import { createSupabaseHangyumi } from "@/lib/hangyumi/service";
import { createSupabaseWallet } from "@/lib/shop/wallet";
import { createClient } from "@/lib/supabase/client";

import GamesHub from "./GamesHub";

/** The games hub as a signed-in reader sees it: their cookies, today's share of the 333. */
export default function GamesPage() {
  const supabase = useMemo(() => createClient(), []);
  const loadToday = useCallback(async () => (await createSupabaseHangyumi(supabase).today()).earned, [supabase]);
  const loadBalance = useCallback(async () => (await createSupabaseWallet(supabase).load()).balance, [supabase]);
  return (
    <GamesHub
      loadToday={loadToday}
      loadBalance={loadBalance}
      hrefs={{ hangyumi: "/hangyumi", wordvault: "/wordvault" }}
      backHref="/home"
    />
  );
}
