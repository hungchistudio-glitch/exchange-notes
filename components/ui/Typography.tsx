import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function Display({ children, className }: Props) {
  return (
    <h1
      className={cn(
        "text-[32px] font-bold tracking-[-0.055em] leading-[1.05] text-neutral-950",
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function Title({ children, className }: Props) {
  return (
    <h2
      className={cn(
        "text-[24px] font-semibold tracking-[-0.03em] leading-tight text-neutral-950",
        className,
      )}
    >
      {children}
    </h2>
  );
}