import Surface from "@/components/ui/Surface";

export default function ReviewCard() {
  return (
    <Surface tone="forest">
      <div className="space-y-2">

        <div className="text-sm text-[#768B6F]">
          Today's Review
        </div>

        <div className="text-3xl font-semibold">
          18
        </div>

        <div className="text-sm text-stone-500">
          cards waiting
        </div>

      </div>
    </Surface>
  );
}
