type BookIconProps = {
  className?: string;
};

export default function BookIcon({
  className = "h-5 w-5",
}: BookIconProps) {
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
        d="M4.5 5.5c2-1 5-1 7.5.5 2.5-1.5 5.5-1.5 7.5-.5v12c-2-1-5-1-7.5.5-2.5-1.5-5.5-1.5-7.5-.5v-12z"
      />
      <path strokeLinecap="round" d="M12 6v12" />
    </svg>
  );
}
