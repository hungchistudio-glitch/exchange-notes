"use client";

import dynamic from "next/dynamic";

/* Its own chunk, fetched after the page: nothing in it is needed until a
   microphone is refused (tests/routeImportWeight.test.ts). */
const MicGuideHost = dynamic(() => import("@/components/voice/MicGuideHost"), { ssr: false });

export default function MicGuideMount() {
  return <MicGuideHost />;
}
