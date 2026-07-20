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
        className="block text-sm font-semibold tracking-[-0.01em] text-black"
      >
        {label}
      </label>

      <div className="mt-2">{children}</div>

      {description && !error && (
        <p className="mt-2 text-xs leading-5 text-black/45">{description}</p>
      )}

      {error && (
        <p className="mt-2 text-xs font-medium leading-5 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
