"use client";

import Link from "next/link";
import {
  BookOpen,
  Camera,
  Compass,
  FileText,
  GraduationCap,
  Mic,
  Smartphone,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useTranslation from "@/hooks/i18n/useTranslation";

/*
 * Everything the dock's four fixed keys are not.
 *
 * The dock went from six icon-only keys to five — home, search, messages,
 * settings, and this. That buys every key more room, but it puts vocabulary
 * and discover one tap further away, so the order here is by how often a
 * reader wants each one rather than by category tidiness: vocabulary is the
 * first row of the first group, visible the moment the sheet opens, without
 * a scroll.
 *
 * The four destinations already on the dock are deliberately absent. The
 * same place offered twice on one screen teaches the reader that the layout
 * does not mean anything — which is exactly why the home screen's ten
 * modules came off. Settings' own sub-pages are here because they are not
 * Settings: progress, help and devices are three separate destinations that
 * the Settings key alone does not reach in one tap.
 *
 * It is a sheet, not a route. Closing it returns the reader to the page and
 * the scroll position they were on, and nothing about it appears in history.
 */

type Row = {
  key: string;
  href: string;
  label: string;
  Icon: typeof BookOpen;
};

type Group = {
  key: string;
  label: string;
  rows: Row[];
};

export type AllFeaturesSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function AllFeaturesSheet({
  open,
  onClose,
}: AllFeaturesSheetProps) {
  const { t } = useTranslation();

  const groups: Group[] = [
    {
      key: "learning",
      label: t.home.panelLearning,
      rows: [
        {
          key: "vocabulary",
          href: "/vocabulary",
          label: t.navigation.vocabulary,
          Icon: BookOpen,
        },
        {
          key: "review",
          href: "/review",
          label: t.navigation.review,
          Icon: GraduationCap,
        },
        {
          key: "notes",
          href: "/notes",
          label: t.navigation.notes,
          Icon: FileText,
        },
        {
          key: "pronunciation",
          href: "/pronunciation",
          label: t.navigation.pronunciation,
          Icon: Mic,
        },
      ],
    },
    {
      key: "discover",
      label: t.home.panelDiscover,
      rows: [
        {
          key: "discover",
          href: "/discover",
          label: t.navigation.discover,
          Icon: Compass,
        },
        /*
         * Two camera entries, not one.
         *
         * They both open a camera, which is the implementation, not the
         * thing. One names a single object; the other reads a whole menu
         * and hands back a translated page. Folding them into one "camera"
         * key would file them by how they are built, and a reader looking
         * for menu translation would never find it.
         */
        {
          key: "capture",
          href: "/capture",
          label: t.home.toolCapture,
          Icon: Camera,
        },
        {
          key: "menu",
          href: "/scanner/menu",
          label: t.home.toolMenu,
          Icon: UtensilsCrossed,
        },
      ],
    },
    {
      key: "people",
      label: t.home.panelPeople,
      rows: [
        {
          key: "friends",
          href: "/friends",
          label: t.navigation.friends,
          Icon: UsersRound,
        },
      ],
    },
    {
      key: "mine",
      label: t.home.panelMine,
      rows: [
        {
          key: "help",
          href: "/profile/help",
          label: t.tutorial.rowValue,
          Icon: GraduationCap,
        },
        {
          key: "devices",
          href: "/profile/devices",
          label: t.settings.devices.rowTitle,
          Icon: Smartphone,
        },
      ],
    },
  ];

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t.home.panelTitle}
      maxHeight="calc(100dvh - max(6rem, env(safe-area-inset-top)))"
    >
      <div className="flex flex-col gap-6 pb-2">
        {groups.map(group => (
          <section key={group.key} className="flex flex-col gap-2">
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              {group.label}
            </h3>

            <div className="flex flex-col">
              {group.rows.map(row => (
                <Link
                  key={row.key}
                  href={row.href}
                  onClick={onClose}
                  className="flex min-h-[44px] items-center gap-3 rounded-2xl px-2 py-2.5 transition active:scale-[0.99]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white">
                    <row.Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="text-[0.9375rem] font-medium">
                    {row.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </BottomSheet>
  );
}
