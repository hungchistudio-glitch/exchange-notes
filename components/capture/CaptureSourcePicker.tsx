"use client";

import {
  Camera,
  ImagePlus,
  LoaderCircle,
} from "lucide-react";

import AppCard from "@/components/ui/AppCard";
import useTranslation from "@/hooks/i18n/useTranslation";

type CaptureSourcePickerProps = {
  cameraStarting: boolean;
  cameraSupported: boolean;
  onCamera: () => void;
  onChooseImage: () => void;
};

export default function CaptureSourcePicker({
  cameraStarting,
  cameraSupported,
  onCamera,
  onChooseImage,
}: CaptureSourcePickerProps) {
  const { t } = useTranslation();
  const copy = t.capture.source;

  return (
    <AppCard
      padding="lg"
      className="mt-6 text-center sm:px-2"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-black/34">
        {copy.eyebrow}
      </p>

      <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.04em]">
        {copy.title}
      </h2>

      <p className="mx-auto mt-3 max-w-md text-[13px] leading-[1.75] text-black/46">
        {copy.description}
      </p>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCamera}
          disabled={cameraStarting}
          className="flex min-h-[132px] flex-col items-center justify-center rounded-[21px] bg-black px-4 text-white transition-transform active:scale-[0.985] disabled:opacity-45"
        >
          {cameraStarting ? (
            <LoaderCircle
              size={25}
              className="animate-spin"
            />
          ) : (
            <Camera
              size={27}
              strokeWidth={1.7}
            />
          )}

          <span className="mt-4 text-[14px] font-semibold tracking-[-0.01em]">
            {cameraStarting
              ? copy.cameraStarting
              : copy.takePhoto}
          </span>

          <span className="mt-1 text-[10px] text-white/52">
            {copy.useCamera}
          </span>
        </button>

        <button
          type="button"
          onClick={onChooseImage}
          className="flex min-h-[132px] flex-col items-center justify-center rounded-[21px] border border-black/[0.07] bg-[#f7f4ee] px-4 transition-transform active:scale-[0.985]"
        >
          <ImagePlus
            size={27}
            strokeWidth={1.7}
          />

          <span className="mt-4 text-[14px] font-semibold tracking-[-0.01em]">
            {copy.chooseImage}
          </span>

          <span className="mt-1 text-[10px] text-black/38">
            {copy.photoLibrary}
          </span>
        </button>
      </div>

      {!cameraSupported ? (
        <p className="mt-5 text-[12px] leading-5 text-black/38">
          {copy.unsupported}
        </p>
      ) : null}
    </AppCard>
  );
}
