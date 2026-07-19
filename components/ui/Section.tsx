import type { ReactNode } from "react";

type Props = {
  title?: ReactNode;
  children: ReactNode;
};

export default function Section({
  title,
  children,
}: Props) {
  return (
    <section className="space-y-4">
      {title && (
        <h2 className="text-lg font-semibold">
          {title}
        </h2>
      )}

      {children}
    </section>
  );
}
