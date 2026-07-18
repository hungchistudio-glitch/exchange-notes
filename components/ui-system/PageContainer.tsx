import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function PageContainer({
  children,
}: Props) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      {children}
    </main>
  );
}
