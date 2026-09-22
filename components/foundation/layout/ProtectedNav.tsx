"use client";

import { LayoutGrid } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import NavDiscoverIcon from "@/components/foundation/icons/NavDiscoverIcon";
import NavHomeIcon from "@/components/foundation/icons/NavHomeIcon";
import NavMessagesIcon from "@/components/foundation/icons/NavMessagesIcon";
import NavSearchIcon from "@/components/foundation/icons/NavSearchIcon";
import NavSettingsIcon from "@/components/foundation/icons/NavSettingsIcon";
import NavVocabularyIcon from "@/components/foundation/icons/NavVocabularyIcon";
import BottomNavigation from "@/components/foundation/layout/BottomNavigation";
import AllFeaturesSheet from "@/components/foundation/navigation/AllFeaturesSheet";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import {
  getServerYumiRingState,
  getYumiRingState,
  subscribeToYumiRing,
} from "@/lib/home/yumiRing";
import { useLexiconSearchSheet } from "@/contexts/LexiconSearchContext";
import useIncomingFriendRequestCount from "@/hooks/friends/useIncomingFriendRequestCount";
import useTranslation from "@/hooks/i18n/useTranslation";
import useUnreadMessageCount from "@/hooks/messages/useUnreadMessageCount";

/*
 * Which key a route belongs to.
 *
 * Friends sits under Messages: the only screens that link to it are a
 * conversation list and the features sheet, and a reader who reached it came
 * through the first.
 */
function isActive(pathname: string, href: string) {
  if (href === "/home") {
    return pathname === "/home";
  }

  if (href === "/messages") {
    return (
      pathname === "/messages" ||
      pathname.startsWith("/messages/") ||
      pathname === "/friends"
    );
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

type NavRoute = {
  href?: string;
  label: string;
  renderIcon: (active: boolean, className: string) => ReactNode;
  onSelect?: () => void;
};

export default function ProtectedNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isCosmic } = useInterfaceMode();
  const { openSearch } = useLexiconSearchSheet();
  const { unreadCount, pulseToken } = useUnreadMessageCount();
  const { count: pendingFriendRequestCount, pulseToken: friendRequestPulseToken } =
    useIncomingFriendRequestCount();
  const ringState = useSyncExternalStore(
    subscribeToYumiRing,
    getYumiRingState,
    getServerYumiRingState,
  );

  const [featuresOpen, setFeaturesOpen] = useState(false);

  /*
   * Two rows, because the two modes were asked to stay different.
   *
   * Standard Mode's row is five keys: four destinations and a sheet holding
   * everything else. Vocabulary and Discover moved into that sheet, which is
   * the cost of the fifth slot and the reason the sheet opens on Vocabulary.
   *
   * Cosmic Mode keeps the six it has always had. Its Command Deck is built
   * around that set, and this change was scoped to Standard Mode on purpose:
   * one mode's navigation is not evidence about the other's.
   *
   * Search is an action in both. It opens a sheet, not a route — rendering it
   * as a link to nowhere would put a URL in the status bar, offer a useless
   * "open in new tab", and hand the wrong role to a screen reader.
   *
   * The reason Home is a key at all, in either row: this dock is the only
   * route back to `/home` in the entire app. Nothing else links there. Every
   * rearrangement has to keep that.
   */
  const cosmicRoutes: NavRoute[] = [
    {
      href: "/vocabulary",
      label: t.navigation.vocabulary,
      renderIcon: (active, className) => (
        <NavVocabularyIcon className={className} active={active} />
      ),
    },
    {
      href: "/messages",
      label: t.navigation.messages,
      renderIcon: (active, className) => (
        <NavMessagesIcon className={className} active={active} />
      ),
    },
    {
      href: "/home",
      label: t.navigation.home,
      renderIcon: (active, className) => (
        <NavHomeIcon className={className} active={active} />
      ),
    },
    {
      label: t.navigation.search,
      renderIcon: (active, className) => (
        <NavSearchIcon className={className} active={active} />
      ),
      onSelect: () => openSearch(),
    },
    {
      href: "/discover",
      label: t.navigation.discover,
      renderIcon: (active, className) => (
        <NavDiscoverIcon className={className} active={active} />
      ),
    },
    {
      href: "/profile",
      label: t.navigation.settings,
      renderIcon: (active, className) => (
        <NavSettingsIcon className={className} active={active} />
      ),
    },
  ];

  const standardRoutes: NavRoute[] = [
    {
      href: "/home",
      label: t.navigation.home,
      renderIcon: (active, className) => (
        <NavHomeIcon className={className} active={active} />
      ),
    },
    {
      label: t.navigation.search,
      renderIcon: (active, className) => (
        <NavSearchIcon className={className} active={active} />
      ),
      onSelect: () => openSearch(),
    },
    {
      href: "/messages",
      label: t.navigation.messages,
      renderIcon: (active, className) => (
        <NavMessagesIcon className={className} active={active} />
      ),
    },
    {
      href: "/profile",
      label: t.navigation.settings,
      renderIcon: (active, className) => (
        <NavSettingsIcon className={className} active={active} />
      ),
    },
    {
      /*
       * No href, like Search: a sheet is not a place. It never lights up,
       * not even on the pages it leads to — lighting it on Vocabulary would
       * tell the reader the sheet is where they are, and it is closed.
       */
      label: t.navigation.allFeatures,
      renderIcon: (_active, className) => (
        <LayoutGrid className={className} strokeWidth={1.8} aria-hidden="true" />
      ),
      onSelect: () => setFeaturesOpen(true),
    },
  ];

  const navRoutes = isCosmic ? cosmicRoutes : standardRoutes;
  const iconClassName = isCosmic ? COSMIC_ICON_CLASS_NAME : ICON_CLASS_NAME;

  function toItems() {
    return navRoutes.map(route => {
      const active = Boolean(route.href) && isActive(pathname, route.href!);
      const isMessages = route.href === "/messages";
      /*
       * A pending friend request badges Home, not Messages.
       *
       * Both live under the Messages key now, but a dock key carries one
       * number and these are two different things — a message someone sent
       * you and a person asking to be added. Summing them would make a "3"
       * that means nothing. Home keeps the request badge it has always had,
       * and the home screen itself names the two separately.
       */
      const isHome = route.href === "/home";

      return {
        href: route.href,
        label: route.label,
        active,
        icon: route.renderIcon(active, iconClassName),
        onSelect: route.onSelect,
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
    });
  }

  const sheet = isCosmic ? null : (
    <AllFeaturesSheet
      open={featuresOpen}
      onClose={() => setFeaturesOpen(false)}
    />
  );

  /*
   * Standard Mode's home screen has no dock, because Yumi is the dock there:
   * the ring she opens carries every key this row has and she is Home.
   *
   * ...unless the ring never arrived. The home screen is only Yumi now, so if
   * her scene cannot start there is nothing else on it to navigate from, and
   * a dock that stepped aside for a ring has to step back when there is no
   * ring. "pending" still hides it: the dock must not flash in during the
   * second the scene is starting. See lib/home/yumiRing.
   */
  if (!isCosmic && pathname === "/home" && ringState !== "failed") {
    return null;
  }

  /*
   * Hidden outright on a phone, dimmed on a desktop where there is room for
   * both and losing your bearings costs more than the few pixels. Hovering or
   * focusing it brings it back to full strength, so "quieter" never means
   * "harder to use".
   */
  if (isInsideConversation(pathname)) {
    return (
      <>
        <div className="hidden opacity-40 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100 sm:block">
          <BottomNavigation
            label={isCosmic ? t.cosmic.deck.dockLabel : t.navigation.primaryLabel}
            items={toItems()}
          />
        </div>
        {sheet}
      </>
    );
  }

  return (
    <>
      <BottomNavigation
        label={isCosmic ? t.cosmic.deck.dockLabel : t.navigation.primaryLabel}
        items={toItems()}
      />
      {sheet}
    </>
  );
}
