import { ReactNode } from "react";

export default function PageTitle({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <h1 className="text-[32px] font-semibold tracking-tight text-stone-800">
      {children}
    </h1>
  );
}
