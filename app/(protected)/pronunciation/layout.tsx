import type { ReactNode } from "react";

import { PronunciationLabProvider } from "@/contexts/PronunciationLabContext";
import { VocabularyProvider } from "@/contexts/VocabularyContext";

/**
 * Everything under /pronunciation shares one set of state.
 *
 * VocabularyProvider is the same one the Vocabulary screen mounts, not a
 * copy: the Words module practises the learner's actual saved words, and a
 * second store of them would be a second answer to "what have I saved".
 *
 * The order matters — the Lab reads vocabulary to work out which words
 * exercise which sounds, so it has to sit inside it.
 */
export default function PronunciationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <VocabularyProvider>
      <PronunciationLabProvider>{children}</PronunciationLabProvider>
    </VocabularyProvider>
  );
}
