import type { ReactNode } from "react";

import AppCard from "@/components/ui/AppCard";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <AppCard className={`app-empty-state ${className}`} padding="lg">
      <div className="app-empty-state__icon">{icon}</div>
      <h2 className="app-empty-state__title">{title}</h2>
      <p className="app-empty-state__description">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </AppCard>
  );
}
