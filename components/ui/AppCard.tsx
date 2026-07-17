import type { ElementType, HTMLAttributes, ReactNode } from "react";

type AppCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: ElementType;
  tone?: "surface" | "soft" | "dark";
  padding?: "none" | "sm" | "md" | "lg";
};

export default function AppCard({
  children,
  as: Component = "section",
  tone = "surface",
  padding = "md",
  className = "",
  ...props
}: AppCardProps) {
  return (
    <Component
      className={`app-card app-card--${tone} app-card--${padding} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
