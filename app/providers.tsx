"use client";

import type { ReactNode } from "react";

import { VocabularyProvider } from "@/contexts/VocabularyContext";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({
  children,
}: ProvidersProps) {
  return (
    <VocabularyProvider>
      {children}
    </VocabularyProvider>
  );
}
