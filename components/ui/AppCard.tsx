import { cn } from "@/lib/utils";

type Padding =
  | "none"
  | "sm"
  | "md"
  | "lg";

type Props = {
  children: React.ReactNode;
  className?: string;
  padding?: Padding;
};

const paddingClasses: Record<Padding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function AppCard({
  children,
  className,
  padding = "md",
}: Props) {
  return (
    <section
      className={cn(
        "overflow-hidden",
        "rounded-[28px]",
        "border border-black/[0.06]",
        "bg-white",
        "shadow-[0_8px_30px_rgba(0,0,0,.05)]",
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </section>
  );
}
