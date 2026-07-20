"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  House,
  MessageCircle,
  Settings,
  Sparkles,
} from "lucide-react";

type NavigationItem = {
  href: string;
  label: string;
  icon: typeof BookOpen;
  featured?: boolean;
};

const items: NavigationItem[] = [
  {
    href: "/vocabulary",
    label: "Words",
    icon: BookOpen,
  },
  {
    href: "/messages",
    label: "Messages",
    icon: MessageCircle,
  },
  {
    href: "/home",
    label: "Home",
    icon: House,
    featured: true,
  },
  {
    href: "/discover",
    label: "Discover",
    icon: Sparkles,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/home") {
    return pathname === "/" || pathname.startsWith("/home");
  }

  if (href === "/settings") {
    return pathname.startsWith("/settings") || pathname.startsWith("/profile");
  }

  return pathname.startsWith(href);
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(10px,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto grid h-[72px] max-w-xl grid-cols-5 rounded-[26px] border border-black/[0.08] bg-white/92 p-1.5 shadow-[0_18px_55px_rgba(16,16,15,0.14)] backdrop-blur-2xl">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavigationItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                if (item.href !== "/messages") return;

                event.preventDefault();
                window.location.assign("/messages");
              }}
              className={`relative flex min-w-0 flex-col items-center justify-center rounded-[20px] px-1 transition-all active:scale-[0.96] ${
                active
                  ? "bg-black text-white"
                  : item.featured
                    ? "text-black/65"
                    : "text-black/48"
              }`}
            >
              <Icon
                size={item.featured ? 21 : 18}
                strokeWidth={active ? 2.15 : 1.9}
              />

              <span className="mt-1 max-w-full truncate text-[10px] font-semibold tracking-[-0.01em]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
