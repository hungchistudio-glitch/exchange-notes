import { UserRound } from "lucide-react";

type AvatarSize = "sm" | "md" | "lg" | "xl";

type AvatarProps = {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  loading?: boolean;
  className?: string;
};

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
};

const textClasses: Record<AvatarSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
  xl: "text-xl",
};

export default function Avatar({
  src,
  alt = "Profile",
  fallback,
  size = "md",
  loading = false,
  className = "",
}: AvatarProps) {
  const fallbackText = fallback?.trim().slice(0, 1).toUpperCase();

  return (
    <span
      className={[
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-gradient-to-br from-neutral-900 to-neutral-700 text-white",
        "ring-4 ring-white",
        sizeClasses[size],
        textClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : fallbackText ? (
        <span className="font-semibold">{fallbackText}</span>
      ) : (
        <UserRound
          size={size === "xl" ? 28 : size === "lg" ? 22 : 17}
          strokeWidth={1.7}
        />
      )}

      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-r-white" />
        </span>
      ) : null}
    </span>
  );
}
