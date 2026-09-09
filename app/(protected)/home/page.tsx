"use client";

import CommandDeck from "@/components/cosmic/CommandDeck";
import StandardHome from "@/components/home/StandardHome";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";

/**
 * The one place the two interface shells diverge.
 *
 * A Client Component rather than a Server one on purpose: the mode lives in a
 * context that app/(protected)/layout.tsx seeds from the request, so this
 * renders the right shell during the server pass too. Reading the cookie again
 * here would work for the common case and be wrong on a device that has not
 * seen the account before, where the profile is the authority.
 *
 * Only the shell changes. Both branches read the same vocabulary, the same
 * notes and the same progress from the same tables.
 */
export default function HomePage() {
  const { isCosmic } = useInterfaceMode();

  return isCosmic ? <CommandDeck /> : <StandardHome />;
}
