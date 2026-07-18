import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function Surface({
  children,
  className = "",
}: Props) {
  return (
    <section
      className={`
      rounded-[28px]
      border
      border-neutral-200
      bg-white
      p-6
      shadow-sm
      ${className}
      `}
    >
      {children}
    </section>
  );
}
