"use client";

import { usePathname } from "next/navigation";

import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavHomeIcon from "@/components/foundation/icons/NavHomeIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import BottomNavigation from "@/components/foundation/layout/BottomNavigation";
import useTranslation from "@/hooks/i18n/useTranslation";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const iconClassName = "h-[22px] w-[22px]";

export default function ProtectedNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navRoutes = [
    {
      href: "/vocabulary",
      label: t.navigation.vocabulary,
      Icon: NavVocabularyIcon,
    },
    {
      href: "/messages",
      label: t.navigation.messages,
      Icon: NavMessagesIcon,
    },
    {
      href: "/",
      label: t.navigation.home,
      Icon: NavHomeIcon,
    },
    {
      href: "/discover",
      label: t.navigation.discover,
      Icon: NavDiscoverIcon,
    },
    {
      href: "/profile",
      label: t.navigation.settings,
      Icon: NavSettingsIcon,
    },
  ];

  return (
    <BottomNavigation
      items={navRoutes.map((route) => {
        const active = isActive(pathname, route.href);

        return {
          href: route.href,
          label: route.label,
          active,
          icon: <route.Icon className={iconClassName} active={active} />,
        };
      })}
    />
  );
}
