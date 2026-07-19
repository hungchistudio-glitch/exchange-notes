import Card from "./Card";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
};

export default function StatCard({
  title,
  value,
  subtitle,
}: Props) {
  return (
    <Card className="p-5">
      <p className="text-sm text-neutral-500">
        {title}
      </p>

      <div className="mt-2 text-3xl font-bold">
        {value}
      </div>

      {subtitle && (
        <p className="mt-2 text-sm text-neutral-400">
          {subtitle}
        </p>
      )}
    </Card>
  );
}
