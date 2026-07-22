import { cn } from "@/lib/utils";

type Padding =
  | "none"
  | "sm"
  | "md"
  | "lg";

type Tone =
  | "default"
  | "secondary"
  | "elevated";

type Props = {
  children: React.ReactNode;
  className?: string;
  padding?: Padding;
  tone?: Tone;
};

const paddingClasses: Record<
  Padding,
  string
> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const toneClasses: Record<
  Tone,
  string
> = {
  default:
    "bg-[var(--en-surface)]",
  secondary:
    "bg-[var(--en-surface-secondary)]",
  elevated:
    "bg-[var(--en-page-elevated)]",
};

export default function AppCard({
  children,
  className,
  padding = "md",
  tone = "default",
}: Props) {
  return (
    <section
      className={cn(
        "overflow-hidden",
        "rounded-[28px]",
        "border border-[var(--en-border)]",
        "text-[var(--en-text-primary)]",
        "shadow-[0_8px_30px_rgba(0,0,0,0.05)]",
        "transition-colors",
        toneClasses[tone],
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </section>
  );
}
