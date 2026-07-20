import { Camera } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/foundation";

export default function VocabularyEmptyLibraryState() {
  return (
    <EmptyState
      className="mt-8 rounded-[28px] py-9 shadow-[0_4px_20px_rgba(0,0,0,0.035)]"
      icon={<Camera size={23} strokeWidth={1.7} />}
      title="Your first word begins outside"
      description="Photograph something from daily life and save its English and Traditional Chinese meaning."
      action={
        <Link
          href="/capture"
          className="mx-auto flex h-12 max-w-sm items-center justify-center rounded-full bg-black px-5 text-[13px] font-semibold text-white transition active:scale-[0.99]"
        >
          Discover a word
        </Link>
      }
    />
  );
}
