type HomeIconProps = {
  className?: string;
};

export default function HomeIcon({
  className = "h-5 w-5",
}: HomeIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 11l8-6.5L20 11v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-8z"
      />
    </svg>
  );
}
