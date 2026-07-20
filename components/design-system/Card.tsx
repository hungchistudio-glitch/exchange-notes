import type {
  HTMLAttributes,
  ReactNode,
} from "react";

import { cn, ui } from "./tokens";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
  padding?: "none" | "compact" | "default";
};

const paddingClasses = {
  none: "",
  compact: "p-4",
  default: "p-5",
};

export default function Card({
  children,
  interactive = false,
  padding = "default",
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "border bg-white",
        ui.colors.border,
        ui.radius.card,
        ui.shadow.card,
        paddingClasses[padding],
        interactive &&
          "transition-all duration-200 hover:-translate-y-0.5 hover:border-black/[0.10]",
        interactive && ui.shadow.hover,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
