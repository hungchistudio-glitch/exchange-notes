import type { HTMLAttributes, ReactNode } from "react";

type ScreenProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  contentClassName?: string;
};

export default function Screen({
  children,
  className = "",
  contentClassName = "",
  ...props
}: ScreenProps) {
  return (
    <main
      className={[
        "min-h-[100dvh] bg-surface text-neutral-950",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <div
        className={[
          "mx-auto min-h-[100dvh] w-full max-w-xl pb-28",
          contentClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </main>
  );
}
