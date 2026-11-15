import { Suspense } from "react";

import ListenMode from "@/components/listen/ListenMode";

/* Listening mode (Chi, 2026-11-15: 通勤收聽模式): components/listen/ListenMode. */
export default function ListenPage() {
  return (
    <Suspense fallback={null}>
      <ListenMode />
    </Suspense>
  );
}
