type ReviewProgressProps = {
  current: number;
  total: number;
};

export default function ReviewProgress({
  current,
  total,
}: ReviewProgressProps) {
  const percentage = total === 0 ? 0 : Math.min(100, (current / total) * 100);

  return (
    <div aria-label={`${current} of ${total} reviewed`}>
      <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-black/45">
        <span>{current} completed</span>
        <span>{Math.max(0, total - current)} left</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/[0.07]">
        <div
          className="h-full rounded-full bg-black transition-[width] duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
