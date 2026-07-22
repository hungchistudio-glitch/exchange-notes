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
import { useEffect, useState } from "react";

import {
  DEFAULT_INTERFACE_LANGUAGE,
  getInterfaceLanguage,
  subscribeToInterfaceLanguage,
  type InterfaceLanguage,
} from "@/lib/appPreferences";

type NavigationItem = {
  href: string;
  label: {
    english: string;
    "traditional-chinese": string;
  };
  icon: typeof BookOpen;
  featured?: boolean;
};

const items: NavigationItem[] = [
  {
    href: "/vocabulary",
    label: {
      english: "Words",
      "traditional-chinese": "單字",
    },
    icon: BookOpen,
  },
  {
    href: "/messages",
    label: {
      english: "Messages",
      "traditional-chinese": "訊息",
    },
    icon: MessageCircle,
  },
  {
    href: "/home",
    label: {
      english: "Home",
      "traditional-chinese": "首頁",
    },
    icon: House,
    featured: true,
  },
  {
    href: "/discover",
    label: {
      english: "Discover",
      "traditional-chinese": "探索",
    },
    icon: Sparkles,
  },
  {
    href: "/settings",
    label: {
      english: "Settings",
      "traditional-chinese": "設定",
    },
    icon: Settings,
  },
];

function isNavigationItemActive(
  pathname: string,
  href: string,
) {
  if (href === "/home") {
    return (
      pathname === "/" ||
      pathname.startsWith("/home")
    );
  }

  if (href === "/settings") {
    return (
      pathname.startsWith("/settings") ||
      pathname.startsWith("/profile")
    );
  }

  return pathname.startsWith(href);
}

export default function BottomNav() {
  const pathname = usePathname();

  const [language, setLanguage] =
    useState<InterfaceLanguage>(
      DEFAULT_INTERFACE_LANGUAGE,
    );

  useEffect(() => {
    setLanguage(getInterfaceLanguage());

    return subscribeToInterfaceLanguage(
      (nextLanguage) => {
        setLanguage(nextLanguage);
      },
    );
  }, []);

  const navigationLabel =
    language === "traditional-chinese"
      ? "主要導覽"
      : "Primary navigation";

  return (
    <nav
      aria-label={navigationLabel}
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(10px,env(safe-area-inset-bottom))]"
    >
      <div
        className={[
          "mx-auto grid h-[72px] max-w-xl grid-cols-5 rounded-[26px] border p-1.5",
          "border-[var(--en-border)] bg-[color:var(--en-surface)]",
          "shadow-[var(--en-shadow)] backdrop-blur-2xl",
        ].join(" ")}
      >
        {items.map((item) => {
          const Icon = item.icon;

          const active =
            isNavigationItemActive(
              pathname,
              item.href,
            );

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                active ? "page" : undefined
              }
              onClick={(event) => {
                if (
                  item.href !== "/messages"
                ) {
                  return;
                }

                event.preventDefault();
                window.location.assign(
                  "/messages",
                );
              }}
              className={[
                "relative flex min-w-0 flex-col items-center justify-center rounded-[20px] px-1",
                "transition-all active:scale-[0.96]",
                active
                  ? "bg-[var(--en-selected)] text-[var(--en-selected-text)]"
                  : item.featured
                    ? "text-[var(--en-text-secondary)]"
                    : "text-[var(--en-text-tertiary)]",
              ].join(" ")}
            >
              <Icon
                size={
                  item.featured ? 21 : 18
                }
                strokeWidth={
                  active ? 2.15 : 1.9
                }
              />

              <span className="mt-1 max-w-full truncate text-[10px] font-semibold tracking-[-0.01em]">
                {item.label[language]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
