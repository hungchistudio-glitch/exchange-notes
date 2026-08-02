import type { ReactNode } from "react";

import { VocabularyProvider } from "@/contexts/VocabularyContext";

export default function VocabularyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <VocabularyProvider>{children}</VocabularyProvider>;
}
