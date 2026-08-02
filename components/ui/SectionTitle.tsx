import { ReactNode } from "react";

export default function SectionTitle({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <h2 className="text-xl font-semibold text-stone-700">
      {children}
    </h2>
  );
}
