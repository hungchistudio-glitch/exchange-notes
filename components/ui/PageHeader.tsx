import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  leading,
  trailing,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`app-header ${className}`}>
      {leading ? <div className="app-header__leading">{leading}</div> : null}

      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
        <h1 className="app-title">{title}</h1>
        {description ? <p className="app-description">{description}</p> : null}
      </div>

      {trailing ? <div className="app-header__trailing">{trailing}</div> : null}
    </header>
  );
}
