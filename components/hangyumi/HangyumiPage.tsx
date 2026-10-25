"use client";

import { useCallback, useMemo } from "react";

import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { createSupabaseHangyumi } from "@/lib/hangyumi/service";
import { createSupabaseWallet } from "@/lib/shop/wallet";
import { createClient } from "@/lib/supabase/client";

import HangyumiGame from "./HangyumiGame";

/** Hangyumi as a signed-in reader plays it: their language, their cookies, their Yumi. */
export default function HangyumiPage() {
  const { learningLanguage, supportLanguage } = useDisplayLanguages();
  const supabase = useMemo(() => createClient(), []);
  const service = useMemo(() => createSupabaseHangyumi(supabase), [supabase]);
  const loadOutfit = useCallback(async () => (await createSupabaseWallet(supabase).load()).outfit, [supabase]);

  return (
    <HangyumiGame
      service={service}
      learningLanguage={learningLanguage}
      hintLanguage={supportLanguage}
      loadOutfit={loadOutfit}
    />
  );
}
