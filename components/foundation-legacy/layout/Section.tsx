import { HTMLAttributes, ReactNode } from "react";

type SectionSpacing = "none" | "sm" | "md" | "lg" | "xl";

type SectionProps = {
  children: ReactNode;
  className?: string;
  spacing?: SectionSpacing;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

const spacingClasses: Record<SectionSpacing, string> = {
  none: "",
  sm: "py-3",
  md: "py-5",
  lg: "py-8",
  xl: "py-12",
};

export default function Section({
  children,
  className = "",
  spacing = "lg",
  ...props
}: SectionProps) {
  return (
    <section
      className={[spacingClasses[spacing], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </section>
  );
}
