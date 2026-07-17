import { Camera, ImagePlus, LoaderCircle } from "lucide-react";

import AppCard from "@/components/ui/AppCard";

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
  return (
    <AppCard padding="lg" className="mt-6 text-center">
      <p className="app-eyebrow">English × 繁體中文</p>
      <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.045em]">
        Turn life into words
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-[14px] leading-6 text-black/48">
        Photograph an object or choose an image. AI will create a bilingual
        vocabulary card that you can review before saving.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCamera}
          disabled={cameraStarting}
          className="flex min-h-[136px] flex-col items-center justify-center rounded-[22px] bg-black px-4 text-white transition-transform active:scale-[0.985] disabled:opacity-45"
        >
          {cameraStarting ? (
            <LoaderCircle size={25} className="animate-spin" />
          ) : (
            <Camera size={27} strokeWidth={1.7} />
          )}
          <span className="mt-4 text-[14px] font-semibold">Take photo</span>
          <span className="mt-1 text-[11px] text-white/55">Use camera</span>
        </button>

        <button
          type="button"
          onClick={onChooseImage}
          className="flex min-h-[136px] flex-col items-center justify-center rounded-[22px] border border-black/[0.07] bg-[#f7f4ee] px-4 transition-transform active:scale-[0.985]"
        >
          <ImagePlus size={27} strokeWidth={1.7} />
          <span className="mt-4 text-[14px] font-semibold">Choose image</span>
          <span className="mt-1 text-[11px] text-black/40">Photo library</span>
        </button>
      </div>

      {!cameraSupported ? (
        <p className="mt-5 text-[12px] leading-5 text-black/38">
          Live preview is unavailable in this browser. Your device camera can
          still open through the photo picker.
        </p>
      ) : null}
    </AppCard>
  );
}
