import {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classNames(
        "en-button",
        `en-button-${variant}`,
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Icon button                                                                */
/* -------------------------------------------------------------------------- */

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function IconButton({
  label,
  className,
  type = "button",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={classNames("en-icon-button", className)}
      {...props}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

type CardProps = HTMLAttributes<HTMLDivElement> & {
  dark?: boolean;
};

export function Card({ dark = false, className, ...props }: CardProps) {
  return (
    <div
      className={classNames(dark ? "en-card-dark" : "en-card", className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Input                                                                      */
/* -------------------------------------------------------------------------- */

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={classNames("en-input", className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                      */
/* -------------------------------------------------------------------------- */

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return <span className={classNames("en-badge", className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Page container                                                             */
/* -------------------------------------------------------------------------- */

type PageProps = HTMLAttributes<HTMLElement> & {
  narrow?: boolean;
};

export function Page({
  narrow = false,
  className,
  children,
  ...props
}: PageProps) {
  return (
    <main className={classNames("en-page", className)} {...props}>
      <div className={narrow ? "en-page-narrow" : undefined}>{children}</div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Page header                                                                */
/* -------------------------------------------------------------------------- */

type PageHeaderProps = {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export function PageHeader({ title, left, right, className }: PageHeaderProps) {
  return (
    <header className={classNames("en-page-header", className)}>
      <div>{left}</div>

      <h1 className="en-page-header-title">{title}</h1>

      <div className="flex justify-end">{right}</div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Editorial heading                                                          */
/* -------------------------------------------------------------------------- */

type EditorialHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function EditorialHeading({
  eyebrow,
  title,
  description,
  className,
}: EditorialHeadingProps) {
  return (
    <header className={classNames("space-y-5", className)}>
      {eyebrow ? <p className="en-eyebrow">{eyebrow}</p> : null}

      <h1 className="en-page-title">{title}</h1>

      {description ? (
        <p className="en-body-text max-w-2xl">{description}</p>
      ) : null}
    </header>
  );
}
