import type { ReactNode } from "react";

import Button from "./Button";
import Label from "./Label";
import { cn, ui } from "./tokens";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  className?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actionLabel,
  actionIcon,
  onAction,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("py-6", className)}>
      {eyebrow && <Label>{eyebrow}</Label>}

      <div className="mt-2 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className={ui.typography.pageTitle}>
            {title}
          </h1>

          {description && (
            <p className={cn("mt-2", ui.typography.body)}>
              {description}
            </p>
          )}

          {meta && (
            <p className={cn("mt-2", ui.typography.caption)}>
              {meta}
            </p>
          )}
        </div>

        {actionLabel && onAction && (
          <Button
            variant="secondary"
            size="small"
            onClick={onAction}
            className="shrink-0"
          >
            {actionIcon}
            {actionLabel}
          </Button>
        )}
      </div>
    </header>
  );
}
