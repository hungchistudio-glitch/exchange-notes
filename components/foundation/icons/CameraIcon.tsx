type CameraIconProps = {
    className?: string;
  };
  
  export default function CameraIcon({
    className = "h-5 w-5",
  }: CameraIconProps) {
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
          d="M4 8.5A1.5 1.5 0 015.5 7h2l1-1.5h7L16.5 7h2A1.5 1.5 0 0120 8.5V17a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17V8.5z"
        />
        <circle cx="12" cy="12.5" r="3.2" />
      </svg>
    );
  }