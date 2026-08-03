type NavIconProps = {
  className?: string;
  active?: boolean;
};

// "Language Core" — two facing arcs (reads as an open book, a mouth mid-
// syllable, or Yumi's own bracket silhouette) around a small central
// node. The node fills in solid once selected, like a word just landed.
export default function NavVocabularyIcon({
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
      className={className}
      aria-hidden="true"
    >
      <path d={active ? "M7 4.5 A8 8 0 0 0 7 19.5" : "M7.6 5 A7.3 7.3 0 0 0 7.6 19"} />
      <path d={active ? "M17 4.5 A8 8 0 0 1 17 19.5" : "M16.4 5 A7.3 7.3 0 0 1 16.4 19"} />
      <circle
        cx="12"
        cy="12"
        r="1.6"
        fill={active ? "currentColor" : "none"}
        stroke={active ? "none" : "currentColor"}
      />
    </svg>
  );
}
