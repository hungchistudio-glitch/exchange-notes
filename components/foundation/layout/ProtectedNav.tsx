"use client";

import { usePathname } from "next/navigation";

import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavHomeIcon from "@/components/foundation/icons/NavHomeIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import BottomNavigation from "@/components/foundation/layout/BottomNavigation";
import useIncomingFriendRequestCount from "@/hooks/friends/useIncomingFriendRequestCount";
import useTranslation from "@/hooks/i18n/useTranslation";
import useUnreadMessageCount from "@/hooks/messages/useUnreadMessageCount";

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
  const { unreadCount, pulseToken } = useUnreadMessageCount();
  const { count: pendingFriendRequestCount, pulseToken: friendRequestPulseToken } =
    useIncomingFriendRequestCount();

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
        const isMessages = route.href === "/messages";
        // Home is where the "add friends" entry point (LearningPartnerCard)
        // lives, and there's no dedicated Friends tab, so a pending
        // incoming request badges Home instead of going unnoticed.
        const isHome = route.href === "/";

        return {
          href: route.href,
          label: route.label,
          active,
          icon: <route.Icon className={iconClassName} active={active} />,
          badgeCount: isMessages
            ? unreadCount
            : isHome
              ? pendingFriendRequestCount
              : undefined,
          pulseToken: isMessages
            ? pulseToken
            : isHome
              ? friendRequestPulseToken
              : undefined,
        };
      })}
    />
  );
}
