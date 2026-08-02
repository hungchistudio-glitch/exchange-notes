type Props = {
  title: string;
  description: string;
};

export default function EmptyState({
  title,
  description,
}: Props) {
  return (
    <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-8 py-14 text-center">
      <h3 className="text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 text-sm text-neutral-500">
        {description}
      </p>
    </div>
  );
}
