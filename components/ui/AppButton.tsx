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

  /**
   * Displays a loading indicator and disables the button.
   */
  loading?: boolean;

  /**
   * Temporary backwards-compatible alias for loading.
   */
  isLoading?: boolean;

  /**
   * Makes the button fill the available width.
   */
  fullWidth?: boolean;

  /**
   * Optional content displayed before the label.
   */
  leftIcon?: ReactNode;

  /**
   * Optional content displayed after the label.
   */
  rightIcon?: ReactNode;

  /**
   * Accessible label announced while loading.
   */
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
        <>
          <LoadingSpinner />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {leftIcon ? (
            <span
              aria-hidden="true"
              className="inline-flex shrink-0 items-center"
            >
              {leftIcon}
            </span>
          ) : null}

          <span>{children}</span>

          {rightIcon ? (
            <span
              aria-hidden="true"
              className="inline-flex shrink-0 items-center"
            >
              {rightIcon}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}
