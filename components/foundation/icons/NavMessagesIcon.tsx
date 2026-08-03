type NavIconProps = {
  className?: string;
  active?: boolean;
};

// "Communication Pulse" — a soft, rounded bubble carrying a minimal
// waveform instead of text lines, so it reads as message + voice +
// translation at once. The waveform tightens and brightens once selected,
// like a message that just landed.
export default function NavMessagesIcon({
  className = "h-5 w-5",
  active = false,
}: NavIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.5 6.5c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2v7c0 1.1-.9 2-2 2H10l-4 3.2V15.5H6.5c-1.1 0-2-.9-2-2v-7Z" />
      <path
        d={active ? "M8.5 8.5v3" : "M8.5 9v2"}
        opacity={active ? 1 : 0.55}
      />
      <path
        d={active ? "M12 7.5v5" : "M12 8.5v3"}
        opacity={active ? 1 : 0.55}
      />
      <path
        d={active ? "M15.5 9v2.5" : "M15.5 9.3v1.4"}
        opacity={active ? 1 : 0.55}
      />
    </svg>
  );
}
