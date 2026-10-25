"use client";

import { useCallback, useMemo } from "react";

import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { createSupabaseHangyumi } from "@/lib/hangyumi/service";
import { createSupabaseWallet } from "@/lib/shop/wallet";
import { createClient } from "@/lib/supabase/client";

import HangyumiGame from "./HangyumiGame";

/** Hangyumi as a signed-in reader plays it: their language, their cookies, their Yumi. */
export default function HangyumiPage() {
  const { learningLanguage, nativeLanguage } = useLearningLanguageContext();
  const supabase = useMemo(() => createClient(), []);
  const service = useMemo(() => createSupabaseHangyumi(supabase), [supabase]);
  const loadOutfit = useCallback(async () => (await createSupabaseWallet(supabase).load()).outfit, [supabase]);

  return (
    <HangyumiGame
      service={service}
      defaultLanguage={learningLanguage}
      nativeLanguage={nativeLanguage}
      loadOutfit={loadOutfit}
    />
  );
}
