"use client";

import { useCallback, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import type { ObjectIdentificationResult } from "@/lib/ai/identifyObject";
import { writeCachedEntry } from "@/lib/lexicon/cache";
import { normalizeQuery } from "@/lib/lexicon/normalize";
import type { LexiconEntry } from "@/lib/lexicon/types";
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
import { INTERFACE_LANGUAGE_CODE } from "@/lib/languages";
import { fill, formatResetTime } from "@/lib/i18n/format";
import type { ObjectWord } from "@/lib/vision/objectLexicon";
import { recognizeOnDevice } from "@/lib/vision/onDeviceClassifier";

/**
 * How a word from a photograph is handed on. See LexiconSubmitOptions: the
 * phone's first answer carries its word, and the AI's later answer for the
 * same photo is an upgrade.
 */
export type ImageTermOptions = {
  onDeviceWord?: ObjectWord;
  upgrade?: boolean;
  /** The AI could not read the photo: the phone's card is the answer. */
  finalOnDevice?: boolean;
};

/*
 * The recognition, as the dictionary card it already is.
 *
 * It carries everything a lookup of the same word would — both sides, the
 * part of speech, an example pair, and now the IPA — so the camera's card
 * is this, not a second request for the word it found (see termIpa in
 * lib/ai/identifyObject.ts).
 */
function recognitionEntry(result: ObjectIdentificationResult): LexiconEntry {
  return {
    term: result.term,
    translation: result.translation,
    partOfSpeech: result.partOfSpeech,
    termIpa: result.termIpa?.trim() || undefined,
    termExample: result.termExample,
    translationExample: result.translationExample,
    confidence: result.confidence,
    category: "objects",
    termLanguage: result.termLanguage,
    translationLanguage: result.translationLanguage,
    queryLanguage: result.termLanguage,
    kind: "word",
    highlight: null,
  };
}

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
  onDevice = true,
}: {
  onTerm: (term: string, options?: ImageTermOptions) => void;
  /**
   * Whether the phone may answer first. Off for a surface whose search
   * cannot show a card without a request (VocabularySearch hands the word
   * to another screen), where two answers would be two lookups.
   */
  onDevice?: boolean;
}) {
  const { t, language: interfaceLanguage } = useTranslation();
  const { pair } = useDisplayLanguages();
  const { nativeLanguage } = useLearningLanguageContext();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const readingRef = useRef(false);

  /*
   * Which photograph is current. Once the phone has answered, the reader may
   * take the next one while the AI is still reading the last; an answer —
   * or an error — for a photo that is no longer current is dropped.
   */
  const generationRef = useRef(0);

  const finishReading = useCallback((generation: number) => {
    if (generation !== generationRef.current) return;
    readingRef.current = false;
    setReading(false);
  }, []);

  const errorMessage = useCallback(
    (code: ImageRecognitionCode, failure?: ImageRecognitionError): string => {
      const errors = t.capture.errors;

      switch (code) {
        /*
         * Google's AI is unavailable, said as such (Chi, 2026-09-28): the
         * free plan's peaks are Google's, and a reader told "busy" keeps
         * pressing the shutter. With when it is likely back, when known.
         */
        case "google-down": {
          if (failure?.quotaOnly && failure.retryAt) {
            return fill(errors.identifyGoogleQuota, {
              time: formatResetTime(
                failure.retryAt,
                INTERFACE_LANGUAGE_CODE[interfaceLanguage],
              ),
            });
          }
          const minutes = failure?.retryAt
            ? Math.max(1, Math.ceil((failure.retryAt - Date.now()) / 60_000))
            : 1;
          return fill(errors.identifyGoogleDown, { minutes });
        }
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
    [interfaceLanguage, t.capture.errors],
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
      generation: number,
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

      const isCurrent = () => generation === generationRef.current;

      /*
       * Two readers of the same frame, at once.
       *
       * The AI, as before; and the classifier on the phone, which needs no
       * network and answers in a fraction of a second. Whichever the reader
       * sees first, the AI's answer has the last word — it knows a "mug"
       * from a "cup" and writes the example sentences — and when the AI
       * cannot answer (a free-tier peak: every model "high demand" at once,
       * 2026-09-28) the phone's answer is what the reader keeps.
       */
      const fromAi = identifyImage(started.recognitionImage);
      let aiAnswered = false;
      let shownOnDevice: string | null = null;

      const onDevicePromise: Promise<string | null> = onDevice
        ? recognizeOnDevice(started.recognitionImage).then(async (hit) => {
            if (!hit || aiAnswered || !isCurrent()) return null;

            const term = hit.word[pair[0]];
            holdImageCapture(term, await started.capture);
            if (aiAnswered || !isCurrent()) return null;

            shownOnDevice = term;
            onTerm(term, { onDeviceWord: hit.word });

            // The card is up: the shutter is free for the next photograph.
            finishReading(generation);
            return term;
          })
        : Promise.resolve(null);

      let identified: Awaited<typeof fromAi>;

      try {
        identified = await fromAi;
      } catch (aiError) {
        if (!isCurrent()) return;

        const onDeviceTerm = shownOnDevice ?? (await onDevicePromise);
        if (!onDeviceTerm) throw aiError;

        /*
         * The AI could not read the photo, but the phone did, and its card
         * already has both languages. No second request: the card stays,
         * marked as the phone's answer.
         */
        if (isCurrent()) onTerm(onDeviceTerm, { finalOnDevice: true });
        return;
      }

      aiAnswered = true;
      if (!isCurrent()) return;

      if (!identified.term) {
        if (shownOnDevice) onTerm(shownOnDevice, { finalOnDevice: true });
        return;
      }

      /*
       * One request per photograph. The recognition goes into the lookup
       * cache under the word it found, so every search surface that is handed
       * that word — this one, the sheet, the Vocabulary page — shows this
       * card straight from the cache instead of asking a model again.
       */
      writeCachedEntry(
        {
          query: normalizeQuery(identified.term),
          pair,
          native: nativeLanguage,
          head: null,
        },
        recognitionEntry(identified),
      );

      // Held rather than uploaded: nothing reaches storage until the reader
      // saves the word this photograph produced.
      holdImageCapture(identified.term, await started.capture);
      if (!isCurrent()) return;

      if (shownOnDevice) onTerm(identified.term, { upgrade: true });
      else onTerm(identified.term);
    },
    [finishReading, nativeLanguage, onDevice, onTerm, pair],
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
      const generation = ++generationRef.current;
      setError("");
      setReading(true);

      try {
        await readRaster(generation, raster, targetRect, "camera");
      } catch (recognitionError) {
        console.error("Could not read that photo:", recognitionError);
        if (generation === generationRef.current) {
          setError(
            recognitionError instanceof ImageRecognitionError
              ? errorMessage(recognitionError.code, recognitionError)
              : errorMessage("failed"),
          );
        }
      } finally {
        // startCapture owns the raster and closes it when its derivatives
        // settle; closing it here would pull the pixels out from under an
        // encode still running.
        finishReading(generation);
      }
    },
    [errorMessage, finishReading, readRaster],
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
      const generation = ++generationRef.current;
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
          generation,
          decoded,
          DEFAULT_TARGET_RECT,
          pdf ? "file" : "photo",
          file.name,
        );
      } catch (recognitionError) {
        console.error("Could not read that photo:", recognitionError);
        if (generation === generationRef.current) {
          setError(
            recognitionError instanceof ImageRecognitionError
              ? errorMessage(recognitionError.code, recognitionError)
              : errorMessage("failed"),
          );
        }
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

        finishReading(generation);
      }
    },
    [errorMessage, finishReading, readRaster],
  );

  return { reading, error, handleFile, handleCapture };
}
