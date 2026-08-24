import type { ReactNode } from "react";

/**
 * Nothing to add any more.
 *
 * This mounted VocabularyProvider until the library became app-wide — see
 * app/(protected)/layout.tsx. Mounting a second one here would give this
 * screen its own copy of the list, which is precisely the thing that made a
 * word saved from the search sheet invisible to the page underneath it.
 *
 * Kept as a pass-through rather than deleted so the route group keeps its
 * own segment boundary for loading and error UI.
 */
export default function VocabularyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
