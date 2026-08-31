"use client";

import { useCallback, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import {
  ImageRecognitionError,
  identifyImage,
  type ImageRecognitionCode,
} from "@/lib/lexicon/imageRecognition";
import { holdImageCapture } from "@/lib/lexicon/pendingImageCapture";
import type { NormalizedRect } from "@/lib/media/geometry";
import type { Raster } from "@/lib/media/raster";
import type { MediaSourceType } from "@/lib/media/record";
import { DEFAULT_TARGET_RECT, MAX_IMAGE_FILE_SIZE } from "@/lib/media/config";
import { buildCapture } from "@/lib/media/pipeline";
import { decodeBlob } from "@/lib/media/raster";

/**
 * The one image-recognition path used by every lexicon camera key.
 *
 * Source selection belongs to LexiconImageMenu and the platform. This hook
 * owns everything after a file comes back: validation, compression,
 * recognition, translated errors and protection against a second request.
 * Keeping those jobs together prevents one search surface from quietly
 * drifting back to the retired capture page or showing different failures.
 */
export default function useLexiconImageLookup({
  onTerm,
}: {
  onTerm: (term: string) => void;
}) {
  const { t } = useTranslation();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const readingRef = useRef(false);

  const errorMessage = useCallback(
    (code: ImageRecognitionCode): string => {
      const errors = t.capture.errors;

      switch (code) {
        case "not-an-image":
          return errors.selectImage;
        case "too-large":
          return errors.imageTooLarge;
        case "unreadable":
          return errors.processImage;
        case "daily-limit":
          return errors.identifyDailyLimit;
        case "busy":
          return errors.identifyBusy;
        case "timeout":
          return errors.identifyTimeout;
        default:
          return errors.identifyImage;
      }
    },
    [t.capture.errors],
  );

  /**
   * The shared half: pixels in, a word out.
   *
   * Both entry points land here. What differs before it is only where the
   * pixels came from — a picked file has to be validated and decoded, a
   * camera capture arrives already decoded with a target the reader chose.
   */
  const readRaster = useCallback(
    async (
      raster: Raster,
      targetRect: NormalizedRect,
      sourceType: MediaSourceType,
      fileName?: string,
    ) => {
      /*
       * The whole frame goes to the model and the reader's target becomes
       * the card's.
       *
       * Not the same rectangle, and deliberately. The prompt asks for the
       * object at the exact centre, so sending the target alone would take
       * away the context it uses to decide what that object is — this is a
       * working recognition path and narrowing its input would change
       * answers. The card, meanwhile, must not be the whole photograph
       * shrunk down, which is exactly what the spec forbids.
       */
      const built = await buildCapture({
        raster,
        targetRect,
        sourceType,
        recognitionKind: "object",
        recognitionScope: "frame",
        sourceFileName: fileName,
      });

      const identified = await identifyImage(built.recognitionImage);

      if (identified.term) {
        // Held rather than uploaded: nothing reaches storage until the
        // reader saves the word this photograph produced.
        holdImageCapture(identified.term, built.capture);
        onTerm(identified.term);
      }
    },
    [onTerm],
  );

  /** A frame off the shutter, with the target the reader tapped. */
  const handleCapture = useCallback(
    async (raster: Raster, targetRect: NormalizedRect) => {
      if (readingRef.current) return;

      readingRef.current = true;
      setError("");
      setReading(true);

      try {
        await readRaster(raster, targetRect, "camera");
      } catch (recognitionError) {
        console.error("Could not read that photo:", recognitionError);
        setError(
          errorMessage(
            recognitionError instanceof ImageRecognitionError
              ? recognitionError.code
              : "failed",
          ),
        );
      } finally {
        raster.close();
        readingRef.current = false;
        setReading(false);
      }
    },
    [errorMessage, readRaster],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (readingRef.current) return;

      readingRef.current = true;
      setError("");
      setReading(true);

      let raster = null;

      try {
        if (!file.type.startsWith("image/")) {
          throw new ImageRecognitionError("not-an-image");
        }

        if (file.size > MAX_IMAGE_FILE_SIZE) {
          throw new ImageRecognitionError("too-large");
        }

        raster = await decodeBlob(file);

        await readRaster(raster, DEFAULT_TARGET_RECT, "photo", file.name);
      } catch (recognitionError) {
        console.error("Could not read that photo:", recognitionError);
        setError(
          errorMessage(
            recognitionError instanceof ImageRecognitionError
              ? recognitionError.code
              : "failed",
          ),
        );
      } finally {
        raster?.close();
        readingRef.current = false;
        setReading(false);
      }
    },
    [errorMessage, readRaster],
  );

  return { reading, error, handleFile, handleCapture };
}
