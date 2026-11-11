"use client";

import { useCallback, useMemo } from "react";

import { loadGamesProgress } from "@/lib/games/progress";
import { createSupabaseHangyumi } from "@/lib/hangyumi/service";
import { createSupabaseWallet } from "@/lib/shop/wallet";
import { createClient } from "@/lib/supabase/client";

import GamesHub from "./GamesHub";

/** The games hub as a signed-in reader sees it: their cookies, today's share of the 333, each game's progress. */
export default function GamesPage() {
  const supabase = useMemo(() => createClient(), []);
  const loadToday = useCallback(async () => (await createSupabaseHangyumi(supabase).today()).earned, [supabase]);
  const loadBalance = useCallback(async () => (await createSupabaseWallet(supabase).load()).balance, [supabase]);
  const loadProgress = useCallback(() => loadGamesProgress(supabase), [supabase]);
  return (
    <GamesHub
      loadToday={loadToday}
      loadBalance={loadBalance}
      loadProgress={loadProgress}
      hrefs={{ hangyumi: "/hangyumi", wordvault: "/wordvault", starweaver: "/starweaver" }}
      backHref="/home"
    />
  );
}
