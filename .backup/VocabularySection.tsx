import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function VocabularySection({
  title,
  subtitle,
  children,
}: Props) {
  return (
    <section className="mb-10">

      <div className="mb-5 flex items-end justify-between">

        <div>

          <h2 className="text-xl font-bold tracking-tight">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-sm text-neutral-500">
              {subtitle}
            </p>
          )}

        </div>

      </div>

      {children}

    </section>
  );
}
