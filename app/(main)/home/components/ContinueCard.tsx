import { ArrowRight } from "lucide-react";
import HeroCard from "@/components/ui/HeroCard";
import Button from "@/components/ui/Button";

export default function ContinueCard() {
  return (
    <HeroCard
      title="Continue today's journey"
      subtitle="Keep building your vocabulary one word at a time."
    >
      <Button
        trailingIcon={<ArrowRight size={18} />}
      >
        Continue
      </Button>
    </HeroCard>
  );
}
