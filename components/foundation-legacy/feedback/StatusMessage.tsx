import { ReactNode } from "react";

type StatusMessageTone = "info" | "success" | "danger";

type StatusMessageProps = {
  children: ReactNode;
  tone?: StatusMessageTone;
  className?: string;
};

const toneClasses: Record<StatusMessageTone, string> = {
  info: "bg-white text-black/65",
  success: "bg-emerald-50 text-emerald-800",
  danger: "bg-red-50 text-red-700",
};

export default function StatusMessage({
  children,
  tone = "info",
  className = "",
}: StatusMessageProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={[
        "rounded-2xl px-4 py-3 text-sm font-medium leading-6",
        toneClasses[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
