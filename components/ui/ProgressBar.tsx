type ProgressBarProps = {
  value: number;
  max: number;
};

export default function ProgressBar({
  value,
  max,
}: ProgressBarProps) {
  const percent =
    max <= 0
      ? 0
      : Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="space-y-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#E6EBE2]">
        <div
          className="h-full rounded-full bg-[#5E7555] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-[#6B7268]">
        <span>{percent}%</span>
        <span>{Math.max(max - value, 0)} left</span>
      </div>
    </div>
  );
}
