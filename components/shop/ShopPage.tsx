"use client";

import { useMemo } from "react";

import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import { createSupabaseWallet } from "@/lib/shop/wallet";
import { createClient } from "@/lib/supabase/client";

import YumiShop from "./YumiShop";

/** The shop as a signed-in reader sees it: their own cookies, their own Yumi. */
export default function ShopPage() {
  const { isCosmic, setInterfaceMode } = useInterfaceMode();
  const wallet = useMemo(() => createSupabaseWallet(createClient()), []);

  return (
    <YumiShop
      wallet={wallet}
      isCosmic={isCosmic}
      onToggleMode={() => setInterfaceMode(isCosmic ? "standard" : "yumi-cosmic")}
    />
  );
}
