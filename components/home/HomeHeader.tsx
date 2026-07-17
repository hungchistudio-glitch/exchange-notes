"use client";

import PageHeader from "@/components/ui/PageHeader";

type HomeHeaderProps = {
  greeting: string;
  streakDays: number;
};

export default function HomeHeader({ greeting, streakDays }: HomeHeaderProps) {
  return (
    <PageHeader
      eyebrow={greeting}
      title="Exchange Notes"
      description="Build useful vocabulary from the life happening around you."
      trailing={
        <div className="rounded-full border border-black/[0.06] bg-white px-3 py-2 text-[11px] font-semibold shadow-[0_8px_26px_rgba(16,16,15,0.05)]">
          {streakDays > 0 ? `🔥 ${streakDays}d` : "Start today"}
        </div>
      }
    />
  );
}
