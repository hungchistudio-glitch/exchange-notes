"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageCircle, Search, UserRound } from "lucide-react";

function AppLogoIcon({
  size = 20,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 300,70 Q 110,70 100,180"
        stroke="currentColor"
        strokeWidth="52"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 100,180 Q 110,320 300,320"
        stroke="currentColor"
        strokeWidth="52"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 100,180 L 250,180"
        stroke="currentColor"
        strokeWidth="52"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="285"
        cy="180"
        r="40"
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
      />
      <circle cx="294" cy="172" r="14" fill="currentColor" />
    </svg>
  );
}

const items = [
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
    href: "/discover",
    label: "",
    icon: AppLogoIcon,
    compact: true,
  },
  {
    href: "/friends",
    label: "Friends",
    icon: Search,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: UserRound,
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 mx-auto grid max-w-md grid-cols-5 rounded-[26px] border border-black/10 bg-white p-2 shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label || "Discover"}
            onClick={(event) => {
              if (item.href !== "/messages") return;

              event.preventDefault();
              window.location.assign("/messages");
            }}
            className={`flex min-h-14 flex-col items-center justify-center rounded-[18px] px-2 text-xs font-bold transition-transform active:scale-[0.96] ${
              active ? "bg-black text-white" : "text-black"
            }`}
          >
            <Icon
              size={item.compact ? 16 : 20}
              strokeWidth={2.2}
              className={item.compact ? "opacity-70" : undefined}
            />
            {item.label && <span className="mt-1">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
