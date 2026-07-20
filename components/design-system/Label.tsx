import type {
  HTMLAttributes,
  ReactNode,
} from "react";

import { cn, ui } from "./tokens";

type LabelProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export default function Label({
  children,
  className,
  ...props
}: LabelProps) {
  return (
    <span
      className={cn(ui.typography.label, className)}
      {...props}
    >
      {children}
    </span>
  );
}
