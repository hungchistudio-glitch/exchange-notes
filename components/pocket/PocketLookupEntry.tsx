"use client";

import { useSearchParams } from "next/navigation";

import PocketLookup from "./PocketLookup";

/**
 * /lookup's query, read on the phone: `input=voice` opens straight onto
 * listening, and a new `widgetNonce` (one per tap on the widget) starts a
 * fresh lookup rather than showing the last one's result.
 */
export default function PocketLookupEntry() {
  const params = useSearchParams();
  return (
    <PocketLookup
      key={params.get("widgetNonce") ?? "lookup"}
      inputMode={params.get("input") === "voice" ? "voice" : "text"}
    />
  );
}
