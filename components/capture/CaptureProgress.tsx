import { Check } from "lucide-react";

type Step = "photo" | "analyze" | "review" | "save";

type CaptureProgressProps = {
  current: Step;
};

const steps: Array<{ id: Step; label: string }> = [
  { id: "photo", label: "Photo" },
  { id: "analyze", label: "Analyze" },
  { id: "review", label: "Review" },
  { id: "save", label: "Save" },
];

export default function CaptureProgress({ current }: CaptureProgressProps) {
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <div aria-label="Capture progress" className="grid grid-cols-4 gap-2">
      {steps.map((step, index) => {
        const complete = index < currentIndex;
        const active = index === currentIndex;

        return (
          <div key={step.id} className="min-w-0">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                complete || active ? "bg-black" : "bg-black/[0.08]"
              }`}
            />
            <div className="mt-2 flex items-center gap-1.5">
              {complete ? (
                <Check size={11} strokeWidth={2.2} className="shrink-0" />
              ) : null}
              <span
                className={`truncate text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  active || complete ? "text-black/70" : "text-black/28"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
