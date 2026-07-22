import { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  description?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
};

export default function FormField({
  label,
  children,
  description,
  error,
  htmlFor,
  className = "",
}: FormFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block text-[14px] font-semibold tracking-[-0.015em] text-[var(--en-text-primary)]"
      >
        {label}
      </label>

      <div className="mt-2.5">
        {children}
      </div>

      {description && !error ? (
        <p className="mt-2 text-xs leading-5 text-[var(--en-text-tertiary)]">
          {description}
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs font-medium leading-5 text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}
