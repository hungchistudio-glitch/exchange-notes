"use client";

import { usePathname } from "next/navigation";

import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavHomeIcon from "@/components/foundation/icons/NavHomeIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSearchIcon from "@/components/foundation/icons/NavSearchIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import BottomNavigation from "@/components/foundation/layout/BottomNavigation";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import { useLexiconSearchSheet } from "@/contexts/LexiconSearchContext";
import useIncomingFriendRequestCount from "@/hooks/friends/useIncomingFriendRequestCount";
import useTranslation from "@/hooks/i18n/useTranslation";
import useUnreadMessageCount from "@/hooks/messages/useUnreadMessageCount";

function isActive(pathname: string, href: string) {
  if (href === "/home") {
    return pathname === "/home";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

/*
 * An open conversation is the one screen that competes with the dock for the
 * bottom of the display, and the composer should win: it is what the user
 * came here to use, and on a phone the two would otherwise be stacked.
 *
 * The list, the archive and the new-conversation bridge all keep the dock —
 * they are places you pass through, not places you settle into.
 */
function isInsideConversation(pathname: string) {
  if (!pathname.startsWith("/messages/")) return false;

  const segment = pathname.slice("/messages/".length);
  return segment.length > 0 && segment !== "archived" && segment !== "new";
}

// Cosmic Mode draws the same glyphs a size down. The dock is the quiet
// counterpart to the Command Deck's large controls — the deck is where the
// app is spectacular, and a sub-page should be handing its attention to the
// vocabulary or the message on screen. The row the icons sit in is untouched,
// so a smaller glyph is not a smaller thing to hit.
const ICON_CLASS_NAME = "h-[22px] w-[22px]";
const COSMIC_ICON_CLASS_NAME = "h-[19px] w-[19px]";

export default function ProtectedNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isCosmic } = useInterfaceMode();
  const { openSearch } = useLexiconSearchSheet();
  const { unreadCount, pulseToken } = useUnreadMessageCount();
  const { count: pendingFriendRequestCount, pulseToken: friendRequestPulseToken } =
    useIncomingFriendRequestCount();

  /*
   * Six keys, and the sixth is Search.
   *
   * The plan was to swap the centre key — Home on the home screen, Search
   * everywhere else — until a grep turned up the thing that makes that
   * unshippable: this dock is the only route back to `/home` in the entire app.
   * Nothing else links there. Trading the centre key away would have left a
   * reader on the Vocabulary screen with no way home at all.
   *
   * So Search is added rather than substituted, directly beside Home, and
   * every existing key keeps its position. Six icon-only keys still clear
   * the 44px touch target on the narrowest phone the app supports (53px each
   * at 375px wide), which is what makes the extra slot affordable.
   *
   * It is present on the home screen too, where the field above it does the
   * same job. A dock whose keys appear and disappear by route is a dock
   * nobody can build a habit around, and the habit is the whole point.
   */
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
      href: "/home",
      label: t.navigation.home,
      Icon: NavHomeIcon,
    },
    {
      // No href: this opens a sheet, not a route. See BottomNavigation.
      label: t.navigation.search,
      Icon: NavSearchIcon,
      onSelect: () => openSearch(),
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

  const iconClassName = isCosmic ? COSMIC_ICON_CLASS_NAME : ICON_CLASS_NAME;

  /*
   * Hidden outright on a phone, dimmed on a desktop where there is room for
   * both and losing your bearings costs more than the few pixels. Hovering or
   * focusing it brings it back to full strength, so "quieter" never means
   * "harder to use".
   */
  if (isInsideConversation(pathname)) {
    return (
      <div className="hidden opacity-40 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100 sm:block">
        <BottomNavigation
          label={isCosmic ? t.cosmic.deck.dockLabel : t.navigation.primaryLabel}
          items={navRoutes.map((route) => {
            const active = Boolean(route.href) && isActive(pathname, route.href!);

            return {
              href: route.href,
              label: route.label,
              active,
              icon: <route.Icon className={iconClassName} active={active} />,
              onSelect: route.onSelect,
            };
          })}
        />
      </div>
    );
  }

  return (
    <BottomNavigation
      label={isCosmic ? t.cosmic.deck.dockLabel : t.navigation.primaryLabel}
      items={navRoutes.map((route) => {
        const active = Boolean(route.href) && isActive(pathname, route.href!);
        const isMessages = route.href === "/messages";
        // Home is where the "add friends" entry point (LearningPartnerCard)
        // lives, and there's no dedicated Friends tab, so a pending
        // incoming request badges Home instead of going unnoticed.
        const isHome = route.href === "/home";

        return {
          href: route.href,
          label: route.label,
          active,
          icon: <route.Icon className={iconClassName} active={active} />,
          onSelect: route.onSelect,
          // Home is the Command Deck in Cosmic Mode, so going there is a
          // return to the bridge and gets the arrival that says so. Every
          // other dock tap is a lateral move between rooms and gets the short
          // crossfade. Standard Mode passes nothing and animates nothing.
          transitionTypes: !isCosmic
            ? undefined
            : isHome
              ? ["deck-return"]
              : ["dock-move"],
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
