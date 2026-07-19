import { cn } from "@/lib/utils";

export default function Divider({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-px w-full bg-black/[0.06]",
        className,
      )}
    />
  );
}
