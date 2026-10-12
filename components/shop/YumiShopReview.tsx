"use client";

import { useEffect, useMemo, useState } from "react";

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
export default function YumiShopReview({ startCosmic }: { startCosmic: boolean }) {
  const wallet = useMemo(() => createPreviewWallet(240), []);
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

  return (
    <YumiShop
      wallet={wallet}
      isCosmic={isCosmic}
      onToggleMode={() => setCosmic(value => !value)}
      preview
    />
  );
}
