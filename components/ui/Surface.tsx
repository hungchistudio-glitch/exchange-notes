import type { HTMLAttributes } from "react";

type SurfaceTone = "default" | "forest" | "earth" | "muted";

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  tone?: SurfaceTone;
  padding?: "none" | "sm" | "md" | "lg";
};

const tones: Record<SurfaceTone, string> = {
  default: "border-[#E3E3DC] bg-white/90",
  forest: "border-[#D2DEC9] bg-[#F4F7F2]",
  earth: "border-[#DFCFBE] bg-[#F7F1EA]",
  muted: "border-[#E3E3DC] bg-[#F4F5F0]",
};

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export default function Surface({
  tone = "default",
  padding = "md",
  className = "",
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={`
        rounded-[22px]
        border
        shadow-[var(--en-shadow-card)]
        ${tones[tone]}
        ${paddings[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
