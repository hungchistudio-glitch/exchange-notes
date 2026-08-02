type CompassIconProps = {
  className?: string;
};

export default function CompassIcon({
  className = "h-5 w-5",
}: CompassIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.5 9.5l-2 5-3-1.5 2-5 3 1.5z"
      />
    </svg>
  );
}
