type ProfileIconProps = {
  className?: string;
};

export default function ProfileIcon({
  className = "h-5 w-5",
}: ProfileIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3" />
      <path
        strokeLinecap="round"
        d="M5.5 19a6.5 6.5 0 0113 0"
      />
    </svg>
  );
}
