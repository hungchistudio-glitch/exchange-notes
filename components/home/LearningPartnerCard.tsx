import Link from "next/link";

import Card from "@/components/foundation/cards/Card";

export default function LearningPartnerCard() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dbead6] text-sm font-bold text-[#2f6c38]">
          LP
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-neutral-400">
            Learning Partner
          </p>

          <p className="mt-0.5 truncate text-sm font-semibold">
            Practice together every day
          </p>
        </div>

        <Link
          href="/messages"
          className="rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-transform active:scale-95"
        >
          Message
        </Link>
      </div>
    </Card>
  );
}
