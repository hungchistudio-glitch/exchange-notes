"use client";

import type { RefObject } from "react";
import {
  Camera,
  ImagePlus,
  ScanLine,
  Sparkles,
} from "lucide-react";

import { Surface } from "@/components/ui";

type QuickCaptureCardProps = {
  cameraInputRef: RefObject<HTMLInputElement | null>;
  libraryInputRef: RefObject<HTMLInputElement | null>;
};

export default function QuickCaptureCard({
  cameraInputRef,
  libraryInputRef,
}: QuickCaptureCardProps) {
  return (
    <Surface
      tone="earth"
      padding="lg"
      className="relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-14
          -top-16
          size-48
          rounded-full
          bg-[#DFCFBE]/45
          blur-2xl
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-20
          -left-16
          size-44
          rounded-full
          bg-[#D2DEC9]/35
          blur-2xl
        "
      />

      <div className="relative">
        <div className="flex items-start gap-4">
          <span
            className="
              flex
              size-12
              shrink-0
              items-center
              justify-center
              rounded-[18px]
              border
              border-[#DFCFBE]
              bg-white/70
              text-[#7D634F]
              shadow-sm
            "
          >
            <ScanLine size={22} strokeWidth={1.9} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9C7E63]">
                AI capture
              </p>

              <Sparkles
                aria-hidden="true"
                size={14}
                strokeWidth={1.9}
                className="text-[#9C7E63]"
              />
            </div>

            <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.035em] text-[#2F312D]">
              Learn what you see.
            </h2>

            <p className="mt-2 max-w-[440px] text-[14px] leading-6 text-[#666A63]">
              Photograph something around you and turn it into a bilingual
              vocabulary card.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="
              en-focus-ring
              group
              flex
              min-h-[116px]
              flex-col
              justify-between
              rounded-[20px]
              border
              border-[#4C6144]
              bg-[#4C6144]
              p-4
              text-left
              text-white
              shadow-sm
              transition
              duration-200
              hover:-translate-y-0.5
              hover:bg-[#394A35]
              hover:shadow-[0_12px_28px_rgba(57,74,53,0.18)]
              active:translate-y-0
              active:scale-[0.985]
            "
          >
            <span
              className="
                flex
                size-10
                items-center
                justify-center
                rounded-[14px]
                bg-white/12
                transition
                group-hover:bg-white/16
              "
            >
              <Camera size={20} strokeWidth={1.9} />
            </span>

            <span>
              <span className="block text-[14px] font-semibold">
                Take photo
              </span>

              <span className="mt-1 block text-[11px] leading-4 text-white/65">
                Open camera
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => libraryInputRef.current?.click()}
            className="
              en-focus-ring
              group
              flex
              min-h-[116px]
              flex-col
              justify-between
              rounded-[20px]
              border
              border-[#DFCFBE]
              bg-white/72
              p-4
              text-left
              text-[#3E423B]
              shadow-sm
              transition
              duration-200
              hover:-translate-y-0.5
              hover:border-[#CBB6A1]
              hover:bg-white
              hover:shadow-[0_12px_28px_rgba(95,75,58,0.10)]
              active:translate-y-0
              active:scale-[0.985]
            "
          >
            <span
              className="
                flex
                size-10
                items-center
                justify-center
                rounded-[14px]
                bg-[#EFE6DB]
                text-[#8C7059]
                transition
                group-hover:bg-[#E7D9C9]
              "
            >
              <ImagePlus size={20} strokeWidth={1.9} />
            </span>

            <span>
              <span className="block text-[14px] font-semibold">
                Choose photo
              </span>

              <span className="mt-1 block text-[11px] leading-4 text-[#777A73]">
                Browse library
              </span>
            </span>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] leading-5 text-[#777A73]">
          <Sparkles
            aria-hidden="true"
            size={13}
            strokeWidth={1.9}
            className="shrink-0 text-[#9C7E63]"
          />

          <span>
            AI will identify the object and prepare English and Traditional
            Chinese.
          </span>
        </div>
      </div>
    </Surface>
  );
}
