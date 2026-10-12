"use client";

import useTranslation from "@/hooks/i18n/useTranslation";

/**
 * What a screen reader hears while a tab loads, in the app's language.
 *
 * Its own client component because the skeleton around it is rendered on
 * the server and reads no preferences. It said "Loading" in English to
 * everybody.
 */
export default function LoadingLabel() {
  const { t } = useTranslation();

  return <span className="sr-only">{t.common.loading}</span>;
}
