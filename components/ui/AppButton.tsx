import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

export type AppButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

export type AppButtonSize =
  | "sm"
  | "md"
  | "lg"
  | "icon";

export type AppButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children: ReactNode;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loadingLabel?: string;
};

function LoadingSpinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 animate-spin"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}

export default function AppButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  loading = false,
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  loadingLabel = "Loading",
  disabled,
  ...props
}: AppButtonProps) {
  const buttonIsLoading = loading || isLoading;
  const buttonIsDisabled = disabled || buttonIsLoading;

  return (
    <button
      type={type}
      disabled={buttonIsDisabled}
      aria-busy={buttonIsLoading || undefined}
      className={[
        "app-button",
        `app-button--${variant}`,
        `app-button--${size}`,
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {buttonIsLoading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <LoadingSpinner />
          <span>{loadingLabel}</span>
        </span>
      ) : (
        <span className="inline-flex items-center justify-center gap-2">
          {leftIcon && (
            <span className="inline-flex shrink-0 items-center">
              {leftIcon}
            </span>
          )}

          <span>{children}</span>

          {rightIcon && (
            <span className="inline-flex shrink-0 items-center">
              {rightIcon}
            </span>
          )}
        </span>
      )}
    </button>
  );
}
