import Button from "@/components/ui/Button";

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-4">

      <Button variant="secondary">
        Review
      </Button>

      <Button variant="secondary">
        Add Word
      </Button>

    </div>
  );
}
