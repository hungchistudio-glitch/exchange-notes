import { LoaderCircle } from "lucide-react";

export default function VocabularyLoadingState() {
  return (
    <section
      aria-label="Loading vocabulary"
      aria-live="polite"
      className="mt-8 flex min-h-40 items-center justify-center rounded-[28px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.035)]"
    >
      <div className="flex flex-col items-center gap-3 text-black/40">
        <LoaderCircle
          className="animate-spin"
          size={24}
          strokeWidth={1.8}
        />

        <span className="text-[12px] font-medium">
          Loading your words
        </span>
      </div>
    </section>
  );
}
