import type { ReactNode } from "react";

import { PronunciationLabProvider } from "@/contexts/PronunciationLabContext";

/**
 * Everything under /pronunciation shares one set of Lab state.
 *
 * The vocabulary it practises comes from the app-wide VocabularyProvider in
 * app/(protected)/layout.tsx — the Lab reads the learner's actual saved
 * words, and a second store of them would be a second answer to "what have I
 * saved". This used to mount its own; hoisting it removed the copy without
 * changing what the Lab reads.
 */
export default function PronunciationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PronunciationLabProvider>{children}</PronunciationLabProvider>;
}
