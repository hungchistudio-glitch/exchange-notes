"use client";

import { BookOpen, Compass, Home, MessageCircle, Search, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import BottomNavigation from "@/components/foundation/layout/BottomNavigation";
import RouteStage from "@/components/foundation/layout/RouteStage";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { setLaunching } from "@/lib/launchState";

const STOPS = [
  { page: "vocabulary", label: "Vocabulary", Icon: BookOpen },
  { page: "messages", label: "Messages", Icon: MessageCircle },
  { page: "home", label: "Home", Icon: Home },
  { page: null, label: "Search", Icon: Search },
  { page: "discover", label: "Discover (slow)", Icon: Compass },
  { page: "settings", label: "Settings", Icon: Settings },
] as const;

/**
 * The review's shell: the real RouteStage and Standard mode's real dock,
 * so a page's arrival and a finger sliding along the dock can be seen
 * without an account. No opening here, so nothing waits for one.
 */
export default function ArrivalReviewShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => setLaunching(false), []);
  return (
    <InterfaceModeProvider initialMode="standard" preview>
      <div className="min-h-[100dvh] bg-surface pb-28">
        <RouteStage>{children}</RouteStage>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 h-0">
        <BottomNavigation
          label="Review navigation"
          items={STOPS.map(({ page, label, Icon }) => ({
            label,
            href: page ? `/arrival-review/${page}` : undefined,
            onSelect: page ? undefined : () => {},
            active: page !== null && pathname === `/arrival-review/${page}`,
            icon: <Icon size={19} strokeWidth={1.8} aria-hidden="true" />,
          }))}
        />
      </div>
    </InterfaceModeProvider>
  );
}
