import {
  Volume2,
  Brain,
  Pencil,
  Share2,
} from "lucide-react";

import AppButton from "@/components/ui/AppButton";
import SectionCard from "@/components/design/SectionCard";

export default function VocabularyQuickActions() {
  const actions = [
    {
      icon: Volume2,
      label: "Speak",
    },
    {
      icon: Brain,
      label: "Review",
    },
    {
      icon: Pencil,
      label: "Edit",
    },
    {
      icon: Share2,
      label: "Share",
    },
  ];

  return (
    <SectionCard>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <AppButton
              key={action.label}
              variant="secondary"
              className="flex items-center justify-center gap-2 py-3"
            >
              <Icon size={18} />
              <span>{action.label}</span>
            </AppButton>
          );
        })}
      </div>
    </SectionCard>
  );
}
