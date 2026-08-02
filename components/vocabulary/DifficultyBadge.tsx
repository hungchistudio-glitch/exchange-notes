type Props = {
  level: "new" | "learning" | "mastered";
};

const styles = {
  new: "bg-blue-100 text-blue-700",
  learning: "bg-amber-100 text-amber-700",
  mastered: "bg-green-100 text-green-700",
};

const labels = {
  new: "New",
  learning: "Learning",
  mastered: "Mastered",
};

export default function DifficultyBadge({
  level,
}: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}
