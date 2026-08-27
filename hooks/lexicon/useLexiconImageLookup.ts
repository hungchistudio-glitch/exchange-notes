"use client";

import { useCallback, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import {
  ImageRecognitionError,
  fileToModelImage,
  identifyImage,
  type ImageRecognitionCode,
} from "@/lib/lexicon/imageRecognition";

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

  const handleFile = useCallback(
    async (file: File) => {
      if (readingRef.current) return;

      readingRef.current = true;
      setError("");
      setReading(true);

      try {
        const identified = await identifyImage(await fileToModelImage(file));
        if (identified.term) onTerm(identified.term);
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
        readingRef.current = false;
        setReading(false);
      }
    },
    [errorMessage, onTerm],
  );

  return { reading, error, handleFile };
}
