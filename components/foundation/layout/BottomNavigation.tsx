"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type NavigationItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
};

type BottomNavigationProps = {
  items: NavigationItem[];
};

// Avoids a React warning about useLayoutEffect during server rendering,
// while still measuring synchronously (no flash) once hydrated.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function BottomNavigation({ items }: BottomNavigationProps) {
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
  } | null>(null);

  const activeIndex = items.findIndex((item) => item.active);

  useIsomorphicLayoutEffect(() => {
    const activeElement = itemRefs.current[activeIndex];

    if (!activeElement) {
      setIndicator(null);
      return;
    }

    setIndicator({
      left: activeElement.offsetLeft,
      width: activeElement.offsetWidth,
    });
  }, [activeIndex, items.length]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.625rem)",
      }}
      aria-label="Primary navigation"
    >
      <div className="relative w-full max-w-xl rounded-full border border-line bg-white p-1 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        {indicator && (
          <div
            aria-hidden="true"
            className="absolute inset-y-1 left-0 rounded-full bg-black transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.left}px)`,
            }}
          />
        )}

        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item, index) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              prefetch={false}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              aria-current={item.active ? "page" : undefined}
              className={`z-10 flex flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium transition-colors duration-300 ${
                item.active && indicator
                  ? "text-white"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
