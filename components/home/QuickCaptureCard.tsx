"use client";

import type { RefObject } from "react";
import { Camera, ImagePlus } from "lucide-react";

type QuickCaptureCardProps = {
  cameraInputRef: RefObject<HTMLInputElement | null>;
  libraryInputRef: RefObject<HTMLInputElement | null>;
};

export default function QuickCaptureCard({
  cameraInputRef,
  libraryInputRef,
}: QuickCaptureCardProps) {
  return (
    <section className="rounded-[30px] bg-white p-5 shadow-[0_10px_35px_rgba(0,0,0,0.045)] sm:p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">
          Quick capture
        </p>

        <h2 className="mt-3 text-[26px] font-semibold tracking-[-0.035em]">
          Learn what you see.
        </h2>

        <p className="mt-2 text-[14px] leading-6 text-black/50">
          Take a photo or choose one from your library.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex min-h-[112px] flex-col justify-between rounded-[22px] bg-black p-4 text-left text-white transition-transform active:scale-[0.98]"
        >
          <Camera size={22} strokeWidth={1.8} />
          <span className="text-[13px] font-semibold">Take Photo</span>
        </button>

        <button
          type="button"
          onClick={() => libraryInputRef.current?.click()}
          className="flex min-h-[112px] flex-col justify-between rounded-[22px] bg-[#f5f2eb] p-4 text-left text-black transition-transform active:scale-[0.98]"
        >
          <ImagePlus size={22} strokeWidth={1.8} />
          <span className="text-[13px] font-semibold">Choose Photo</span>
        </button>
      </div>
    </section>
  );
}
