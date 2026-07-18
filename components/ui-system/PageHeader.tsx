import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  action,
}: Props) {
  return (
    <header className="flex items-start justify-between">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-2 text-neutral-500">
            {subtitle}
          </p>
        )}
      </div>

      {action}
    </header>
  );
}
