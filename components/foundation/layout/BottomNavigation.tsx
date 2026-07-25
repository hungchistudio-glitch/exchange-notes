import Link from "next/link";
import type { ReactNode } from "react";

type NavigationItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
};

type BottomNavigationProps = {
  items: NavigationItem[];
};

export default function BottomNavigation({
  items,
}: BottomNavigationProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-[#f5f3ed]/95 backdrop-blur-xl"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Primary navigation"
    >
      <div
        className="mx-auto grid h-16 max-w-xl px-2"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
              item.active
                ? "text-neutral-950"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
