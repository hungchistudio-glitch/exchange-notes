"use client";

import type { ReactNode } from "react";

import PageTitle from "@/components/foundation/layout/PageTitle";

type AppHeaderProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  // A sub-screen of the page named here. Settings' Devices & Widgets and
  // Help & About are the first two; the dock stays where it is either way.
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  className?: string;
};

/**
 * A sub-screen's heading: a note, Settings' Devices and Help, the menu
 * scanner's result.
 *
 * It was a compact sticky bar with a 20px title. Since 2026-11-15 every page
 * wears the same title, a sub-screen included (Chi: 每一頁的主題頁面字體及大小
 * 統一, 副頁和主頁一樣大), so this is PageTitle with a way back: same face,
 * same size, the eyebrow's status light, and the letters running into place
 * as it appears.
 */
export default function AppHeader({
  title,
  eyebrow,
  action,
  backHref,
  onBack,
  backLabel,
  className = "",
}: AppHeaderProps) {
  const label = backLabel ?? "";
  const back = backHref
    ? { href: backHref, label }
    : onBack
      ? { onClick: onBack, label }
      : undefined;

  return (
    <div className={className}>
      <PageTitle title={title} eyebrow={eyebrow} action={action} back={back} />
    </div>
  );
}
