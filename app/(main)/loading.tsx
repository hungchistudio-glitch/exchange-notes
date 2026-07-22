"use client";

import useTranslation from "@/hooks/i18n/useTranslation";
import LogoLoader from "@/components/ui/LogoLoader";

export default function MainLoading() {
  const { t } = useTranslation();

  return <LogoLoader label={t.messages.loadingConversations} />;
}
