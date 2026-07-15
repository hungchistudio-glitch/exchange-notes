"use client";

type HomeHeaderProps = {
  greeting: string;
  streakDays: number;
};

export default function HomeHeader({ greeting, streakDays }: HomeHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-5">
      <div>
        <p className="text-[13px] font-medium text-black/45">{greeting}</p>

        <h1 className="mt-2 text-[42px] font-semibold leading-none tracking-[-0.055em]">
          Exchange Notes
        </h1>

        <p className="mt-4 text-[16px] leading-7 text-black/55">
          Learn through real life.
        </p>
      </div>

      <div className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[12px] font-semibold shadow-[0_5px_20px_rgba(0,0,0,0.05)]">
        🔥 {streakDays} day
      </div>
    </header>
  );
}
