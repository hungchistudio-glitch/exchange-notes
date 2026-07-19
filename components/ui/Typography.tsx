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

export function Subtitle({ children, className }: Props) {
  return (
    <h3
      className={cn(
        "text-[18px] font-semibold leading-7 text-neutral-900",
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function Body({ children, className }: Props) {
  return (
    <p
      className={cn(
        "text-[16px] leading-7 text-neutral-700",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Caption({ children, className }: Props) {
  return (
    <p
      className={cn(
        "text-[13px] leading-6 text-neutral-500",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Label({ children, className }: Props) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400",
        className,
      )}
    >
      {children}
    </p>
  );
}
