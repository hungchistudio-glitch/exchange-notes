type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
};

const sizeClasses = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-9 border-[3px]",
};

export default function LoadingSpinner({
  size = "md",
  label = "Loading",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`
        inline-block
        animate-spin
        rounded-full
        border-[#D2DEC9]
        border-t-[#5E7555]
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}
