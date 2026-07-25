type MessageIconProps = {
  className?: string;
};

export default function MessageIcon({
  className = "h-5 w-5",
}: MessageIconProps) {
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
        d="M5 5.5h14v10H9l-4 3v-13z"
      />
    </svg>
  );
}
