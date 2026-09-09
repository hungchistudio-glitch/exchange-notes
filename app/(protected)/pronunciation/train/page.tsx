import { Suspense } from "react";

import TrainModule from "@/components/pronunciation/lab/TrainModule";

export default function TrainPage() {
  return (
    <Suspense fallback={null}>
      <TrainModule />
    </Suspense>
  );
}
