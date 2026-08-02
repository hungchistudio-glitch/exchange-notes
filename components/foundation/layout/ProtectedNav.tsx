"use client";

import { usePathname } from "next/navigation";

import BookIcon from "@/components/foundation/icons/BookIcon";
import CompassIcon from "@/components/foundation/icons/CompassIcon";
import HomeIcon from "@/components/foundation/icons/HomeIcon";
import MessageIcon from "@/components/foundation/icons/MessageIcon";
import ProfileIcon from "@/components/foundation/icons/ProfileIcon";
import BottomNavigation from "@/components/foundation/layout/BottomNavigation";
import useTranslation from "@/hooks/i18n/useTranslation";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ProtectedNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const iconClassName = "h-4 w-4";

  const navRoutes = [
    {
      href: "/vocabulary",
      label: t.navigation.vocabulary,
      icon: <BookIcon className={iconClassName} />,
    },
    {
      href: "/messages",
      label: t.navigation.messages,
      icon: <MessageIcon className={iconClassName} />,
    },
    {
      href: "/",
      label: t.navigation.home,
      icon: <HomeIcon className={iconClassName} />,
    },
    {
      href: "/discover",
      label: t.navigation.discover,
      icon: <CompassIcon className={iconClassName} />,
    },
    {
      href: "/profile",
      label: t.navigation.settings,
      icon: <ProfileIcon className={iconClassName} />,
    },
  ];

  return (
    <BottomNavigation
      items={navRoutes.map((route) => ({
        ...route,
        active: isActive(pathname, route.href),
      }))}
    />
  );
}
