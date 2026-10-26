"use client";

import { useEffect, useMemo, useState } from "react";

import type { SceneChoice } from "@/lib/shop/atmosphere";
import { setSceneChoice } from "@/lib/shop/useShopWeather";
import { MYTHIC_ITEMS } from "@/lib/shop/mythicCollection";
import { createPreviewWallet } from "@/lib/shop/wallet";

import YumiShop from "./YumiShop";

/**
 * The shop on the review screen.
 *
 * The mode switch here repaints this page only, through the same attribute
 * the token layer keys on, and puts the original back on the way out (see
 * CosmicYumiReview for why a review page must not write the reader's real
 * mode).
 */
export default function YumiShopReview({ startCosmic, sky = null, collection03 = false, vault = 0 }: {
  startCosmic: boolean; sky?: SceneChoice | null; collection03?: boolean;
  /** How many of the Mythic Vault's pieces the preview starts with. */
  vault?: number;
}) {
  const wallet = useMemo(
    () => createPreviewWallet(collection03 ? 3300 : 240, MYTHIC_ITEMS.slice(0, vault).map(item => item.id)),
    [collection03, vault],
  );
  const [isCosmic, setCosmic] = useState(startCosmic);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-interface-mode");
    return () => {
      if (previous === null) root.removeAttribute("data-interface-mode");
      else root.setAttribute("data-interface-mode", previous);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-interface-mode", isCosmic ? "yumi-cosmic" : "standard");
  }, [isCosmic]);

  // A sky asked for by link.
  useEffect(() => {
    if (sky) setSceneChoice(sky);
  }, [sky]);

  return (
    <YumiShop
      wallet={wallet}
      isCosmic={isCosmic}
      onToggleMode={() => setCosmic(value => !value)}
      preview
      startCollection={collection03 ? "collection03" : "all"}
    />
  );
}
