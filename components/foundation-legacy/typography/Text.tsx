import {
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
} from "react";

type TextTone = "default" | "muted" | "subtle" | "danger" | "success";
type TextAlign = "left" | "center" | "right";
type TextWeight = "regular" | "medium" | "semibold" | "bold";

type TextProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  tone?: TextTone;
  align?: TextAlign;
  weight?: TextWeight;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className" | "color"
>;

const toneClasses: Record<TextTone, string> = {
  default: "text-black",
  muted: "text-neutral-600",
  subtle: "text-neutral-500",
  danger: "text-red-600",
  success: "text-emerald-700",
};

const alignClasses: Record<TextAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const weightClasses: Record<TextWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export default function Text<T extends ElementType = "p">({
  as,
  children,
  className = "",
  tone = "default",
  align = "left",
  weight = "regular",
  ...props
}: TextProps<T>) {
  const Component = as ?? "p";

  return (
    <Component
      className={[
        toneClasses[tone],
        alignClasses[align],
        weightClasses[weight],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}
