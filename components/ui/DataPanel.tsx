type DataRow = {
  label: string;
  value: string | number;
};

type Props = {
  rows: DataRow[];
};

export default function DataPanel({
  rows,
}: Props) {
  return (
    <section className="mt-10 border-y border-black/10 py-5">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between py-2"
        >
          <span className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">
            {row.label}
          </span>

          <span className="text-sm font-medium tracking-tight">
            {row.value}
          </span>
        </div>
      ))}
    </section>
  );
}
