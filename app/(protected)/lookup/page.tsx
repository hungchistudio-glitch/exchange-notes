import { Suspense } from "react";

import PocketLookupEntry from "@/components/pocket/PocketLookupEntry";

/*
 * Yumi Pocket Lookup (Chi, 2026-11-12): the screen the iPhone widget opens.
 *
 * Its query (`input=voice`, a fresh `widgetNonce` per tap) is read on the
 * phone, not here, so the offline copy the service worker keeps of this
 * page is one copy that serves every tap (public/sw.js, QUERY_PAGES).
 */
export default function LookupPage() {
  return (
    <Suspense fallback={null}>
      <PocketLookupEntry />
    </Suspense>
  );
}
