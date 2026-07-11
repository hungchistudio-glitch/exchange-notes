"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  MessageCircle,
  Search,
  UserRound,
} from "lucide-react";

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
    <nav className="fixed inset-x-3 bottom-3 z-50 mx-auto grid max-w-md grid-cols-4 rounded-[26px] border border-black/10 bg-white p-2 shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-14 flex-col items-center justify-center rounded-[18px] px-2 text-xs font-bold ${
              active
                ? "bg-black text-white"
                : "text-black"
            }`}
          >
            <Icon size={20} strokeWidth={2.2} />
            <span className="mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
