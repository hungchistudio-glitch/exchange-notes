import { Suspense } from "react";

import SoundsModule from "@/components/pronunciation/lab/SoundsModule";

export default function SoundsPage() {
  return (
    <Suspense fallback={null}>
      <SoundsModule />
    </Suspense>
  );
}
