import { Suspense } from "react";

import LabLanding from "@/components/pronunciation/lab/LabLanding";

/*
 * A server component wrapping the client one, purely for the Suspense
 * boundary: LabLanding reads the query string to decide where its back
 * arrow goes, and useSearchParams needs a boundary above it.
 */
export default function PronunciationLabPage() {
  return (
    <Suspense fallback={null}>
      <LabLanding />
    </Suspense>
  );
}
