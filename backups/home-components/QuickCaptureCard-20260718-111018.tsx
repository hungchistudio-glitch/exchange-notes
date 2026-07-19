"use client";

import type { RefObject } from "react";
import { Camera, ImagePlus } from "lucide-react";

import AppCard from "@/components/ui/AppCard";

type QuickCaptureCardProps = {
  cameraInputRef: RefObject<HTMLInputElement | null>;
  libraryInputRef: RefObject<HTMLInputElement | null>;
};

export default function QuickCaptureCard({
  cameraInputRef,
  libraryInputRef,
}: QuickCaptureCardProps) {
  return (
    <AppCard>
      <p className="app-section-label">Quick capture</p>
      <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.035em]">
        Learn what you see.
      </h2>
      <p className="mt-2 text-[14px] leading-6 text-black/48">
        Turn a real-life photo into a bilingual vocabulary card.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex min-h-[104px] flex-col justify-between rounded-[20px] bg-black p-4 text-left text-white transition-transform active:scale-[0.98]"
        >
          <Camera size={21} strokeWidth={1.85} />
          <span className="text-[13px] font-semibold">Take photo</span>
        </button>

        <button
          type="button"
          onClick={() => libraryInputRef.current?.click()}
          className="flex min-h-[104px] flex-col justify-between rounded-[20px] bg-[#ebe7de] p-4 text-left text-black transition-transform active:scale-[0.98]"
        >
          <ImagePlus size={21} strokeWidth={1.85} />
          <span className="text-[13px] font-semibold">Choose photo</span>
        </button>
      </div>
    </AppCard>
  );
}
