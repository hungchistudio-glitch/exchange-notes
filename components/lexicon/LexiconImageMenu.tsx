"use client";

import { Camera } from "lucide-react";
import { useState } from "react";

import OverlayPortal from "@/components/foundation/overlays/OverlayPortal";
import TargetCamera, {
  type CameraCapture,
} from "@/components/camera/TargetCamera";
import useTranslation from "@/hooks/i18n/useTranslation";

/**
 * One camera key, and the app's own camera behind it.
 *
 * This used to be a bare file input. On iOS that presents the system sheet —
 * Photo Library, Take Photo, Choose File — and "Take Photo" hands over to
 * Apple's camera: its own shutter, its own mode pills, its own 0.5/1x/2
 * stops. Which worked, and was a different camera from the one the rest of
 * the app had just been rebuilt around. Four search surfaces mount this key,
 * so four of them were still opening a camera nobody here designed.
 *
 * It opens TargetCamera now, the same screen the capture flow uses, and gets
 * the same target selection and the same media pipeline with it. The photo
 * library is still one tap away — TargetCamera carries its own picker — so
 * nothing that was reachable before has been taken away.
 */
type LexiconImageMenuProps = {
  onFile: (file: File) => void | Promise<void>;
  onCapture: (capture: CameraCapture) => void | Promise<void>;
  disabled?: boolean;
  buttonClassName?: string;
  /** True while a photo is being read, so the camera can say so. */
  busy?: boolean;
};

export default function LexiconImageMenu({
  onFile,
  onCapture,
  disabled = false,
  busy = false,
  buttonClassName = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft transition-transform active:scale-[0.97]",
}: LexiconImageMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const camera = t.capture.camera;

  return (
    <span className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label={t.lexicon.modeCamera}
        title={t.lexicon.modeCamera}
        className={buttonClassName}
      >
        <Camera size={16} strokeWidth={1.7} aria-hidden="true" />
      </button>

      {open && (
        /*
         * Portalled, because three of the four callers sit inside a bottom
         * sheet. A fixed, full-bleed camera rendered inside a transformed,
         * scrolling panel is positioned against that panel rather than the
         * screen — which is how a viewfinder ends up in the top third of a
         * sheet with its shutter off the bottom.
         */
        <OverlayPortal>
          <TargetCamera
            busy={busy}
            copy={{
              close: camera.closeCameraAriaLabel,
              shutter: camera.captureAriaLabel,
              torchOn: camera.torchOn,
              torchOff: camera.torchOff,
              photoLibrary: t.capture.source.photoLibrary,
              importFile: camera.importFile,
              zoom: camera.zoom,
              zoomLevel: camera.zoomLevel,
              hint: camera.targetHint,
              selectedTarget: camera.selectedTarget,
              candidateTarget: camera.candidateTarget,
              focused: camera.focused,
              analysing: camera.analysing,
              permissionDenied: t.capture.errors.cameraPermissionDenied,
              unavailable: t.capture.errors.cameraUnavailable,
              retry: camera.retry,
            }}
            onClose={() => setOpen(false)}
            /*
             * The camera stays up while the photograph is read, and closes
             * when there is an answer.
             *
             * Closing on the shutter instead made the screen vanish with no
             * feedback for the two or three seconds recognition takes,
             * which reads as the button having failed. `busy` is what draws
             * "Analysing target…" over the frame, and it can only do that
             * if the frame is still there.
             */
            onCapture={async (capture) => {
              await onCapture(capture);
              setOpen(false);
            }}
            onPickPhoto={async (file) => {
              await onFile(file);
              setOpen(false);
            }}
          />
        </OverlayPortal>
      )}
    </span>
  );
}
