"use client";

import { Trash2 } from "lucide-react";
import { useSwipeable } from "react-swipeable";

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
};

export default function SwipeableConversationCard({
  children,
  onDelete,
}: Props) {
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      onDelete();
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  return (
    <div {...handlers} className="relative overflow-hidden rounded-3xl">
      {children}

      <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-red-500">
        <Trash2 size={22} />
      </div>
    </div>
  );
}
