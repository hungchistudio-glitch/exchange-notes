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
import { PdfRenderError, isPdf, openPdf, type PdfDocument } from "@/lib/media/pdf";
import type { Raster } from "@/lib/media/raster";
import type { MediaSourceType } from "@/lib/media/record";
import { DEFAULT_TARGET_RECT, MAX_IMAGE_FILE_SIZE } from "@/lib/media/config";
import { startCapture } from "@/lib/media/pipeline";
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
      /*
       * The request goes out as soon as the model's copy exists; the two
       * stored derivatives encode while it is in flight. They used to be
       * encoded first, which put about three hundred milliseconds of work
       * for files the reader may never save in front of the network call.
       */
      const started = await startCapture({
        raster,
        targetRect,
        sourceType,
        recognitionKind: "object",
        recognitionScope: "frame",
        sourceFileName: fileName,
      });

      const identified = await identifyImage(started.recognitionImage);

      if (!identified.term) return;

      // Held rather than uploaded: nothing reaches storage until the reader
      // saves the word this photograph produced.
      holdImageCapture(identified.term, await started.capture);
      onTerm(identified.term);
    },
    [onTerm],
  );

  /** A frame off the shutter, with the target the reader tapped. */
  const handleCapture = useCallback(
    async (raster: Raster, targetRect: NormalizedRect) => {
      if (readingRef.current) {
        /*
         * A second shutter press while the first is still being read. The
         * frame is dropped, and has to be freed here — nothing downstream
         * ever sees it, and it is a full-resolution copy of the sensor.
         */
        raster.close();
        return;
      }

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
        // startCapture owns the raster and closes it when its derivatives
        // settle; closing it here would pull the pixels out from under an
        // encode still running.
        readingRef.current = false;
        setReading(false);
      }
    },
    [errorMessage, readRaster],
  );

  /**
   * A file the reader picked: a photograph, or the first page of a document.
   *
   * The PDF half used to live on the capture page, which was the only entry
   * point in the app that accepted something that is not an image. Merging
   * the two camera doors would have quietly taken that away, so it moved
   * here instead — and having moved, it is now reachable from every lexicon
   * camera rather than from one screen.
   *
   * Page one, always. Somebody photographing a menu, a form or a label means
   * the first page nine times in ten, and this path exists to read a word
   * out of a document rather than to browse it.
   */
  const handleFile = useCallback(
    async (file: File) => {
      if (readingRef.current) return;

      readingRef.current = true;
      setError("");
      setReading(true);

      let raster = null;
      let document_: PdfDocument | null = null;

      try {
        const pdf = isPdf(file);

        if (!pdf && !file.type.startsWith("image/")) {
          throw new ImageRecognitionError("not-an-image");
        }

        if (file.size > MAX_IMAGE_FILE_SIZE) {
          throw new ImageRecognitionError("too-large");
        }

        if (pdf) {
          try {
            document_ = await openPdf(file);
            raster = await document_.renderPage(1);
          } catch (pdfError) {
            /*
             * A document this module cannot open is the same story to the
             * reader as a photograph it cannot decode, and `unreadable` is
             * already the code that says so. The capture page showed the
             * same sentence for the same failure.
             */
            throw pdfError instanceof PdfRenderError
              ? new ImageRecognitionError("unreadable")
              : pdfError;
          }
        } else {
          raster = await decodeBlob(file);
        }

        /*
         * Ownership moves with the value. Past this point the capture frees
         * it when its derivatives settle, and the `finally` below must not.
         */
        const decoded = raster;
        raster = null;

        await readRaster(
          decoded,
          DEFAULT_TARGET_RECT,
          pdf ? "file" : "photo",
          file.name,
        );
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
        /*
         * Only ever non-null on the paths that never reached the capture — a
         * file refused for its type or size, or a decode that failed.
         */
        raster?.close();

        /*
         * The page is a canvas of its own with its own `close`, so the
         * document can go the moment it has been rendered — destroying the
         * pdf.js task does not touch the bitmap the capture is now holding.
         */
        document_?.close();

        readingRef.current = false;
        setReading(false);
      }
    },
    [errorMessage, readRaster],
  );

  return { reading, error, handleFile, handleCapture };
}
