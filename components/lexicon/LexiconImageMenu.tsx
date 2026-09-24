"use client";

import { Camera } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";

import OverlayPortal from "@/components/foundation/overlays/OverlayPortal";
import type { CameraCapture } from "@/components/camera/TargetCamera";
import useTranslation from "@/hooks/i18n/useTranslation";

/* =========================================================
   The camera arrives with the tap, not with the screen

   ── What this was costing ──────────────────────────────────────────────

   This file renders a 44px button. Behind `{open && …}` it renders the
   app's whole camera, and until now that camera was a static import — so
   every screen carrying this key parsed it before it could paint anything.

   Measured on 2026-09-24 by walking the static import graph from each tab's
   entry point, counting source bytes and following neither `import type`
   nor `import()`:

     /vocabulary   162 files  1075 KB   — TargetCamera reached via
                                          VocabularyMainContent → …Search
     /home         157 files  1115 KB   — reached via CommandDeck →
                                          OmniLexiconConsole
     TargetCamera   16 files   122 KB

   Sixteen files and a hundred and twenty kilobytes of source, on the first
   render of the two heaviest screens in the app, for a viewfinder that does
   not exist until somebody taps a button. The word list is the screen a
   reader opens most, and it was paying for the camera every time.

   ── Why this changes nothing on screen ─────────────────────────────────

   The chunk is warmed on `pointerdown`, which lands before `click` — and on
   focus, for a reader arriving by keyboard. So by the time the tap resolves
   the module is already in flight or in hand, and the camera opens exactly
   as it did. `loading` is null rather than a spinner for the same reason:
   there is nothing to show for the handful of milliseconds between, and a
   flash of anything would be a change to what the reader sees.
   ========================================================= */
const loadCamera = () => import("@/components/camera/TargetCamera");

const TargetCamera = dynamic(loadCamera, { loading: () => null });

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
  const warmed = useRef(false);

  /*
   * Once per mount. `dynamic` caches the module itself, but a pointer that
   * wanders across this key several times should not queue several imports
   * for the bundler to deduplicate.
   */
  const warm = useCallback(() => {
    if (warmed.current) return;
    warmed.current = true;
    void loadCamera();
  }, []);

  const camera = t.capture.camera;

  return (
    <span className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerDown={warm}
        onFocus={warm}
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
            /*
             * The document key, which this menu never passed through.
             *
             * TargetCamera has always had a second input for it — the one
             * that accepts application/pdf — and it draws its key only when
             * a handler is given. Nobody gave one here, so reading a word
             * out of a PDF was reachable from the capture page and nowhere
             * else. The lookup takes both now, so it is the same handler.
             */
            onPickFile={async (file) => {
              await onFile(file);
              setOpen(false);
            }}
          />
        </OverlayPortal>
      )}
    </span>
  );
}
