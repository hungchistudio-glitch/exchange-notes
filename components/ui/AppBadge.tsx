import type { HTMLAttributes, ReactNode } from "react";

type AppBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: "neutral" | "dark" | "success" | "warning";
};

export default function AppBadge({
  children,
  tone = "neutral",
  className = "",
  ...props
}: AppBadgeProps) {
  return (
    <span className={`app-badge app-badge--${tone} ${className}`} {...props}>
      {children}
    </span>
  );
}
