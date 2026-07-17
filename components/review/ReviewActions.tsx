"use client";

import type { VocabularyItem } from "@/lib/types/app";
import type { ReviewGrade } from "@/lib/review/scheduler";
import { formatNextReview } from "@/lib/review/scheduler";

type ReviewActionsProps = {
  item: VocabularyItem;
  disabled?: boolean;
  onGrade: (grade: ReviewGrade) => void;
};

const actions: Array<{
  grade: ReviewGrade;
  label: string;
  className: string;
}> = [
  { grade: "again", label: "Again", className: "bg-[#f9e8e5] text-[#9a3f35]" },
  { grade: "hard", label: "Hard", className: "bg-[#f7eedb] text-[#8a6425]" },
  { grade: "good", label: "Good", className: "bg-[#e8f0e7] text-[#3f6945]" },
  { grade: "easy", label: "Easy", className: "bg-black text-white" },
];

export default function ReviewActions({
  item,
  disabled = false,
  onGrade,
}: ReviewActionsProps) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {actions.map((action) => (
        <button
          key={action.grade}
          type="button"
          disabled={disabled}
          onClick={() => onGrade(action.grade)}
          className={`min-h-[62px] rounded-[18px] px-2 text-center transition active:scale-[0.98] disabled:opacity-50 ${action.className}`}
        >
          <span className="block text-[12px] font-bold">{action.label}</span>
          <span className="mt-1 block text-[9px] font-semibold opacity-65">
            {formatNextReview(action.grade, item)}
          </span>
        </button>
      ))}
    </div>
  );
}
