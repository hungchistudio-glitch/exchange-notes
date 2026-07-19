type Props = {
  value: number;
};

export default function ProgressRing({ value }: Props) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-[8px] border-[#D2DEC9]">
      <span className="text-lg font-semibold text-[#4C6144]">
        {pct}%
      </span>
    </div>
  );
}
